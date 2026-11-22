/* 用假 DOM 跑一遍 demo 的逻辑：页面切换、弹层、渲染、28 天记忆 */
const fs = require('fs');
const vm = require('vm');

class El {
  constructor(tag = 'div') {
    this.tag = tag;
    this.dataset = {};
    this.style = {};
    this._cls = new Set();
    this.textContent = '';
    this.innerHTML = '';
    this.value = '';
    this.children = [];
    this.hidden = false;
    this.parent = null;
  }
  get classList() {
    const s = this._cls;
    return {
      add: (...a) => a.forEach((x) => s.add(x)),
      remove: (...a) => a.forEach((x) => s.delete(x)),
      toggle: (x, f) => {
        if (f === undefined) return s.has(x) ? s.delete(x) : s.add(x);
        return f ? s.add(x) : s.delete(x);
      },
      contains: (x) => s.has(x),
    };
  }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  insertAdjacentHTML(pos, html) { this.innerHTML += html; }
  addEventListener() {}
  setPointerCapture() {}
  focus() {}
  closest(sel) {
    let p = this;
    while (p) {
      if (sel.startsWith('.') && p._cls && p._cls.has(sel.slice(1))) return p;
      const m = sel.match(/^\[data-([a-z-]+)\]$/);
      if (m && p.dataset) {
        const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        if (p.dataset[key] !== undefined) return p;
      }
      p = p.parent;
    }
    return null;
  }
  querySelector() { return new El(); }
  querySelectorAll() { return []; }
}

const PAGES = ['launch','login','register','invite','invite-h5','room','album','day-card','day-originals','me','profile','account-security','forgot-password','change-password','phone-change','account-delete','notifications','export','how-it-works','privacy','terms','feedback','room-info'];
const SHEETS = ['leave-room','keep-day','delete-mark','rename','logout-confirm','notify-ask','actions','image-viewer','unkeep-day'];

const screenEl = new El('div');
const pageEls = PAGES.map((p) => { const e = new El('section'); e._cls.add('page'); e.dataset.page = p; e.parent = screenEl; return e; });
const sheetEls = SHEETS.map((s) => { const e = new El('div'); e._cls.add('sheet'); e.dataset.overlay = s; e.parent = screenEl; return e; });

const els = { screen: screenEl };
els.screen.querySelectorAll = (sel) => {
  if (sel === '.page') return pageEls;
  if (sel === '.sheet') return sheetEls;
  return [];
};
els.screen.querySelector = (sel) => {
  const m = sel.match(/data-page="([a-z0-9-]+)"/);
  if (m) return pageEls.find((p) => p.dataset.page === m[1]) || new El();
  return new El();
};

const handlers = {};
const document = {
  getElementById(id) { return els[id] || (els[id] = new El()); },
  createElement(tag) { return new El(tag); },
  querySelector() { return new El(); },
  querySelectorAll() { return []; },
  addEventListener(type, fn) { handlers[type] = fn; },
};

function tap(act, extra = {}, inSheet = null) {
  // 模拟真实冒泡：按钮在弹层里，弹层自己带 data-overlay
  const sheet = new El('div');
  sheet._cls.add('sheet');
  if (inSheet) sheet.dataset.overlay = inSheet;
  const target = new El('button');
  target.dataset = Object.assign({ act }, extra);
  target.parent = sheet;
  handlers.click({ target, preventDefault() {} });
}

const timers = [];
const ctx = {
  document,
  window: { addEventListener() {} },
  location: { reload() {} },
  setTimeout: (fn, ms) => { timers.push(ms); return timers.length; },
  clearTimeout: () => {},
  console,
};

