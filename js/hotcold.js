/* ===== Hot & cold — multiplayer LED hide-and-seek =====
 * One player hides a light on joseph, the other hunts it down.
 * Open this tab on two phones: game state syncs over MQTT (retained).
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

function hcColorForT(t) {
  t = Math.max(0, Math.min(1, t));
  let r, g, b;
  if (t < 0.5) { const k = t / 0.5; r = 255; g = Math.round(255 * k); b = Math.round(255 * k); }
  else { const k = (t - 0.5) / 0.5; r = Math.round(255 * (1 - k)); g = Math.round(255 * (1 - k)); b = 255; }
  return [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hcRender() {
  const g = document.getElementById('hc-dots');
  g.innerHTML = '';
  const isHider = hcState.hiderId === hcClientId;
  const guessMap = {};
  hcState.guesses.forEach(gu => { guessMap[gu.idx] = gu; });
  const latestIdx = hcState.guesses.length ? hcState.guesses[hcState.guesses.length - 1].idx : null;
  const canTapNow = (hcState.status === 'hiding' && isHider) || (hcState.status === 'playing' && !isHider);

  HC_ACTIVE.forEach(idx => {
    const p = LED_POSITIONS[idx];
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
    const gu = guessMap[idx];
    if (gu) {
      c.setAttribute('r', idx === latestIdx ? 24 : 18);
      c.setAttribute('fill', '#' + gu.color);
      c.setAttribute('stroke', '#fff');
      c.setAttribute('stroke-width', idx === latestIdx ? 3 : 1);
    } else if (isHider && hcState.secret === idx && hcState.status !== 'idle') {
      c.setAttribute('r', 16);
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', '#facc15'); c.setAttribute('stroke-width', 3);
    } else {
      c.setAttribute('r', 14);
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
  if (hcState.status === 'idle') el.textContent = 'tap "new round" — whoever taps becomes the hider';
  else if (hcState.status === 'hiding') el.textContent = isHider ? 'tap a spot on joseph to hide the secret' : 'waiting for the other player to hide the secret…';
  else if (hcState.status === 'playing') el.textContent = isHider ? "they're guessing — watch the trail" : 'tap dots — red is hot, blue is cold';
  else if (hcState.status === 'won') {
    const n = hcState.guesses.length;
    el.textContent = (hcState.winnerId === hcClientId ? 'you found it! ' : 'found! ') + n + ' guess' + (n === 1 ? '' : 'es');
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
hcRender();
hcUpdateStatus();
