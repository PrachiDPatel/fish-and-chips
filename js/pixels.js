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
  // raw pixel coords from pleco mapping - dots.png (1920×1920)
  // spatial order; wiring order TBD via calibration
  {x:  634.64, y:  515.52}, // 0
  {x:  804.64, y:  497.52}, // 1
  {x:  427.60, y:  670.56}, // 2
  {x:  517.60, y:  601.56}, // 3
  {x:  605.60, y:  640.56}, // 4
  {x:  280.64, y:  736.56}, // 5
  {x:  317.60, y:  707.52}, // 6
  {x:  371.60, y:  721.56}, // 7
  {x:  558.64, y:  682.56}, // 8
  {x:  707.60, y:  758.52}, // 9
  {x:  866.64, y:  699.48}, // 10
  {x: 1003.60, y:  738.48}, // 11
  {x:  142.64, y:  834.48}, // 12
  {x:  204.64, y:  767.52}, // 13
  {x:  241.60, y:  823.56}, // 14
  {x:  399.60, y:  831.48}, // 15
  {x:  542.64, y:  789.48}, // 16
  {x:  850.64, y:  783.48}, // 17
  {x: 1134.64, y:  839.52}, // 18
  {x:  159.60, y:  885.48}, // 19
  {x:  501.60, y:  870.48}, // 20
  {x:  666.64, y:  852.48}, // 21
  {x:  901.60, y:  882.48}, // 22
  {x: 1244.64, y:  886.56}, // 23
  {x:  157.60, y:  945.48}, // 24
  {x:  273.60, y:  942.48}, // 25
  {x:  206.64, y:  941.52}, // 26
  {x:  350.64, y:  944.52}, // 27
  {x:  483.60, y:  952.56}, // 28
  {x:  613.60, y:  967.56}, // 29
  {x: 1026.64, y:  992.52}, // 30
  {x: 1349.60, y:  932.52}, // 31
  {x:  219.12, y: 1011.48}, // 32
  {x:  307.60, y: 1055.52}, // 33
  {x:  361.60, y: 1029.48}, // 34
  {x:  790.64, y: 1029.48}, // 35
  {x: 1554.64, y: 1072.56}, // 36
  {x: 1590.64, y: 1045.56}, // 37
  {x:  373.60, y: 1084.56}, // 38
  {x:  442.64, y: 1089.48}, // 39
  {x:  613.60, y: 1092.48}, // 40
  {x:  820.64, y: 1104.48}, // 41
  {x:  975.60, y: 1115.52}, // 42
  {x:  495.60, y: 1162.56}, // 43
  {x:  561.60, y: 1164.48}, // 44
  {x: 1610.64, y: 1170.48}, // 45
  {x:  601.60, y: 1270.56}, // 46
  {x:  715.60, y: 1285.56}, // 47
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
    hit.setAttribute('r', 44);

    const led = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    led.setAttribute('class', 'led');
    led.setAttribute('cx', p.x);
    led.setAttribute('cy', p.y);
    led.setAttribute('r', 18);

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