const src = fs.readFileSync('D:/Work/IM/demo/app.js', 'utf8');
vm.createContext(ctx);
try {
  vm.runInContext(src + '\nglobalThis.__api = { S, show, renderRoom, renderAlbum, renderDay, openSheet, closeSheet, isMarked, bubbleHtml, isKept, preset };', ctx);
} catch (e) {
  console.log('BOOT FAIL:', e.message);
  process.exit(1);
}
const api = ctx.__api;
const feed = document.getElementById('feed');
const onPages = () => pageEls.filter((p) => p._cls.has('on')).map((p) => p.dataset.page);
const onSheets = () => sheetEls.filter((s) => s._cls.has('on')).map((s) => s.dataset.overlay);

let fails = 0;
const check = (label, cond) => { if (cond) console.log('  ok  ', label); else { console.log('  FAIL', label); fails += 1; } };

check('23 个页面都在 screen 里', pageEls.length === 23);
check('9 个弹层都在 screen 里', sheetEls.length === 9);

api.show('room');
api.S.door = 'open'; api.S.justOpened = false; api.renderRoom();
check('只有 room 显示', onPages().join() === 'room');
check('房间显示今天的消息', feed.innerHTML.includes('晚上吃什么'));
check('房间显示「留过」那一行', feed.innerHTML.includes('留过'));

api.S.door = 'closed'; api.renderRoom();
check('关门后看不到任何消息', feed.innerHTML === '');

api.S.door = 'open'; api.S.justOpened = true; api.renderRoom();
check('刚开门、还没递卡时也没有消息（没有猫眼）', feed.innerHTML === '');

api.openSheet('keep-day');
check('点「留这一天」弹层能显示', onSheets().join() === 'keep-day');
api.closeSheet();
check('弹层能关掉', onSheets().length === 0);

api.show('album');
check('能切到相册', onPages().join() === 'album');

api.show('day-card'); api.S.openDay = '2025-10-16'; api.renderDay();
const day = document.getElementById('dayBody');
check('留过的卡有「AI 整理」', day.innerHTML.includes('AI 整理'));
check('留过的卡有「此刻」', day.innerHTML.includes('此刻'));
check('留过的卡有「看那天的原文」', day.innerHTML.includes('看那天的原文'));

api.S.openDay = '2025-10-17'; api.renderDay();
check('今天还没到第 1 天，不出卡', day.innerHTML.includes('第 1 天才有卡'));

// 走一遍「留这一天」的点击链路
api.S.door = 'open'; api.S.justOpened = false;
api.S.openDay = '2025-10-09'; api.renderDay();
check('10 月 9 日能留（第 7 天起）', day.innerHTML.includes('留这一天'));
tap('keep-day');
check('点「留这一天」打开确认弹层', onSheets().join() === 'keep-day');
tap('keep-confirm', {}, 'keep-day');
check('点「留」之后弹层关掉', onSheets().length === 0);
check('点「留」之后这一天被标成留过', api.S.days['2025-10-09'].keeps.me === true);
check('点「留」之后卡里出现「留过」', day.innerHTML.includes('留过'));
check('点「留」之后卡里出现「看那天的原文」', day.innerHTML.includes('看那天的原文'));
api.renderRoom();
check('点「留」之后房间那一行变成留过', feed.innerHTML.includes('10 月 9 日 · 留过'));

api.S.offset = 21; api.S.door = 'open'; api.S.justOpened = false; api.renderRoom();
check('第 21 天原文变成一行日期', feed.innerHTML.includes('已收进相册'));

// 新时间轴：第 1 天成卡、可留
api.S.offset = 1;
api.S.openDay = '2025-10-17';
api.renderDay();
check('第 1 天就有卡了', day.innerHTML.includes('AI 整理'));
check('第 1 天就能留', day.innerHTML.includes('留这一天'));
api.S.offset = 0;

// 隐藏功能已砍：卡上不再有「隐藏这一天」，也没有隐藏页
api.S.offset = 0;
api.S.openDay = '2025-10-09'; api.renderDay();
check('卡上没有「隐藏这一天」', !day.innerHTML.includes('hide-day'));
check('相册没有隐藏入口', !document.getElementById('screen').innerHTML.includes('album-hidden'));

