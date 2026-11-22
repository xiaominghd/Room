-- 房间 · 数据库结构
-- 依据：docs/DATA-MODEL.md（v0.2）+ docs/DECISIONS.md（已定的十件事）
-- 目标：PostgreSQL 16
-- 说明：本文件按「依赖顺序」建表，可直接整段执行。
--      没有在本地跑过（这台机器没有 Postgres），第一次跑请留意报错。

begin;

-- ---------------------------------------------------------------------------
-- 0. 通用：房间时区与「今天」
-- ---------------------------------------------------------------------------

-- 全库只有一个地方把「现在」变成「房间里的一天」。
-- 代码里不许出现 CURRENT_DATE / now()::date / created_at + 21d。
create or replace function room_today(p_room uuid)
returns date
language sql stable
as $$
  select (now() at time zone r.room_tz)::date
  from rooms r where r.id = p_room;
$$;

-- ---------------------------------------------------------------------------
-- 1. 房间
-- ---------------------------------------------------------------------------

create table rooms (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default '我们的房间',
  join_code    text,                       -- 房间码 = 房号；满员后置空
  room_tz      text not null default 'Asia/Shanghai',
  seq_counter  bigint not null default 0,  -- 房间内取号器
  created_at   timestamptz not null default now(),
  constraint name_len  check (char_length(btrim(name)) between 1 and 12),
  constraint code_shape check (join_code is null
              or (join_code ~ '^[2-9A-Z]{6}$' and join_code !~ '[01IOL]')),
  constraint tz_fixed  check (room_tz = 'Asia/Shanghai')
);
create unique index rooms_join_code on rooms (join_code) where join_code is not null;

-- 取号：同一间房串行，回滚不烧号
create or replace function next_seq(p_room uuid)
returns bigint
language sql
as $$
  update rooms set seq_counter = seq_counter + 1
  where id = p_room
  returning seq_counter;
$$;

-- ---------------------------------------------------------------------------
-- 2. 人（一账号一房：room_id 一列就是这条约束）
-- ---------------------------------------------------------------------------

create table users (
  id                       uuid primary key default gen_random_uuid(),
  phone                    text,
  password_hash            text not null default '',
  must_change_password     boolean not null default false,
  temp_password_expires_at timestamptz,

  room_id                  uuid references rooms(id),
  slot                     smallint,          -- 1 | 2
  username                 text,              -- 房间内显示名；注销后仍要显示
  joined_at                timestamptz,
  last_seen_seq            bigint not null default 0,

  deletion_requested_at    timestamptz,       -- 注销冷却 7 天
  deleted_at               timestamptz,       -- 执行了：清凭证、留名字
  created_at               timestamptz not null default now(),

  constraint phone_shape check (phone is null or phone ~ '^1[3-9][0-9]{9}$'),
  constraint slot_domain check (slot is null or slot in (1, 2)),
  constraint name_len    check (username is null or char_length(btrim(username)) between 1 and 12),
  -- 房间、名次、名字要么全空（还没进房），要么全有
  constraint room_fields_together
    check ((room_id is null) = (slot is null) and (room_id is null) = (username is null)),
  -- 注销 = 软删：清凭证、留名字
  constraint deleted_has_no_credentials
    check (deleted_at is null or (password_hash = '' and phone is null and temp_password_expires_at is null))
);
create unique index users_phone on users (phone) where phone is not null;
create unique index users_slot  on users (room_id, slot) where room_id is not null;   -- 一间房只能坐两个人
create unique index users_name  on users (room_id, lower(btrim(username))) where room_id is not null;

-- ---------------------------------------------------------------------------
-- 3. 一天
-- ---------------------------------------------------------------------------

create table days (
  id          bigint generated always as identity primary key,
  room_id     uuid not null references rooms(id),
  day         date not null,        -- 房间时区的日历日，写入时冻结
  anchor_seq  bigint,               -- 那行日期在消息流里的位置
  created_at  timestamptz not null default now(),
  unique (room_id, day)
);
create index days_room_day on days (room_id, day);

