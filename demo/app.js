/* 房间 · 网页 demo
   按 PRD 把交互串起来：导航栈、门、消息、21 天记忆、相册、此刻、留一天、设置。
   所有状态都在内存里，刷新即重置。 */

const DAY = 86400000;
const T0 = new Date(2025, 9, 17, 21, 15).getTime(); // demo 的“现在”

/* ---------------- 状态 ---------------- */

const S = {
  offset: 0,
  signedIn: false,
  alone: false,
  user: { name: '小满', phone: '138 0013 8000', joined: '2025 年 9 月 12 日' },
  partner: '阿澄',
  room: { name: '我们的房间', code: '7K2M9X' },   // 房间名 + 房间码（一个码管进房和邀请）
  door: 'open',          // open | half | closed
  doorLine: '今晚到这儿',  // 关门那句（可改，不能空）
  theirDoor: 'open',     // open | closed
  doorCard: false,       // 门口有没有对方留的卡
  justOpened: false,     // 刚开门、卡片还没递出去
  queue: [],             // 我关着门时对方说的话
  card: null,            // 我递出去的卡片
  messages: [],
  seq: 0,
  days: {
    '2025-10-02': { photos: 0, cards: { me: '那天没留下照片。', them: '那天没说什么。' }, moments: {}, marks: [], keeps: {} },
    '2025-10-09': { photos: 2, cards: { me: '那天傍晚下了雨。', them: '下班时下了雨，伞忘在工位。' }, moments: {}, marks: [], keeps: {} },
    '2025-10-16': {
      photos: 6,
      cards: {
        me: '白天各忙各的，晚上聊到想吃什么。\n阿澄提议周末去试新开的店，你下班路上拍了很好看的云。',
        them: '他到家很晚，我先把饭吃了。\n周末想一起去新开的店，他说路上看到了很好看的云。',
      },
      moments: { them: '今天云很好看', me: '下班路上顺手拍的' },
      marks: [
        { id: 'mk1', text: '周末去试试新开的店', by: 'me', msgId: null, deleted: false },
        { id: 'mk2', text: '晚安，做个好梦', by: 'them', msgId: null, deleted: false },
      ],
      keeps: { me: true },
    },
    '2025-10-17': { photos: 6, cards: {}, moments: {}, marks: [], keeps: {} },
  },
  openDay: null,
  viewer: null,            // { mode: 'chat' | 'album', msgId?, day? }
  quote: null,
  actionMsg: null,
  notify: { msg: true, lock: false, tonight: false },
  exportPrefs: { range: 'all', format: 'pdf' },
  demo: {},
  stack: [],
  route: 'launch',
};

const now = () => T0 + S.offset * DAY;
const pad = (n) => String(n).padStart(2, '0');
const hhmm = (ts) => `${pad(new Date(ts).getHours())}:${pad(new Date(ts).getMinutes())}`;
const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dayLabel = (key) => {
  const [, m, d] = key.split('-');
  return `${Number(m)} 月 ${Number(d)} 日`;
};
const daysAgo = (key) => Math.round((new Date(dayKey(now())).getTime() - new Date(key).getTime()) / DAY);

/* ---------------- 种子 ---------------- */

let mid = 0;
function mk(from, kind, text, at, extra = {}) {
  mid += 1;
  return Object.assign({ id: `m${mid}`, from, kind, text, at, status: 'sent' }, extra);
}

S.messages = [
  // 10 月 16 日：留过的一天，原文只在「看那天的原文」里
  mk('them', 'text', '今天加班到几点？我先吃了', new Date(2025, 9, 16, 21, 6).getTime()),
  mk('me', 'text', '刚到家，别等我', new Date(2025, 9, 16, 21, 12).getTime()),
  mk('them', 'image', '', new Date(2025, 9, 16, 21, 20).getTime(), { place: '楼下' }),
  mk('them', 'text', '周末去试试新开的店吧', new Date(2025, 9, 16, 22, 2).getTime()),
  mk('me', 'text', '晚安，做个好梦', new Date(2025, 9, 16, 22, 9).getTime()),
  // 今天
  mk('them', 'text', '晚上吃什么？我回来路上可以带点菜', T0 - 13 * 60000),
  mk('them', 'text', '都行，冰箱里有昨天的排骨，顺路带把小青菜就行', T0 - 12 * 60000),
  mk('them', 'voice', '', T0 - 10 * 60000, { dur: '0:12' }),
  mk('them', 'image', '', T0 - 9 * 60000, { place: '下班路上' }),
  mk('me', 'text', '今晚想早点休息，明天要赶早班机\n你也别熬太晚', T0 - 7 * 60000),
  mk('me', 'text', '周末去试试新开的店吧', T0 - 6 * 60000, { quoteId: 'm1' }),
];

/* 把种子里的小框挂到具体消息上：聊天里那个点、原文页那个点，都靠 msgId */
(function linkSeedMarks() {
  const day = S.days['2025-10-16'];
  const byMark = { mk1: '周末去试试新开的店吧', mk2: '晚安，做个好梦' };
  (day.marks || []).forEach((k) => {
    const text = byMark[k.id];
    const m = S.messages.find((x) => x.text === text && dayKey(x.at) === '2025-10-16');
    if (m) k.msgId = m.id;
  });
})();

/* ---------------- DOM ---------------- */

const screenEl = document.getElementById('screen');
const pages = [...screenEl.querySelectorAll('.page')];
const feedEl = document.getElementById('feed');
const scrim = document.getElementById('scrim');
const sheets = [...screenEl.querySelectorAll('.sheet')];
const navEl = document.getElementById('nav');
const roomEl = screenEl.querySelector('.page[data-page="room"]');
const inputEl = document.getElementById('roomInput');
const dimEl = document.getElementById('dim');
const toastEl = document.getElementById('toast');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('on'), 1600);
}

/* ---------------- 导航 ---------------- */

