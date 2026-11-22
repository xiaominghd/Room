# 数据模型 v0.2

> 依据：`PRD-v4.md`（v4.4）、`UI-STRUCTURE.md`、`demo/`。
> v0.1 的五份评审意见见 `DATA-MODEL-REVIEW.md`；本文是修完之后的版本。
> 标记：【定】已定 ·【议】建议 ·【拍】要你拍板

---

## 0. 三条设计原则

这三条是 v0.1 踩坑换来的，v0.2 的每一处都要经得起它们。

**① 规则要落在「数据动不了」上，不是「账面好看」**
「这一天有卡」不代表「我这一篇写过」，`purged_at` 为空不代表原文还在。能锁死的用外键，能收回的收回权限，剩下的靠对账。

**② 一天一个事务**
第 21 天的「写卡」和「删原文」必须同一次提交。分开提交就会「写完了没删」「崩了永远跳过」。不允许拆。

**③ 时间规则不做门禁**
原文活 21 天，是时间说了算，不是「有没有卡」说了算。卡写不出来就写降级卡；卡写不进去，整个事务回滚，第二天重试。

---

## 1. 五个视角的结论

| 视角 | 最硬的一条 |
|---|---|
| 领域模型 | **「一天」必须是一等对象**：21 天切、留、此刻、特别记忆、压缩，都拿日期当键 |
| 数据库约束 | 把规则写成约束，不要写成代码自觉 |
| 权限视角 | 「删了只在我这边少」是 `(对象, 人)` 的小表，不是一列 |
| 接口契约 | **不要提供「开门」这个动作**，只留「交一张卡」和「关门」 |
| 时间与任务 | 处理单位是天桶 `(房, 日期)`；**v14/21 压的是上一版卡**，不重读原文 |

五个视角都同意：这套产品的核心不是消息表，是「一天」。

---

## 2. 对象与寿命

| 对象 | 是什么 | 寿命 | 谁能改变 |
|---|---|---|---|
| **人** | 手机号 + 密码 + 房间 + 房间内名字 | 注册 → 注销冷却 7 天 → 执行（行留着，名字还要显示） | 本人、运营者（临时密码） |
| **房间** | 一间房、一个名字、一串码 | 本版不结束 | 房间名：任一方；房间码：任一方（满员后不可改） |
| **一天** | 房间时区的一个日历日 | **永久** | 系统（成卡/压缩）；任一方（留，21 天内可取消） |
| **原文** | 文字 / 图片 / 语音 | **21 天**（留过的除外） | 发送者（2 分钟内撤回） |
| **门卡片** | 开门时递的那 1–2 句 | **不随天过期**；没被取走就一直在门口 | 发出者（发出后不可改） |
| **图文卡** | 那天的一段话 + 照片 | D+1 出生；D+7/14/21 各压一次；留过的停在 v1 | 只有系统 |
| **门** | 每人各自一道 | 关 → 开 | 关门的人 |
| **此刻** | 卡下一句，一人一条 | 永久（21 天后仍可写） | 只有本人 |
| **特别记忆** | 一句原话或一张图（640）的快照 | 永久 | 标的人（删了两个人都看不见） |
| **媒体** | 1600 与 640 两档 | 1600 随原文（21 天）；640 永久 | 系统 |

### 2.1 一天的生命周期

| 时刻 | 事件 | 数据上发生什么 |
|---|---|---|
| D | 产生原文 | 第一条消息落库时同事务建 `days` 行，消息挂 `day_id` |
| 发出后 0–120 秒 | 撤回 | 正文与媒体置空，留墓碑（行还在） |
| **D+1** | 成卡 v1（读原文） | **每人写一份** `day_cards(rev=1)`：A 用 A 标的，B 用 B 标的。**可留窗口打开** |
| D+7 | 压 v2（读各自 v1） | 每人写 `day_cards(rev=7)` |
| D+14 | 压 v3（读各自 v2） | 每人写 `day_cards(rev=14)` |
| **D+21** | 压 v4 + 原文消失 | **一个事务**：写 `rev=21` → 删那天的原文（不含卡片）→ 提交 |
| D+21 之后 | 定型态 | 聊天框只有一行 `10 月 17 日 · 已收进相册`；相册有卡、此刻、特别记忆 |

