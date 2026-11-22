-- 自检：这些语句**应该全部报错**（报错 = 约束生效）
-- 用法：psql -f verify.sql，逐条看，每条后面都写了期望
-- 任何一条没有报错，说明那条规则没锁住。

-- 准备：一间房、两个人
begin;
insert into rooms (id, name, join_code) values ('00000000-0000-0000-0000-000000000001', '自检房', 'ABC234');
insert into users (id, phone, password_hash, room_id, slot, username, joined_at) values
  ('00000000-0000-0000-0000-00000000000a', '13800000001', 'x', '00000000-0000-0000-0000-000000000001', 1, '甲', now()),
  ('00000000-0000-0000-0000-00000000000b', '13800000002', 'x', '00000000-0000-0000-0000-000000000001', 2, '乙', now());
insert into days (id, room_id, day) values (1, '00000000-0000-0000-0000-000000000001', '2025-10-16');
commit;

-- 1. 第三个人进不来（一间房只有两个位置）
insert into users (phone, password_hash, room_id, slot, username, joined_at)
values ('13800000003', 'x', '00000000-0000-0000-0000-000000000001', 3, '丙', now());
-- 期望：ERROR  slot_domain / users_slot

-- 2. 同名进不来（房间内唯一）
insert into users (phone, password_hash, room_id, slot, username, joined_at)
values ('13800000004', 'x', '00000000-0000-0000-0000-000000000001', 3, '甲', now());
-- 期望：ERROR  users_name

-- 3. 空房间名不行
update rooms set name = '   ' where id = '00000000-0000-0000-0000-000000000001';
-- 期望：ERROR  name_len

-- 4. 房间码里不许出现 0/1/I/O/L
update rooms set join_code = 'ABC01L' where id = '00000000-0000-0000-0000-000000000001';
-- 期望：ERROR  code_shape

-- 5. 关门那句不能空
insert into door_closures (room_id, by_user, line)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '  ');
-- 期望：ERROR  line_len

-- 6. 一个人只能关一道门
insert into door_closures (room_id, by_user, line) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '今晚到这儿'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '再关一次');
-- 期望：第二条 ERROR  door_one_closed

-- 7. 没有卡不许「开门」
update door_closures set opened_at = now()
where by_user = '00000000-0000-0000-0000-00000000000a' and opened_at is null;
-- 期望：ERROR  opened_needs_key

-- 8. 此刻一人一条
insert into day_moments (day_id, user_id, text) values
  (1, '00000000-0000-0000-0000-00000000000a', '今天不错'),
  (1, '00000000-0000-0000-0000-00000000000a', '再来一条');
-- 期望：第二条 ERROR  主键 day_moments_pkey

-- 9. 同一条消息，同一个人只能标一次
insert into messages (room_id, day_id, seq, sender_id, kind, body, client_id)
values ('00000000-0000-0000-0000-000000000001', 1, 1, '00000000-0000-0000-0000-00000000000a', 'text', '你好', 'c1');
insert into day_marks (day_id, by_user, source_message_id, text) values
  (1, '00000000-0000-0000-0000-00000000000a', 1, '你好'),
  (1, '00000000-0000-0000-0000-00000000000a', 1, '再标一次');
-- 期望：第二条 ERROR  marks_one_per_person

-- 10. 卡不能改（生成好的）
insert into day_cards (day_id, for_user, rev, text) values
  (1, '00000000-0000-0000-0000-00000000000a', 1, '第一版');
update day_cards set text = '偷偷改一句' where day_id = 1;
-- 期望：ERROR  已经生成好的卡不能改

-- 11. 定型之后，这一天的卡全部只读
insert into day_cards (day_id, for_user, rev, text) values
  (1, '00000000-0000-0000-0000-00000000000b', 21, '定型');
insert into day_cards (day_id, for_user, rev, text) values
  (1, '00000000-0000-0000-0000-00000000000b', 7, '迟到的第七版');
-- 期望：ERROR  已经定型

-- 12. 留过的一天，purge_day 不删原文
insert into day_keeps (day_id, user_id) values (1, '00000000-0000-0000-0000-00000000000a');
select purge_day(1, '定型的那句话');
select count(*) as remaining from messages where day_id = 1;
-- 期望：remaining = 1（原文还在）

-- 13. 没人留的那天，purge_day 删原文、留卡片
delete from day_keeps where day_id = 1;
select purge_day(1, '定型的那句话');
select count(*) as remaining from messages where day_id = 1 and kind <> 'card';
-- 期望：remaining = 0（原文删了）

-- 清理
begin;
delete from day_marks where day_id = 1;
delete from day_moments where day_id = 1;
delete from door_closures where room_id = '00000000-0000-0000-0000-000000000001';
delete from messages where day_id = 1;
delete from day_cards where day_id = 1;
delete from day_keeps where day_id = 1;
delete from days where id = 1;
delete from users where room_id = '00000000-0000-0000-0000-000000000001';
delete from rooms where id = '00000000-0000-0000-0000-000000000001';
commit;
