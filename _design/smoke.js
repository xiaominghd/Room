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

const PAGES = ['launch','login','register','invite','invite-h5','room','album','album-hidden','day-card','day-originals','me','profile','account-security','forgot-password','change-password','phone-change','account-delete','notifications','export','how-it-works','privacy','terms','feedback','room-code-setup','invite-share'];
const SHEETS = ['leave-room','keep-day','hide-day','delete-mark','rename','logout-confirm','notify-ask','actions'];

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

const ctx = {
  document,
  window: { addEventListener() {} },
  location: { reload() {} },
  setTimeout: () => 0,
  clearTimeout: () => {},
  console,
};

const src = fs.readFileSync('D:/Work/IM/demo/app.js', 'utf8');
vm.createContext(ctx);
try {
  vm.runInContext(src + '\nglobalThis.__api = { S, show, renderRoom, renderAlbum, renderDay, openSheet, closeSheet };', ctx);
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

check('25 个页面都在 screen 里', pageEls.length === 25);
check('8 个弹层都在 screen 里', sheetEls.length === 8);

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
check('今天还没到第 7 天，不出卡', day.innerHTML.includes('还没到第 7 天'));

// 走一遍「留这一天」的点击链路
api.S.door = 'open'; api.S.justOpened = false;
api.S.openDay = '2025-10-09'; api.renderDay();
check('10 月 9 日能留（第 7 天起）', day.innerHTML.includes('留这一天'));
tap('keep-day');
check('点「留这一天」打开确认弹层', onSheets().join() === 'keep-day');
tap('keep-confirm', {}, 'keep-day');
check('点「留」之后弹层关掉', onSheets().length === 0);
check('点「留」之后这一天被标成 kept', api.S.days['2025-10-09'].kept === true);
check('点「留」之后卡里出现「留过」', day.innerHTML.includes('留过'));
check('点「留」之后顶部出现留过状态条', day.innerHTML.includes('kept-bar'));
check('点「留」之后卡里出现「看那天的原文」', day.innerHTML.includes('看那天的原文'));
api.renderRoom();
check('点「留」之后房间那一行变成留过', feed.innerHTML.includes('10 月 9 日 · 留过'));

api.S.offset = 28; api.S.door = 'open'; api.S.justOpened = false; api.renderRoom();
check('第 28 天原文变成一行日期', feed.innerHTML.includes('已收进相册'));

// 隐藏 → 隐藏的一天 → 恢复
api.S.offset = 0;
api.S.openDay = '2025-10-09'; api.renderDay();
tap('hide-day');
check('点「隐藏这一天」打开弹层', onSheets().join() === 'hide-day');
tap('hide-confirm', {}, 'hide-day');
check('隐藏后这一天被标 hidden', api.S.days['2025-10-09'].hidden === true);
api.show('album-hidden');
const hidden = document.getElementById('hiddenList');
check('隐藏的一天里能看到它', hidden.innerHTML.includes('10 月 9 日'));
tap('restore', { day: '2025-10-09' });
check('点恢复后 hidden 被清掉', api.S.days['2025-10-09'].hidden === false);

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
document.getElementById('cardInput').textContent = '今晚早点睡';
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

// 留一天不可取消；特别记忆本人可删（只影响自己）
api.S.openDay = '2025-10-16';
api.renderDay();
check('留过的卡写明「不能取消」', day.innerHTML.includes('不能取消'));
check('留过没有「取消留」入口', !day.innerHTML.includes('取消留'));
check('我的特别记忆有「删」', day.innerHTML.includes('data-act="mark-del"'));
check('对方标的特别记忆标了「阿澄 标的」且没有删', day.innerHTML.includes('阿澄 标的'));

const themMsg = api.S.messages.find((m) => m.text === '今天加班到几点？我先吃了');
api.S.actionMsg = themMsg.id;
tap('mark');
check('长按能标特别记忆', themMsg.mark === true);
api.S.actionMsg = themMsg.id;
tap('mark');
check('长按再点一次能取消特别记忆', themMsg.mark === false);

tap('mark-del', { id: 'mk1' });
check('删掉自己标的之后卡里不再显示', !day.innerHTML.includes('周末去试试新开的店'));
check('删掉自己标的之后对方那条还在', day.innerHTML.includes('晚安，做个好梦'));

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

// 逐页跳转：25 个页面每个都能显示，且只显示它一个
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
check('25 个页面逐一显示且只有一个在屏', pageFails.length === 0);
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
const halfIn = document.getElementById('halfLine');
check('半关时那句被预填成「今晚到这儿」', halfIn.value === '今晚到这儿');
halfIn.value = '   ';
tap('close-door');
check('那句空着不让关', api.S.door === 'half');
halfIn.value = '别等我了，早点睡';
tap('close-door');
check('写了一句就能关', api.S.door === 'closed');
check('关门那句存下来的是我写的', api.S.doorLine === '别等我了，早点睡');

console.log(fails ? `\n${fails} 项失败` : '\n全部通过');
process.exit(fails ? 1 : 0);