**留一天**（窗口 `[D+1, D+21)`，任一成员、单方；**21 天内可取消，21 天后锁定**）：

- 在 `day_keeps` 里加一行（我的那一票）
- 之后**不再压缩**，卡停在 **v1**（最小压缩 = 最详细那版）
- 第 21 天**不删原文**（删除条件：这一天一票都没有）
- 聊天框里同样只留一行（`10 月 17 日 · 留过`），原文从**相册那一天**里的「看那天的原文」进入
- 原图永久
- **取消（21 天内）**：删掉我那一票；别人还留着就仍然算留；票清零后原文回到正常到期、卡恢复压缩

**卡片的寿命与 21 天无关**：门口没被取走的卡一直挂着，被取走时进消息流。第 21 天的清理**只删 `kind in ('text','image','voice')`**。

### 2.2 不是对象的东西

- **日期行**：由「这天 ≥21 天」或「留过」推出来，位置用 `days.anchor_seq`
- **排队的消息**：不是队列，是「关门这段时间对我不可见」的推导
- **门口的卡片**：卡片本身就是一条消息，`card_delivered_at` 为空即「在门口」，不需要另一种对象
- **短记**：卡 + 此刻的读视图
- **未读数字**：水位差，不是已读回执
- **AI 开门问的那句**：不落库（落库就等于留存）
- **半关**：客户端手势，不写库

---

## 3. 表设计（10 张）

### 3.1 房间与身份

```sql
rooms (
  id uuid pk,
  name text not null default '我们的房间',
  join_code text,                       -- 房间码 = 房号，满员后置空
  room_tz text not null default 'Asia/Shanghai',
  seq_counter bigint not null default 0, -- 取号器（行锁分配）
  created_at timestamptz not null default now()
);
create unique index on rooms (join_code) where join_code is not null;
alter table rooms add constraint name_len check (char_length(btrim(name)) between 1 and 12);
alter table rooms add constraint code_shape
  check (join_code is null or (join_code ~ '^[2-9A-Z]{6}$' and join_code !~ '[01IOL]'));
```

```sql
users (
  id uuid pk,
  phone text,
  password_hash text not null,
  must_change_password boolean not null default false,
  temp_password_expires_at timestamptz,

  room_id uuid references rooms(id),    -- 一账号一房：一列就是这条约束
  slot smallint,
  username text,                        -- 房间内显示名；注销后仍要显示
  joined_at timestamptz,
  last_seen_seq bigint not null default 0,

  deletion_requested_at timestamptz,    -- 注销冷却 7 天
  deleted_at timestamptz,               -- 执行了：清凭证、留名字
  created_at timestamptz not null default now()
);
create unique index on users (phone) where phone is not null;
create unique index on users (room_id, slot) where room_id is not null;
create unique index on users (room_id, lower(btrim(username))) where room_id is not null;
alter table users add constraint phone_shape check (phone is null or phone ~ '^1[3-9][0-9]{9}$');
alter table users add constraint slot_domain check (slot is null or slot in (1,2));
alter table users add constraint room_fields_together
  check ((room_id is null) = (slot is null) and (room_id is null) = (username is null));
alter table users add constraint deleted_has_no_credentials
  check (deleted_at is null or (password_hash = '' and phone is null));
```

> 注销 = **软删**：清凭证、留 `username` 与 `room_id`，相册里的名字继续显示。这条写进 §9 红线。

### 3.2 一天与卡

```sql
days (
  id bigint generated always as identity pk,
  room_id uuid not null references rooms(id),
  day date not null,                    -- 房间时区的日历日，写入时冻结
  -- 有没有卡、压到第几版：都在 day_cards 上，按人算
  anchor_seq bigint,                    -- 那行日期在消息流里的位置
  created_at timestamptz not null default now()
);
create unique index on days (room_id, day);

```

```sql
day_keeps (                              -- 一次「留」= 一行；两个人各一票，谁留都算留
  day_id bigint not null references days(id) on delete cascade,
  user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  primary key (day_id, user_id)
);
```

