/* ===== Snake game =====
 * Playfield: body LEDs 5-28 (6 cols × 4 rows, col 0 = tail end, col 5 = head end)
 * Tick: 2 s to accommodate ~1 s MQTT latency
 * LED mapping: snakeLED(row, col) = 5 + col*4 + row
 */
const SNAKE_COLS = 6;
const SNAKE_ROWS = 4;
const SNAKE_TICK = 2000;

function snakeLED(row, col) { return 5 + col * 4 + row; }

let snake = [];
let snakeFood = null;
let snakeDir = {dr: 0, dc: 1};
let snakeNextDir = {dr: 0, dc: 1};
let snakeScore = 0;
let snakeRunning = false;
let snakeTimer = null;

function buildSnakeGrid() {
  const grid = document.getElementById('snake-grid');
  grid.innerHTML = '';
  for (let r = 0; r < SNAKE_ROWS; r++) {
    for (let c = 0; c < SNAKE_COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'snake-cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      grid.appendChild(cell);
    }
  }
}

function snakeGetCell(r, c) {
  return document.querySelector('#snake-grid [data-r="'+r+'"][data-c="'+c+'"]');
}

function snakeRedraw(gameOverFlash) {
  const headKey = snake[0] ? snake[0].r + ',' + snake[0].c : null;
  const bodyKeys = new Set(snake.slice(1).map(s => s.r + ',' + s.c));
  const foodKey = snakeFood ? snakeFood.r + ',' + snakeFood.c : null;
  for (let r = 0; r < SNAKE_ROWS; r++) {
    for (let c = 0; c < SNAKE_COLS; c++) {
      const cell = snakeGetCell(r, c);
      if (!cell) continue;
      const k = r + ',' + c;
      cell.className = 'snake-cell';
      if (gameOverFlash && (headKey === k || bodyKeys.has(k))) cell.classList.add('dead');
      else if (headKey === k) cell.classList.add('head');
      else if (bodyKeys.has(k)) cell.classList.add('body');
      else if (k === foodKey) cell.classList.add('food');
    }
  }
}

async function snakeSendLEDs(gameOverFlash) {
  if (!connected) return;
  const colors = new Array(LED_POSITIONS.length).fill('000000');
  if (gameOverFlash) {
    for (let i = 5; i <= 28; i++) colors[i] = 'ff1020';
  } else {
    if (snakeFood) colors[snakeLED(snakeFood.r, snakeFood.c)] = 'ff4400';
    snake.slice(1).forEach(s => { colors[snakeLED(s.r, s.c)] = '009944'; });
    if (snake[0]) colors[snakeLED(snake[0].r, snake[0].c)] = '00ff80';
  }
  const arr = [];
  colors.forEach((c, i) => arr.push(i, c));
  const payload = JSON.stringify({ on: true, bri: 255, seg: { i: arr } });
  try { await publish(payload); } catch {}
}

function snakePlaceFood() {
  const occupied = new Set(snake.map(s => s.r + ',' + s.c));
  const empty = [];
  for (let r = 0; r < SNAKE_ROWS; r++)
    for (let c = 0; c < SNAKE_COLS; c++)
      if (!occupied.has(r + ',' + c)) empty.push({r, c});
  if (!empty.length) { snakeFood = null; return; }
  snakeFood = empty[Math.floor(Math.random() * empty.length)];
}

function snakeSetDir(dr, dc) {
  if (!snakeRunning) return;
  if (dr === -snakeDir.dr && dc === -snakeDir.dc) return;
  snakeNextDir = {dr, dc};
}

function snakeTick() {
  snakeDir = snakeNextDir;
  const head = snake[0];
  const newHead = {r: head.r + snakeDir.dr, c: head.c + snakeDir.dc};

  if (newHead.r < 0 || newHead.r >= SNAKE_ROWS || newHead.c < 0 || newHead.c >= SNAKE_COLS
      || snake.some(s => s.r === newHead.r && s.c === newHead.c)) {
    snakeGameOver(); return;
  }

  snake.unshift(newHead);
  const ate = snakeFood && newHead.r === snakeFood.r && newHead.c === snakeFood.c;
  if (ate) {
    snakeScore++;
    document.getElementById('snake-score').textContent = snakeScore;
    snakePlaceFood();
    if (!snakeFood) { snakeWin(); return; }
  } else {
    snake.pop();
  }
  snakeRedraw(false);
  snakeSendLEDs(false);
}

function snakeStopTimer() {
  if (snakeTimer) { clearInterval(snakeTimer); snakeTimer = null; }
  snakeRunning = false;
  const btn = document.getElementById('snake-start');
  btn.textContent = 'start';
  btn.classList.remove('running');
}

function snakeStart() {
  snakeStopTimer();
  snake = [{r: 1, c: 1}, {r: 1, c: 0}];
  snakeDir = {dr: 0, dc: 1};
  snakeNextDir = {dr: 0, dc: 1};
  snakeScore = 0;
  document.getElementById('snake-score').textContent = '0';
  const status = document.getElementById('snake-status');
  status.textContent = '';
  status.className = 'snake-status';
  const btn = document.getElementById('snake-start');
  btn.textContent = 'stop';
  btn.classList.add('running');
  snakePlaceFood();
  snakeRunning = true;
  snakeRedraw(false);
  snakeSendLEDs(false);
  snakeTimer = setInterval(snakeTick, SNAKE_TICK);
}

async function snakeGameOver() {
  snakeStopTimer();
  snakeRedraw(true);
  await snakeSendLEDs(true);
  const status = document.getElementById('snake-status');
  status.textContent = 'game over — score: ' + snakeScore;
  status.className = 'snake-status gameover';
  setTimeout(() => { snakeRedraw(false); snakeSendLEDs(false); }, 1800);
}

function snakeWin() {
  snakeStopTimer();
  snakeRedraw(false);
  snakeSendLEDs(false);
  const status = document.getElementById('snake-status');
  status.textContent = 'you win!! score: ' + snakeScore;
  status.className = 'snake-status win';
}

buildSnakeGrid();
addTapListener(document.getElementById('snake-start'), () => {
  if (snakeRunning) snakeStopTimer();
  else snakeStart();
});
addTapListener(document.getElementById('dpad-up'),    () => snakeSetDir(-1, 0));
addTapListener(document.getElementById('dpad-down'),  () => snakeSetDir(1,  0));
addTapListener(document.getElementById('dpad-left'),  () => snakeSetDir(0, -1));
addTapListener(document.getElementById('dpad-right'), () => snakeSetDir(0,  1));

document.addEventListener('keydown', (e) => {
  if (!document.getElementById('tab-snake').classList.contains('active')) return;
  if (e.key === 'ArrowUp')    snakeSetDir(-1, 0);
  if (e.key === 'ArrowDown')  snakeSetDir(1,  0);
  if (e.key === 'ArrowLeft')  snakeSetDir(0, -1);
  if (e.key === 'ArrowRight') snakeSetDir(0,  1);
});
</script>
