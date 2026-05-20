/* ===== Pixel editor =====
 * Top-down pleco view, both pectoral fins extended (modeled on pleco-icon.png).
 * Total: 47 LEDs.
 * Wiring order (matches the physical strand):
 *   0-4   tail fan
 *   5-28  body, 6 columns × 4 rows, wired column-by-column from tail end to head end
 *   29-33 left pectoral fin
 *   34-38 right pectoral fin
 *   39-46 head (back of head → snout)
 */
const LED_POSITIONS = [
  // 0-4: tail fan (right side)
  {x: 228, y: 80},
  {x: 218, y: 56}, {x: 218, y: 104},
  {x: 206, y: 46}, {x: 206, y: 114},

  // 5-28: body, 6 cols x 4 rows, tail-to-front column order
  // col @ x=162
  {x: 162, y: 60}, {x: 162, y: 74}, {x: 162, y: 86}, {x: 162, y: 98},
  // col @ x=144
  {x: 144, y: 60}, {x: 144, y: 74}, {x: 144, y: 86}, {x: 144, y: 98},
  // col @ x=126
  {x: 126, y: 60}, {x: 126, y: 74}, {x: 126, y: 86}, {x: 126, y: 98},
  // col @ x=108
  {x: 108, y: 60}, {x: 108, y: 74}, {x: 108, y: 86}, {x: 108, y: 98},
  // col @ x=90
  {x:  90, y: 60}, {x:  90, y: 74}, {x:  90, y: 86}, {x:  90, y: 98},
  // col @ x=74
  {x:  74, y: 60}, {x:  74, y: 74}, {x:  74, y: 86}, {x:  74, y: 98},

  // 29-33: left pectoral fin (5 LEDs, fan up)
  {x:  74, y: 44}, {x:  86, y: 30}, {x: 102, y: 18}, {x: 116, y: 22}, {x: 124, y: 38},

  // 34-38: right pectoral fin (5 LEDs, fan down)
  {x:  74, y: 114}, {x:  86, y: 128}, {x: 102, y: 140}, {x: 116, y: 136}, {x: 124, y: 120},

  // 39-46: head (8 LEDs)
  {x:  60, y: 60}, {x:  60, y: 98},
  {x:  48, y: 56}, {x:  48, y: 80}, {x:  48, y: 102},
  {x:  34, y: 60}, {x:  34, y: 100},
  {x:  22, y: 80}
];

const PALETTE = [
  'ffffff', 'ff3030', 'ff8000', 'ffd400',
  '40ff40', '00d4d4', '3070ff', '6020ff',
  'd040ff', 'ff40b0', 'ff80c0', '203050'
];

let currentColor = PALETTE[2];
const pixelState = new Array(LED_POSITIONS.length).fill(null);

function renderPalette() {
  const pal = document.getElementById('palette');
  pal.innerHTML = '';
  PALETTE.forEach((hex) => {
    const s = document.createElement('button');
    s.className = 'swatch';
    s.style.background = '#' + hex;
    s.style.setProperty('--swatch-color', '#' + hex);
    s.dataset.color = hex;
    if (hex === currentColor) s.classList.add('active');
    addTapListener(s, () => {
      currentColor = hex;
      document.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
    });
    pal.appendChild(s);
  });
  const custom = document.createElement('label');
  custom.className = 'swatch custom-swatch';
  custom.title = 'custom color';
  const input = document.createElement('input');
  input.type = 'color';
  input.value = '#' + currentColor;
  input.addEventListener('input', (e) => {
    currentColor = e.target.value.replace('#','').toLowerCase();
    custom.style.setProperty('--swatch-color', e.target.value);
    document.querySelectorAll('.swatch').forEach(x => x.classList.remove('active'));
    custom.classList.add('active');
  });
  custom.appendChild(input);
  pal.appendChild(custom);
}

function renderLEDs() {
  const g = document.getElementById('leds');
  g.innerHTML = '';
  LED_POSITIONS.forEach((p, idx) => {
    const ledGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    ledGroup.setAttribute('class', 'led-group');
    ledGroup.setAttribute('data-index', idx);

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hit.setAttribute('class', 'led-hit');
    hit.setAttribute('cx', p.x);
    hit.setAttribute('cy', p.y);
    hit.setAttribute('r', 6.5);

    const led = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    led.setAttribute('class', 'led');
    led.setAttribute('cx', p.x);
    led.setAttribute('cy', p.y);
    led.setAttribute('r', 3.2);

    ledGroup.appendChild(hit);
    ledGroup.appendChild(led);
    g.appendChild(ledGroup);

    addTapListener(ledGroup, () => {
      if (pixelState[idx] === currentColor) {
        pixelState[idx] = null;
      } else {
        pixelState[idx] = currentColor;
      }
      paintLED(idx);
    });
  });
}

function paintLED(idx) {
  const ledGroup = document.querySelector('.led-group[data-index="' + idx + '"]');
  if (!ledGroup) return;
  const color = pixelState[idx];
  if (color) {
    ledGroup.classList.add('lit');
    ledGroup.style.color = '#' + color;
  } else {
    ledGroup.classList.remove('lit');
    ledGroup.style.color = '';
  }
}
function paintAllLEDs() { for (let i = 0; i < pixelState.length; i++) paintLED(i); }

async function sendPixels() {
  if (!(await ensureConnected())) return;
  const arr = [];
  for (let i = 0; i < pixelState.length; i++) {
    arr.push(i);
    arr.push(pixelState[i] || '000000');
  }
  const payload = JSON.stringify({ on: true, bri: 255, seg: { i: arr } });
  setStatus('sending', 'sending pixels...');
  try {
    await publish(payload);
    setStatus('success', 'pixels sent');
    const lit = pixelState.filter(c => c).length;
    addLog('sent ' + lit + ' lit pixel(s)', 'ok');
    lightOn = lit > 0; setPowerUI(lit > 0 ? 'on' : null);
    setActivePreset(null);
  } catch {
    setStatus('error', 'failed');
    addLog('pixel send failed', 'err');
  }
}

function clearPixels() {
  for (let i = 0; i < pixelState.length; i++) pixelState[i] = null;
  paintAllLEDs();
}

renderPalette();
renderLEDs();
addTapListener(document.getElementById('btn-send-pixels'), sendPixels);
addTapListener(document.getElementById('btn-clear'), clearPixels);