> 「这一天留过没有」= `exists (select 1 from day_keeps where day_id = d.id)`。
> 不需要在 `days` 上存一个「已留」标记：留是一张票，不是一天的属性；两个人各投各的，谁都可以撤。
> 「留过的卡停在 v1」也由它推导——这一天只要有一票，就取 `rev=1`。

> **没有 `purged_at`，也没有 `finalized_at`。**
> 「这天清理了没有」= 「这天还有没有原文」。因为写卡与删原文在同一个事务里，原文没了就说明事务整体成功。
> 代价：将来若允许「单条删除」或「清空房间」，这个推断会失效——那两件事本版不做。

```sql
day_cards (                              -- 一人一份：同一天两篇日记
  day_id bigint not null references days(id) on delete cascade,
  for_user uuid not null references users(id),
  rev smallint not null,                -- 1 | 7 | 14 | 21
  text text,                            -- 可空：只有日期也算一张
  photos jsonb not null default '[]',   -- 有序 photo 清单（media id + 次序）
  status text not null default 'ok',    -- ok | degraded
  generated_at timestamptz not null default now(),
  unique (day_id, for_user, rev)
);
alter table day_cards add constraint rev_domain check (rev in (1,7,14,21));
alter table day_cards add constraint photos_is_array check (jsonb_typeof(photos) = 'array');
alter table day_cards add constraint status_domain check (status in ('ok','degraded'));
```

> 降级卡是**真的卡**：照片照常（照片是真数据），只是文字为空或一行事实。
> 卡不可改，靠触发器：`degraded → ok` 允许，其余 UPDATE 拒绝；`rev = 21` 写进去之后，这一天的卡全部只读。

### 3.3 原文与媒体

```sql
messages (
  id bigint generated always as identity pk,
  room_id uuid not null references rooms(id),
  day_id bigint not null references days(id),
  seq bigint not null,
  sender_id uuid not null references users(id),
  kind text not null,                   -- text | image | voice | card
  body text,
  media_id uuid,
  voice_sec int,
  client_id text not null,
  quote_id bigint,
  quote_day date,
  recalled_at timestamptz,
  card_delivered_at timestamptz,        -- 仅 card：null = 在门口
  created_at timestamptz not null default now()
);
create unique index on messages (room_id, seq);
create unique index on messages (room_id, sender_id, client_id);
create index on messages (day_id, seq);
create index on messages (room_id, kind) where kind = 'card' and card_delivered_at is null;
alter table messages add constraint kind_domain check (kind in ('text','image','voice','card'));
alter table messages add constraint tombstone_is_empty
  check (recalled_at is null or (body is null and media_id is null));
create unique index one_undelivered_card_per_room
  on messages (room_id) where kind = 'card' and card_delivered_at is null;
```

```sql
media (
  id uuid pk,
  room_id uuid not null references rooms(id),
  kind text not null,                   -- image | voice
  width int, height int,
  place text,                           -- 图片可带地点（demo 有）
  taken_at timestamptz,
  orig_key text,                        -- 1600
  thumb_key text,                       -- 640（上传时就生成）
  orig_purged_at timestamptz,
  created_at timestamptz not null default now()
);
```

> `media.room_id` 只用来隔离房间，不决定谁能看；取图鉴权按「调用者可见的那条消息」判，不按 media 判——否则关门期间拿到 media id 就能取图。

### 3.4 门

```sql
door_closures (
  id bigint generated always as identity pk,
  room_id uuid not null references rooms(id),
  by_user uuid not null references users(id),
  line text not null,
  closed_at timestamptz not null default now(),
  opened_at timestamptz,
  key_card_seq bigint
);
create unique index one_closed_per_member on door_closures (room_id, by_user) where opened_at is null;
alter table door_closures add constraint line_not_blank check (btrim(line) <> '');
alter table door_closures add constraint opened_needs_key
  check ((opened_at is null) = (key_card_seq is null));
alter table door_closures add constraint key_card_exists
  foreign key (room_id, key_card_seq) references messages (room_id, seq);
```

> 卡片不再随天删除，所以「开门那张卡的外键」是稳的——不会因为清理而挡住建表或开门。

### 3.5 记忆

