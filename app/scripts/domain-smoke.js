/* 领域规则冒烟测试：只验证第 6 节的状态边界，不依赖 React Native。 */
const assert = require('assert');
const d = require('./domain.js');

const NOW = Date.UTC(2026, 10, 16, 12, 0, 0);
let n = 0;
function ok(name) {
  n += 1;
  console.log('  ✓ ' + name);
}

/* 6.1 消息 7 天删除 */
{
  let room = d.seed(NOW);
  const old = { id: 'old1', from: 'A', kind: 'text', text: '九天前的一句话', at: NOW - 9 * d.DAY };
  const old2 = { id: 'old2', from: 'B', kind: 'text', text: '同一天的另一句', at: NOW - 9 * d.DAY + 3600_000 };
  room = { ...room, messages: [...room.messages, old, old2], traces: [] };
  const before = room.messages.length;
  room = d.reduce(room, { type: 'tick', now: NOW });

  assert.strictEqual(room.messages.length, before - 2, '到期消息应被删除');
  assert.ok(!room.messages.some((m) => m.id === 'old1'), '消息对象不应残留');
  assert.ok(!JSON.stringify(room.messages).includes('九天前的一句话'), '内容不应残留');
  const trace = room.traces.find((t) => t.key === d.dayKey(NOW - 9 * d.DAY));
  assert.ok(trace && trace.count === 2, '应聚合成「日期 · 2 条」');
  ok('7 天前的消息从状态里删除，只留日期与条数');

  const again = d.reduce(room, { type: 'tick', now: NOW + 1000 });
  assert.strictEqual(again.traces.find((t) => t.key === trace.key).count, 2, '重复清理不能重复计数');
  ok('清理幂等：重复 tick 不重复计数');

  // 相册里的照片不受影响
  const keptPhotoId = room.album[0].photo.id;
  assert.ok(room.album.some((a) => a.photo.id === keptPhotoId), '相册照片不应随消息消失');
  ok('留过的照片不受 7 天删除影响');
}

/* 6.2 双人留照 */
{
  let room = d.seed(NOW);
  const msg = room.messages.find((m) => m.kind === 'photo');
  assert.ok(msg, '种子数据里要有照片消息');
  const albumBefore = room.album.length;

  room = d.reduce(room, { type: 'keep', msgId: msg.id, user: 'A', now: NOW });
  assert.strictEqual(room.album.length, albumBefore + 1, '留一张应进相册');
  assert.ok(d.isKept(room, msg), '双方都应看到已留');
  ok('任一方点「留」→ 照片进共同相册');

  const again = d.reduce(room, { type: 'keep', msgId: msg.id, user: 'B', now: NOW });
  assert.strictEqual(again.album.length, room.album.length, '重复留不应产生第二条');
  ok('同一条消息不会重复进相册');

  const item = room.album.find((a) => a.photo.id === msg.photo.id);
  room = d.reduce(room, { type: 'hide', itemId: item.id, user: 'A' });
  assert.ok(!d.visibleAlbum(room, 'A').some((a) => a.id === item.id), 'A 隐藏后自己看不到');
  assert.ok(d.visibleAlbum(room, 'B').some((a) => a.id === item.id), 'B 仍然看得到');
  assert.ok(d.isKept(room, msg), '隐藏不改变「已留」状态');
  ok('只能从我这边隐藏，对方与房间状态不受影响');
}

/* 6.3 恢复码 */
{
  const room = d.seed(NOW);
  assert.match(room.recoveryCode, /^[A-Z0-9]{4} [A-Z0-9]{4} [A-Z0-9]{4}$/, '恢复码格式 4-4-4');
  const after = d.reduce(room, { type: 'send', user: 'A', text: 'hi', now: NOW });
  assert.strictEqual(after.recoveryCode, room.recoveryCode, '恢复码生成后不变');
  ok('恢复码 12 位、生成后不随任何操作改变');
}

/* 6.4 停 */
{
  let room = d.seed(NOW);
  room = d.reduce(room, { type: 'stop', user: 'A', now: NOW });
  assert.ok(room.stop && room.stop.by === 'A');
  const other = d.reduce(room, { type: 'relight', user: 'B', now: NOW });
  assert.ok(other.stop, '对方不能点亮');
  ok('只有按停的人能点亮');

  const lit = d.reduce(room, { type: 'relight', user: 'A', now: NOW });
  assert.strictEqual(lit.stop, null);
  ok('按停的人可以点亮');

  const sent = d.reduce(room, { type: 'send', user: 'A', text: '还没睡', now: NOW });
  assert.strictEqual(sent.stop, null, '按停的人发一句应自动点亮');
  ok('按停的人自己发一句，房间自动亮');

  const typed = d.reduce(room, { type: 'stopLine', user: 'A', line: '先去洗澡' });
  assert.strictEqual(typed.stop.line, '先去洗澡', '停的文案可改');
  const blank = d.reduce(typed, { type: 'stopLine', user: 'A', line: '' });
  assert.strictEqual(blank.stop.line, '', '停的文案可留空');
  ok('停的文案可改、可留空');
}

