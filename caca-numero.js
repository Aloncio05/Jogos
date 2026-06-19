/* ── Caça-Número do Aloncinho ── */

const ARENA_W = 560, ARENA_H = 380, CIRCLE_D = 54, PAD = 10;
const COLORS = ['#ff4466','#ff8800','#ffdd00','#44cc44','#0099ff',
                '#9944ff','#ff44cc','#00ccaa','#ff6600','#22aaff'];

const arena     = document.getElementById('caca-arena');
const timerEl   = document.getElementById('caca-timer');
const bestEl    = document.getElementById('caca-best');
const nextEl    = document.getElementById('caca-next');
const overlay   = document.getElementById('caca-overlay');
const overTime  = document.getElementById('caca-over-time');
const overBest  = document.getElementById('caca-over-best');
const restartBtn = document.getElementById('caca-restart');

const BEST_KEY = 'caca-best';

let nextExpected = 1, startTime = null, timerRaf = null, running = false;

function getBest() { return parseFloat(localStorage.getItem(BEST_KEY) || '0'); }
function saveBest(t) {
  const b = getBest();
  if (b === 0 || t < b) localStorage.setItem(BEST_KEY, t.toFixed(1));
}

function renderBest() {
  const b = getBest();
  bestEl.textContent = b > 0 ? `Melhor: ${b.toFixed(1)}s` : 'Melhor: --';
}

function randomPositions(n) {
  const positions = [];
  const maxX = ARENA_W - CIRCLE_D - PAD;
  const maxY = ARENA_H - CIRCLE_D - PAD;
  let attempts = 0;
  while (positions.length < n && attempts < 2000) {
    attempts++;
    const x = PAD + Math.random() * (maxX - PAD);
    const y = PAD + Math.random() * (maxY - PAD);
    const overlaps = positions.some(p =>
      Math.hypot(p.x - x, p.y - y) < CIRCLE_D + 8
    );
    if (!overlaps) positions.push({ x, y });
  }
  return positions;
}

function buildArena() {
  arena.innerHTML = '';
  const positions = randomPositions(10);
  // shuffle numbers -> positions
  const nums = Array.from({length:10}, (_,i) => i+1);
  nums.forEach((num, i) => {
    const el = document.createElement('div');
    el.className = 'num-circle';
    el.dataset.num = num;
    el.textContent = num;
    el.style.cssText = [
      `left:${positions[i].x}px`,
      `top:${positions[i].y}px`,
      `background:${COLORS[num-1]}`
    ].join(';');
    el.addEventListener('click', () => handleClick(el, num));
    arena.appendChild(el);
  });
}

function handleClick(el, num) {
  if (!running && nextExpected === 1) {
    // first click starts timer
    startTimer();
  }
  if (!running) return;
  if (num !== nextExpected) {
    el.classList.remove('shake');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('shake');
    el.addEventListener('animationend', () => el.classList.remove('shake'), {once:true});
    return;
  }
  el.classList.add('found');
  el.textContent = '✓';
  nextExpected++;
  nextEl.innerHTML = nextExpected <= 10
    ? `Próximo: <strong>${nextExpected}</strong>`
    : 'Próximo: <strong>—</strong>';
  if (nextExpected > 10) finishGame();
}

function startTimer() {
  running = true;
  startTime = performance.now();
  function tick() {
    if (!running) return;
    const elapsed = (performance.now() - startTime) / 1000;
    timerEl.textContent = `⏱ ${elapsed.toFixed(1)}s`;
    timerRaf = requestAnimationFrame(tick);
  }
  timerRaf = requestAnimationFrame(tick);
}

function finishGame() {
  running = false;
  cancelAnimationFrame(timerRaf);
  const elapsed = (performance.now() - startTime) / 1000;
  timerEl.textContent = `⏱ ${elapsed.toFixed(1)}s`;
  saveBest(elapsed);
  renderBest();
  const b = getBest();
  overTime.textContent = `Seu tempo: ${elapsed.toFixed(1)}s`;
  overBest.textContent = elapsed <= b + 0.05 ? '🏆 Novo recorde!' : `Melhor tempo: ${b.toFixed(1)}s`;
  overlay.classList.remove('hidden');
}

function startGame() {
  nextExpected = 1; running = false; startTime = null;
  cancelAnimationFrame(timerRaf);
  timerEl.textContent = '⏱ 0.0s';
  nextEl.innerHTML = 'Próximo: <strong>1</strong>';
  overlay.classList.add('hidden');
  renderBest();
  buildArena();
}

restartBtn.addEventListener('click', startGame);
startGame();