-- 留：一次「留」= 一行；两个人各一票，谁留都算留
create table day_keeps (
  day_id     bigint not null references days(id) on delete cascade,
  user_id    uuid not null references users(id),
  created_at timestamptz not null default now(),
  primary key (day_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 4. 日记（AI 整理的那一张；一人一份）
-- ---------------------------------------------------------------------------

create table day_cards (
  day_id       bigint not null references days(id) on delete cascade,
  for_user     uuid not null references users(id),
  rev          smallint not null,              -- 1 | 7 | 14 | 21
  text         text,                           -- 可空：只有日期也算一张
  photos       jsonb not null default '[]',    -- 有序：media id + 次序
  status       text not null default 'ok',     -- ok | degraded
  generated_at timestamptz not null default now(),
  primary key (day_id, for_user, rev),
  constraint rev_domain    check (rev in (1, 7, 14, 21)),
  constraint photos_array  check (jsonb_typeof(photos) = 'array'),
  constraint status_domain check (status in ('ok', 'degraded')),
  constraint text_len      check (text is null or char_length(text) <= 1200)
);
create index day_cards_by_user on day_cards (for_user, day_id);

-- 卡不可改：degraded 可以被成功版本替换；
-- 一旦这一天出现 rev=21（定型），这一天的卡就不再接受任何新版本或修改。
-- 注意：rev=21 本身要允许写（两个人各写一份），所以 INSERT 只在「不是 21 版」时拦。
create or replace function day_cards_guard()
returns trigger
language plpgsql
as $$
declare
  v_day bigint := coalesce(new.day_id, old.day_id);
  v_final boolean;
begin
  if tg_op = 'DELETE' then
    return old;   -- 允许级联清理，卡本身不允许被业务删
  end if;

  select exists (select 1 from day_cards where day_id = v_day and rev = 21) into v_final;

  if tg_op = 'INSERT' then
    if new.rev <> 21 and v_final then
      raise exception '这一天已经定型（rev=21），不再接受新版本';
    end if;
    return new;
  end if;

  -- UPDATE
  if v_final then
    raise exception '这一天已经定型（rev=21），卡不再改';
  end if;
  if old.status = 'ok' then
    raise exception '已经生成好的卡不能改';
  end if;
  if new.status <> 'ok' then
    raise exception '只允许 degraded 被成功版本替换';
  end if;
  return new;
end $$;

create trigger day_cards_guard
  before insert or update or delete on day_cards
  for each row execute function day_cards_guard();

-- ---------------------------------------------------------------------------
-- 5. 媒体
-- ---------------------------------------------------------------------------

create table media (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references rooms(id),
  kind           text not null,              -- image | voice
  width          int,
  height         int,
  place          text,
  taken_at       timestamptz,
  orig_key       text,                       -- 1600
  thumb_key      text,                       -- 640，上传时生成
  orig_purged_at timestamptz,                -- 原文到期时删原图；留过则永不置位
  created_at     timestamptz not null default now(),
  constraint kind_domain check (kind in ('image', 'voice'))
);

-- ---------------------------------------------------------------------------
-- 6. 原文（消息）
-- ---------------------------------------------------------------------------

create table messages (
  id                bigint generated always as identity primary key,
  room_id           uuid not null references rooms(id),
  day_id            bigint not null references days(id),
  seq               bigint not null,
  sender_id         uuid not null references users(id),
  kind              text not null,           -- text | image | voice | card
  body              text,
  media_id          uuid references media(id),
  voice_sec         int,
  client_id         text not null,
  quote_id          bigint,
  quote_day         date,
  recalled_at       timestamptz,
  card_delivered_at timestamptz,             -- 仅 kind='card'：null = 在门口
  created_at        timestamptz not null default now(),

  constraint kind_domain check (kind in ('text', 'image', 'voice', 'card')),
  constraint body_len    check (body is null or char_length(body) <= 2000),
  constraint voice_len   check (voice_sec is null or voice_sec between 1 and 60),
  -- 撤回 = 墓碑：正文与媒体都清空
  constraint tombstone_is_empty
    check (recalled_at is null or (body is null and media_id is null)),
  -- 卡片必须有正文，且只有卡片能带「门口」状态
  constraint card_has_body check (kind <> 'card' or btrim(coalesce(body, '')) <> ''),
  constraint door_only_card check (card_delivered_at is null or kind = 'card'),
  -- 引用：同一间房内自引用
  constraint quote_in_room
    foreign key (quote_id, room_id) references messages (id, room_id) on delete set null (quote_id)
);
create unique index messages_seq   on messages (room_id, seq);
create unique index messages_client on messages (room_id, sender_id, client_id);
create index messages_day          on messages (day_id, seq);
-- 门口同时只有一张卡
create unique index messages_door on messages (room_id)
  where kind = 'card' and card_delivered_at is null;

-- ---------------------------------------------------------------------------
-- 7. 门（每个人的门）
-- ---------------------------------------------------------------------------

create table door_closures (
  id            bigint generated always as identity primary key,
  room_id       uuid not null references rooms(id),
  by_user       uuid not null references users(id),
  line          text not null,
  closed_at     timestamptz not null default now(),
  opened_at     timestamptz,
  key_card_seq  bigint,

  constraint line_len   check (char_length(btrim(line)) between 1 and 24),
  -- 门开着 ⇔ 有卡授权过
  constraint opened_needs_key check ((opened_at is null) = (key_card_seq is null))
);
-- 一个人同时只有一道关着的门
create unique index door_one_closed on door_closures (room_id, by_user) where opened_at is null;

-- ---------------------------------------------------------------------------
-- 8. 此刻（一人一条，共用可见）
-- ---------------------------------------------------------------------------

create table day_moments (
  day_id     bigint not null references days(id) on delete cascade,
  user_id    uuid not null references users(id),
  text       text not null,
  updated_at timestamptz not null default now(),
  primary key (day_id, user_id),
  constraint moment_len check (char_length(btrim(text)) between 1 and 60)
);

-- ---------------------------------------------------------------------------
-- 9. 特别记忆（完全私人：只看得到自己标的）
-- ---------------------------------------------------------------------------

create table day_marks (
  id                uuid primary key default gen_random_uuid(),
  day_id            bigint not null references days(id) on delete cascade,
  by_user           uuid not null references users(id),
  source_message_id bigint references messages(id) on delete set null,
  text              text,                    -- 文字快照（21 天后原文已删）
  media_id          uuid references media(id),
  deleted_at        timestamptz,             -- 删自己那条
  created_at        timestamptz not null default now(),
  constraint mark_has_content check (text is not null or media_id is not null),
  constraint mark_len         check (text is null or char_length(text) <= 500)
);
-- 同一条消息，每个人只能有一条有效标记
create unique index marks_one_per_person on day_marks (source_message_id, by_user)
  where source_message_id is not null and deleted_at is null;
create index marks_day on day_marks (day_id, by_user);

-- ---------------------------------------------------------------------------
-- 10. 第 21 天：定型 + 删原文（一个事务，调用方负责开事务）
-- ---------------------------------------------------------------------------

create or replace function purge_day(p_day bigint, p_card_text text default null)
returns void
language plpgsql
as $$
declare
  v_room uuid;
begin
  -- 锁住这一天：和「留」串行
  select room_id into v_room from days where id = p_day for update;
  if not found then
    raise exception '没有这一天';
  end if;

  -- 有人留过：不压、不删
  if exists (select 1 from day_keeps where day_id = p_day) then
    return;
  end if;

  -- 先定型：给这一天的每个人写 rev=21（已经写过就跳过）
  insert into day_cards (day_id, for_user, rev, text, status)
  select p_day, u.id, 21, p_card_text,
         case when p_card_text is null then 'degraded' else 'ok' end
  from users u
  where u.room_id = v_room and u.deleted_at is null
  on conflict (day_id, for_user, rev) do nothing;

  -- 再删原文：卡片不删（门口没取走的卡也留着）
  delete from messages where day_id = p_day and kind <> 'card';
end $$;

commit;
