const BROKER = 'wss://broker.emqx.io:8084/mqtt';
// Portfolio/demo build: the live device topic stays in the private controller.
// This public build intentionally targets a demo topic so it can never control the real Pleco.
const TOPIC = 'wled/demo/api';
const HOTCOLD_TOPIC = 'wled/demo/hotcold';
let client = null;
let connected = false;
let lightOn = false;

function setStatus(state, text) {
  document.getElementById('dot').className = 'status-dot ' + state;
  document.getElementById('status-text').textContent = text;
}
function setPowerUI(state) {
  const btn = document.getElementById('power-btn');
  btn.classList.remove('on', 'connecting', 'error');
  if (state) btn.classList.add(state);
}
function addLog(msg, type) {
  const l = document.getElementById('log');
  const d = document.createElement('div');
  d.className = 'log-entry ' + (type || '');
  d.textContent = msg;
  l.appendChild(d);
  l.scrollTop = l.scrollHeight;
}
function setActivePreset(num) {
  document.querySelectorAll('.preset-btn, .arc-item, .day-btn, .tracker-btn').forEach(b => b.classList.remove('active'));
  if (num != null) {
    const sel = '[data-preset="' + num + '"]';
    document.querySelectorAll(sel).forEach(b => {
      if (b.classList.contains('preset-btn') || b.classList.contains('arc-item') || b.classList.contains('day-btn') || b.classList.contains('tracker-btn')) {
        b.classList.add('active');
      }
    });
  }
}

function connectBroker() {
  return new Promise((resolve, reject) => {
    if (connected) { resolve(); return; }
    setStatus('sending', 'connecting...');
    setPowerUI('connecting');
    addLog('connecting...', 'info');
    const id = 'fish_' + Math.random().toString(16).substr(2,8);
    client = mqtt.connect(BROKER, { clientId: id, clean: true, connectTimeout: 10000, reconnectPeriod: 3000 });
    client.on('connect', () => {
      connected = true;
      setStatus('success', 'connected');
      addLog('connected — ready to send', 'ok');
      setPowerUI(lightOn ? 'on' : null);
      try { client.subscribe(HOTCOLD_TOPIC, { qos: 0 }); } catch {}
      resolve();
    });
    client.on('message', (topic, payload) => {
      if (topic !== HOTCOLD_TOPIC) return;
      try {
        hcState = JSON.parse(payload.toString());
        hcRender(); hcUpdateStatus(); hcSendLEDs();
      } catch {}
    });
    client.on('error', (e) => {
      connected = false;
      setStatus('error', 'error');
      setPowerUI('error');
      addLog('error: ' + (e.message || e), 'err');
      reject(e);
    });
    client.on('close', () => {
      if (connected) {
        connected = false; lightOn = false;
        setStatus('sending', 'reconnecting\u2026');
        setPowerUI('connecting');
        addLog('connection lost \u2014 retrying\u2026', 'err');
      }
    });
    client.on('reconnect', () => {
      setStatus('sending', 'reconnecting\u2026');
      setPowerUI('connecting');
    });
  });
}
function publish(payload) {
  return new Promise((resolve, reject) => {
    if (!connected || !client) { reject(new Error('not connected')); return; }
    client.publish(TOPIC, payload, {qos: 0}, (err) => { if (err) reject(err); else resolve(); });
  });
}
let connectPromise = null;
async function ensureConnected() {
  if (connected) return true;
  if (!connectPromise) connectPromise = connectBroker().finally(() => { connectPromise = null; });
  try { await connectPromise; return true; } catch { return false; }
}

async function sendPreset(num, name) {
  setStatus('sending', 'sending...');
  try {
    await publish('PL=' + num);
    setStatus('success', 'sent');
    addLog('preset ' + num + ' (' + name + ') sent', 'ok');
    return true;
  } catch {
    setStatus('error', 'failed');
    addLog('send failed', 'err');
    return false;
  }
}

