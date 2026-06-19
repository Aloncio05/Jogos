/* ── Bolhas do Aloncinho ── */

const COLORS = ['#ff4466','#ff8800','#ffdd00','#44cc44','#0099ff',
                '#9944ff','#ff44cc','#00ccaa','#ff6600','#22aaff'];

const arena    = document.getElementById('bolhas-arena');
const scoreEl  = document.getElementById('bolhas-score');
const livesEl  = document.getElementById('bolhas-lives');
const overlay  = document.getElementById('bolhas-overlay');
const finalEl  = document.getElementById('bolhas-final-score');
const restartBtn = document.getElementById('bolhas-restart');

let score = 0, lives = 5, spawnTimer = null, gameActive = false;

function renderLives() {
  livesEl.textContent = '❤️'.repeat(lives) + '🖤'.repeat(Math.max(0, 5 - lives));
}

function renderScore() {
  scoreEl.textContent = 'Pontos: ' + score;
}

function spawnInterval() {
  // starts at 1000ms, decreases by 50ms every 5 points, min 350ms
  return Math.max(350, 1000 - Math.floor(score / 5) * 50);
}

function randomBetween(a, b) { return a + Math.random() * (b - a); }

function spawnBubble() {
  if (!gameActive) return;

  const size = Math.round(randomBetween(38, 70));
  const dur  = randomBetween(2.5, 5);
  const left = randomBetween(2, 94); // % of arena width

  const bub = document.createElement('div');
  bub.className = 'bubble';
  bub.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    `left:${left}%`,
    `background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55) 0%, ${COLORS[Math.floor(Math.random()*COLORS.length)]} 60%)`,
    `animation-duration:${dur}s`,
    `bottom:-100px`
  ].join(';');

  bub.addEventListener('click', () => popBubble(bub));
  bub.addEventListener('animationend', () => bubbleEscaped(bub));

  arena.appendChild(bub);

  // schedule next
  spawnTimer = setTimeout(spawnBubble, spawnInterval());
}

function popBubble(bub) {
  if (!gameActive || bub.classList.contains('popping')) return;
  bub.classList.add('popping');
  bub.removeEventListener('animationend', () => bubbleEscaped(bub));
  score++;
  renderScore();
  setTimeout(() => bub.remove(), 260);
}

function bubbleEscaped(bub) {
  if (!gameActive || bub.classList.contains('popping')) return;
  bub.remove();
  lives--;
  renderLives();
  if (lives <= 0) endGame();
}

function endGame() {
  gameActive = false;
  clearTimeout(spawnTimer);
  // remove remaining bubbles
  arena.querySelectorAll('.bubble').forEach(b => b.remove());
  finalEl.textContent = 'Você fez ' + score + ' ponto' + (score !== 1 ? 's' : '') + '!';
  overlay.classList.remove('hidden');
}

function startGame() {
  score = 0; lives = 5; gameActive = true;
  renderScore(); renderLives();
  overlay.classList.add('hidden');
  arena.querySelectorAll('.bubble').forEach(b => b.remove());
  clearTimeout(spawnTimer);
  spawnBubble();
}

restartBtn.addEventListener('click', startGame);
startGame();
