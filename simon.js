/* ── Simon do Aloncinho ── */

const pads      = document.querySelectorAll('.simon-pad');
const levelEl   = document.getElementById('simon-level');
const bestEl    = document.getElementById('simon-best');
const statusEl  = document.getElementById('simon-status');
const startBtn  = document.getElementById('simon-start');
const overlay   = document.getElementById('simon-overlay');
const overMsg   = document.getElementById('simon-over-msg');
const restartBtn = document.getElementById('simon-restart');

const BEST_KEY = 'simon-best';

let sequence = [], playerIndex = 0, level = 1;
let accepting = false, playing = false;

function getBest() { return parseInt(localStorage.getItem(BEST_KEY) || '1', 10); }
function saveBest(v) { localStorage.setItem(BEST_KEY, Math.max(getBest(), v)); }

function renderHud() {
  levelEl.textContent = 'Nível: ' + level;
  bestEl.textContent  = 'Melhor nível: ' + getBest();
}

function flashDuration() {
  // 400ms, decreasing by 20ms every 5 levels, min 150ms
  return Math.max(150, 400 - Math.floor((level - 1) / 5) * 20);
}

function flashPad(padIndex) {
  return new Promise(resolve => {
    const pad = pads[padIndex];
    const dur = flashDuration();
    pad.classList.add('active');
    setTimeout(() => {
      pad.classList.remove('active');
      setTimeout(resolve, 200); // gap between flashes
    }, dur);
  });
}

async function playSequence() {
  accepting = false;
  setPadsEnabled(false);
  statusEl.textContent = 'Observe a sequência…';
  await delay(600);
  for (const idx of sequence) {
    await flashPad(idx);
  }
  accepting = true;
  playerIndex = 0;
  setPadsEnabled(true);
  statusEl.textContent = 'Sua vez! Repita a sequência.';
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function setPadsEnabled(on) {
  pads.forEach(p => { p.disabled = !on; });
}

async function startGame() {
  sequence = []; level = 1; playerIndex = 0; playing = true;
  overlay.classList.add('hidden');
  startBtn.style.display = 'none';
  renderHud();
  await nextRound();
}

async function nextRound() {
  sequence.push(Math.floor(Math.random() * 4));
  renderHud();
  await playSequence();
}

function handlePadClick(padIndex) {
  if (!accepting) return;
  flashPad(padIndex);
  if (padIndex !== sequence[playerIndex]) {
    gameOver();
    return;
  }
  playerIndex++;
  if (playerIndex === sequence.length) {
    accepting = false;
    setPadsEnabled(false);
    statusEl.textContent = '✅ Correto! Próximo nível…';
    saveBest(level);
    level++;
    setTimeout(() => nextRound(), 900);
  }
}

function gameOver() {
  accepting = false; playing = false;
  setPadsEnabled(false);
  saveBest(level);
  renderHud();
  overMsg.textContent = `Você chegou ao nível ${level}. Melhor: ${getBest()}`;
  overlay.classList.remove('hidden');
  statusEl.textContent = 'Fim de jogo!';
}

pads.forEach(pad => {
  pad.addEventListener('click', () => handlePadClick(parseInt(pad.dataset.pad, 10)));
});
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// init
setPadsEnabled(false);
renderHud();
