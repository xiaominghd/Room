/**
 * 房间状态机 —— 纯函数，可单测。
 * 第 6 节的状态边界都在这里落地：
 *  6.1 消息 7 天删除（删除对象本身，只留「日期 · 条数」痕迹）
 *  6.2 双人留照（共同内容，只能从我这边隐藏）
 *  6.3 恢复码（一次性生成、不可重置）
 *  6.4 停（单方、只有按停的人能点亮）
 *  6.5 想聊（单人小点 / 双人问题 / 过期痕迹）
 *  6.6 说给自己（不进消息流、不进导出）
 */

export type User = 'A' | 'B';

export type Photo = { id: string; hue: number; label: string; place: string };

export type MsgKind = 'text' | 'photo' | 'voice';

export type Msg = {
  id: string;
  from: User;
  kind: MsgKind;
  text?: string;
  photo?: Photo;
  voiceSec?: number;
  at: number;
};

export type AlbumItem = {
  id: string;
  photo: Photo;
  at: number;
  place: string;
  keptBy: User;
  hiddenBy: User[];
  footnote: boolean;
};

export type Note = { id: string; at: number; text: string };

export type Trace = { key: string; at: number; count: number };

export type Stop = { by: User; line: string; at: number } | null;

export type Talk = {
  pressed: Record<User, boolean>;
  at: number;
  expireAt: number;
  talking: boolean;
  answers: Partial<Record<User, string>>;
  reflectedAt: number | null;
} | null;

export type Scope = 'all' | '30' | '7';
export type Format = 'pdf' | 'text';

export type Room = {
  id: string;
  createdAt: number;
  messages: Msg[];
  traces: Trace[];
  album: AlbumItem[];
  notes: Note[];
  stop: Stop;
  talk: Talk;
  talkTrace: { at: number; text: string } | null;
  invite: { code: string; seats: number; limit: number };
  members: Record<User, boolean>;
  recoveryCode: string;
  profile: { names: Record<User, string>; joinedAt: number };
  notify: boolean;
  exportPrefs: { scope: Scope; format: Format; lastExportAt: number | null };
};

export const DAY = 86_400_000;
export const TTL = 7 * DAY;
export const INVITE_CODE = 'K7Q';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

let seq = 0;
export function uid(prefix: string) {
  seq += 1;
  return `${prefix}_${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export function formatDateTight(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatTime(ts: number) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(ts: number) {
  return `${formatDateTight(ts)} ${formatTime(ts)}`;
}

export function endOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

export function sameDay(a: number, b: number) {
  return dayKey(a) === dayKey(b);
}

export function makeRecoveryCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 12; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${out.slice(0, 4)} ${out.slice(4, 8)} ${out.slice(8, 12)}`;
}

export function nameOf(room: Room, user: User) {
  return room.profile.names[user];
}

export function otherOf(user: User): User {
  return user === 'A' ? 'B' : 'A';
}

/* ------------------------------------------------------------------ */
/* seed                                                                */
/* ------------------------------------------------------------------ */

function photo(hue: number, label: string, place: string): Photo {
  return { id: uid('p'), hue, label, place };
}