const PARENT = {
  'forgot-password': 'login',
  register: 'login',
  'invite-h5': 'invite',
  album: 'room',
  'day-card': 'album',
  'day-originals': 'day-card',
  me: 'room',
  profile: 'me',
  'account-security': 'me',
  'change-password': 'account-security',
  'phone-change': 'account-security',
  'account-delete': 'account-security',
  notifications: 'me',
  export: 'me',
  'how-it-works': 'me',
  privacy: 'me',
  terms: 'me',
  feedback: 'me',
  'room-info': 'me',
  invite: 'login',
  login: 'launch',
};

function show(route) {
  S.route = route;
  pages.forEach((p) => p.classList.toggle('on', p.dataset.page === route));
  closeSheet();
  const pad = document.querySelector('.page.on .pad');
  if (pad) pad.scrollTop = 0;
  if (route === 'room') renderRoom();
  if (route === 'album') renderAlbum();
  if (route === 'day-card') renderDay();
  if (route === 'day-originals') renderOriginals();
  if (route === 'me' || route === 'profile' || route === 'room-info' || route === 'invite') renderMe();
  if (route === 'notifications' || route === 'export' || route === 'account-security') renderSettings();
  syncNav();
}

function go(route, opts = {}) {
  if (opts.replace) S.stack = S.stack.slice(0, -1);
  S.stack.push(route);
  show(route);
}

function back() {
  S.stack.pop();
  const prev = S.stack[S.stack.length - 1] || PARENT[S.route] || 'room';
  show(prev);
}

function syncNav() {
  [...navEl.querySelectorAll('button')].forEach((b) => b.classList.toggle('on', b.dataset.route === S.route));
}

/* ---------------- 房间 ---------------- */

function dayOfMessages(key) {
  return S.messages.filter((m) => dayKey(m.at) === key).sort((a, b) => a.at - b.at);
}

/** 按 PRD §2.6 / §4.1：留过的一天只留一行；21 天后原文收进相册；其余照常显示 */
function roomItems() {
  const keys = new Set(Object.keys(S.days));
  S.messages.forEach((m) => keys.add(dayKey(m.at)));
  const items = [];
  [...keys].sort().forEach((key) => {
    const day = S.days[key] || {};
    const age = daysAgo(key);
    if (isKept(day)) {
      items.push({ t: 'line', text: `${dayLabel(key)} · 留过`, key });
      return;
    }
    if (age >= 21) {
      if (day.photos || (day.cards && day.cards.me)) items.push({ t: 'line', text: `${dayLabel(key)} · 已收进相册`, key });
      return;
    }
    const msgs = dayOfMessages(key);
    if (!msgs.length) return;
    items.push({ t: 'sep', text: sepLabel(key) });
    msgs.forEach((m) => items.push({ t: 'msg', m }));
  });
  return items;
}

function sepLabel(key) {
  const a = daysAgo(key);
  if (a === 0) return '今天';
  if (a === 1) return '昨天';
  return dayLabel(key);
}

function quoteHtml(id) {
  const target = S.messages.find((m) => m.id === id);
  if (!target) return '原消息已撤回';
  const key = dayKey(target.at);
  const day = S.days[key] || {};
  if (isKept(day)) return `${dayLabel(key)} · 留过`;
  if (daysAgo(key) >= 21) return `${dayLabel(key)} · 已收进相册`;
  if (target.kind === 'image') return '（图片）';
  if (target.kind === 'voice') return '（语音）';
  return target.text || '';
}

/* 留：谁留都算留；两个人都没留才回到不留 */
function isKept(day) {
  return !!(day && day.keeps && (day.keeps.me || day.keeps.them));
}
function iKept(day) {
  return !!(day && day.keeps && day.keeps.me);
}

/* 这条消息上的标记（谁标的都算；删掉了就没有） */
function markOf(m) {
  const day = S.days[dayKey(m.at)];
  // 只看得到自己标的
  return day ? (day.marks || []).find((k) => k && k.by === 'me' && k.msgId === m.id && !k.deleted) || null : null;
}

/* 这条消息有没有小点：标记被删了，两个人都看不见了 */
function isMarked(m) {
  return !!markOf(m);
}

function bubbleHtml(m) {
  if (m.kind === 'card') {
    const atDoor = m.from === 'me' && S.theirDoor === 'closed';
    return `<div class="m card" data-msg="${m.id}"><div class="card-msg">${esc(m.text)}<div class="who">${esc(
      atDoor ? '我递出的卡片 · 放在对方门口' : m.from === 'me' ? '我递出的卡片' : `${S.partner} 递来的卡片`
    )}</div></div></div>`;
  }

  const quote = m.quoteId ? `<div class="quote-inset">${esc(quoteHtml(m.quoteId))}</div>` : '';
  const inner =
    m.kind === 'voice'
      ? `<div class="bubble voice"><svg class="ic"><use href="#i-play"/></svg><span>${esc(m.dur || '0:12')}</span></div>`
      : m.kind === 'image'
      ? `<div class="img-msg ${m.status === 'failed' ? 'failed' : ''}" data-act="view-image" data-id="${m.id}"><i class="ph"></i>${m.status === 'failed' ? '<span class="img-fail">!</span>' : ''}${m.place ? `<div class="img-place">${esc(m.place)}</div>` : ''}</div>`
      : `<div class="bubble">${quote}${esc(m.text)}${m.status === 'sending' ? '<span class="dot-pending"></span>' : ''}</div>`;

  const fail = m.status === 'failed' ? `<div class="fail">发送失败 · <button class="link" data-act="retry" data-id="${m.id}">重发</button></div>` : '';
  const canRecall = m.from === 'me' && m.status === 'sent' && now() - m.at < 120000;
  const recall = canRecall ? ` · <button class="link" data-act="recall" data-id="${m.id}">撤回</button>` : '';
  const meta =
    m.status === 'sent'
      ? `<div class="meta">${hhmm(m.at)}${recall}</div>`
      : m.status === 'sending'
      ? '<div class="meta">发送中</div>'
      : '';
  const mark = isMarked(m) ? '<span class="markdot"></span>' : '';
  return `<div class="m ${m.from === 'me' ? 'right' : 'left'}" data-msg="${m.id}">${inner}${mark}${meta}${fail}</div>`;
}

