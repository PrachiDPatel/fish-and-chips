const BROKER = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC = 'wled/b6fba0/api';
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
  document.querySelectorAll('.preset-btn, .arc-item, .day-btn').forEach(b => b.classList.remove('active'));
  if (num != null) {
    const sel = '[data-preset="' + num + '"]';
    document.querySelectorAll(sel).forEach(b => {
      if (b.classList.contains('preset-btn') || b.classList.contains('arc-item') || b.classList.contains('day-btn')) {
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
    const id = 'orion_' + Math.random().toString(16).substr(2,8);
    client = mqtt.connect(BROKER, { clientId: id, clean: true, connectTimeout: 10000, reconnectPeriod: 0 });
    client.on('connect', () => {
      connected = true;
      setStatus('success', 'connected');
      addLog('connected — ready to send', 'ok');
      setPowerUI(lightOn ? 'on' : null);
      resolve();
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
        setStatus('error', 'disconnected');
        setPowerUI(null);
        addLog('disconnected', 'err');
      }
    });
  });
}
function publish(payload) {
  return new Promise((resolve, reject) => {
    if (!connected || !client) { reject(new Error('not connected')); return; }
    client.publish(TOPIC, payload, {qos: 0}, (err) => { if (err) reject(err); else resolve(); });
  });
}
async function ensureConnected() {
  if (connected) return true;
  try { await connectBroker(); return true; } catch { return false; }
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

/* All tappable preset surfaces: arc items, preset buttons, day buttons, morse */
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
