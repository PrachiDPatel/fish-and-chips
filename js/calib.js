const _settingsOverlay = document.getElementById('settings-overlay');
const _settingsDrawer  = document.getElementById('settings-drawer');
function openSettings()  { _settingsDrawer.classList.add('open');    _settingsOverlay.classList.add('open'); }
function closeSettings() { _settingsDrawer.classList.remove('open'); _settingsOverlay.classList.remove('open'); }
document.getElementById('settings-btn').addEventListener('click', () => {
  if (_settingsDrawer.classList.contains('open')) closeSettings();
  else openSettings();
});
_settingsOverlay.addEventListener('click', closeSettings);

const CALIB_TOTAL  = 50;
const CALIB_TICK   = 2000;
const CALIB_COLORS = ['ff0000', '0055ff', '00ff55'];
const CALIB_NAMES  = ['red', 'blue', 'green'];
const CALIB_CLASS  = ['red-led', 'blue-led', 'green-led'];

let calibIdx     = 0;
let calibRunning = false;
let calibTimer   = null;

function calibUpdateUI() {
  const ci = calibIdx % 3;
  const numEl  = document.getElementById('calib-num');
  const nameEl = document.getElementById('calib-color-name');
  numEl.textContent  = calibIdx;
  numEl.className    = 'calib-counter ' + CALIB_CLASS[ci];
  nameEl.textContent = CALIB_NAMES[ci];
  nameEl.className   = 'calib-color-name ' + CALIB_CLASS[ci];
  document.getElementById('calib-fill').style.width = Math.round((calibIdx / CALIB_TOTAL) * 100) + '%';
  document.getElementById('calib-progress-text').textContent = calibIdx + ' / ' + CALIB_TOTAL;
}

async function calibSendLED(idx) {
  if (!connected) return;
  const colors = new Array(LED_POSITIONS.length).fill('000000');
  colors[idx] = CALIB_COLORS[idx % 3];
  const arr = [];
  colors.forEach((c, i) => arr.push(i, c));
  try { await publish(JSON.stringify({ on: true, bri: 255, seg: { i: arr } })); } catch {}
}

async function calibStep() {
  if (calibIdx >= CALIB_TOTAL) {
    calibStop();
    document.getElementById('calib-num').textContent = '✓';
    document.getElementById('calib-color-name').textContent = 'done!';
    document.getElementById('calib-color-name').className = 'calib-color-name green-led';
    document.getElementById('calib-fill').style.width = '100%';
    document.getElementById('calib-progress-text').textContent = CALIB_TOTAL + ' / ' + CALIB_TOTAL;
    try { await publish(JSON.stringify({ on: false })); } catch {}
    return;
  }
  calibUpdateUI();
  await calibSendLED(calibIdx);
  calibIdx++;
}

function calibStop() {
  if (calibTimer) { clearInterval(calibTimer); calibTimer = null; }
  calibRunning = false;
  const btn = document.getElementById('calib-start');
  btn.textContent = 'start'; btn.classList.remove('running');
}

addTapListener(document.getElementById('calib-start'), async () => {
  if (calibRunning) {
    calibStop();
    try { await publish(JSON.stringify({ on: false })); } catch {}
    return;
  }
  if (!(await ensureConnected())) return;
  calibIdx = 0; calibRunning = true;
  const btn = document.getElementById('calib-start');
  btn.textContent = 'stop'; btn.classList.add('running');
  await calibStep();
  calibTimer = setInterval(calibStep, CALIB_TICK);
});
