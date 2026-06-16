'use strict';

const TOTAL_SQ    = 36;
const BOARD_COLS  = 6;
const BOARD_ROWS  = 6;
const TIMER_SECS  = 60;
const TEAM_COLORS = ['#7c3aed', '#fb7185', '#22d3ee', '#34d399'];
const DICE_FACES  = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const IA_SQUARES = [
  'start',   // 0
  'person',  // 1
  'object',  // 2
  'place',   // 3
  'action',  // 4
  'wild',    // 5
  'action',  // 6
  'place',   // 7
  'skip',    // 8
  'person',  // 9
  'object',  // 10
  'wild',    // 11
  'place',   // 12
  'person',  // 13
  'action',  // 14
  'object',  // 15
  'forward', // 16
  'person',  // 17
  'wild',    // 18
  'action',  // 19
  'place',   // 20
  'object',  // 21
  'person',  // 22
  'back',    // 23
  'wild',    // 24
  'object',  // 25
  'action',  // 26
  'place',   // 27
  'person',  // 28
  'skip',    // 29
  'wild',    // 30
  'place',   // 31
  'action',  // 32
  'object',  // 33
  'person',  // 34
  'finish',  // 35
];

const CAT = {
  person:  { label: 'Pessoa',      icon: '🧑', color: '#fb923c' },
  object:  { label: 'Objeto',      icon: '📦', color: '#60a5fa' },
  place:   { label: 'Lugar',       icon: '🏠', color: '#34d399' },
  action:  { label: 'Ação',        icon: '🏃', color: '#fb7185' },
  wild:    { label: 'Livre',       icon: '⭐', color: '#a78bfa' },
  skip:    { label: 'Perde vez',   icon: '⏭️', color: '#64748b' },
  forward: { label: 'Avança +2',   icon: '⏩', color: '#22d3ee' },
  back:    { label: 'Volta -2',    icon: '⏪', color: '#ef4444' },
  start:   { label: 'Início',      icon: '🏁', color: '#334155' },
  finish:  { label: 'Chegada!',    icon: '🏆', color: '#fde047' },
};