async function togglePower() {
  if (!(await ensureConnected())) return;
  if (lightOn) {
    const ok = await sendPreset(10, 'light off');
    if (ok) { lightOn = false; setPowerUI(null); setActivePreset(null); }
  } else {
    const ok = await sendPreset(1, 'default');
    if (ok) { lightOn = true; setPowerUI('on'); setActivePreset(1); }
  }
}

function emitBubbles(x, y, n) {
  n = n || 4;
  for (let i = 0; i < n; i++) {
    const b = document.createElement('div');
    b.className = 'tap-bubble';
    b.style.left = x + 'px';
    b.style.top  = y + 'px';
    const size = 5 + Math.random() * 9;
    b.style.width = size + 'px';
    b.style.height = size + 'px';
    b.style.setProperty('--dx', ((Math.random() - 0.5) * 50) + 'px');
    b.style.animationDuration = (1 + Math.random() * 0.6) + 's';
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 1700);
  }
}

document.querySelectorAll('.tab-btn').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('tab-' + t.dataset.tab).classList.add('active');
  });
});

document.getElementById('log-toggle').addEventListener('click', (e) => {
  e.currentTarget.classList.toggle('expanded');
  document.getElementById('log').classList.toggle('expanded');
});

function addTapListener(el, fn) {
  el.addEventListener('click', (e) => fn(e));
  el.addEventListener('touchend', function(e) { e.preventDefault(); fn(e); });
}

addTapListener(document.getElementById('power-btn'), (e) => {
  const rect = e.currentTarget ? e.currentTarget.getBoundingClientRect() : null;
  if (rect) emitBubbles(rect.left + rect.width/2, rect.top + rect.height/2, 6);
  togglePower();
});

addTapListener(document.getElementById('chip-call'), async (e) => {
  if (!(await ensureConnected())) return;
  if (e && e.clientX != null) emitBubbles(e.clientX, e.clientY, 4);
  const ok = await sendPreset(16, 'calling');
  if (ok) { lightOn = true; setPowerUI('on'); setActivePreset(null); }
});
addTapListener(document.getElementById('chip-default'), async (e) => {
  if (!(await ensureConnected())) return;
  if (e && e.clientX != null) emitBubbles(e.clientX, e.clientY, 4);
  const ok = await sendPreset(1, 'default');
  if (ok) { lightOn = true; setPowerUI('on'); setActivePreset(1); }
});

addTapListener(document.getElementById('custom-send'), async () => {
  const val = document.getElementById('custom-num').value;
  if (!val) return;
  if (!(await ensureConnected())) return;
  const ok = await sendPreset(val, 'preset ' + val);
  if (ok) { lightOn = true; setPowerUI('on'); setActivePreset(val); }
});

/* All tappable preset surfaces: arc items, preset buttons, day buttons, morse
 * (the sun/moon tracker buttons have their own handlers — they also hand off to the tracker) */
document.querySelectorAll('.arc-item, .preset-btn, .day-btn, .morse-btn').forEach(btn => {
  addTapListener(btn, async (e) => {
    if (!(await ensureConnected())) return;
    if (e && e.touches && e.touches[0]) {
      emitBubbles(e.touches[0].clientX, e.touches[0].clientY, 3);
    } else if (e && e.clientX != null) {
      emitBubbles(e.clientX, e.clientY, 3);
    }
    const ok = await sendPreset(btn.dataset.preset, btn.dataset.name);
    if (ok) {
      lightOn = true; setPowerUI('on');
      // Morse doesn't get a persistent active marker (it's a signal, not a mode)
      if (btn.classList.contains('morse-btn')) setActivePreset(null);
      else setActivePreset(btn.dataset.preset);
    }
  });
});

/* Sleep tracker handoff: Sun wakes the lights (good morning), Moon settles
   them (good evening) — then both hand off to the sleep tracker. */