export function seed(now = Date.now()): Room {
  const sunset = photo(24, '家里的窗台', '家里');
  const ramen = photo(205, '海边的傍晚', '厦门');
  const oden = photo(28, '便利店的关东煮', '楼下');

  return {
    id: uid('room'),
    createdAt: now - 46 * DAY,
    messages: [
      { id: uid('m'), from: 'B', kind: 'text', text: '今天风好大，下班路上买了糖炒栗子', at: now - 26 * 3600_000 },
      { id: uid('m'), from: 'A', kind: 'text', text: '给我留一点，不许吃完', at: now - 25.6 * 3600_000 },
      { id: uid('m'), from: 'B', kind: 'photo', photo: sunset, at: now - 25.2 * 3600_000 },
      { id: uid('m'), from: 'B', kind: 'voice', voiceSec: 12, at: now - 24.8 * 3600_000 },
      { id: uid('m'), from: 'B', kind: 'text', text: '今晚的月亮很亮，你看到了吗', at: now - 2.9 * 3600_000 },
      { id: uid('m'), from: 'A', kind: 'text', text: '看到了，这会儿刚到家', at: now - 2.4 * 3600_000 },
    ],
    traces: [{ key: dayKey(now - 9 * DAY), at: now - 9 * DAY, count: 3 }],
    album: [
      { id: uid('k'), photo: ramen, at: now - 30 * DAY, place: '厦门', keptBy: 'B', hiddenBy: [], footnote: false },
      { id: uid('k'), photo: oden, at: now - 20 * DAY, place: '楼下', keptBy: 'A', hiddenBy: [], footnote: true },
      // 与房间里的那张是两张不同的照片：房间那张还等着被「留」
      { id: uid('k'), photo: photo(24, '家里的窗台', '家里'), at: now - 6 * DAY, place: '家里', keptBy: 'B', hiddenBy: [], footnote: false },
    ],
    notes: [
      { id: uid('n'), at: now - 3 * DAY, text: '其实我也有点怕，只是没说。' },
      { id: uid('n'), at: now - 6 * DAY, text: '今天没有生气，只是不知道怎么开口。' },
      { id: uid('n'), at: now - 12 * DAY, text: '想说的话，先放在这里。' },
    ],
    stop: null,
    talk: null,
    talkTrace: null,
    invite: { code: INVITE_CODE, seats: 1, limit: 2 },
    members: { A: true, B: false },
    recoveryCode: makeRecoveryCode(),
    profile: { names: { A: '栗子', B: '阿澄' }, joinedAt: now - 45 * DAY },
    notify: true,
    exportPrefs: { scope: 'all', format: 'pdf', lastExportAt: null },
  };
}

/* ------------------------------------------------------------------ */
/* 6.1 消息 7 天删除                                                   */
/* ------------------------------------------------------------------ */

/** 到期消息从状态里删除，按自然日聚合成痕迹。幂等。 */
export function purgeExpired(room: Room, now: number): Room {
  if (room.messages.length === 0) return room;
  const keep: Msg[] = [];
  const expired: Msg[] = [];
  for (const m of room.messages) {
    if (now - m.at >= TTL) expired.push(m);
    else keep.push(m);
  }
  if (expired.length === 0) return room;

  const traces = room.traces.map((t) => ({ ...t }));
  for (const m of expired) {
    const key = dayKey(m.at);
    const hit = traces.find((t) => t.key === key);
    if (hit) {
      hit.count += 1;
      hit.at = Math.min(hit.at, m.at);
    } else {
      traces.push({ key, at: m.at, count: 1 });
    }
  }
  return { ...room, messages: keep, traces };
}

/* ------------------------------------------------------------------ */
/* 6.5 想聊：过期                                                      */
/* ------------------------------------------------------------------ */

function expireTalk(room: Room, now: number): Room {
  const t = room.talk;
  if (!t || now <= t.expireAt) return room;
  const bothAnswered = !!(t.answers.A && t.answers.B);
  if (bothAnswered) return { ...room, talk: null };
  return {
    ...room,
    talk: null,
    talkTrace: { at: t.expireAt, text: t.talking ? '24 小时 · 未成' : '24:00 · 未成' },
  };
}

function tick(room: Room, now: number): Room {
  return expireTalk(purgeExpired(room, now), now);
}

/* ------------------------------------------------------------------ */
/* reducer                                                             */
/* ------------------------------------------------------------------ */

export type Action =
  | { type: 'tick'; now: number }
  | { type: 'send'; user: User; text: string; now: number }
  | { type: 'recall'; msgId: string; user: User; now: number }
  | { type: 'keep'; msgId: string; user: User; now: number }
  | { type: 'hide'; itemId: string; user: User }
  | { type: 'stop'; user: User; now: number }
  | { type: 'stopLine'; user: User; line: string }
  | { type: 'relight'; user: User; now: number }
  | { type: 'talkPress'; user: User; now: number }
  | { type: 'talkAnswer'; user: User; text: string; now: number }
  | { type: 'talkDismiss'; now: number }
  | { type: 'noteAdd'; text: string; now: number }
  | { type: 'noteDel'; id: string }
  | { type: 'inviteJoin'; user: User; now: number }
  | { type: 'rename'; user: User; name: string }
  | { type: 'notify'; on: boolean }
  | { type: 'exportScope'; scope: Scope }
  | { type: 'exportFormat'; format: Format }
  | { type: 'exportRun'; now: number }
  | { type: 'footnote'; itemId: string; on: boolean }
  | { type: 'reset'; now: number };