```sql
day_moments (
  day_id bigint not null references days(id) on delete cascade,
  user_id uuid not null references users(id),
  text text not null,
  updated_at timestamptz not null default now(),
  primary key (day_id, user_id)
);
alter table day_moments add constraint moment_not_blank check (btrim(text) <> '');


day_marks (
  id uuid pk,
  day_id bigint not null references days(id) on delete cascade,
  by_user uuid not null references users(id),
  source_message_id bigint,
  text text,                             -- 文字快照（必须存，21 天后原文已删）
  media_id uuid,                         -- 图快照（只 640）
  deleted_at timestamptz,                -- 删了两个人都看不见；只有 by_user 能写
  created_at timestamptz not null default now()
);
-- 同一条消息，两个人各能标一次；同一个人只能有一条有效的
create unique index one_mark_per_person
  on day_marks (source_message_id, by_user) where source_message_id is not null and deleted_at is null;
create index on day_marks (day_id, created_at);
-- 聊天里那个小点：按消息查标记
create index on day_marks (source_message_id) where source_message_id is not null;


```

---

## 4. 规则 → 落点

| 规则 | 落在哪 |
|---|---|
| 原文留 21 天、按天切 | `days` + `room_today() - day >= 21`，任务按天扫 |
| 21 天原文消失 | 一个事务里写 `rev=21` + `delete … where day_id=X and kind <> 'card'` |
| 留过的一天，21 天内不删 | 删除 SQL 带 `not exists (select 1 from day_keeps k where k.day_id = d.id)` |
| 只能留已生成卡的日子（第 1–20 天） | 接口 `INSERT … SELECT WHERE room_today()-day BETWEEN 1 AND 20`，0 行 → 409 |
| **21 天内可以取消留** | `DELETE FROM day_keeps WHERE day_id=$1 AND user_id=$me AND room_today()-day < 21`；原文不动 |
| **21 天后锁定** | 同一个接口在 age ≥ 21 时影响行数为 0 → 409 |
| 留过的卡停在 v1 | 读卡时「这一天有任何一票 → 取 rev=1」；压缩任务跳过有票的天 |
| 每天都有卡 | 我这天的 `day_cards` 有行即可，不看卡文字 |
| 卡片不随天过期 | 清理条件 `kind <> 'card'` |
| 此刻一人一条 | 主键 `(day_id, user_id)` |
| 此刻只能本人改删 | 接口 `WHERE user_id = 会话` |
| 特别记忆是私有的 | 读一律带 `by_user = 会话`：小点、小框都只查自己那份；对方的查不到 |
| 两个人可以标同一条 | `unique (source_message_id, by_user)`；每人一条有效 |
| 删只删自己的 | 接口只允许 `by_user = 会话` 写 `deleted_at`；另一份不受影响 |
| 被标的消息在聊天里带小点 | 由「我自己的有效标记」推导 |
| 日记一人一份 | `day_cards (day_id, for_user, rev)`；A 看不到 B 那篇 |
| 被标的原话必须进我这一篇 | 压缩输入 = 那天的原文 + **我自己的有效标记**（对方标的我看不到，也不进我这篇） |
| 留是共同的 | `day_keeps` 任一票 → 两个人的卡都停在 v1 |
| 删标记不改已生成的卡 | 卡的文字是历史版本，不重写；21 天内的删除由下一次压缩体现，21 天后的删除只影响小框 |
| 开门必须带卡 | `check ((opened_at is null) = (key_card_seq is null))` + 外键 |
| 一人同时只有一道关着的门 | `unique (room_id, by_user) where opened_at is null` |
| 关门那句不能空 | `check (btrim(line) <> '')` |
| 房间上限 2 人 | `slot in (1,2)` + `unique (room_id, slot)` |
| 一账号一房 | `users.room_id` 一列 |
| 房间码唯一、满员即废 | `unique (join_code)`；满员时置空 |
| 房间名 1–12 字 | `check (char_length(btrim(name)) between 1 and 12)` |
| 用户名房间内唯一 | `unique (room_id, lower(btrim(username)))` |
| 手机号全局唯一、可换 | `unique (phone) where phone is not null` |
| 发消息不重复 | `unique (room_id, sender_id, client_id)` |
| 撤回 2 分钟 | `UPDATE … WHERE now()-created_at <= 120s`，看影响行数 |
| 撤回后引用三态 | 墓碑 + `quote_day` + `days` 状态 |
| 通知只推新消息 | 不落表；推送队列按「合并槽 + 水位」实现，见 §6 |
| 导出按请求人可见性 | 接口层一份谓词，见 §9 红线 2 |
| 注销 7 天冷却、执行后软删 | `deletion_requested_at` / `deleted_at` + CHECK |