/* 6.5 想聊 */
{
  let room = d.seed(NOW);
  room = d.reduce(room, { type: 'talkPress', user: 'A', now: NOW });
  assert.ok(room.talk && !room.talk.talking, '单人按只出小点，不出问题');
  assert.ok(room.talk.pressed.A && !room.talk.pressed.B);
  ok('单人按：只给按的人状态，不出现问题');

  room = d.reduce(room, { type: 'talkPress', user: 'B', now: NOW + 1000 });
  assert.ok(room.talk.talking, '两人都按才出问题');
  ok('两人都按：出现一次问题');

  room = d.reduce(room, { type: 'talkAnswer', user: 'A', text: '那句「随便」', now: NOW + 2000 });
  assert.ok(room.talk.answers.A && !room.talk.answers.B, '各答一句');
  ok('各答一句；只有自己答完时等对方');

  room = d.reduce(room, { type: 'talkAnswer', user: 'B', text: '我没解释', now: NOW + 3000 });
  assert.ok(room.talk.answers.B);
  const dismissed = d.reduce(room, { type: 'talkDismiss', now: NOW + 4000 });
  assert.strictEqual(dismissed.talk, null, '收起来后不留档');
  assert.strictEqual(dismissed.talkTrace, null);
  ok('收起来之后不留记录');

  const single = d.reduce(d.seed(NOW), { type: 'talkPress', user: 'A', now: NOW });
  const expired = d.reduce(single, { type: 'tick', now: NOW + d.DAY + 1000 });
  assert.strictEqual(expired.talk, null);
  assert.strictEqual(expired.talkTrace && expired.talkTrace.text, '24:00 · 未成');
  ok('单人按过夜：留「24:00 · 未成」');

  const both = d.reduce(
    d.reduce(d.seed(NOW), { type: 'talkPress', user: 'A', now: NOW }),
    { type: 'talkPress', user: 'B', now: NOW + 1000 }
  );
  const bothExpired = d.reduce(both, { type: 'tick', now: NOW + d.DAY + 2000 });
  assert.strictEqual(bothExpired.talkTrace && bothExpired.talkTrace.text, '24 小时 · 未成');
  ok('双人按未答完：留「24 小时 · 未成」');
}

/* 6.6 说给自己 */
{
  const room = d.seed(NOW);
  const before = room.messages.length;
  const after = d.reduce(room, { type: 'noteAdd', text: '只给自己', now: NOW });
  assert.strictEqual(after.messages.length, before, '自说自话不进消息流');
  assert.strictEqual(after.notes[0].text, '只给自己');
  assert.ok(!JSON.stringify(after.messages).includes('只给自己'));
  ok('说给自己：不进消息流、不进导出范围');

  const del = d.reduce(after, { type: 'noteDel', id: after.notes[0].id });
  assert.strictEqual(del.notes.length, after.notes.length - 1);
  ok('抽屉内容可删');
}

/* 6.7 邀请与两人上限 */
{
  let room = d.seed(NOW);
  assert.strictEqual(room.invite.seats, 1);
  room = d.reduce(room, { type: 'inviteJoin', user: 'B', now: NOW });
  assert.strictEqual(room.invite.seats, 2);
  assert.ok(room.members.B);
  const third = d.reduce(room, { type: 'inviteJoin', user: 'B', now: NOW });
  assert.strictEqual(third.invite.seats, 2, '第三个人进不来');
  ok('两人上限：第二个人进来后不再增加');
}

/* 撤回 */
{
  let room = d.seed(NOW);
  const msg = room.messages[room.messages.length - 1];
  const early = d.reduce(room, { type: 'recall', msgId: msg.id, user: msg.from, now: msg.at + 60_000 });
  assert.ok(!early.messages.some((m) => m.id === msg.id), '2 分钟内可撤回');
  const late = d.reduce(room, { type: 'recall', msgId: msg.id, user: msg.from, now: msg.at + 3 * 60_000 });
  assert.ok(late.messages.some((m) => m.id === msg.id), '超过 2 分钟不能撤回');
  const foreign = d.reduce(room, { type: 'recall', msgId: msg.id, user: msg.from === 'A' ? 'B' : 'A', now: msg.at + 1000 });
  assert.ok(foreign.messages.some((m) => m.id === msg.id), '不能撤回别人的消息');
  ok('撤回：2 分钟内、只能撤回自己的');
}

console.log(`\n${n} 条状态边界通过`);