export function reduce(input: Room, action: Action): Room {
  const room = action.type === 'tick' || action.type === 'reset' ? input : tick(input, nowOf(action));

  switch (action.type) {
    case 'tick':
      return tick(room, action.now);

    case 'reset':
      return seed(action.now);

    case 'send': {
      const text = action.text.trim();
      if (!text) return room;
      // 6.4 按停的人自己发一句，房间自动亮
      const stop = room.stop && room.stop.by === action.user ? null : room.stop;
      const msg: Msg = { id: uid('m'), from: action.user, kind: 'text', text, at: action.now };
      return purgeExpired({ ...room, stop, messages: [...room.messages, msg] }, action.now);
    }

    case 'recall': {
      // 2 分钟内可撤回：只撤回自己的消息
      const msg = room.messages.find((m) => m.id === action.msgId);
      if (!msg || msg.from !== action.user) return room;
      if (action.now - msg.at > 2 * 60_000) return room;
      return { ...room, messages: room.messages.filter((m) => m.id !== action.msgId) };
    }

    case 'keep': {
      // 6.2 双人留照：任一方留，进共同相册；不可重复
      const msg = room.messages.find((m) => m.id === action.msgId);
      if (!msg || msg.kind !== 'photo' || !msg.photo) return room;
      if (room.album.some((a) => a.photo.id === msg.photo!.id)) return room;
      const item: AlbumItem = {
        id: uid('k'),
        photo: msg.photo,
        at: msg.at,
        place: msg.photo.place,
        keptBy: action.user,
        hiddenBy: [],
        footnote: false,
      };
      return { ...room, album: [...room.album, item] };
    }

    case 'hide': {
      // 6.2 只能从我这边隐藏；对方仍可见，房间里「已留」不变
      return {
        ...room,
        album: room.album.map((a) =>
          a.id === action.itemId && !a.hiddenBy.includes(action.user)
            ? { ...a, hiddenBy: [...a.hiddenBy, action.user] }
            : a
        ),
      };
    }

    case 'stop':
      if (room.stop) return room;
      return { ...room, stop: { by: action.user, line: '今晚到这儿', at: action.now } };

    case 'stopLine':
      if (!room.stop || room.stop.by !== action.user) return room;
      return { ...room, stop: { ...room.stop, line: action.line } };

    case 'relight':
      // 6.4 只有按停的人能点亮
      if (!room.stop || room.stop.by !== action.user) return room;
      return { ...room, stop: null };

    case 'talkPress': {
      const base = room.talk && action.now <= room.talk.expireAt ? room.talk : null;
      if (base && base.pressed[action.user]) return room;
      const pressed = base
        ? { ...base.pressed, [action.user]: true }
        : { A: false, B: false, [action.user]: true } as Record<User, boolean>;
      const both = pressed.A && pressed.B;
      const talk: NonNullable<Talk> = {
        pressed,
        at: base ? base.at : action.now,
        expireAt: both ? action.now + DAY : base ? base.expireAt : endOfDay(action.now),
        talking: both,
        answers: base ? base.answers : {},
        reflectedAt: null,
      };
      return { ...room, talk, talkTrace: null };
    }

    case 'talkAnswer': {
      const text = action.text.trim();
      if (!room.talk || !room.talk.talking || !text) return room;
      if (room.talk.answers[action.user]) return room;
      return {
        ...room,
        talk: { ...room.talk, answers: { ...room.talk.answers, [action.user]: text } },
      };
    }

    case 'talkDismiss':
      return { ...room, talk: null, talkTrace: null };

    case 'noteAdd': {
      const text = action.text.trim();
      if (!text) return room;
      // 6.6 只在本机，不进消息流
      return { ...room, notes: [{ id: uid('n'), at: action.now, text }, ...room.notes] };
    }

    case 'noteDel':
      return { ...room, notes: room.notes.filter((n) => n.id !== action.id) };

    case 'inviteJoin': {
      // 6.7 两人上限
      if (room.invite.seats >= room.invite.limit) return room;
      return {
        ...room,
        invite: { ...room.invite, seats: room.invite.seats + 1 },
        members: { ...room.members, [action.user]: true },
      };
    }

    case 'rename':
      return {
        ...room,
        profile: { ...room.profile, names: { ...room.profile.names, [action.user]: action.name.trim() || room.profile.names[action.user] } },
      };

    case 'notify':
      return { ...room, notify: action.on };

    case 'exportScope':
      return { ...room, exportPrefs: { ...room.exportPrefs, scope: action.scope } };

    case 'exportFormat':
      return { ...room, exportPrefs: { ...room.exportPrefs, format: action.format } };

    case 'exportRun':
      return { ...room, exportPrefs: { ...room.exportPrefs, lastExportAt: action.now } };

    case 'footnote':
      return {
        ...room,
        album: room.album.map((a) => (a.id === action.itemId ? { ...a, footnote: action.on } : a)),
      };

    default:
      return room;
  }
}