// 月份翻页
api.S.monthIdx = 0; api.renderAlbum();
tap('next-month');
const grid = document.getElementById('grid');
check('翻到 9 月（没有内容）', api.S.monthIdx === 1 && grid.innerHTML.includes('这个月还没有'));
tap('prev-month');
check('能翻回 10 月', api.S.monthIdx === 0);

// 门口卡片当钥匙
api.S.door = 'closed'; api.S.doorCard = true; api.S.queue = [];
api.S.queue.push({ id: 'q1', from: 'them', kind: 'text', text: '门口那张卡你看到了吗', at: Date.now(), status: 'sent' });
api.renderRoom();
tap('use-card');
check('用门口的卡片能开门', api.S.door === 'open');
check('开门后排队的话出现', api.S.queue.length === 0 && api.S.messages.some((m) => m.id === 'q1'));

// 引用 → 撤回 → 引用块显示「原消息已撤回」
const a = { id: 'qa1', from: 'me', kind: 'text', text: '被引用的那句', at: Date.now(), status: 'sent' };
const b = { id: 'qb1', from: 'me', kind: 'text', text: '我引用它', at: Date.now(), status: 'sent', quoteId: 'qa1' };
api.S.messages.push(a, b);
api.renderRoom();
check('引用块显示原话', feed.innerHTML.includes('被引用的那句'));
tap('recall', { id: 'qa1' });
check('被引用的消息能撤回', !api.S.messages.some((m) => m.id === 'qa1'));
check('撤回后引用块改成「原消息已撤回」', feed.innerHTML.includes('原消息已撤回'));

// 关门 → 开门 → 递卡片
const roomPage = pageEls.find((p) => p.dataset.page === 'room');
api.S.door = 'closed'; api.S.justOpened = false; api.S.doorCard = false; api.S.queue = []; api.renderRoom();
check('关门态', roomPage.dataset.state === 'closed');
tap('open-door');
check('点「说一句，门就开」进「刚开门」', roomPage.dataset.state === 'opened');
check('刚开门时消息一条都不出现', feed.innerHTML === '');
api.S.theirDoor = 'closed';
const cardEl = document.getElementById('cardInput');
cardEl.textContent = '';
api.S.messages = api.S.messages.filter((m) => m.kind !== 'card');
tap('deliver');
check('卡片空着不让递', !api.S.messages.some((m) => m.kind === 'card'));
cardEl.textContent = '今晚早点睡';
tap('deliver');
check('递出后回到正常态', roomPage.dataset.state === 'open');
check('卡片进了消息流', feed.innerHTML.includes('今晚早点睡'));
check('对方关着门时卡片显示「放在对方门口」', feed.innerHTML.includes('放在对方门口'));
check('卡片是独立的一条消息', api.S.messages.some((m) => m.kind === 'card' && m.text === '今晚早点睡'));
api.S.theirDoor = 'open';

// 对方递卡到门口 → 用这张卡开门
api.S.door = 'open'; api.S.justOpened = false; api.renderRoom();
tap('partner-card');
check('对方递卡后门是关的、门口有卡', api.S.door === 'closed' && api.S.doorCard === true);
tap('use-card');
check('用对方的卡开门后卡片出现在消息流', feed.innerHTML.includes('递来的卡片'));

// 引用 → 点 × 取消引用
api.S.door = 'open'; api.S.justOpened = false; api.renderRoom();
api.S.quote = api.S.messages[0].id;
api.renderRoom();
check('引用态有 quote', api.S.quote === api.S.messages[0].id);
tap('unquote');
check('点 × 能取消引用', api.S.quote === null);

// 留一天不可取消；特别记忆：谁标谁删，删了两个人都看不见，聊天和卡上都能删
api.S.openDay = '2025-10-16';
api.renderDay();
check('21 天内有「取消留这一天」', day.innerHTML.includes('取消留这一天'));
check('卡上有删除入口', day.innerHTML.includes('data-act="mark-del"'));
check('对方标的，我看不到', !day.innerHTML.includes('晚安，做个好梦'));
check('也不再写「阿澄 标的」', !day.innerHTML.includes('阿澄 标的'));