---

## 5. 时间与任务（瘦版）

**一个任务，每天 00:05 跑一次。**

```
对每一天：
  age = room_today() - day

  age ∈ {7, 14} 且 这一天没有票 → 对每个人各压一版（已有该版就跳过）
    → 压那一版（读上一版卡；已有就跳过）

  age >= 21 且 这一天没有票 且 这天还有原文
    → 一个事务：
        读上一版卡（v14）→ 调算法（失败就用降级卡，照片照常）
        给每个人各写一份 day_cards(rev=21)

        delete from messages where day_id = X and kind <> 'card'
        commit
```

**留与删的竞争**：事务开始先 `SELECT … FROM days WHERE id = X FOR UPDATE`，再判这一天有没有票。留的操作同样锁这一行。所以不会出现「复核之后又被留，然后删掉」。

**跑完自检两句**（查不到就结束，查得到就告警）：

```sql
-- 该删没删
select id from days d where room_today() - d.day >= 21
  and not exists (select 1 from day_keeps k where k.day_id = d.id)
  and exists (select 1 from messages m where m.day_id = d.id and m.kind <> 'card');

-- 留过却被删
select id from days d join day_keeps k on k.day_id = d.id
  and not exists (select 1 from messages m where m.day_id = d.id);
```

**没有**租约、状态机、退避表、每小时对账。失败就第二天重试；连续三天自检不过就人工看。

**时间只有一个来源**：注入的 Clock + 房间时区。代码里不许出现 `now()` / `CURRENT_DATE` / `created_at + 21d`。

---

## 6. 接口

| 动作 | 接口 | 事务/要点 |
|---|---|---|
| 注册 | `POST /v1/auth/register` | 建房 + 发房间码 + 名字默认「我们的房间」 |
| 登录 | `POST /v1/auth/login` | 单设备：新会话顶掉旧的 |
| 进房（输码） | `POST /v1/rooms/join { code }` | 码对且有空位 → 占 slot；满员 409 |
| 退出 | `POST /v1/auth/logout` | 清会话，不离开房间 |
| 对齐 | `GET /v1/room/state` | 房间名、房间码、门态、`max_seq`、我的 slot |
| 补拉 | `GET /v1/feed?after_seq=` | 门关着 → items 恒空 |
| 发消息 | `POST /v1/messages` | 取 seq → 幂等查 → 落库 |
| 撤回 | `POST /v1/messages/:id/recall` | 2 分钟窗口写进 WHERE |
| 关门 | `POST /v1/door/close { line }` | 空 → 422 |
| 开门（带卡） | `POST /v1/door/knock { card }` | 写卡片 + 取 seq + 置开门，同一事务 |
| 用门口的卡开门 | `POST /v1/door/knock { take }` | 消费门口卡（`card_delivered_at`）+ 开门 |
| 某一天 | `GET /v1/days/:date` | 卡（留过 → v1）、照片、此刻、特别记忆 |
| 月历 | `GET /v1/album?month=` | 每天的摘要（有无卡、留过、照片数） |
| 看原图 | `GET /v1/media/:id` | 按「调用者可见的那条消息」鉴权 |
| 写/改/删此刻 | `PUT｜DELETE /v1/days/:date/moment` | 只动本人那一行 |
| 标/删特别记忆 | `POST /v1/messages/:id/mark`；`DELETE /v1/marks/:id` | 只动本人 |
| 留一天 | `POST /v1/days/:date/keep` | 写 `day_keeps`，带窗口判断；0 行 → 409 |
| 改房间名 | `PATCH /v1/room { name }` | 两人都能改；1–12 字 |
| 换房间码 | `POST /v1/room/recode` | 满员 → 409；返回新码 |
| 导出 | `POST /v1/exports` | 按请求人可见性取数 |