function renderRoom() {
  const alone = S.alone && !S.messages.length;
  const quiet = S.demo.quiet;
  const items = roomItems();
  const empty = S.demo.empty || (alone ? 'solo' : quiet ? 'both' : null);

  let state = 'open';
  if (S.door === 'half') state = 'half';
  else if (S.door === 'closed') state = S.doorCard ? 'door-card' : 'closed';
  else if (S.justOpened) state = 'opened';

  roomEl.dataset.state = state;
  roomEl.classList.toggle('theirs-closed', S.theirDoor === 'closed');
  roomEl.classList.toggle('has-card', !!S.card && S.theirDoor === 'closed');

  // 消息流
  if (S.door === 'closed') {
    feedEl.innerHTML = '';
  } else if (S.justOpened) {
    // PRD §3.2：卡片递出去之前，排队的话一条都不出现
    feedEl.innerHTML = '';
  } else if (empty) {
    feedEl.innerHTML = emptyHtml(empty);
  } else if (!items.length) {
    feedEl.innerHTML = emptyHtml('both');
  } else {
    feedEl.innerHTML = items
      .map((it) => {
        if (it.t === 'sep') return `<div class="sep">${esc(it.text)}</div>`;
        if (it.t === 'line') return `<div class="line-item">${esc(it.text)}</div>`;
        return bubbleHtml(it.m);
      })
      .join('');
  }

  // 演示态
  if (S.demo.recording) feedEl.insertAdjacentHTML('beforeend', '<div class="line-item">松手发送 · 上滑取消 · 0:03</div>');
  if (S.demo.forceFail && !S.messages.some((m) => m.status === 'failed')) {
    // 只在按“下一条发失败”后生效，不做额外渲染
  }

  // 引用条
  const quote = S.quote ? S.messages.find((m) => m.id === S.quote) : null;
  const qbar = roomEl.querySelector('.quote-bar');
  if (qbar) {
    qbar.style.display = quote ? 'flex' : '';
    if (quote) qbar.querySelector('.quote-tx').textContent = quote.text || '（图片）';
  }

  // AI 提示只在刚开门时
  const ai = roomEl.querySelector('.ai-chip');
  if (ai) ai.style.display = state === 'opened' ? 'flex' : '';

  // 新消息提示
  const nm = roomEl.querySelector('.newmsg');
  if (nm) nm.style.display = S.demo.newmsg ? 'block' : '';

  // 关门层里的卡片提示
  const dcl = roomEl.querySelector('.door-card-line');
  if (dcl) dcl.style.display = S.doorCard ? '' : 'none';

  // 关门那句（用户自己写的）
  const cq = roomEl.querySelector('.closed-quote');
  if (cq) cq.textContent = S.doorLine || '今晚到这儿';

  feedEl.scrollTop = feedEl.scrollHeight;
  updateDev();
}

function emptyHtml(kind) {
  // 只有我一个人：放一个邀请入口（大一点）
  if (kind === 'solo')
    return `<div class="empty">
      <button class="invite-only" data-goto="room-info">邀请一个人进来</button>
    </div>`;
  // 两个人都在、还没说话：什么都不放，就是一张空白
  return '';
}

function pushMessage(msg) {
  S.messages.push(msg);
  renderRoom();
}

function send() {
  if (S.door === 'closed') return;
  const text = (inputEl.value || '').trim();
  if (!text) return;
  S.demo.empty = null;
  const m = mk('me', 'text', text, now(), { status: 'sending', quoteId: S.quote || null });
  m.at = now();
  S.quote = null;
  inputEl.value = '';
  pushMessage(m);
  const fail = S.demo.forceFail;
  S.demo.forceFail = false;
  setTimeout(() => {
    m.status = fail ? 'failed' : 'sent';
    renderRoom();
  }, 700);
}

/* ---------------- 相册 ---------------- */

const MONTHS = [{ y: 2025, m: 10, label: '2025 年 10 月' }, { y: 2025, m: 9, label: '2025 年 9 月' }];