const themMsg = api.S.messages.find((m) => m.text === '今天加班到几点？我先吃了');
api.S.actionMsg = themMsg.id;
tap('mark');
check('长按能标特别记忆', api.isMarked(themMsg) === true);
api.S.actionMsg = themMsg.id;
tap('mark');
check('再点一次就取消', api.isMarked(themMsg) === false);

api.S.openDay = '2025-10-16';
api.renderDay();
tap('mark-del', { id: 'mk1' });
check('卡上能删自己标的', api.S.days['2025-10-16'].marks.find((k) => k.id === 'mk1').deleted === true);
check('删掉之后卡里不再显示', !day.innerHTML.includes('周末去试试新开的店'));
check('对方标的仍不在我的小框里', !day.innerHTML.includes('晚安，做个好梦'));
api.S.days['2025-10-16'].marks.find((k) => k.id === 'mk1').deleted = false;
api.renderDay();

// 本轮补的死按钮与缺口
api.S.openDay = '2025-10-16'; api.renderDay();
api.renderRoom();

// 发图片
api.S.door = 'open'; api.S.justOpened = false;
api.renderRoom();
const imgCount = api.S.messages.filter((m) => m.kind === 'image').length;
tap('image');
check('点图片按钮真的发了一张图', api.S.messages.filter((m) => m.kind === 'image').length === imgCount + 1);
check('图片气泡出现在消息流', feed.innerHTML.includes('img-msg'));

// 录音
tap('record');
check('点麦克风进入录音态', api.S.demo.recording === true);
check('录音态有提示', feed.innerHTML.includes('松手发送'));
tap('record');
check('再点一次退出录音态', api.S.demo.recording === false);

// 导出范围 / 格式
api.show('export');
tap('range', { v: '7' });
check('范围能选近 7 天', api.S.exportPrefs.range === '7');
tap('format', { v: 'text' });
check('格式能选纯文本', api.S.exportPrefs.format === 'text');

// 此刻：本人能改能删
api.show('day-card'); api.S.openDay = '2025-10-16'; api.renderDay();
check('自己的此刻有「改」「删」', day.innerHTML.includes('moment-del') && day.innerHTML.includes('moment-add'));
const myMomentBefore = api.S.days['2025-10-16'].moments.me;
tap('moment-del');
check('删掉此刻', api.S.days['2025-10-16'].moments.me === '');
check('删后不显示那句', !day.innerHTML.includes(myMomentBefore));
check('删后出现「写一句」入口', day.innerHTML.includes('写一句'));

// H5 与邀请链接
api.show('invite-h5');
tap('open-app');
check('H5「已装，打开」跳到开房码页', api.S.route === 'invite');
tap('reopen-link');
check('重新打开链接不会崩', true);

// 逐页跳转：23 个页面每个都能显示，且只显示它一个
let pageFails = [];
for (const p of PAGES) {
  try {
    api.show(p);
    const on = onPages();
    if (on.length !== 1 || on[0] !== p) pageFails.push(`${p} -> ${on.join(',')}`);
  } catch (e) {
    pageFails.push(`${p} 抛错 ${e.message}`);
  }
}
check('23 个页面逐一显示且只有一个在屏', pageFails.length === 0);
if (pageFails.length) console.log('     ', pageFails);

// 每个二级页返回都不崩，且落回上一页
const stackFails = [];
for (const p of PAGES) {
  if (['launch', 'login', 'invite-h5'].includes(p)) continue;
  try {
    api.show(p);
    api.S.stack = ['room', p];
    handlers.click({ target: { dataset: {}, closest: (sel) => (sel === '[data-back]' ? {} : null) }, preventDefault() {} });
    const on = onPages();
    if (on.length !== 1) stackFails.push(`${p} -> ${on.join(',')}`);
  } catch (e) {
    stackFails.push(`${p} 抛错 ${e.message}`);
  }
}
check('每个页面的返回都落回一个页面', stackFails.length === 0);
if (stackFails.length) console.log('     ', stackFails);