const WORDS = {
  person: ['Médico','Professor','Astronauta','Palhaço','Pirata','Fada','Bombeiro','Bailarina','Chef','Policial','Vampiro','Surfista','Cientista','Cantor','Atleta','Mágico','Vovó','Super-herói','Piloto','Pescador','Jardineiro','Dentista','Skatista','Boxeador','Ninja','Fantasma','Robô','Sereia','Cowboy','Bruxa'],
  object: ['Guarda-chuva','Televisão','Bicicleta','Avião','Geladeira','Chapéu','Mochila','Relógio','Câmera','Violão','Óculos','Tesoura','Balão','Martelo','Lápis','Bola','Boneca','Espelho','Escova','Foguete','Âncora','Escada','Sino','Chave','Lanterna','Sofá','Vassoura','Ventilador','Caixão','Troféu'],
  place:  ['Praia','Montanha','Escola','Hospital','Aeroporto','Floresta','Parque','Cinema','Restaurante','Museu','Biblioteca','Estádio','Fazenda','Castelo','Ilha','Caverna','Circo','Zoológico','Deserto','Vulcão','Pirâmide','Fundo do mar','Selva','Polo Norte','Espaço','Metrô','Supermercado','Cemitério','Aquário','Parque de diversões'],
  action: ['Correr','Nadar','Dançar','Dormir','Cozinhar','Rir','Chorar','Voar','Pular','Cantar','Pintar','Pescar','Dirigir','Fotografar','Construir','Plantar','Mergulhar','Escalar','Patinar','Surfar','Boxear','Malabarismo','Soprar','Abraçar','Escavar','Atirar','Cavalgar','Tomar banho','Levantar peso','Tocar violão'],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Grid position (snake path) ────────────────────────────────────────────────
function gridPos(pos) {
  const row = Math.floor(pos / BOARD_COLS);
  const col = row % 2 === 0 ? pos % BOARD_COLS : (BOARD_COLS - 1) - (pos % BOARD_COLS);
  return { gridRow: BOARD_ROWS - row, gridCol: col + 1 };
}

// ── State ────────────────────────────────────────────────────────────────────
let teams        = [];
let currentTeam  = 0;
let gameState    = 'setup'; // setup | roll | reveal | timer | result | win
let currentWord  = '';
let timerSecs    = 0;
let timerInt     = null;
let teamCount    = 2;

// ── DOM ──────────────────────────────────────────────────────────────────────
const setupEl       = document.getElementById('ia-setup');
const gameEl        = document.getElementById('ia-game');
const boardEl       = document.getElementById('ia-board');
const scoreboardEl  = document.getElementById('ia-scoreboard');
const currentTeamEl = document.getElementById('ia-current-team');
const diceEl        = document.getElementById('ia-dice');
const rollBtn       = document.getElementById('ia-roll-btn');
const wordSectionEl = document.getElementById('ia-word-section');
const categoryBadge = document.getElementById('ia-category-badge');
const revealBtn     = document.getElementById('ia-reveal-btn');
const wordRevealEl  = document.getElementById('ia-word-reveal');
const wordEl        = document.getElementById('ia-word');
const timerWrapEl   = document.getElementById('ia-timer-wrap');
const timerBarEl    = document.getElementById('ia-timer-bar');
const timerNumEl    = document.getElementById('ia-timer');
const correctBtn    = document.getElementById('ia-correct-btn');
const wrongBtn      = document.getElementById('ia-wrong-btn');
const resultEl      = document.getElementById('ia-result');
const nextBtn       = document.getElementById('ia-next-btn');
const startBtn      = document.getElementById('ia-start-btn');
const restartBtn    = document.getElementById('ia-restart-btn');
const nameInputsEl  = document.getElementById('ia-name-inputs');
const countBtns     = document.querySelectorAll('[data-team-count]');

// ── Render board ─────────────────────────────────────────────────────────────
function renderBoard() {
  if (!boardEl) return;
  boardEl.innerHTML = '';

  for (let pos = 0; pos < TOTAL_SQ; pos++) {
    const { gridRow, gridCol } = gridPos(pos);
    const sq  = IA_SQUARES[pos];
    const cat = CAT[sq];

    const div = document.createElement('div');
    div.className = 'ia-square';
    div.style.gridRow    = gridRow;
    div.style.gridColumn = gridCol;
    div.style.setProperty('--sq-color', cat.color);

    const iconSpan = document.createElement('span');
    iconSpan.className   = 'ia-sq-icon';
    iconSpan.textContent = cat.icon;
    div.appendChild(iconSpan);

    const numSpan = document.createElement('span');
    numSpan.className   = 'ia-sq-num';
    numSpan.textContent = pos === 0 ? 'INI' : pos === TOTAL_SQ - 1 ? 'FIM' : pos;
    div.appendChild(numSpan);

    // Tokens
    const tokensDiv = document.createElement('div');
    tokensDiv.className = 'ia-tokens';
    teams.forEach(team => {
      if (team.pos === pos) {
        const t = document.createElement('div');
        t.className   = 'ia-token';
        t.style.background = team.color;
        t.textContent = team.name[0].toUpperCase();
        tokensDiv.appendChild(t);
      }
    });
    div.appendChild(tokensDiv);
    boardEl.appendChild(div);
  }
}

// ── Render scoreboard ─────────────────────────────────────────────────────────
function renderScoreboard() {
  if (!scoreboardEl) return;
  scoreboardEl.innerHTML = '';
  teams.forEach((team, i) => {
    const item = document.createElement('div');
    item.className = 'ia-score-item' + (i === currentTeam ? ' ia-score-item--active' : '');
    item.style.borderColor = team.color;
    item.innerHTML = `
      <span class="ia-score-dot" style="background:${team.color}">${team.name[0].toUpperCase()}</span>
      <span class="ia-score-name">${team.name}</span>
      <span class="ia-score-pts">${team.score}pt</span>
    `;
    scoreboardEl.appendChild(item);
  });
}

// ── State transitions ─────────────────────────────────────────────────────────
function setState(s) {
  gameState = s;
  rollBtn.hidden      = s !== 'roll';
  wordSectionEl.hidden = !['reveal','timer'].includes(s);
  if (revealBtn)    revealBtn.hidden    = s !== 'reveal';
  if (wordRevealEl) wordRevealEl.hidden = s !== 'timer';
  resultEl.hidden   = !['result','win'].includes(s);
  nextBtn.hidden    = s !== 'result';
}

// ── Roll dice ─────────────────────────────────────────────────────────────────
function roll() {
  if (gameState !== 'roll') return;
  rollBtn.disabled = true;
  let ticks = 0;
  const anim = setInterval(() => {
    diceEl.textContent = DICE_FACES[Math.floor(Math.random() * 6) + 1];
    if (++ticks >= 12) {
      clearInterval(anim);
      const result = Math.floor(Math.random() * 6) + 1;
      diceEl.textContent = DICE_FACES[result];
      rollBtn.disabled = false;
      movePiece(result);
    }
  }, 70);
}

// ── Move piece ────────────────────────────────────────────────────────────────
function movePiece(steps) {
  const team = teams[currentTeam];
  team.pos = Math.min(team.pos + steps, TOTAL_SQ - 1);
  renderBoard();

  if (team.pos >= TOTAL_SQ - 1) { win(); return; }

  const sq = IA_SQUARES[team.pos];

  if (sq === 'skip') {
    showResult(`${CAT.skip.icon} ${team.name} perde a vez!`);
    nextTeam(); return;
  }
  if (sq === 'forward') {
    team.pos = Math.min(team.pos + 2, TOTAL_SQ - 1);
    renderBoard();
    if (team.pos >= TOTAL_SQ - 1) { win(); return; }
    showResult(`${CAT.forward.icon} ${team.name} avançou +2 casas!`);
    setState('result'); return;
  }
  if (sq === 'back') {
    team.pos = Math.max(team.pos - 2, 0);
    renderBoard();
    showResult(`${CAT.back.icon} ${team.name} voltou -2 casas!`);
    setState('result'); return;
  }

  // Word round
  const catKey = sq === 'wild'
    ? pick(['person','object','place','action'])
    : sq;
  currentWord = pick(WORDS[catKey]);
  const cat = CAT[catKey];

  categoryBadge.textContent = `${cat.icon} ${cat.label}`;
  categoryBadge.style.background = cat.color + '33';
  categoryBadge.style.color = cat.color;
  currentTeamEl.textContent = `✏️ ${team.name} deve desenhar!`;
  setState('reveal');
}

// ── Reveal word ───────────────────────────────────────────────────────────────
function revealWord() {
  wordEl.textContent = currentWord;
  setState('timer');
  startTimer();
}

function startTimer() {
  timerSecs = TIMER_SECS;
  updateTimer();
  clearInterval(timerInt);
  timerInt = setInterval(() => {
    timerSecs--;
    updateTimer();
    if (timerSecs <= 0) {
      clearInterval(timerInt);
      timerNumEl.textContent = 'Tempo!';
    }
  }, 1000);
}

function updateTimer() {
  timerNumEl.textContent = timerSecs;
  if (timerBarEl) timerBarEl.style.width = `${(timerSecs / TIMER_SECS) * 100}%`;
}

// ── Answer ────────────────────────────────────────────────────────────────────
function correct() {
  clearInterval(timerInt);
  teams[currentTeam].score++;
  renderScoreboard();
  showResult('✓ Acertou! +1 ponto para a equipe.');
  setState('result');
}

function wrong() {
  clearInterval(timerInt);
  teams[currentTeam].pos = Math.max(teams[currentTeam].pos - 1, 0);
  renderBoard();
  showResult('✗ Errou. A equipe voltou 1 casa.');
  setState('result');
}

function showResult(msg) {
  resultEl.textContent = msg;
  resultEl.hidden = false;
}

// ── Next team ─────────────────────────────────────────────────────────────────
function nextTeam() {
  currentTeam = (currentTeam + 1) % teams.length;
  const team = teams[currentTeam];
  currentTeamEl.textContent = `Vez de: ${team.name}`;
  currentTeamEl.style.color = team.color;
  diceEl.textContent = '🎲';
  renderScoreboard();
  setState('roll');
}

// ── Win ───────────────────────────────────────────────────────────────────────
function win() {
  clearInterval(timerInt);
  const winner = teams[currentTeam];
  currentTeamEl.textContent = `🏆 ${winner.name} venceu!`;
  currentTeamEl.style.color = winner.color;
  showResult(`Parabéns, ${winner.name}! Chegou primeiro ao FIM com ${winner.score} pontos!`);
  rollBtn.hidden = true;
  wordSectionEl.hidden = true;
  nextBtn.hidden = true;
  gameState = 'win';
}

// ── Start game ────────────────────────────────────────────────────────────────
function startGame() {
  const groups = nameInputsEl.querySelectorAll('.ia-name-group:not(.ia-name-group--hidden)');
  teams = Array.from(groups).slice(0, teamCount).map((g, i) => ({
    name:  g.querySelector('input').value.trim() || `Equipe ${i + 1}`,
    color: TEAM_COLORS[i],
    pos:   0,
    score: 0,
  }));

  setupEl.hidden = true;
  gameEl.hidden  = false;

  renderBoard();
  renderScoreboard();

  const team = teams[0];
  currentTeamEl.textContent = `Vez de: ${team.name}`;
  currentTeamEl.style.color = team.color;
  diceEl.textContent = '🎲';
  setState('roll');
}

// ── Restart ───────────────────────────────────────────────────────────────────
function restart() {
  clearInterval(timerInt);
  gameEl.hidden  = true;
  setupEl.hidden = false;
  gameState = 'setup';
}

// ── Team count selection ──────────────────────────────────────────────────────
countBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    teamCount = parseInt(btn.dataset.teamCount);
    countBtns.forEach(b => b.classList.remove('ia-count-btn--active'));
    btn.classList.add('ia-count-btn--active');

    const groups = nameInputsEl.querySelectorAll('[data-team-idx]');
    groups.forEach(g => {
      const idx = parseInt(g.dataset.teamIdx);
      g.classList.toggle('ia-name-group--hidden', idx >= teamCount);
    });
  });
});

// Default: 2 teams
document.querySelector('[data-team-count="2"]').click();

// ── Event listeners ───────────────────────────────────────────────────────────
startBtn   && startBtn.addEventListener('click',   startGame);
restartBtn && restartBtn.addEventListener('click',  restart);
rollBtn    && rollBtn.addEventListener('click',     roll);
revealBtn  && revealBtn.addEventListener('click',   revealWord);
correctBtn && correctBtn.addEventListener('click',  correct);
wrongBtn   && wrongBtn.addEventListener('click',    wrong);
nextBtn    && nextBtn.addEventListener('click',     nextTeam);