[['tracker-sun', '13', 'good morning'], ['tracker-moon', '14', 'good evening']].forEach(([id, preset, name]) => {
  addTapListener(document.getElementById(id), async () => {
    if (!(await ensureConnected())) return;
    const ok = await sendPreset(preset, name);
    if (ok) { lightOn = true; setPowerUI('on'); setActivePreset(preset); }
    addLog('off to the sleep tracker \u2192', 'ok');
    setTimeout(() => { window.location.href = 'https://prachidpatel.github.io/fish-and-chips-sleep-tracker/'; }, 700);
  });
});

/* ===== game fullscreen: expand / minimize / rotate (hot/cold + snake) ===== */
const gameFs = { open: false, rotated: false, tab: null, moved: [] };

function gameFsFit() {
  if (!gameFs.open) return;
  const stage = document.getElementById('game-fs-stage');
  const svg = stage.querySelector('svg');
  if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
  const vb = svg.viewBox.baseVal;
  const a = vb.width / vb.height;
  const vw = stage.clientWidth, vh = stage.clientHeight;
  let w, h;
  if (stage.classList.contains('rotated')) {
    // after a 90deg turn the svg's height runs horizontally: fit h_svg<=vw, w_svg<=vh
    h = Math.min(vw, vh / a);
    w = a * h;
  } else {
    const s = Math.min(vw / vb.width, vh / vb.height);
    w = vb.width * s; h = vb.height * s;
  }
  svg.style.width = Math.floor(w) + 'px';
  svg.style.height = Math.floor(h) + 'px';
}

function gameFsMove(node, dest) {
  gameFs.moved.push({ node, parent: node.parentNode, next: node.nextSibling });
  dest.appendChild(node);
}

function gameFsOpen(tab) {
  if (gameFs.open) return;
  gameFs.open = true; gameFs.tab = tab; gameFs.moved = [];
  const stage = document.getElementById('fs-rot');
  const controls = document.getElementById('game-fs-controls');
  const title = document.getElementById('game-fs-title');
  if (tab === 'hotcold') {
    title.textContent = 'hot & cold';
    gameFsMove(document.querySelector('#tab-hotcold .canvas-wrap'), stage);
    gameFsMove(document.querySelector('#tab-hotcold .pixel-actions'), controls);
    HC_DOT_SCALE = 1.7;
    hcRender();
  } else {
    title.textContent = 'snake';
    gameFsMove(document.querySelector('#tab-snake .snake-grid'), stage);
    gameFsMove(document.querySelector('#tab-snake .snake-score-row'), controls);
    gameFsMove(document.querySelector('#tab-snake .dpad'), controls);
  }
  document.getElementById('game-fs').classList.add('open');
  document.getElementById('game-fs').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(gameFsFit);
}

function gameFsClose() {
  if (!gameFs.open) return;
  for (let i = gameFs.moved.length - 1; i >= 0; i--) {
    const m = gameFs.moved[i];
    m.parent.insertBefore(m.node, m.next);
  }
  gameFs.moved = [];
  gameFs.open = false; gameFs.tab = null;
  document.getElementById('game-fs-stage').classList.remove('rotated');
  gameFs.rotated = false;
  const stage = document.getElementById('fs-rot');
  const svg = stage.querySelector('svg');
  if (svg) { svg.style.width = ''; svg.style.height = ''; }
  document.getElementById('game-fs').classList.remove('open');
  document.getElementById('game-fs').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (typeof HC_DOT_SCALE !== 'undefined' && HC_DOT_SCALE !== 1) { HC_DOT_SCALE = 1; hcRender(); }
}

function gameFsToggleRotate() {
  if (!gameFs.open) return;
  gameFs.rotated = !gameFs.rotated;
  document.getElementById('game-fs-stage').classList.toggle('rotated', gameFs.rotated);
  requestAnimationFrame(gameFsFit);
}

addTapListener(document.getElementById('snake-expand'), () => gameFsOpen('snake'));
addTapListener(document.getElementById('game-fs-close'), gameFsClose);
addTapListener(document.getElementById('game-fs-rotate'), gameFsToggleRotate);
window.addEventListener('resize', gameFsFit);
window.addEventListener('orientationchange', () => setTimeout(gameFsFit, 300));