// 半关的关门那句：可改、不能空
api.show('room');
api.S.door = 'open'; api.S.justOpened = false; api.renderRoom();
tap('half');
check('半关', api.S.door === 'half');
check('半关不再有 5 秒自动弹回', !timers.includes(5000));
const halfIn = document.getElementById('halfLine');
check('半关时输入框是空的（只有占位提示）', halfIn.value === '');
halfIn.value = '   ';
tap('close-door');
check('那句空着不让关', api.S.door === 'half');
halfIn.value = '别等我了，早点睡';
tap('close-door');
check('写了一句就能关', api.S.door === 'closed');
check('关门那句存下来的是我写的', api.S.doorLine === '别等我了，早点睡');
tap('half');
tap('cancel-half');
check('点「算了」回到开着', api.S.door === 'open');

// 看图：从聊天进 → 留；从相册进 → 从我这边隐藏
const imgMsg = api.S.messages.find((m) => m.kind === 'image');
api.S.viewer = null;
tap('view-image', { id: imgMsg.id });
check('点图片消息打开看图', onSheets().join() === 'image-viewer');
check('看图是聊天模式', api.S.viewer && api.S.viewer.mode === 'chat');
tap('viewer-act');
check('在装里点「留」= 特别记忆', api.isMarked(imgMsg) === true);

api.show('day-card');
api.S.openDay = '2025-10-16';
tap('view-photo');
check('一天的卡点照片也是看图', api.S.viewer && api.S.viewer.mode === 'album');
check('相册里看图不再有动作（隐藏已砍）', api.S.viewer.mode === 'album');
check('相册里看图没有动作按钮', document.getElementById('viewerAct').style.display === 'none');

// 房间信息：改名 + 换码
api.show('room-info');
check('房间信息页能打开', !document.querySelector('.page[data-page="room-info"]').hidden);
check('房间名预填当前名字', document.getElementById('roomName').value === '我们的房间');
document.getElementById('roomName').value = '周末的岛';
tap('save-name');
check('改名生效', api.S.room.name === '周末的岛');
check('房间标题跟着改', document.getElementById('roomTitle').textContent === '周末的岛');
const oldCode = api.S.room.code;
tap('new-code');
check('换码是 6 位且和旧码不同', api.S.room.code.length === 6 && api.S.room.code !== oldCode);
check('房间码里没有易混字符', !/[01IOL]/.test(api.S.room.code));

// 特别记忆的小点：谁标的都显示；我删掉只在我这边消失
const m16 = api.S.messages.find((m) => m.text === '晚安，做个好梦');
check('对方标的那句我看不到', api.isMarked(m16) === false);
const myMarked = api.S.messages.find((m) => m.text === '周末去试试新开的店吧');
check('我自己标的有小点', api.bubbleHtml(myMarked).includes('markdot'));
const mPlain = api.S.messages.find((m) => m.text === '刚到家，别等我');
check('没标的没有小点', api.bubbleHtml(mPlain).includes('markdot') === false);
check('同一条两人都标：各自看到自己的', api.isMarked(myMarked) === true);

// 21 天后：原文没了，卡上的小框还能删（只是把这句快照删掉，没有 AI 参与）
api.S.offset = 22;
api.S.openDay = '2025-10-16';
api.renderDay();
const markBefore = (api.S.days['2025-10-16'].marks || []).filter((k) => !k.deleted).length;
tap('mark-del', { id: 'mk1' });
check('21 天后卡上仍能删标记', (api.S.days['2025-10-16'].marks || []).filter((k) => !k.deleted).length === markBefore - 1);
api.S.offset = 0;
api.renderDay();