function nowOf(action: Action): number {
  return 'now' in action ? action.now : Date.now();
}

/* ------------------------------------------------------------------ */
/* selectors                                                           */
/* ------------------------------------------------------------------ */

export type FeedItem =
  | { kind: 'msg'; at: number; msg: Msg }
  | { kind: 'trace'; at: number; key: string; text: string };

export function buildFeed(room: Room): FeedItem[] {
  const items: FeedItem[] = room.messages.map((m) => ({ kind: 'msg', at: m.at, msg: m }));
  for (const t of room.traces) {
    items.push({ kind: 'trace', at: t.at, key: t.key, text: `${formatDate(t.at)} · ${t.count} 条` });
  }
  if (room.talkTrace) {
    items.push({ kind: 'trace', at: room.talkTrace.at, key: `talk-${room.talkTrace.at}`, text: room.talkTrace.text });
  }
  items.sort((a, b) => a.at - b.at);
  return items;
}

export function keptPhotoIds(room: Room): Set<string> {
  return new Set(room.album.map((a) => a.photo.id));
}

export function visibleAlbum(room: Room, viewer: User): AlbumItem[] {
  return room.album.filter((a) => !a.hiddenBy.includes(viewer)).sort((a, b) => b.at - a.at);
}

export function talkActive(room: Room, now: number) {
  return room.talk && now <= room.talk.expireAt ? room.talk : null;
}

/** 6.2 相册是共同内容：只要有人留过，双方都看到「已留」 */
export function isKept(room: Room, msg: Msg) {
  return !!msg.photo && room.album.some((a) => a.photo.id === msg.photo!.id);
}

/**
 * AI 脚注（本地占位实现）：只写事实，不引原话，不判断谁做了什么。
 * 真实实现里这里会调模型，并把摘要永久写进照片脚注。
 */
export function footnoteSummary(room: Room, item: AlbumItem): string {
  const near = room.messages.filter((m) => Math.abs(m.at - item.at) < 12 * 3600_000);
  const speakers = new Set(near.map((m) => m.from));
  const n = near.length;
  const hour = new Date(item.at).getHours();
  const when = hour < 12 ? '上午' : hour < 18 ? '下午' : '傍晚';
  if (n === 0) return `那天${when}的照片，没有留下别的话。`;
  if (speakers.size >= 2) return `那天${when}的对话有 ${n} 句，两边都说过话。`;
  return `那天${when}的对话有 ${n} 句。`;
}

export function exportMessageCount(room: Room, viewer: User): number {
  const scope = room.exportPrefs.scope;
  const since = scope === 'all' ? 0 : Date.now() - (scope === '30' ? 30 : 7) * DAY;
  return room.messages.filter((m) => m.at >= since).length;
}