function renderAlbum() {
  const grid = document.getElementById('grid');
  const monthEl = screenEl.querySelector('.page[data-page="album"] .month');
  if (!grid) return;
  const cur = MONTHS[S.monthIdx] || MONTHS[0];
  S.monthIdx = Math.max(0, Math.min(MONTHS.length - 1, S.monthIdx || 0));
  if (monthEl) monthEl.textContent = cur.label;

  const prefix = `${cur.y}-${pad(cur.m)}`;
  const hasAny = Object.keys(S.days).some((k) => k.startsWith(prefix) && (S.days[k].photos || (S.days[k].cards && S.days[k].cards.me)));
  if (!hasAny) {
    grid.innerHTML = '<div class="album-empty">这个月还没有</div>';
    return;
  }

  const first = new Date(cur.y, cur.m - 1, 1).getDay();
  const offset = (first + 6) % 7;
  const total = new Date(cur.y, cur.m, 0).getDate();
  let html = '';
  for (let i = 0; i < offset; i += 1) html += '<div class="cell empty"></div>';

  for (let d = 1; d <= total; d += 1) {
    const key = `${cur.y}-${pad(cur.m)}-${pad(d)}`;
    const day = S.days[key];
    if (!day) {
      html += `<div class="cell empty"><span class="d">${d}</span></div>`;
      continue;
    }
    const hasCard = isKept(day) || daysAgo(key) >= 1;
    if (isKept(day)) html += `<div class="cell has kept" data-day="${key}"><i class="thumb ph p${(d % 6) + 1}"></i><span class="d">${d}</span></div>`;
    else if (hasCard && day.photos > 0)
      html += `<div class="cell has soft" data-day="${key}"><i class="thumb ph p${(d % 6) + 1}"></i><span class="d">${d}</span></div>`;
    else if (hasCard && !day.photos) html += `<div class="cell dot" data-day="${key}"><span class="d">${d}</span></div>`;
    else html += `<div class="cell empty"><span class="d">${d}</span></div>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll('[data-day]').forEach((cell) => {
    cell.onclick = () => openDay(cell.dataset.day);
  });
}

function renderViewer() {
  const v = S.viewer || {};
  const img = document.getElementById('viewerImg');
  const cap = document.getElementById('viewerCap');
  const act = document.getElementById('viewerAct');
  if (!img || !cap || !act) return;

  if (v.mode === 'chat') {
    const m = S.messages.find((x) => x.id === v.msgId);
    img.className = 'viewer-img';
    cap.textContent = m ? hhmm(m.at) + (m.place ? ' · ' + m.place : '') : '';
    const mk = m ? markOf(m) : null;
    act.textContent = mk ? '已留' : '留';
    act.disabled = !!mk;
  } else {
    const key = v.day || S.openDay;
    const day = S.days[key] || {};
    img.className = 'viewer-img';
    cap.textContent = dayLabel(key) + (day.photos ? ' · ' + day.photos + ' 张照片' : '');
    act.style.display = 'none';   // 相册里看图没有动作（隐藏功能已砍）
  }
}

function openDay(key) {
  S.openDay = key;
  go('day-card');
}

/* ---------------- 一天的卡 ---------------- */

function dayInfo(key) {
  const day = S.days[key] || { photos: 0, cards: {}, moments: {}, marks: [], keeps: {} };
  const age = daysAgo(key);
  const hasCard = isKept(day) || age >= 1;
  return { day, age, hasCard };
}

function renderDay() {
  const key = S.openDay || '2025-10-17';
  const { day, age, hasCard } = dayInfo(key);
  const body = document.getElementById('dayBody');
  const title = screenEl.querySelector('.page[data-page="day-card"] .page-title');
  if (title) title.textContent = dayLabel(key);
  if (!body) return;

  const photos = [];
  for (let i = 1; i <= Math.min(day.photos || 0, 9); i += 1) photos.push(`<i class="ph p${(i % 6) + 1}" data-act="view-photo"></i>`);
  const moments = [];
  if (day.moments && day.moments.them) moments.push(`<div class="m-row"><b>${esc(S.partner)}：</b>${esc(day.moments.them)}</div>`);
  if (day.moments && day.moments.me) moments.push(`<div class="m-row mine"><b>${esc(S.user.name)}：</b>${esc(day.moments.me)}<span class="m-tools"><button class="link" data-act="moment-add">改</button><button class="link" data-act="moment-del">删</button></span></div>`);
  const markList = (day.marks || []).filter((k) => k && k.by === 'me' && !k.deleted);
  const marks = markList
    .map(
      (k) =>
        // 小框里只有我自己标的；卡上也能删（21 天内删影响下次压缩，21 天后删只删快照）
        `<div class="mark"><span>${esc(k.text)}</span><button class="link mark-x" data-act="mark-del" data-id="${esc(k.id)}">删</button></div>`
    )
    .join('');

  const acts = [];
  const kept = isKept(day);
  const mine = iKept(day);
  if (kept) acts.push('<span class="kept">留过</span>');
  if (age < 1) {
    if (!kept) acts.push('<span class="muted small">第 1 天起才能留</span>');
  } else if (age >= 21) {
    if (!kept) acts.push('<span class="muted small">已经定型，不能留了</span>');
  } else if (mine) {
    acts.push('<button class="link" data-act="unkeep">取消留这一天</button>');
  } else {
    // 没留，或者对方留了我还没留——我都可以留
    acts.push('<button class="link" data-act="keep-day">留这一天</button>');
  }
  if (kept) acts.push('<button class="link" data-goto="day-originals">看那天的原文</button>');

  body.innerHTML = `
    <div class="ai-line">${hasCard ? '<span class="ai-tag">AI 整理</span>' : '<span class="muted small">第 1 天才有卡</span>'}</div>
    ${hasCard ? `<p class="day-text">${esc((day.cards && day.cards.me) || `那天有 ${dayOfMessages(key).length} 句原文，已经收进相册。`).replace(/\n/g, '<br>')}</p>` : ''}
    ${photos.length ? `<div class="photo-grid">${photos.join('')}</div>` : ''}
    <div class="moments">
      <div class="m-title">此刻${day.moments && day.moments.me ? '' : ' · <button class="link" data-act="moment-add">写一句</button>'}</div>
      ${moments.join('') || ''}
      <div class="moment-edit" hidden><input id="momentInput" placeholder="写一句只有这一天的话" /><button class="btn primary sm-btn" data-act="moment-save">保存</button></div>
    </div>
    ${marks ? `<div class="marks">${marks}</div>` : ''}
    <div class="day-actions">${acts.join('')}</div>
  `;
}

/* ---------------- 那天的原文 ---------------- */

function renderOriginals() {
  const key = S.openDay || '2025-10-16';
  const list = dayOfMessages(key);
  const title = screenEl.querySelector('.page[data-page="day-originals"] .page-title');
  if (title) title.textContent = dayLabel(key);
  const feed = screenEl.querySelector('.page[data-page="day-originals"] .feed');
  if (!feed) return;
  feed.innerHTML = list.length
    ? list.map((m) => bubbleHtml({ ...m, status: 'sent' })).join('')
    : '<div class="empty"><div class="empty-tx">这一天的原文只在这里</div></div>';
}

/* ---------------- 我的 / 设置 ---------------- */

/* 注册不填用户名：系统先给一个，进房后可以改 */
const DEFAULT_NAMES = ['小满', '青禾', '南风', '白露', '阿灯', '小岛', '北岸', '麦子'];
function defaultName() {
  const pool = DEFAULT_NAMES.filter((n) => n !== S.partner);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* 房间码：6 位，去掉 0/1/I/O/L 这类看着像的字符 */
const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function genCode() {
  let out = '';
  for (let i = 0; i < 6; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

function renderMe() {
  const n = document.getElementById('meName');
  const p = document.getElementById('mePartner');
  const pn = document.getElementById('profileName');
  if (n) n.textContent = S.user.name;
  if (p) p.textContent = `和 ${S.partner} 在「${S.room.name}」`;
  if (pn) pn.textContent = S.user.name;

  const roomName = S.room.name;
  const title = document.getElementById('roomTitle');
  if (title) title.textContent = roomName;
  const pr = document.getElementById('profileRoom');
  if (pr) pr.textContent = `${S.partner} · ${roomName}`;
  const ir = document.getElementById('inviteRoom');
  if (ir) ir.textContent = roomName;
  const code = document.getElementById('roomCode');
  if (code) code.textContent = S.room.code;
  // 满员（两个人都在）后，码不能再换，也不能再分享
  const full = !S.alone;
  document.querySelectorAll('[data-act="new-code"], [data-act="share"]').forEach((b) => { b.disabled = full; });

  const nameInput = document.getElementById('roomName');
  if (nameInput && document.activeElement !== nameInput) nameInput.value = roomName;
}

function renderSettings() {
  const done = document.getElementById('exportDone');
  if (done) done.hidden = !S.demo.exported;

  const exportPage = screenEl.querySelector('.page[data-page="export"]');
  if (exportPage) {
    exportPage.querySelectorAll('[data-act="range"]').forEach((c) => c.classList.toggle('on', c.dataset.v === S.exportPrefs.range));
    exportPage.querySelectorAll('[data-act="format"]').forEach((r) => {
      const dot = r.querySelector('.radio');
      if (dot) dot.classList.toggle('on', r.dataset.v === S.exportPrefs.format);
    });
  }
  screenEl.querySelectorAll('.toggle').forEach((t) => {
    const row = t.closest('.row');
    if (!row) return;
    const label = row.querySelector('span') ? row.querySelector('span').textContent : '';
    if (label.includes('新消息')) t.classList.toggle('on', S.notify.msg);
    if (label.includes('锁屏')) t.classList.toggle('on', S.notify.lock);
    if (label.includes('今晚')) t.classList.toggle('on', S.notify.tonight);
  });
}

/* ---------------- 弹层 ---------------- */

function openSheet(name) {
  S.sheet = name;
  sheets.forEach((s) => s.classList.toggle('on', s.dataset.overlay === name));
  scrim.classList.add('on');
  if (name === 'image-viewer') renderViewer();
  if (name === 'rename') {
    const f = document.getElementById('renameField');
    if (f) {
      f.textContent = S.user.name;
      f.contentEditable = 'true';
      f.focus();
    }
  }
  if (name === 'actions') {
    const menu = screenEl.querySelector('.sheet[data-overlay="actions"] .menu');
    const m = S.messages.find((x) => x.id === S.actionMsg);
    if (menu && m) {
      menu.querySelector('[data-act="quote"]').style.display = 'block';
      const markBtn = menu.querySelector('[data-act="mark"]');
      const mk = markOf(m);          // 只看得到自己标的
      markBtn.style.display = 'block';
      markBtn.disabled = false;
      markBtn.textContent = mk ? '取消特别记忆' : '特别记忆';
    }
  }
}

function closeSheet() {
  S.sheet = null;
  sheets.forEach((s) => s.classList.remove('on'));
  scrim.classList.remove('on');
}

/* ---------------- 记忆规则 ---------------- */

function keepDay() {
  const key = S.openDay;
  const day = S.days[key];
  if (!day) return;
  day.keeps = day.keeps || {};
  day.keeps.me = true;
  closeSheet();
  toast('留住了');
  renderDay();
  renderAlbum();
  if (S.route === 'day-card') return;
}



/* ---------------- 门的半关（停住，不自动弹回） ---------------- */

function enterHalf() {
  S.door = 'half';
  const inp = document.getElementById('halfLine');
  if (inp) {
    inp.value = '';
    inp.focus();
  }
  renderRoom();
}
function clearHalf() {
  /* 半关不再自动弹回：停在这里等人写完那句，点「关」或「算了」才走 */
}

/* ---------------- 开发件 ---------------- */

function updateDev() {
  const el = document.getElementById('devNow');
  if (el) el.textContent = `${new Date(now()).getMonth() + 1} 月 ${new Date(now()).getDate()} 日 ${hhmm(now())}`;
}

/* ---------------- 事件 ---------------- */

document.addEventListener('click', (e) => {
  const t = e.target;

  if (t.closest('[data-close]')) {
    closeSheet();
    return;
  }

  const backBtn = t.closest('[data-back]');
  if (backBtn) {
    back();
    return;
  }

  const goto = t.closest('[data-goto]');
  if (goto && !goto.closest('.nav')) {
    go(goto.dataset.goto);
    return;
  }

  const ov = t.closest('[data-overlay]');
  if (ov && !ov.classList.contains('sheet')) {
    openSheet(ov.dataset.overlay);
    return;
  }

  const tg = t.closest('[data-toggle]');
  if (tg) {
    tg.classList.toggle('on');
    const row = tg.closest('.row');
    const label = row && row.querySelector('span') ? row.querySelector('span').textContent : '';
    const on = tg.classList.contains('on');
    if (label.includes('新消息')) S.notify.msg = on;
    if (label.includes('锁屏')) S.notify.lock = on;
    if (label.includes('今晚')) S.notify.tonight = on;
    toast(on ? '打开了' : '关掉了');
    return;
  }

  const act = t.closest('[data-act]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'send') return send();
    if (a === 'view-image') { S.viewer = { mode: 'chat', msgId: act.dataset.id }; openSheet('image-viewer'); return; }
    if (a === 'view-photo') { S.viewer = { mode: 'album', day: S.openDay }; openSheet('image-viewer'); return; }
    if (a === 'viewer-act') {
      const v = S.viewer || {};
      if (v.mode === 'chat') {
        const m = S.messages.find((x) => x.id === v.msgId);
        if (m && !markOf(m)) {
          const key = dayKey(m.at);
          const day = S.days[key] || (S.days[key] = { photos: 0, cards: {}, moments: {}, marks: [], keeps: {} });
          day.marks = day.marks || [];
          day.marks.push({ id: 'mk' + Date.now().toString(36), text: '（图片）', by: 'me', msgId: m.id, deleted: false });
          toast('留了，21 天后还在');
        }
        renderViewer();
        renderRoom();
        return;
      }
      const key = v.day || S.openDay;
      const day = S.days[key];
      closeSheet();
      renderAlbum();
      return;
    }
    if (a === 'unquote') {
      S.quote = null;
      renderRoom();
      if (inputEl) inputEl.focus();
      return;
    }
    if (a === 'half') { enterHalf(); return; }
    if (a === 'cancel-half') { clearHalf(); S.door = 'open'; return renderRoom(); }
    if (a === 'close-door') {
      const inp = document.getElementById('halfLine');
      const line = (inp && inp.value ? inp.value : '').trim();
      if (!line) { toast('说点什么再关'); return; }
      S.doorLine = line;
      clearHalf();
      S.door = 'closed';
      S.justOpened = false;
      return renderRoom();
    }
    if (a === 'open-door') { S.door = 'open'; S.justOpened = true; S.doorCard = false; return renderRoom(); }
    if (a === 'deliver') {
      const el = document.getElementById('cardInput');
      const txt = (el && el.textContent ? el.textContent : '').trim();
      if (!txt) { toast('先写一句'); return; }
      const card = mk('me', 'card', txt, now());
      S.messages.push(card);
      S.justOpened = false;
      if (el) el.innerHTML = '';
      const n = S.queue.length;
      if (n) { S.messages.push(...S.queue); S.queue = []; }
      toast(n ? `递出去了 · 对方排队的 ${n} 条话回来了` : '递出去了');
      return renderRoom();
    }
    if (a === 'retry') {
      const m = S.messages.find((x) => x.id === act.dataset.id);
      if (m) {
        m.status = 'sending';
        renderRoom();
        setTimeout(() => { m.status = 'sent'; renderRoom(); }, 700);
      }
      return;
    }
    if (a === 'recall') {
      const id = act.dataset.id;
      S.messages = S.messages.filter((m) => m.id !== id);
      toast('撤回了');
      return renderRoom();
    }
    if (a === 'quote') {
      S.quote = S.actionMsg;
      closeSheet();
      renderRoom();
      if (inputEl) inputEl.focus();
      return;
    }
    if (a === 'mark') {
      const m = S.messages.find((x) => x.id === S.actionMsg);
      if (!m) { closeSheet(); return; }
      const key = dayKey(m.at);
      const day = S.days[key] || (S.days[key] = { photos: 0, cards: {}, moments: {}, marks: [], keeps: {} });
      day.marks = day.marks || [];
      const mk = markOf(m);
      if (mk) {
        mk.deleted = true;          // 只删我自己这条，对方标的我看不到也动不了
        toast('取消了，下次压缩会看到');
      } else {
        day.marks.push({
          id: 'mk' + Date.now().toString(36),
          text: m.text || (m.kind === 'image' ? '（图片）' : '（语音）'),
          by: 'me',
          msgId: m.id,
          deleted: false,
        });
        toast('标了特别记忆');
      }
      closeSheet();
      renderRoom();
      renderDay();
      return;
    }
    if (a === 'keep-day') { openSheet('keep-day'); return; }
    if (a === 'unkeep') { openSheet('unkeep-day'); return; }
    if (a === 'unkeep-confirm') {
      const day = S.days[S.openDay];
      const age = daysAgo(S.openDay);
      if (!day || !iKept(day)) { closeSheet(); return; }
      if (age >= 21) { closeSheet(); toast('第 21 天后就锁定了'); return; }
      day.keeps.me = false;        // 只取消我自己那一票
      closeSheet();
      toast(isKept(day) ? '你取消了，对方还留着' : '取消了');
      renderDay();
      renderRoom();
      return;
    }
    if (a === 'keep-confirm') {
      const day = S.days[S.openDay] || (S.days[S.openDay] = { photos: 0, cards: {}, moments: {}, marks: [], keeps: {} });
      day.keeps = day.keeps || {};
      day.keeps.me = true;
      closeSheet();
      toast('留住了');
      renderDay();
      renderAlbum();
      renderRoom();
      return;
    }
    if (a === 'mark-confirm') {
      const day = S.days[S.openDay];
      const rec = day && (day.marks || []).find((k) => k.by === 'me' && !k.deleted);
      if (rec) rec.deleted = true;   // 删给两个人看
      closeSheet();
      toast('取消了，下次压缩会看到');
      renderDay();
      renderRoom();
      return;
    }
    if (a === 'prev-month') { S.monthIdx = Math.max(0, (S.monthIdx || 0) - 1); renderAlbum(); return; }
    if (a === 'next-month') { S.monthIdx = Math.min(MONTHS.length - 1, (S.monthIdx || 0) + 1); renderAlbum(); return; }
    if (a === 'use-card') {
      S.door = 'open';
      S.doorCard = false;
      S.justOpened = false;
      if (S.queue.length) { S.messages.push(...S.queue); S.queue = []; }
      toast('用门口那张卡片开了门');
      return renderRoom();
    }
    if (a === 'range') { S.exportPrefs.range = act.dataset.v; renderSettings(); return; }
    if (a === 'format') { S.exportPrefs.format = act.dataset.v; renderSettings(); return; }
    if (a === 'share') { toast('邀请链接已复制'); return; }
    if (a === 'reopen-link') { toast('这个链接里没带房间码，重新打开一次邀请链接'); return; }
    if (a === 'download') { toast('这里会跳到应用商店'); return; }
    if (a === 'open-app') { go('invite'); return; }
    if (a === 'image') {
      if (S.door === 'closed') return;
      const m = mk('me', 'image', '', now(), { place: '相册', status: 'sending' });
      pushMessage(m);
      setTimeout(() => { m.status = 'sent'; renderRoom(); }, 700);
      return;
    }
    if (a === 'record') {
      S.demo.recording = !S.demo.recording;
      renderRoom();
      toast(S.demo.recording ? '按住说话，上滑取消' : '取消录音');
      return;
    }
    if (a === 'submit') {
      const vals = [...document.querySelectorAll('.page.on input.field')].map((f) => (f.value || '').trim());
      if (S.route === 'change-password') {
        if ((vals[1] || '').length < 8) { toast('新密码至少 8 位'); return; }
        toast('改好了，其他设备会掉线');
        back();
        return;
      }
      if (S.route === 'phone-change') {
        if (vals[0] && vals[1] && vals[0] !== vals[1]) { toast('两次输入的新手机号不一样'); return; }
        if (!vals[0]) { toast('新手机号还没填'); return; }
        toast('换好了，旧号可以再注册');
        back();
        return;
      }
      toast('提交了');
      return;
    }
    if (a === 'delete-account') {
      toast('已提交注销，7 天内登录可撤销');
      back();
      return;
    }
    if (a === 'notify-yes') { S.notify.msg = true; closeSheet(); toast('有人说话时，通知你。别的不会推。'); return; }
    if (a === 'mark-del') {
      const day = S.days[S.openDay];
      const rec = day && (day.marks || []).find((k) => k.id === act.dataset.id && !k.deleted);
      if (!rec) { return; }
      if (rec.by !== 'me') { toast(`${S.partner} 标的，只有 TA 能删`); return; }
      rec.deleted = true;
      const age = daysAgo(S.openDay);
      toast(age < 21 ? '取消了，下次压缩会看到' : '删了');
      renderDay();
      renderRoom();
      return;
    }
    if (a === 'moment-add') {
      const box = screenEl.querySelector('.moment-edit');
      const cur = (S.days[S.openDay] && S.days[S.openDay].moments && S.days[S.openDay].moments.me) || '';
      if (box) {
        box.hidden = false;
        const inp = box.querySelector('input');
        inp.value = cur;
        inp.focus();
      }
      return;
    }
    if (a === 'moment-del') {
      const day = S.days[S.openDay];
      if (day && day.moments) day.moments.me = '';
      renderDay();
      toast('删了');
      return;
    }
    if (a === 'moment-save') {
      const box = screenEl.querySelector('.moment-edit');
      const v = box && box.querySelector('input') ? box.querySelector('input').value.trim() : '';
      const key = S.openDay;
      if (v && S.days[key]) {
        S.days[key].moments = S.days[key].moments || {};
        S.days[key].moments.me = v;
        renderDay();
        toast('写下了');
      }
      return;
    }
    if (a === 'export') {
      S.demo.exported = true;
      renderSettings();
      toast('已生成，对方已收到提示');
      return;
    }
    if (a === 't1' || a === 't7' || a === 't14' || a === 't21') {
      const step = Number(a.slice(1));
      S.offset += step;
      toast(`往前 ${step} 天`);
      show('room');
      renderAlbum();
      return;
    }
    if (a === 'treset') {
      location.reload();
      return;
    }
    if (a === 'their-door') {
      S.theirDoor = S.theirDoor === 'open' ? 'closed' : 'open';
      toast(S.theirDoor === 'closed' ? '对方关上了门' : '对方开门了');
      if (S.theirDoor === 'open' && S.queue.length) {
        S.messages.push(...S.queue);
        S.queue = [];
        toast('排队的话回来了');
      }
      return renderRoom();
    }
    if (a === 'incoming') {
      const msg = mk('them', 'text', '刚到家，你睡了吗', now());
      if (S.door === 'closed') S.queue.push(msg);
      else S.messages.push(msg);
      return renderRoom();
    }
    if (a === 'fail') {
      S.demo.forceFail = true;
      toast('下一条会发失败');
      return;
    }
    if (a === 'partner-card') {
      S.messages.push(mk('them', 'card', '我先睡了，门口这张卡你拿着，明早再说', now()));
      S.doorCard = true;
      if (S.door !== 'closed' && S.door !== 'door-card') S.door = 'closed';
      toast('对方在门口留了一张卡片');
      return renderRoom();
    }
    if (a === 'save-name') {
      const el = document.getElementById('roomName');
      const v = (el && el.value ? el.value : '').trim();
      if (!v) { toast('房间名不能空'); return; }
      if (v.length > 12) { toast('名字最多 12 个字'); return; }
      S.room.name = v;
      renderMe();
      toast('名字改好了');
      return;
    }
    if (a === 'new-code') {
      S.room.code = genCode();
      renderMe();
      toast('换了新码，旧码作废');
      return;
    }
    if (a === 'enter-room') { S.alone = false; go('room', { replace: true }); return; }
    if (a === 'login') {
      const v = [...document.querySelectorAll('.page.on input.field')].map((f) => (f.value || '').trim());
      if (!v[0]) { toast('手机号还没填'); return; }
      if (!v[1]) { toast('密码还没填'); return; }
      S.signedIn = true;
      S.alone = false;
      go('room', { replace: true });
      return;
    }
    if (a === 'register') {
      const g = (id) => (document.getElementById(id) || {}).value || '';
      const phone = g('regPhone').trim();
      const p1 = g('regPass');
      const p2 = g('regPass2');
      if (!phone) { toast('手机号还没填'); return; }
      if (!/^1[3-9]\d{9}$/.test(phone)) { toast('手机号不对'); return; }
      if (!p1) { toast('密码还没填'); return; }
      if (p1.length < 8) { toast('密码至少 8 位'); return; }
      if (p1 !== p2) { toast('两次密码不一样'); return; }
      // 不给用户名：系统先给一个，进房后可以改
      S.user.name = defaultName();
      S.signedIn = true;
      S.alone = true;
      S.demo.empty = 'solo';
      toast(`先叫你 ${S.user.name}，在「我的」里能改`);
      go('room', { replace: true });
      return;
    }
    if (a === 'logout') {
      S.signedIn = false;
      S.stack = [];
      closeSheet();
      show('login');
      toast('已退出登录');
      return;
    }
    if (a === 'rename-save') {
      const f = document.getElementById('renameField');
      const v = f ? f.textContent.trim() : '';
      if (v) S.user.name = v;
      closeSheet();
      renderMe();
      toast('改好了');
      return;
    }
    return;
  }

  // 一天的卡里的开关是 <button class="link"> 之类，这里兜底
});

/* 长按消息 */
let pressTimer = null;
feedEl.addEventListener('pointerdown', (e) => {
  const m = e.target.closest('[data-msg]');
  if (!m) return;
  pressTimer = setTimeout(() => {
    S.actionMsg = m.dataset.msg;
    openSheet('actions');
  }, 480);
});
feedEl.addEventListener('pointerup', () => clearTimeout(pressTimer));
feedEl.addEventListener('pointerleave', () => clearTimeout(pressTimer));
feedEl.addEventListener('contextmenu', (e) => {
  const m = e.target.closest('[data-msg]');
  if (!m) return;
  e.preventDefault();
  S.actionMsg = m.dataset.msg;
  openSheet('actions');
});

/* 关门把手：按住上拉 */
(function dragDoor() {
  const handle = roomEl.querySelector('.handle');
  if (!handle) return;
  let startY = null;
  handle.addEventListener('pointerdown', (e) => {
    startY = e.clientY;
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (startY === null) return;
    const dy = startY - e.clientY;
    const p = Math.max(0, Math.min(1, dy / 120));
    if (dimEl) dimEl.style.opacity = String(p * 0.55);
  });
  handle.addEventListener('pointerup', (e) => {
    if (startY === null) return;
    const dy = startY - e.clientY;
    startY = null;
    if (dimEl) dimEl.style.opacity = '';
    if (dy > 60) enterHalf();
  });
})();

/* 输入框回车发送 */
if (inputEl) {
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  });
}

/* 半关的关门那句：回车等于按「关」 */
const halfLineEl = document.getElementById('halfLine');
if (halfLineEl) {
  halfLineEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inp = document.getElementById('halfLine');
      const line = (inp && inp.value ? inp.value : '').trim();
      if (!line) { toast('说点什么再关'); return; }
      S.doorLine = line;
      clearHalf();
      S.door = 'closed';
      S.justOpened = false;
      renderRoom();
    }
  });
}

/* 侧栏跳转 */
const SCREENS = [
  { group: '准入', items: [['启动', 'launch'], ['登录', 'login'], ['注册', 'register'], ['开房码', 'invite'], ['邀请落地 H5', 'invite-h5'], ['找回密码', 'forgot-password']] },
  { group: '房间', items: [['正常', 'room', {}], ['空 · 只有我', 'room', { empty: 'solo' }], ['空 · 两人没说话', 'room', { quiet: true }], ['对方关着门', 'room', { theirDoor: 'closed' }], ['半关', 'room', { door: 'half' }], ['我关着门', 'room', { door: 'closed' }], ['门口有卡片', 'room', { door: 'closed', doorCard: true }], ['刚开门', 'room', { door: 'open', justOpened: true }], ['递出卡片后', 'room', { delivered: true }], ['引用态', 'room', { quote: true }], ['发送中', 'room', { sending: true }], ['已发送', 'room', { sent: true }], ['失败', 'room', { failed: true }], ['重发中', 'room', { sending: true }], ['图片失败', 'room', { imageFail: true }], ['录音中', 'room', { recording: true }], ['有新消息', 'room', { newmsg: true }]] },
  { group: '相册', items: [['相册 · 月历', 'album'], ['一天的卡（留过）', 'day-card'], ['那天的原文', 'day-originals']] },
  { group: '我的', items: [['我的', 'me'], ['个人资料', 'profile'], ['账号与安全', 'account-security'], ['修改密码', 'change-password'], ['换手机号', 'phone-change'], ['注销账号', 'account-delete'], ['通知', 'notifications'], ['导出', 'export'], ['这个房间怎么运转', 'how-it-works'], ['隐私政策', 'privacy'], ['用户协议', 'terms'], ['反馈', 'feedback']] },
  { group: '设置', items: [['房间信息', 'room-info']] },
  { group: '弹层', items: [['留这一天', 'day-card', {}, 'keep-day'], ['删小框', 'day-card', {}, 'delete-mark'], ['改名', 'profile', {}, 'rename'], ['退出登录', 'account-security', {}, 'logout-confirm'], ['通知权限', 'room', {}, 'notify-ask'], ['长按菜单', 'room', {}, 'actions'], ['离开房间（钩子）', 'me', {}, 'leave-room']] },
];

function preset(opts = {}) {
  S.door = 'open';
  S.theirDoor = 'open';
  S.justOpened = false;
  S.doorCard = false;
  S.quote = null;
  S.demo = {};
  S.alone = false;
  S.openDay = opts.openDay || '2025-10-16';
  S.doorLine = '今晚到这儿';
  if (opts.door) S.door = opts.door;
  if (opts.door === 'closed' || opts.doorCard) S.doorLine = '今晚想自己待一会儿，明早再聊';
  if (opts.theirDoor) S.theirDoor = opts.theirDoor;
  if (opts.justOpened) S.justOpened = true;
  if (opts.doorCard) S.doorCard = true;
  if (opts.empty) S.demo.empty = opts.empty;
  if (opts.quiet) S.demo.quiet = true;
  if (opts.recording) S.demo.recording = true;
  if (opts.newmsg) S.demo.newmsg = true;
  if (opts.quote) S.quote = S.messages[0] ? S.messages[0].id : null;
  if (opts.failed) {
    const last = S.messages.filter((m) => m.from === 'me').pop();
    if (last) last.status = 'failed';
  }
  if (opts.sending) {
    const last = S.messages.filter((m) => m.from === 'me').pop();
    if (last) last.status = 'sending';
  }
  if (opts.imageFail) {
    S.demo.imageFail = true;
    S.messages.push(mk('me', 'image', '', now(), { status: 'failed' }));
  }
  syncNav();
}

for (const g of SCREENS) {
  const t = document.createElement('div');
  t.className = 'group';
  t.textContent = g.group;
  navEl.appendChild(t);
  for (const item of g.items) {
    const [label, route, opts, sheet] = item;
    const b = document.createElement('button');
    b.textContent = label;
    b.dataset.route = route;
    b.onclick = () => {
      preset(opts || {});
      S.stack = ['launch', route];
      show(route);
      if (sheet) setTimeout(() => openSheet(sheet), 20);
    };
    navEl.appendChild(b);
  }
}

/* 启动 */
setTimeout(() => {
  if (S.route === 'launch') {
    S.stack = ['launch', 'login'];
    show('login');
  }
}, 1200);
show('launch');