// 留：21 天内可以取消，21 天后锁定
api.S.offset = 0;
api.S.openDay = '2025-10-16';
api.S.days['2025-10-16'].keeps = { me: true };
api.renderDay();
check('留过的日子有「取消留」', day.innerHTML.includes('data-act="unkeep"'));
tap('unkeep');
check('取消留先弹确认', onSheets().includes('unkeep-day'));
tap('unkeep-confirm');
check('确认后我这边的留取消了', api.S.days['2025-10-16'].keeps.me === false);
check('取消后可以再留', day.innerHTML.includes('data-act="keep-day"'));

api.S.days['2025-10-16'].keeps = { me: true };
api.S.offset = 22;
api.renderDay();
check('21 天后没有「取消留」', !day.innerHTML.includes('data-act="unkeep"'));
api.S.offset = 0;
api.S.days['2025-10-16'].keeps = { me: true };
api.renderDay();

// 留是「谁留都算留」：我取消、对方还留着，卡片仍然留
const day16 = api.S.days['2025-10-16'];
day16.keeps = { me: true, them: true };
api.S.offset = 0; api.S.openDay = '2025-10-16'; api.renderDay();
tap('unkeep'); tap('unkeep-confirm');
check('我取消、对方还留着 → 仍然算留过', api.isKept(day16) === true);
check('仍然能看那天的原文', day.innerHTML.includes('data-goto="day-originals"'));
day16.keeps = { me: false, them: true };
api.renderDay();
check('对方留过、我还没留 → 我还能留', day.innerHTML.includes('data-act="keep-day"'));
day16.keeps = { me: false, them: false };
api.renderDay();
check('两边都不留 → 回到不留', !api.isKept(day16));
check('不留之后没有「看那天的原文」', !day.innerHTML.includes('data-goto="day-originals"'));
day16.keeps = { me: true };

// 日记：一人一份，各看各的
api.S.offset = 0;
api.S.openDay = '2025-10-16';
api.renderDay();
check('看到的是我这一篇', day.innerHTML.includes('白天各忙各的'));
check('看不到对方那篇', !day.innerHTML.includes('他到家很晚'));

// 注册不填用户名：给一个默认名，能改
api.show('register');
const regPage = pageEls.find((p) => p.dataset.page === 'register');
check('注册页没有用户名输入框', !regPage.innerHTML.includes('用户名'));
document.getElementById('regPhone').value = '13800138000';
document.getElementById('regPass').value = '12345678';
document.getElementById('regPass2').value = '12345678';
tap('register');
check('注册后进房', api.S.route === 'room');
check('系统给了一个默认名字', !!api.S.user.name && api.S.user.name.length >= 2);
check('默认名字不是对方的「阿澄」', api.S.user.name !== api.S.partner);

// 空房（只有我）：只给一个邀请入口，没有别的字
api.show('room');
api.S.alone = true; api.S.demo.empty = 'solo';
api.renderRoom();
const feedSolo = document.getElementById('feed').innerHTML;
check('空房只有一个邀请入口', feedSolo.includes('invite-only'));
check('空房不再有「不用做什么」', !feedSolo.includes('不用做什么'));
check('空房不再有「这儿还只有你」', !feedSolo.includes('这儿还只有你'));
api.S.alone = false; api.S.demo.empty = null; api.renderRoom();

// 两个人在、还没说话：一片空白，不放任何字
api.S.alone = false; api.S.demo.empty = 'both';
api.renderRoom();
const feedQuiet = document.getElementById('feed').innerHTML.trim();
check('两个人在没说话时是空白', feedQuiet === '');
api.S.demo.empty = null; api.renderRoom();

// 图片发送失败：图还在，带一个「!」和「发送失败 · 重发」
api.preset({ imageFail: true });
api.show('room');
const feedImgFail = document.getElementById('feed').innerHTML;
check('失败的图片有图位', feedImgFail.includes('img-msg failed'));
check('失败的图片有「!」', feedImgFail.includes('img-fail'));
check('失败的图片有重发', feedImgFail.includes('发送失败'));
api.preset({});

console.log(fails ? `\n${fails} 项失败` : '\n全部通过');
process.exit(fails ? 1 : 0);
