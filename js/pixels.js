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
/* ===== Pixel editor =====
 * Top-down pleco view, both pectoral fins extended (modeled on pleco-icon.png).
 * Total: 50 LEDs (indices 0-49); LEDs 0 and 1 are dead (see DEAD_LEDS).
 * Positions are the calibrated map — don't hand-edit, use dot-editor.html.
 */
const DEAD_LEDS = new Set([0, 1]);
const LED_POSITIONS = [
  {x:  242.57, y: 1460.63}, //  0 ← inactive
  {x:  169.06, y: 1451.89}, //  1 ← inactive
  {x:  492.68, y:  819.45}, //  2
  {x:  369.85, y:  888.87}, //  3
  {x:  255.02, y:  782.06}, //  4
  {x:  126.84, y:  808.76}, //  5
  {x:  150.87, y:  926.25}, //  6
  {x:  214.96, y:  993.01}, //  7
  {x:  180.24, y:  838.14}, //  8
  {x:  385.87, y:  680.59}, //  9
  {x:  263.03, y:  717.97}, // 10
  {x:  292.41, y:  891.54}, // 11
  {x:  166.90, y:  760.69}, // 12
  {x:  273.71, y: 1030.40}, // 13
  {x:  222.98, y:  910.24}, // 14
  {x:  319.11, y:  683.26}, // 15
  {x:  449.96, y:  645.88}, // 16
  {x:  530.07, y:  664.57}, // 17
  {x:  540.76, y:  752.68}, // 18
  {x:  634.20, y:  827.45}, // 19
  {x:  393.88, y:  784.73}, // 20
  {x:  353.82, y: 1025.06}, // 21
  {x:  433.94, y: 1041.07}, // 22
  {x:  457.98, y: 1142.56}, // 23
  {x:  364.51, y:  966.31}, // 24
  {x:  482.01, y:  912.91}, // 25
  {x:  578.15, y:  934.27}, // 26
  {x:  538.08, y: 1142.56}, // 27
  {x:  570.13, y: 1254.71}, // 28
  {x:  773.07, y: 1329.48}, // 29
  {x:  596.83, y: 1057.11}, // 30
  {x:  687.62, y:  739.34}, // 31
  {x:  586.14, y:  621.84}, // 32
  {x:  802.45, y:  480.30}, // 33
  {x:  607.51, y:  509.68}, // 34
  {x:  495.35, y:  600.47}, // 35
  {x:  850.51, y:  699.28}, // 36
  {x: 1005.39, y:  750.02}, // 37
  {x:  837.16, y:  766.03}, // 38
  {x:  903.92, y:  854.16}, // 39
  {x:  786.42, y: 1001.03}, // 40
  {x:  807.79, y: 1091.82}, // 41
  {x:  989.38, y: 1142.56}, // 42
  {x: 1061.47, y:  982.33}, // 43
  {x: 1264.41, y:  840.80}, // 44
  {x: 1387.26, y:  926.26}, // 45
  {x: 1582.20, y: 1070.46}, // 46
  {x: 1707.69, y: 1179.94}, // 47
  {x: 1633.71, y: 1163.27}, // 48
  {x: 1666.40, y: 1246.04}, // 49
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
    if (DEAD_LEDS.has(idx)) return;
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
function setPixel(idx, color) { pixelState[idx] = color; paintLED(idx); }

/* ── Brush painting — tap a dot to toggle it, press-drag to paint a stroke ── */
let eraserMode = false;
let brushDown = false, brushMoved = false;
const BRUSH_RADIUS = 45;
const pixelSvg = document.getElementById('pixel-canvas');
const brushCursorEl = document.getElementById('brush-cursor');
brushCursorEl.setAttribute('r', BRUSH_RADIUS);

function pixelSvgCoords(cx, cy) {
  const pt = pixelSvg.createSVGPoint(); pt.x = cx; pt.y = cy;
  return pt.matrixTransform(pixelSvg.getScreenCTM().inverse());
}
function nearestLED(cx, cy, radius) {
  const sp = pixelSvgCoords(cx, cy);
  let best = -1, bestD = radius * radius;
  LED_POSITIONS.forEach((p, idx) => {
    if (DEAD_LEDS.has(idx)) return;
    const dx = p.x - sp.x, dy = p.y - sp.y;
    const d = dx * dx + dy * dy;
    if (d <= bestD) { bestD = d; best = idx; }
  });
  return best;
}
function brushPaintAt(cx, cy) {
  const sp = pixelSvgCoords(cx, cy);
  LED_POSITIONS.forEach((p, idx) => {
    if (DEAD_LEDS.has(idx)) return;
    const dx = p.x - sp.x, dy = p.y - sp.y;
    if (dx * dx + dy * dy <= BRUSH_RADIUS * BRUSH_RADIUS) setPixel(idx, eraserMode ? null : currentColor);
  });
}
function moveBrushCursor(cx, cy) {
  const sp = pixelSvgCoords(cx, cy);
  brushCursorEl.setAttribute('cx', sp.x);
  brushCursorEl.setAttribute('cy', sp.y);
  brushCursorEl.style.display = 'block';
  brushCursorEl.style.stroke = eraserMode ? '#f87171' : ('#' + currentColor);
}

pixelSvg.addEventListener('mousedown', e => {
  brushDown = true; brushMoved = false;
  moveBrushCursor(e.clientX, e.clientY);
});
document.addEventListener('mousemove', e => {
  if (!brushDown) return;
  brushMoved = true;
  moveBrushCursor(e.clientX, e.clientY);
  brushPaintAt(e.clientX, e.clientY);
});
document.addEventListener('mouseup', e => {
  if (!brushDown) return;
  if (!brushMoved) {
    const idx = nearestLED(e.clientX, e.clientY, 44);
    if (idx >= 0) setPixel(idx, (!eraserMode && pixelState[idx] === currentColor) ? null : (eraserMode ? null : currentColor));
  }
  brushDown = false;
  brushCursorEl.style.display = 'none';
});

pixelSvg.addEventListener('touchstart', e => {
  e.preventDefault();
  brushDown = true; brushMoved = false;
  const t = e.touches[0]; moveBrushCursor(t.clientX, t.clientY);
}, { passive: false });
document.addEventListener('touchmove', e => {
  if (!brushDown) return; e.preventDefault();
  brushMoved = true;
  const t = e.touches[0]; moveBrushCursor(t.clientX, t.clientY); brushPaintAt(t.clientX, t.clientY);
}, { passive: false });
document.addEventListener('touchend', e => {
  if (!brushDown) return;
  if (!brushMoved) {
    const t = e.changedTouches[0];
    const idx = nearestLED(t.clientX, t.clientY, 44);
    if (idx >= 0) setPixel(idx, (!eraserMode && pixelState[idx] === currentColor) ? null : (eraserMode ? null : currentColor));
  }
  brushDown = false;
  brushCursorEl.style.display = 'none';
});

addTapListener(document.getElementById('btn-eraser'), () => {
  eraserMode = !eraserMode;
  document.getElementById('btn-eraser').classList.toggle('active', eraserMode);
});

/* ── Word drawing — renders text across the LED layout (best-effort, not a grid) ── */
function spellWord(text) {
  const chars = text.toUpperCase().split('').filter(ch => /[A-Z0-9!?.]/.test(ch) || ch === ' ');
  if (!chars.length) return;

  const activeIdx = LED_POSITIONS.map((_, i) => i).filter(i => !DEAD_LEDS.has(i));
  const xs = activeIdx.map(i => LED_POSITIONS[i].x);
  const ys = activeIdx.map(i => LED_POSITIONS[i].y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const cellW = (maxX - minX) / chars.length;

  const CW = 120, CH = 160;
  const canvas = document.createElement('canvas');
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < pixelState.length; i++) pixelState[i] = null;

  chars.forEach((ch, ci) => {
    if (ch === ' ') return;
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 150px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, CW / 2, CH / 2 + 8);
    const img = ctx.getImageData(0, 0, CW, CH).data;

    const cellMinX = minX + ci * cellW;
    activeIdx.forEach(idx => {
      const p = LED_POSITIONS[idx];
      if (p.x < cellMinX || p.x >= cellMinX + cellW) return;
      const fx = Math.round((p.x - cellMinX) / cellW * CW);
      const fy = Math.round((p.y - minY) / (maxY - minY) * CH);
      if (fx < 0 || fx >= CW || fy < 0 || fy >= CH) return;
      const alpha = img[(fy * CW + fx) * 4 + 3];
      if (alpha > 100) pixelState[idx] = currentColor;
    });
  });

  paintAllLEDs();
}
addTapListener(document.getElementById('btn-spell'), () => {
  spellWord(document.getElementById('spell-input').value || '');
});

/* ── Dot map download — numbered SVG of every LED, for mapping/debugging ── */
document.getElementById('btn-dot-map').addEventListener('click', () => {
  const W = 1920, H = 1080, R = 18;
  const dots = LED_POSITIONS.map((p, i) => {
    const dead = DEAD_LEDS.has(i);
    const fill = dead ? '#444' : '#22d3ee';
    const stroke = dead ? '#666' : '#cffafe';
    return `<circle cx="${p.x}" cy="${p.y}" r="${R}" fill="${fill}" fill-opacity="0.55" stroke="${stroke}" stroke-width="2"/>` +
      `\n    <text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="central" font-family="monospace" font-size="16" fill="${dead ? '#888' : '#fff'}">${i}</text>`;
  }).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#020617"/>
  ${dots}
</svg>`;
  const a = document.createElement('a');
  a.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  a.download = 'joseph-dot-map.svg';
  a.click();
});

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
