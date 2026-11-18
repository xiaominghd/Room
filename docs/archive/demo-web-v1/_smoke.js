// Temporary smoke test: run app.js against a tiny DOM shim.
const fs = require('fs');
const vm = require('vm');

function makeEl(id) {
  const el = {
    id: id,
    dataset: {},
    _h: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, force) {
        const on = force === undefined ? !this._s.has(c) : !!force;
        if (on) this._s.add(c); else this._s.delete(c);
        return on;
      }
    },
    style: { setProperty() {} },
    addEventListener(type, fn) { this._h[type] = fn; },
    innerHTML: '',
    textContent: '',
    value: '',
    placeholder: '',
    scrollTop: 0,
    scrollHeight: 0
  };
  return el;
}

const ids = {};
const byId = (id) => ids[id] || (ids[id] = makeEl(id));

const users = [makeEl('uA'), makeEl('uB')];
users[0].dataset.user = 'A';
users[1].dataset.user = 'B';

const tabs = [makeEl('tRoom'), makeEl('tAlbum')];
tabs[0].dataset.tab = 'room';
tabs[1].dataset.tab = 'album';

const modes = [makeEl('mTo'), makeEl('mSelf')];
modes[0].dataset.mode = 'to';
modes[1].dataset.mode = 'self';

const jumps = [makeEl('j1'), makeEl('j3'), makeEl('j7')];
[1, 3, 7].forEach((n, i) => { jumps[i].dataset.jump = String(n); });

const document = {
  getElementById: byId,
  querySelectorAll(sel) {
    if (sel === '[data-user]') return users;
    if (sel === '[data-tab]') return tabs;
    if (sel === '[data-mode]') return modes;
    if (sel === '[data-jump]') return jumps;
    return [];
  },
  addEventListener() {}
};

const store = {};
const localStorage = {
  getItem(k) { return store[k] || null; },
  setItem(k, v) { store[k] = v; },
  removeItem(k) { delete store[k]; }
};
const location = { reload() {} };

const ctx = { document, localStorage, location, console, setTimeout, clearTimeout, Date, Math, JSON };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('D:/Work/IM/demo/app.js', 'utf8'), ctx);

const stream = byId('stream');
const album = byId('album');
const count = (s, re) => (s.match(re) || []).length;

console.log('boot ok');
console.log('live photo in room:', stream.innerHTML.includes('便利店的关东煮'));
console.log('trace in room:', count(stream.innerHTML, /class="trace"/g) === 1);
console.log('album seeded:', count(album.innerHTML, /data-photo=/g) === 1);

// keep the 2-day photo
byId('roomView')._h.click({
  target: { closest: (sel) => (sel === '[data-keep]' ? { dataset: { keep: 'm5' } } : null) }
});
console.log('leave sheet open:', byId('leaveSheet').innerHTML.includes('留下这张照片'));
byId('leaveSheet')._h.click({
  target: { closest: (sel) => (sel === '[data-leave-confirm]' ? { dataset: {} } : null) }
});
console.log('keep adds album cell:', count(album.innerHTML, /data-photo=/g) === 2);
console.log('kept marker:', stream.innerHTML.includes('已留'));

// self note
byId('input').value = '今天其实有点累';
modes[1]._h.click();
byId('sendBtn')._h.click();
console.log('self note saved:', byId('notes').innerHTML.includes('今天其实有点累'));

// +7 days
jumps[2]._h.click();
console.log('after +7d traces:', count(stream.innerHTML, /class="trace"/g) === 3);
console.log('after +7d live photo gone:', !stream.innerHTML.includes('便利店的关东煮'));
console.log('after +7d kept photo stays:', count(album.innerHTML, /data-photo=/g) === 2);

// stop as A
byId('stopBtn')._h.click();
console.log('stop banner (A):', byId('stopBanner').innerHTML.includes('你按下了停'));

// switch to B
users[1]._h.click();
console.log('stop banner (B):', byId('stopBanner').innerHTML.includes('对方按下了停'));

// talk: A and B both press
users[0]._h.click();
byId('talkBtn')._h.click();
users[1]._h.click();
byId('talkBtn')._h.click();
console.log('talk card visible:', stream.innerHTML.includes('刚才最让你难受'));
console.log('talk dot hidden when both:', byId('talkDot').classList.contains('hidden'));

// 我的 / 导出 / 返回
byId('meBtn')._h.click();
console.log('mine screen:', byId('screen').innerHTML.includes('这个房间怎么运转'));
byId('screen')._h.click({
  target: { closest: (sel) => (sel === '[data-open]' ? { getAttribute: () => 'export' } : null) }
});
console.log('export screen:', byId('screen').innerHTML.includes('生成导出文件'));
byId('screen')._h.click({
  target: { closest: (sel) => (sel === '[data-range]' ? { getAttribute: () => '30' } : null) }
});
console.log('range switched:', byId('screen').innerHTML.includes('近 30 天'));
byId('screen')._h.click({
  target: { closest: (sel) => (sel === '[data-back]' ? { dataset: {} } : null) }
});
console.log('back to mine:', byId('screen').innerHTML.includes('这个房间怎么运转'));
