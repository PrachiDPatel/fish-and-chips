/* ===== Pixel editor =====
 * Top-down pleco view. 47 LEDs (indices 0-46).
 * Calibrated from video: strand runs SNOUT → TAIL (LED 0 = head tip, LED ~46 = tail).
 * Detected positions (blue LEDs, frame-by-frame): 4,7,10,13,16,19,22,25,27,28,31,33,34,37,40,42,43.
 * Remaining positions interpolated between detected anchors.
 */
const LED_POSITIONS = [
  // 0-3: snout tip (extrapolated, buried in head stuffing)
  {x:  30, y: 78}, {x:  36, y: 72}, {x:  42, y: 78}, {x:  50, y: 84},
  // 4: head (calibrated)
  {x:  60, y: 73},
  // 5-6: interp 4→7
  {x:  60, y: 77}, {x:  61, y: 81},
  // 7: head lower (calibrated)
  {x:  61, y: 85},
  // 8-9: interp 7→10
  {x:  65, y: 76}, {x:  70, y: 67},
  // 10: head upper (calibrated)
  {x:  74, y: 58},
  // 11-12: interp 10→13
  {x:  76, y: 75}, {x:  78, y: 92},
  // 13: lower fin (calibrated)
  {x:  80, y: 110},
  // 14-15: interp 13→16
  {x:  87, y: 93}, {x:  94, y: 76},
  // 16: body upper-left (calibrated)
  {x: 100, y: 59},
  // 17-18: interp 16→19
  {x: 114, y: 66}, {x: 127, y: 72},
  // 19: body center (calibrated)
  {x: 141, y: 79},
  // 20-21: interp 19→22 (strand loops back)
  {x: 129, y: 89}, {x: 118, y: 98},
  // 22: body lower-left (calibrated)
  {x: 106, y: 107},
  // 23-24: interp 22→25
  {x: 110, y: 101}, {x: 114, y: 95},
  // 25: body lower-center (calibrated)
  {x: 118, y: 89},
  // 26: interp 25→27
  {x: 126, y: 97},
  // 27: body lower (calibrated)
  {x: 134, y: 105},
  // 28: lower fin (calibrated)
  {x: 139, y: 111},
  // 29-30: interp 28→31 (strand rises back up)
  {x: 146, y: 97}, {x: 153, y: 83},
  // 31: body upper-center (calibrated)
  {x: 160, y: 68},
  // 32: interp 31→33
  {x: 169, y: 54},
  // 33: upper fin tip (calibrated)
  {x: 178, y: 39},
  // 34: body upper-right (calibrated, strand returns from fin)
  {x: 151, y: 56},
  // 35-36: interp 34→37
  {x: 167, y: 61}, {x: 184, y: 66},
  // 37: tail area (calibrated)
  {x: 200, y: 71},
  // 38-39: interp 37→40 (strand loops back again)
  {x: 184, y: 79}, {x: 169, y: 86},
  // 40: body lower-right (calibrated)
  {x: 154, y: 93},
  // 41: interp 40→42
  {x: 167, y: 94},
  // 42: tail lower (calibrated)
  {x: 179, y: 96},
  // 43: tail (calibrated)
  {x: 194, y: 92},
  // 44-45: extrapolated toward tail tip
  {x: 208, y: 88}, {x: 218, y: 84},
  // 46: tail tip / near cable exit (barely on fish)
  {x: 225, y: 82}
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
