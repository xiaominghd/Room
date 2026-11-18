(function () {
  'use strict';

  var DAY = 86400000;
  var TTL = 7 * DAY;
  var STORE = 'im-demo-v1';

  function $(id) { return document.getElementById(id); }

  function uid(prefix) {
    return prefix + Math.random().toString(36).slice(2, 8);
  }

  function makePhoto(hue, label, place) {
    return { id: uid('p'), hue: hue, label: label, place: place };
  }

  /* ---------------- seed ---------------- */

  function seed() {
    var now = Date.now();
    return {
      v: 1,
      user: 'A',
      offset: 0,
      tab: 'room',
      mode: 'to',
      stop: null,
      talk: null,
      talkTrace: null,
      messages: [
        { id: 'm1', from: 'B', type: 'photo', photo: makePhoto(205, '海边的傍晚', '厦门'), at: now - 9 * DAY },
        { id: 'm2', from: 'A', type: 'text', text: '这张拍得真好', at: now - 9 * DAY + 3600000 },
        { id: 'm3', from: 'B', type: 'text', text: '下次一起去', at: now - 9 * DAY + 7200000 },
        { id: 'm4', from: 'A', type: 'text', text: '今天路过那家店，想起你说想吃', at: now - 2 * DAY - 3600000 },
        { id: 'm5', from: 'B', type: 'photo', photo: makePhoto(28, '便利店的关东煮', '楼下'), at: now - 2 * DAY },
        { id: 'm6', from: 'B', type: 'text', text: '给你留了一串', at: now - 2 * DAY + 60000 },
        { id: 'm7', from: 'A', type: 'text', text: '明天早点睡', at: now - 6 * 3600000 },
        { id: 'm8', from: 'B', type: 'text', text: '你也是', at: now - 5 * 3600000 }
      ],
      album: [
        { id: uid('k'), photo: makePhoto(8, '第一顿饭', '家里'), at: now - 30 * DAY, place: '家里' }
      ],
      notes: [
        { id: uid('n'), at: now - 3 * DAY, text: '其实我也有点怕，只是没说。' }
      ]
    };
  }

  var S;
  try {
    S = JSON.parse(localStorage.getItem(STORE) || 'null') || seed();
  } catch (e) {
    S = seed();
  }
  S.stop = S.stop || null;
  S.talk = S.talk || null;
  S.talkTrace = S.talkTrace || null;
  S.messages = S.messages || [];
  S.album = S.album || [];
  S.notes = S.notes || [];

  S.notify = S.notify !== false;
  S.nickname = S.nickname || '栗子';
  S.partnerName = S.partnerName || '阿澄';
  S.joinedAt = S.joinedAt || '2025年9月3日';
  S.screen = S.screen || null;
  S.exportRange = S.exportRange || 'all';
  S.exportFormat = S.exportFormat || 'pdf';
  S.leavePending = S.leavePending || null;

  var CODE = 'KQ7M 2X9F D4RA';
  var INVITE_URL = 'room.lichen.example';

  var ICO = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 6-6 6 6 6"/></svg>',
    mark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 20v-6.6a5.5 5.5 0 0 1 11 0V20"/><circle cx="12" cy="13.2" r="1.5" fill="currentColor" stroke="none"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 6 6 6-6 6"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 18h15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v10"/><path d="m8 10 4 4 4-4"/><path d="M5 18.5h14"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="9" r="3.5"/><path d="m11 11.5 8 8"/><path d="m16.5 17 2-2"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    server: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="5.5" rx="1.6"/><rect x="4" y="13.5" width="16" height="5.5" rx="1.6"/><path d="M8 7.8h.01M8 16.3h.01"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7.5h10a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H8L5 18v-2.5H4.5A1.5 1.5 0 0 1 3 14V9a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M17.5 6.5h2A1.5 1.5 0 0 1 21 8v4.5a1.5 1.5 0 0 1-1.5 1.5H19"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-4.2L6 20V5.5a1 1 0 0 1 1-1z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7L11 6.8"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.3-1.3"/></svg>'
  };

  function save() {
    try {
      var out = {};
      for (var k in S) {
        if (k !== 'screen' && k !== 'leavePending') out[k] = S[k];
      }
      localStorage.setItem(STORE, JSON.stringify(out));
    } catch (e) {}
  }

  /* ---------------- helpers ---------------- */

  function now() { return Date.now() + (S.offset || 0); }

  function endOfDay(ts) {
    var d = new Date(ts);
    d.setHours(24, 0, 0, 0);
    return d.getTime();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }

  function fmtTime(ts) {
    var d = new Date(ts);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function clip(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.add('hidden'); }, 1600);
  }

  /* ---------------- expiry ---------------- */

  function checkExpiry() {
    if (!S.talk) return;
    var expireAt = S.talk.expireAt || (S.talk.at + DAY);
    if (now() <= expireAt) return;
    var both = !!(S.talk.answers.A && S.talk.answers.B);
    if (!both) {
      S.talkTrace = {
        at: expireAt,
        text: S.talk.talking ? '24 小时 · 未成' : '24:00 · 未成'
      };
    }
    S.talk = null;
  }

  /* ---------------- render ---------------- */

  function render() {
    checkExpiry();

    document.querySelectorAll('[data-user]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.user === S.user);
    });
    document.querySelectorAll('[data-tab]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === S.tab);
    });
    document.querySelectorAll('[data-mode]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === S.mode);
    });

    $('roomView').classList.toggle('hidden', S.tab !== 'room');
    $('albumView').classList.toggle('hidden', S.tab !== 'album');
    $('composer').classList.toggle('hidden', S.tab !== 'room');

    var off = S.offset || 0;
    $('clockLabel').textContent = off === 0 ? '现在' : '+' + Math.round(off / DAY) + ' 天';

    renderRoom();
    renderAlbum();
    renderNotes();
    renderScreen();
    renderLeave();
    save();
  }

  function streamItems() {
    var n = now();
    var live = [];
    var dead = [];
    S.messages.forEach(function (m) {
      (n - m.at > TTL ? dead : live).push(m);
    });

    var groups = {};
    dead.forEach(function (m) {
      var k = dayKey(m.at);
      if (!groups[k]) groups[k] = { at: m.at, count: 0 };
      groups[k].count += 1;
      if (m.at < groups[k].at) groups[k].at = m.at;
    });

    var items = live.map(function (m) { return { kind: 'msg', at: m.at, m: m }; });
    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      items.push({ kind: 'trace', at: g.at, text: fmtDate(g.at) + ' · ' + g.count + ' 条' });
    });
    if (S.talkTrace) {
      items.push({ kind: 'trace', at: S.talkTrace.at, text: S.talkTrace.text });
    }

    items.sort(function (a, b) { return a.at - b.at; });
    return items;
  }

  function renderMsg(m) {
    var mine = m.from === S.user;
    var body;

    if (m.type === 'photo') {
      var p = m.photo;
      var kept = S.album.some(function (a) { return a.photo.id === p.id; });
      body =
        '<div class="photo" style="--h:' + p.hue + '"><span>' + esc(p.label) + '</span></div>' +
        '<div class="photo-meta">' + esc(p.place || '') + ' · ' + fmtTime(m.at) + '</div>' +
        (kept
          ? '<div class="kept">已留</div>'
          : '<button class="keep" data-keep="' + m.id + '">留</button>');
    } else {
      body = '<div class="text">' + esc(m.text) + '</div>';
    }

    return '<div class="row ' + (mine ? 'mine' : 'theirs') + '">' +
      '<div class="bubble">' + body + '<div class="meta">' + fmtTime(m.at) + '</div></div>' +
      '</div>';
  }

  function renderTalkCard() {
    var t = S.talk;
    if (!t) return '';
    var both = t.pressed.A && t.pressed.B;
    if (!both) return '';

    var html = '<div class="talk-card"><div class="talk-q">刚才最让你难受的是哪一句？</div>';

    ['A', 'B'].forEach(function (u) {
      if (t.answers[u]) {
        html += '<div class="answer"><b>' + (u === S.user ? '你' : 'TA') + '</b>' + esc(t.answers[u]) + '</div>';
      }
    });

    var mineDone = !!t.answers[S.user];
    var bothDone = !!(t.answers.A && t.answers.B);

    if (bothDone) {
      var la = S.user === 'A' ? '你' : 'TA';
      var lb = S.user === 'B' ? '你' : 'TA';
      html += '<div class="reflect"><span>AI 复述（演示）</span>我听到的是——' +
        esc(la) + '：' + esc(clip(t.answers.A, 26)) + '；' +
        esc(lb) + '：' + esc(clip(t.answers.B, 26)) + '。</div>' +
        '<button class="talk-end" data-talk-end="1">收起来</button>';
    } else if (!mineDone) {
      html += '<textarea id="talkAnswer" rows="2" placeholder="各答一句…"></textarea>' +
        '<button class="talk-send" data-talk-answer="1">答一句</button>';
    } else {
      html += '<div class="wait">已答。等对方一句。</div>';
    }

    html += '</div>';
    return html;
  }

  function renderRoom() {
    var items = streamItems();
    var html = '';
    var lastDay = '';

    items.forEach(function (it) {
      if (it.kind === 'trace') {
        html += '<div class="trace">' + esc(it.text) + '</div>';
        return;
      }
      var dk = dayKey(it.at);
      if (dk !== lastDay) {
        html += '<div class="day">' + fmtDate(it.at) + '</div>';
        lastDay = dk;
      }
      html += renderMsg(it.m);
    });

    html += renderTalkCard();

    if (!html) {
      html = '<div class="empty">不用做什么</div>';
    }

    var stream = $('stream');
    stream.innerHTML = html;
    stream.scrollTop = stream.scrollHeight;

    var dot = $('talkDot');
    var showDot = !!S.talk && !(S.talk.pressed.A && S.talk.pressed.B);
    dot.classList.toggle('hidden', !showDot);

    renderStop();
    renderHint();
  }

  function renderStop() {
    var el = $('stopBanner');
    var phone = $('phone');

    if (!S.stop) {
      el.classList.add('hidden');
      phone.classList.remove('dimmed');
      return;
    }

    el.classList.remove('hidden');
    var mine = S.stop.by === S.user;
    phone.classList.toggle('dimmed', mine);

    if (mine) {
      el.innerHTML =
        '<div class="stop-title">你按下了停</div>' +
        '<input id="stopLine" value="' + esc(S.stop.line || '') + '" placeholder="可以不写">' +
        '<div class="stop-sub">只有你能重新点亮</div>' +
        '<button class="relight" id="relight">点亮房间</button>';

      var inp = $('stopLine');
      inp.addEventListener('input', function () {
        S.stop.line = inp.value;
        save();
      });
    } else {
      el.innerHTML =
        '<div class="stop-title">' + esc(S.stop.line || '今晚到这儿') + '</div>' +
        '<div class="stop-sub">对方按下了停 · 你的消息 TA 照常收到</div>';
    }
  }

  function renderHint() {
    var el = $('actionHint');
    if (S.stop && S.stop.by === S.user) {
      el.textContent = '发一句，房间就亮了';
      return;
    }
    if (S.talk) {
      if (S.talk.pressed.A && S.talk.pressed.B) {
        el.textContent = '在聊了';
      } else if (S.talk.pressed[S.user]) {
        el.textContent = '已记下';
      } else {
        el.textContent = '';
      }
      return;
    }
    el.textContent = '';
  }

  /* ---------------- album ---------------- */

  function renderAlbum() {
    var box = $('album');

    if (!S.album.length) {
      box.innerHTML = '<div class="empty">还没有照片</div>';
      return;
    }

    var groups = {};
    S.album.forEach(function (a) {
      var d = new Date(a.at);
      var k = d.getFullYear() + '-' + pad(d.getMonth() + 1);
      (groups[k] = groups[k] || []).push(a);
    });

    var keys = Object.keys(groups).sort().reverse();
    var html = '';

    keys.forEach(function (k) {
      var first = groups[k][0];
      var d0 = new Date(first.at);
      var year = d0.getFullYear();
      var month = d0.getMonth();

      html += '<div class="month"><div class="month-name">' + year + ' 年 ' + (month + 1) + ' 月</div>' +
        '<div class="weekdays"><span>日</span><span>一</span><span>二</span><span>三</span>' +
        '<span>四</span><span>五</span><span>六</span></div><div class="grid">';

      var firstWeekday = new Date(year, month, 1).getDay();
      for (var i = 0; i < firstWeekday; i++) {
        html += '<div class="cell blank"></div>';
      }

      var days = new Date(year, month + 1, 0).getDate();
      for (var day = 1; day <= days; day++) {
        var item = null;
        for (var j = 0; j < groups[k].length; j++) {
          if (new Date(groups[k][j].at).getDate() === day) { item = groups[k][j]; break; }
        }
        if (item) {
          html += '<button class="cell has" data-photo="' + item.id + '">' +
            '<span class="thumb" style="--h:' + item.photo.hue + '"></span>' +
            '<span class="dnum">' + day + '</span></button>';
        } else {
          html += '<div class="cell"><span class="dnum">' + day + '</span></div>';
        }
      }

      html += '</div></div>';
    });

    box.innerHTML = html;
  }

  function openPhoto(id) {
    var item = null;
    for (var i = 0; i < S.album.length; i++) {
      if (S.album[i].id === id) { item = S.album[i]; break; }
    }
    if (!item) return;

    var big = $('bigPhoto');
    big.style.setProperty('--h', item.photo.hue);
    big.style.position = 'relative';
    big.innerHTML = '<span style="position:absolute;left:12px;bottom:10px;font-size:12px;color:rgba(255,255,255,.9)">' +
      esc(item.photo.label) + '</span>';

    $('photoFoot').innerHTML =
      fmtDate(item.at) + ' · ' + esc(item.place || '') +
      '<div style="margin-top:6px">脚注默认只写时间和地点。补一句（演示未接）。</div>';

    $('photoModal').classList.remove('hidden');
  }

  /* ---------------- notes ---------------- */

  function renderNotes() {
    var list = S.notes.slice().sort(function (a, b) { return b.at - a.at; });
    if (!list.length) {
      $('notes').innerHTML = '<div class="empty">还没有。切到「给自己」写一句。</div>';
      return;
    }
    $('notes').innerHTML = list.map(function (n) {
      return '<div class="note"><div class="note-date">' + fmtDate(n.at) + '</div>' + esc(n.text) + '</div>';
    }).join('');
  }

  /* ---------------- 我的 / 设置 ---------------- */

  function pageHead(title) {
    return '<div class="screen-head">' +
      '<button class="back" data-back aria-label="返回">' + ICO.back + '</button>' +
      '<h1 class="page-title">' + title + '</h1>' +
      '</div>';
  }

  function pageFoot(text) {
    return '<p class="page-foot">' + text + '</p>';
  }

  function screenMine() {
    var tgl = '<button class="switch' + (S.notify ? ' on' : '') +
      '" data-toggle-notify aria-label="通知"><i></i></button>';

    return pageHead('我的') +
      '<div class="page-body">' +
        '<div class="card pcard" data-open="profile">' +
          '<span class="mark">' + ICO.mark + '</span>' +
          '<span class="pcard-text"><b>' + esc(S.nickname) + '</b>' +
          '<i>和' + esc(S.partnerName) + ' 在同一个房间</i></span>' +
          '<span class="chev">' + ICO.chevron + '</span>' +
        '</div>' +
        '<div class="card">' +
          '<div class="prow">' +
            '<span class="chip chip-blush">' + ICO.bell + '</span>' +
            '<span class="prow-text"><b>通知</b><i>只推新消息，锁屏不显示内容</i></span>' +
            tgl +
          '</div>' +
          '<div class="prow" data-open="export">' +
            '<span class="chip chip-blue">' + ICO.download + '</span>' +
            '<span class="prow-text"><b>导出</b><i>随时导出，并保留本地副本</i></span>' +
            '<span class="chev">' + ICO.chevron + '</span>' +
          '</div>' +
          '<div class="prow" data-open="recover">' +
            '<span class="chip chip-gold">' + ICO.key + '</span>' +
            '<span class="prow-text"><b>恢复码</b><i>忘记密码时用它来找回</i></span>' +
            '<span class="chev">' + ICO.chevron + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="prow" data-open="how">' +
            '<span class="chip chip-green">' + ICO.help + '</span>' +
            '<span class="prow-text"><b>这个房间怎么运转</b><i>服务器、AI 读什么、怎么关</i></span>' +
            '<span class="chev">' + ICO.chevron + '</span>' +
          '</div>' +
        '</div>' +
        pageFoot('话七天后消失，留下的才进相册') +
        '<p class="page-foot"><button class="link" data-open="invite">演示：邀请码</button></p>' +
      '</div>';
  }

  function screenProfile() {
    function line(k, v) {
      return '<div class="prow plain"><span class="prow-text"><b>' + k + '</b></span>' +
        '<span class="prow-value">' + v + '</span></div>';
    }

    return pageHead('个人资料') +
      '<div class="page-body">' +
        '<div class="card pcard static">' +
          '<span class="mark">' + ICO.mark + '</span>' +
          '<span class="pcard-text"><b>' + esc(S.nickname) + '</b>' +
          '<i>和' + esc(S.partnerName) + ' 在同一个房间</i></span>' +
          '<button class="pill-btn" data-change>更换</button>' +
        '</div>' +
        '<div class="card">' +
          line('昵称', esc(S.nickname)) +
          line('房间里的称呼', esc(S.nickname)) +
          line('房间', '和' + esc(S.partnerName)) +
          line('加入时间', esc(S.joinedAt)) +
        '</div>' +
        pageFoot('称呼只在这个房间里显示') +
      '</div>';
  }

  function screenInvite() {
    return '<div class="screen-head"><button class="back" data-back aria-label="返回">' +
      ICO.back + '</button></div>' +
      '<div class="page-body invite">' +
        '<span class="mark mark-xl">' + ICO.mark + '</span>' +
        '<h1 class="invite-title">有人给你留了一个房间</h1>' +
        '<p class="invite-sub">这个房间只住两个人。输入邀请码进来。</p>' +
        '<div class="code-card">' +
          '<div class="code-cells"><span>K</span><span>7</span><span>Q</span><span class="active"></span></div>' +
          '<p class="code-hint">' + ICO.link + '这个邀请指向 ' + INVITE_URL + '</p>' +
          '<button class="btn btn-green" data-invite-enter>进入房间</button>' +
        '</div>' +
        '<p class="page-foot left">一个邀请码只能注册两个人。进来之后，用户名、密码和恢复码由你自己设。</p>' +
      '</div>';
  }

  function screenExport() {
    var ranges = [['all', '全部'], ['30', '近 30 天'], ['7', '近 7 天']];
    var seg = ranges.map(function (r) {
      return '<button class="seg-btn' + (S.exportRange === r[0] ? ' active' : '') +
        '" data-range="' + r[0] + '">' + r[1] + '</button>';
    }).join('');

    function formatRow(id, title, sub) {
      var on = S.exportFormat === id;
      return '<div class="frow" data-format="' + id + '">' +
        '<span class="prow-text"><b>' + title + '</b><i>' + sub + '</i></span>' +
        '<span class="radio' + (on ? ' on' : '') + '"></span>' +
        '</div>';
    }

    return pageHead('导出') +
      '<div class="page-body">' +
        '<div class="card">' +
          '<p class="card-label">范围</p>' +
          '<div class="seg">' + seg + '</div>' +
        '</div>' +
        '<div class="card">' +
          formatRow('pdf', 'PDF 纪念册', '带照片排版，适合留着看') +
          formatRow('text', '纯文本', '方便搜索和备份') +
        '</div>' +
        '<p class="warn">导出时，对方会收到一条提示</p>' +
        '<button class="btn btn-blue" data-export>生成导出文件</button>' +
        pageFoot('导出的是你的这份副本，照片原图一并打包') +
      '</div>';
  }

  function screenRecover() {
    return pageHead('恢复码') +
      '<div class="page-body">' +
        '<div class="rc-card">' +
          '<p class="rc-label">你的恢复码</p>' +
          '<p class="rc-code">' + CODE + '</p>' +
        '</div>' +
        '<button class="btn btn-gold" data-copy>复制</button>' +
        '<div class="card tips">' +
          '<ul>' +
            '<li>忘记密码时，这是唯一的找回方式</li>' +
            '<li>不要截图留在相册里</li>' +
            '<li>抄在纸上，放在只有你知道的地方</li>' +
          '</ul>' +
        '</div>' +
        pageFoot('我们也看不到这串码，丢了就真的丢了') +
      '</div>';
  }

  function screenHow() {
    var items = [
      ['green', ICO.clock, '七天', '消息只留七天。到期从服务器删除，我们也找不回来。'],
      ['blue', ICO.server, '服务器', '只存这个房间的内容，不做推荐，不给任何人看。'],
      ['green', ICO.ai, 'AI 读什么', '只有点「想聊」时才读最近这段对话，生成一张卡片，不留存、不他用。'],
      ['grey', ICO.mark, '怎么关掉', '想离开时，先在「我的」里导出，再删除房间，两边同时清空。']
    ];

    var cards = items.map(function (it) {
      return '<div class="card how-card">' +
        '<div class="how-head"><span class="chip chip-' + it[0] + '">' + it[1] + '</span>' +
        '<b>' + it[2] + '</b></div>' +
        '<p>' + it[3] + '</p>' +
        '</div>';
    }).join('');

    return pageHead('这个房间怎么运转') +
      '<div class="page-body">' + cards +
      pageFoot('这一页随时可以从「我的」里再看') +
      '</div>';
  }

  function renderScreen() {
    var el = $('screen');
    if (!S.screen) {
      el.classList.add('hidden');
      el.classList.remove('enter');
      el.innerHTML = '';
      el.dataset.screen = '';
      return;
    }

    var html = '';
    if (S.screen === 'mine') html = screenMine();
    else if (S.screen === 'profile') html = screenProfile();
    else if (S.screen === 'invite') html = screenInvite();
    else if (S.screen === 'export') html = screenExport();
    else if (S.screen === 'recover') html = screenRecover();
    else if (S.screen === 'how') html = screenHow();

    var changed = el.dataset.screen !== S.screen;
    el.innerHTML = html;
    el.classList.remove('hidden');
    el.dataset.screen = S.screen;
    if (changed) {
      el.classList.add('enter');
    }
    el.scrollTop = 0;
  }

  /* ---------------- 留图确认 ---------------- */

  function renderLeave() {
    var el = $('leaveSheet');
    if (!S.leavePending) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }

    el.innerHTML =
      '<div class="sheet-mask" data-leave-cancel></div>' +
      '<div class="sheet" role="dialog" aria-label="留下这张照片">' +
        '<div class="sheet-ico">' + ICO.bookmark + '</div>' +
        '<h3>留下这张照片</h3>' +
        '<ul class="sheet-list">' +
          '<li>永久</li>' +
          '<li>两个人共同的内容</li>' +
          '<li>只能从我这边隐藏，不能单方删除</li>' +
        '</ul>' +
        '<div class="sheet-btns">' +
          '<button class="btn btn-ghost" data-leave-cancel>取消</button>' +
          '<button class="btn btn-rose" data-leave-confirm>留下</button>' +
        '</div>' +
      '</div>';
    el.classList.remove('hidden');
  }

  /* ---------------- actions ---------------- */

  function send() {
    var el = $('input');
    var v = el.value.trim();
    if (!v) return;

    if (S.mode === 'self') {
      S.notes.push({ id: uid('n'), at: now(), text: v });
      el.value = '';
      toast('放进抽屉了');
      render();
      return;
    }

    if (S.stop && S.stop.by === S.user) {
      S.stop = null;
    }

    S.messages.push({ id: uid('m'), from: S.user, type: 'text', text: v, at: now() });
    el.value = '';
    render();
  }

  function keepPhoto(messageId) {
    var m = null;
    for (var i = 0; i < S.messages.length; i++) {
      if (S.messages[i].id === messageId) { m = S.messages[i]; break; }
    }
    if (!m || m.type !== 'photo') return;
    if (S.album.some(function (a) { return a.photo.id === m.photo.id; })) return;

    S.album.push({ id: uid('k'), photo: m.photo, at: m.at, place: m.photo.place });
    toast('留住了');
    render();
  }

  function doStop() {
    if (!S.stop) {
      S.stop = { by: S.user, line: '今晚到这儿', at: now() };
      toast('房间暗了');
    } else if (S.stop.by === S.user) {
      toast('再发一句，房间就亮了');
    } else {
      toast('对方按下了停');
    }
    render();
  }

  function pressTalk() {
    var n = now();
    if (!S.talk) {
      S.talk = {
        pressed: { A: false, B: false },
        at: n,
        expireAt: endOfDay(n),
        talking: false,
        answers: {}
      };
    }
    if (S.talk.pressed[S.user]) {
      toast(S.talk.pressed.A && S.talk.pressed.B ? '在聊了' : '已记下，等对方');
      return;
    }
    S.talk.pressed[S.user] = true;
    if (S.talk.pressed.A && S.talk.pressed.B) {
      S.talk.talking = true;
      S.talk.expireAt = n + DAY;
    }
    toast(S.talk.pressed.A && S.talk.pressed.B ? '两个人都按了' : '已记下');
    render();
  }

  function answerTalk() {
    var ta = $('talkAnswer');
    if (!ta || !S.talk) return;
    var v = ta.value.trim();
    if (!v) return;
    S.talk.answers[S.user] = v;
    render();
  }

  function endTalk() {
    S.talk = null;
    S.talkTrace = null;
    toast('收起来了');
    render();
  }

  function jump(days) {
    S.offset = (S.offset || 0) + days * DAY;
    checkExpiry();
    $('timeModal').classList.add('hidden');
    toast('+' + days + ' 天');
    render();
  }

  /* ---------------- events ---------------- */

  document.querySelectorAll('[data-user]').forEach(function (b) {
    b.addEventListener('click', function () {
      S.user = b.dataset.user;
      render();
    });
  });

  document.querySelectorAll('[data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      S.tab = b.dataset.tab;
      render();
    });
  });

  document.querySelectorAll('[data-mode]').forEach(function (b) {
    b.addEventListener('click', function () {
      S.mode = b.dataset.mode;
      render();
    });
  });

  $('sendBtn').addEventListener('click', send);
  $('stopBtn').addEventListener('click', doStop);
  $('talkBtn').addEventListener('click', pressTalk);

  $('input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  $('timeBtn').addEventListener('click', function () {
    $('timeModal').classList.remove('hidden');
  });
  $('timeClose').addEventListener('click', function () {
    $('timeModal').classList.add('hidden');
  });

  document.querySelectorAll('[data-jump]').forEach(function (b) {
    b.addEventListener('click', function () {
      jump(Number(b.dataset.jump));
    });
  });

  $('resetBtn').addEventListener('click', function () {
    try { localStorage.removeItem(STORE); } catch (e) {}
    location.reload();
  });

  $('drawerBtn').addEventListener('click', function () {
    $('drawer').classList.remove('hidden');
  });
  $('drawerClose').addEventListener('click', function () {
    $('drawer').classList.add('hidden');
  });

  $('photoClose').addEventListener('click', function () {
    $('photoModal').classList.add('hidden');
  });

  $('roomView').addEventListener('click', function (e) {
    var keep = e.target.closest('[data-keep]');
    if (keep) {
      S.leavePending = keep.dataset.keep;
      render();
      return;
    }

    var ans = e.target.closest('[data-talk-answer]');
    if (ans) { answerTalk(); return; }

    var end = e.target.closest('[data-talk-end]');
    if (end) { endTalk(); return; }

    var relight = e.target.closest('#relight');
    if (relight) {
      S.stop = null;
      render();
      toast('房间亮了');
    }
  });

  $('album').addEventListener('click', function (e) {
    var p = e.target.closest('[data-photo]');
    if (p) openPhoto(p.dataset.photo);
  });

  /* ---------------- 我的 / 设置 ---------------- */

  $('meBtn').addEventListener('click', function () {
    S.screen = 'mine';
    render();
  });

  $('screen').addEventListener('click', function (e) {
    if (e.target.closest('[data-back]')) {
      S.screen = S.screen === 'mine' ? null : 'mine';
      render();
      return;
    }

    var open = e.target.closest('[data-open]');
    if (open) { S.screen = open.getAttribute('data-open'); render(); return; }

    if (e.target.closest('[data-toggle-notify]')) { S.notify = !S.notify; render(); return; }
    if (e.target.closest('[data-invite-enter]')) {
      S.screen = null;
      render();
      toast('已经在这个房间里了');
      return;
    }

    var rg = e.target.closest('[data-range]');
    if (rg) { S.exportRange = rg.getAttribute('data-range'); render(); return; }

    var fm = e.target.closest('[data-format]');
    if (fm) { S.exportFormat = fm.getAttribute('data-format'); render(); return; }

    if (e.target.closest('[data-export]')) { toast('导出的是你的这份副本（演示未接）'); return; }
    if (e.target.closest('[data-copy]')) { copyCode(); return; }
    if (e.target.closest('[data-change]')) { toast('演示里不改资料'); return; }
  });

  $('leaveSheet').addEventListener('click', function (e) {
    if (e.target.closest('[data-leave-cancel]')) {
      S.leavePending = null;
      render();
      return;
    }
    if (e.target.closest('[data-leave-confirm]')) {
      var id = S.leavePending;
      S.leavePending = null;
      keepPhoto(id);
    }
  });

  function copyCode() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(CODE);
        toast('已复制');
        return;
      }
    } catch (e) {}
    toast(CODE);
  }

  /* ---------------- boot ---------------- */

  var splash = $('splash');
  if (splash) {
    setTimeout(function () { splash.classList.add('hidden'); }, 900);
    splash.addEventListener('click', function () { splash.classList.add('hidden'); });
  }

  render();
})();