**三条形状约束**

1. **没有「开门」这个动词**，只有 `knock`（必带卡）和 `close`。
2. **写操作统一返回**：新水位、本条 seq、`server_time`、门态、当天卡状态、本人视角的 remembered/hidden。
3. **WS 按人推**：关门的人收不到 `message.created` / `card.changed` / 对方 `door.changed`。

---

## 7. 被否掉的建议

| 建议 | 为什么不用 |
|---|---|
| `PATCH /messages/:id` 改正文 | PRD 没有编辑；消息只能发或撤 |
| `POST /room/read` 已读游标 | PRD 明确不做已读 |
| 卡片单独建 `door_cards` 表 | 卡片要有 seq、能引用、走通知合并——它必须是消息流里的一条 |
| 每人一份数据副本 | 违反「一份真删」，且要双写 |
| `deleted_at` 软删代替物理删 | 21 天后仍可查、备份仍带着 |
| 按 `created_at` 现算「哪一天」 | 时区一改、tzdata 一更新，历史重新分桶 |
| 留一天时把原文复制进卡 | 留 = 原文保留，复制会让同一段文字有两个真相 |
| 用 `purged_at` 记「删干净了」 | 写卡与删原文同一事务，看原文在不在就够了（v0.1 的 A4 用「一个事务」解决） |
| 租约 / 任务状态机 / 每小时对账 | 两人一房、单实例，一天跑一次就够 |

---

## 8. 只剩两处要你拍板

### 分歧 1：seq 用房间计数器，还是全局自增？

- **A（我倾向）**：房间计数器行（`rooms.seq_counter`，行锁取号）。同房稠密，回滚不烧号
- B：全局自增列。简单，但每房天生带洞

### 分歧 2：卡上的照片最多 9 张，是「只存 9 张」还是「都存、界面折 9 格」？

- **A（我倾向）**：都存。`day_cards.photos` 存全部，界面只显示前 9
- B：只存前 9。第 10 张的原图第 21 天删不删就没答案了

**已经不用再选的**：门属于人（每人一道）、开门必须带卡、撤回留墓碑、满员即废是一次性闩——都被前面的结论钉死了。

---

## 9. 红线

1. **身份只从会话取**，永不从请求参数取
2. **可见性只有一份谓词**，被 feed、卡片正文、AI 提示词、导出、看图五处共用；漏一处就是一次猫眼
3. **关门判断在写路径也要有**：读侧过滤挡不住直调接口
4. **第 21 天写卡与删原文必须同一事务**，不许拆
5. **删除只走一个入口**，且条件带「这一天没有票」
6. **注销是软删**：清凭证、留名字，不真删行
7. **不存正文到日志、备份、触发器、outbox**；对象存储真删字节
8. **不用 `CURRENT_DATE`**，只用房间时区的 `room_today()`
9. **新增写路径，重新对一遍 §4 表**

---

## 10. 怎么验证

1. **种子**：10-16（留过）、10-17（今天）、10-09（有照片没留）、10-03（纯文字）
2. **时间旅行**：一次 tick 跑 D+1 / D+7 / D+14 / D+21，断言卡版本、原文在不在、那行日期
3. **违规用例**（必须被拒）
   - 第 21 天后留一天 → 409
   - 留过的天，清理任务 → 不删（自检第 2 句为空）
   - 不带卡开门 → 约束拒绝
   - 第三人进房 → slot 冲突
   - 对方替我删特别记忆 → 0 行
   - 改包把 user_id 换成对方 → 会话鉴权拒绝
4. **崩溃注入**：写卡后抛错（模拟中断）→ 事务回滚 → 原文还在 → 次日重跑正常删

---

## 11. 还没定的

1. 删「此刻」是两边都没，还是只在我这边少 —— 按两边都没
2. 卡片能不能撤回 / 标特别记忆 —— 按不能
3. 导出「全部」是否包含此刻与特别记忆 —— 按都包含
4. 注销本版做不做 —— 倾向和结束态一起推迟
5. 半关的草稿要不要跨重启保存 —— 现在不存
