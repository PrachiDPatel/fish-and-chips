/* ===== Hot & cold — multiplayer LED hide-and-seek =====
 * Two devices, one shared round: state syncs over MQTT (retained) on a
 * demo topic. Whoever taps "new round" becomes the hider and picks a secret
 * LED; the other device guesses — each guess is colored red(hot)→purple(cold)
 * by distance from the secret, both on-screen and on the LED fish.
 * Needs LED_POSITIONS / DEAD_LEDS from pixels.js.
 */
const hcClientId = 'p_' + Math.random().toString(16).slice(2, 10);
let hcState = { status: 'idle', hiderId: null, secret: null, guesses: [], winnerId: null };

const HC_ACTIVE = LED_POSITIONS.map((_, i) => i).filter(i => !DEAD_LEDS.has(i));
let HC_MAXDIST = 0;
HC_ACTIVE.forEach(a => HC_ACTIVE.forEach(b => {
  const dx = LED_POSITIONS[a].x - LED_POSITIONS[b].x;
  const dy = LED_POSITIONS[a].y - LED_POSITIONS[b].y;
  HC_MAXDIST = Math.max(HC_MAXDIST, Math.sqrt(dx * dx + dy * dy));
}));

/* Turbo heat scale: red (hottest) -> orange -> yellow -> green -> cyan -> blue -> purple (coldest). */
const HC_RAINBOW = [
  [0.00, [255, 0, 0]],     // red
  [0.17, [255, 128, 0]],   // orange
  [0.33, [255, 255, 0]],   // yellow
  [0.50, [0, 255, 0]],     // green
  [0.67, [0, 255, 255]],   // cyan
  [0.83, [0, 0, 255]],     // blue
  [1.00, [128, 0, 128]],   // purple
];
function hcColorForT(t) {
  t = Math.max(0, Math.min(1, t));
  let a = HC_RAINBOW[0], b = HC_RAINBOW[HC_RAINBOW.length - 1];
  for (let i = 0; i < HC_RAINBOW.length - 1; i++) {
    if (t >= HC_RAINBOW[i][0] && t <= HC_RAINBOW[i + 1][0]) { a = HC_RAINBOW[i]; b = HC_RAINBOW[i + 1]; break; }
  }
  const k = (t - a[0]) / ((b[0] - a[0]) || 1);
  const rgb = a[1].map((v, i) => Math.round(v + (b[1][i] - v) * k));
  return rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}

/* dot radius multiplier while the game is fullscreen-expanded */
let HC_DOT_SCALE = 1;

function hcRender() {
  const g = document.getElementById('hc-dots');
  g.innerHTML = '';
  const isHider = hcState.hiderId === hcClientId;
  const guessMap = {};
  hcState.guesses.forEach(gu => { guessMap[gu.idx] = gu; });
  const latestIdx = hcState.guesses.length ? hcState.guesses[hcState.guesses.length - 1].idx : null;
  const canTapNow = (hcState.status === 'hiding' && isHider) || (hcState.status === 'playing' && !isHider);
  const DS = HC_DOT_SCALE;

  HC_ACTIVE.forEach(idx => {
    const p = LED_POSITIONS[idx];
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
    const gu = guessMap[idx];
    if (gu) {
      c.setAttribute('r', Math.round((idx === latestIdx ? 24 : 18) * DS));
      c.setAttribute('fill', '#' + gu.color);
      c.setAttribute('stroke', '#fff');
      c.setAttribute('stroke-width', idx === latestIdx ? 3 : 1);
    } else if (isHider && hcState.secret === idx && hcState.status !== 'idle') {
      c.setAttribute('r', Math.round(16 * DS));
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', '#facc15'); c.setAttribute('stroke-width', 3);
    } else {
      c.setAttribute('r', Math.round(14 * DS));
      c.setAttribute('fill', 'rgba(34,211,238,0.12)');
      c.setAttribute('stroke', 'rgba(34,211,238,0.3)'); c.setAttribute('stroke-width', 1);
    }
    if (canTapNow) { c.style.cursor = 'pointer'; addTapListener(c, () => hcDotTapped(idx)); }
    g.appendChild(c);
  });
}

function hcUpdateStatus() {
  const el = document.getElementById('hc-status');
  const isHider = hcState.hiderId === hcClientId;
  el.className = 'hc-status';
  if (hcState.status === 'idle') el.textContent = 'tap "new round" — whoever taps hides first';
  else if (hcState.status === 'hiding') el.textContent = isHider ? "you're hiding — tap a spot on joseph" : 'the other player is hiding…';
  else if (hcState.status === 'playing') el.textContent = isHider ? "they're hunting — white is your spot" : 'hunt the white light — red hot · purple cold';
  else if (hcState.status === 'won') {
    const n = hcState.guesses.length;
    el.textContent = (hcState.winnerId === hcClientId ? 'you found it — ' : 'they found it — ') + n + ' guess' + (n === 1 ? '' : 'es');
    el.className = 'hc-status won';
  }
}

function hcPublish() {
  if (!client || !connected) return;
  client.publish(HOTCOLD_TOPIC, JSON.stringify(hcState), { qos: 0, retain: true });
}

async function hcSendLEDs() {
  if (!connected) return;
  const colors = new Array(LED_POSITIONS.length).fill('000000');
  hcState.guesses.forEach(gu => { colors[gu.idx] = gu.color; });
  // the hidden spot glows white on the LED fish so the hider can spot it
  if (hcState.secret != null && hcState.status !== 'idle') colors[hcState.secret] = 'ffffff';
  const arr = [];
  colors.forEach((c, i) => arr.push(i, c));
  try { await publish(JSON.stringify({ on: true, bri: 255, seg: { i: arr } })); } catch {}
}

function hcMakeGuess(idx) {
  if (hcState.secret == null) return;
  const dx = LED_POSITIONS[idx].x - LED_POSITIONS[hcState.secret].x;
  const dy = LED_POSITIONS[idx].y - LED_POSITIONS[hcState.secret].y;
  const t = Math.sqrt(dx * dx + dy * dy) / HC_MAXDIST;
  hcState.guesses = hcState.guesses.filter(g => g.idx !== idx);
  hcState.guesses.push({ idx, color: hcColorForT(t) });
  if (idx === hcState.secret) { hcState.status = 'won'; hcState.winnerId = hcClientId; }
  hcRender(); hcUpdateStatus(); hcSendLEDs();
  hcPublish();
}

async function hcDotTapped(idx) {
  if (hcState.status === 'hiding' && hcState.hiderId === hcClientId) {
    if (!(await ensureConnected())) return;
    hcState.secret = idx;
    hcState.status = 'playing';
    hcRender(); hcUpdateStatus(); hcSendLEDs();
    hcPublish();
  } else if (hcState.status === 'playing' && hcState.hiderId !== hcClientId) {
    if (!(await ensureConnected())) return;
    hcMakeGuess(idx);
  }
}

async function hcNewRound() {
  if (!(await ensureConnected())) return;
  hcState = { status: 'hiding', hiderId: hcClientId, secret: null, guesses: [], winnerId: null };
  hcRender(); hcUpdateStatus(); hcSendLEDs();
  hcPublish();
}

addTapListener(document.getElementById('hc-new-round'), hcNewRound);
addTapListener(document.getElementById('hc-expand'), () => gameFsOpen('hotcold'));
hcRender();
hcUpdateStatus();
