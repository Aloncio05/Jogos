// Quem Sou Eu? — game logic

const CATEGORIES = [
  {
    id: 'todos', label: '🎲 Todos', words: [],
  },
  {
    id: 'famosos', label: '⭐ Famosos', words: [
      'Xuxa', 'Neymar', 'Pelé', 'Anitta', 'Lula', 'Bolsonaro', 'Silvio Santos',
      'Ivete Sangalo', 'Faustão', 'Luciano Huck', 'Roberto Carlos', 'Caetano Veloso',
      'Ana Maria Braga', 'Galvão Bueno', 'Ronaldo', 'Romário', 'Chitãozinho',
      'Zezé Di Camargo', 'Michel Teló', 'Sandy', 'Junior', 'Gugu Liberato',
      'Hebe Camargo', 'Elba Ramalho', 'Claudia Leitte', 'Simone Mendes',
    ],
  },
  {
    id: 'atores', label: '🎬 Atores', words: [
      'Will Smith', 'Tom Hanks', 'Leonardo DiCaprio', 'Angelina Jolie', 'Brad Pitt',
      'Scarlett Johansson', 'Robert Downey Jr', 'Dwayne Johnson', 'Keanu Reeves',
      'Johnny Depp', 'Meryl Streep', 'Jennifer Lawrence', 'Morgan Freeman',
      'Samuel L. Jackson', 'Tom Cruise', 'Vin Diesel', 'Chris Evans', 'Chris Hemsworth',
      'Zendaya', 'Ryan Reynolds', 'Gal Gadot', 'Chadwick Boseman',
    ],
  },
  {
    id: 'animais', label: '🦁 Animais', words: [
      'Leão', 'Elefante', 'Golfinho', 'Pinguim', 'Panda', 'Tucano', 'Capivara',
      'Cobra', 'Tartaruga', 'Flamingo', 'Koala', 'Hipopótamo', 'Girafa', 'Zebra',
      'Urso', 'Lobo', 'Águia', 'Polvo', 'Tubarão', 'Canguru', 'Ornitorrinco',
      'Camaleão', 'Axolote', 'Tamanduá', 'Jacaré', 'Macaco', 'Arara',
    ],
  },
  {
    id: 'personagens', label: '🎭 Personagens', words: [
      'Mickey Mouse', 'Homem Aranha', 'Batman', 'Pikachu', 'Simba', 'Elsa', 'Shrek',
      'Minions', 'Moana', 'Stitch', 'Sonic', 'Mario', 'Woody', 'Buzz Lightyear',
      'Nemo', 'Dory', 'Scooby-Doo', 'Homer Simpson', 'Bob Esponja', 'Patrick',
      'Naruto', 'Goku', 'Deadpool', 'Thanos', 'Darth Vader', 'Harry Potter',
      'Hermione', 'Gandalf', 'Jack Sparrow', 'Mulher Maravilha',
    ],
  },
  {
    id: 'esportes', label: '⚽ Esportes', words: [
      'Futebol', 'Natação', 'Tênis', 'Basquete', 'Vôlei', 'Judô', 'Atletismo',
      'Ciclismo', 'Surf', 'Ginástica', 'Boxe', 'Karatê', 'Skate', 'Golfe',
      'Automobilismo', 'Handebol', 'Rúgbi', 'Hipismo', 'Esgrima', 'Badminton',
      'Polo Aquático', 'Levantamento de Peso', 'Luta Olímpica', 'Hóquei',
    ],
  },
  {
    id: 'paises', label: '🌍 Países', words: [
      'Brasil', 'Estados Unidos', 'França', 'Japão', 'China', 'Argentina',
      'Alemanha', 'Itália', 'Portugal', 'México', 'Rússia', 'Austrália',
      'Índia', 'Canadá', 'Espanha', 'Egito', 'África do Sul', 'Coreia do Sul',
      'Turquia', 'Grécia', 'Peru', 'Colômbia', 'Chile', 'Cuba', 'Noruega',
    ],
  },
  {
    id: 'comidas', label: '🍕 Comidas', words: [
      'Pizza', 'Hambúrguer', 'Sushi', 'Lasanha', 'Churrasco', 'Tapioca',
      'Brigadeiro', 'Açaí', 'Coxinha', 'Pão de queijo', 'Pastel', 'Feijoada',
      'Pão na chapa', 'Pamonha', 'Canjica', 'Pudim', 'Mousse de maracujá',
      'Sanduíche natural', 'Crepe', 'Waffle', 'Hot dog', 'Batata frita',
      'Sorvete', 'Pipoca', 'Quibe', 'Esfiha', 'Ramen', 'Frango frito',
    ],
  },
  {
    id: 'objetos', label: '🔑 Objetos', words: [
      'Guarda-chuva', 'Espelho', 'Relógio', 'Óculos', 'Mochila', 'Teclado',
      'Geladeira', 'Televisão', 'Violão', 'Bicicleta', 'Cadeado', 'Tesoura',
      'Caneta', 'Régua', 'Lâmpada', 'Ventilador', 'Microfone', 'Câmera',
      'Calculadora', 'Chave de fenda', 'Cofrinho', 'Luneta', 'Bússola', 'Abajur',
    ],
  },
];

// Merge all words for "Todos"
CATEGORIES[0].words = CATEGORIES.slice(1).flatMap(c => c.words);

// ===== State =====
let players = [];
let selectedCat = 'todos';
let roundTime = 120;
let currentPlayerIdx = 0;
let scores = [];
let timerInterval = null;
let timeLeft = 0;
let roundCorrect = 0;
let cardPool = [];
let cardIdx = 0;

// ===== DOM =====
const screens = {
  setup:     document.getElementById('qse-setup'),
  prepare:   document.getElementById('qse-prepare'),
  countdown: document.getElementById('qse-countdown'),
  play:      document.getElementById('qse-play'),
  roundend:  document.getElementById('qse-roundend'),
  final:     document.getElementById('qse-final'),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ===== Setup UI =====
const playerInput = document.getElementById('qse-player-input');
const playersList = document.getElementById('qse-players-list');
const addBtn      = document.getElementById('qse-add-btn');
const startBtn    = document.getElementById('qse-start-btn');
const catsEl      = document.getElementById('qse-cats');

function renderPlayers() {
  playersList.innerHTML = '';
  players.forEach((name, i) => {
    const tag = document.createElement('div');
    tag.className = 'qse-player-tag';
    tag.innerHTML = `<span>${name}</span><button aria-label="Remover ${name}">✕</button>`;
    tag.querySelector('button').onclick = () => { players.splice(i, 1); renderPlayers(); updateStartBtn(); };
    playersList.appendChild(tag);
  });
}

function addPlayer() {
  const name = playerInput.value.trim();
  if (!name || players.length >= 8) return;
  if (players.includes(name)) { playerInput.value = ''; return; }
  players.push(name);
  playerInput.value = '';
  renderPlayers();
  updateStartBtn();
  playerInput.focus();
}

addBtn.onclick = addPlayer;
playerInput.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });

function updateStartBtn() {
  startBtn.disabled = players.length < 1;
}

// Categories
CATEGORIES.forEach(cat => {
  const btn = document.createElement('button');
  btn.className = 'qse-cat-btn' + (cat.id === 'todos' ? ' active' : '');
  btn.textContent = cat.label;
  btn.dataset.id = cat.id;
  btn.onclick = () => {
    selectedCat = cat.id;
    document.querySelectorAll('.qse-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.id === cat.id));
  };
  catsEl.appendChild(btn);
});

// Timer opts
document.querySelectorAll('.qse-timer-opt').forEach(btn => {
  btn.onclick = () => {
    roundTime = parseInt(btn.dataset.t, 10);
    document.querySelectorAll('.qse-timer-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };
});

startBtn.onclick = startGame;

// ===== Game Start =====
function startGame() {
  scores = players.map(() => 0);
  currentPlayerIdx = 0;
  cardPool = shuffle([...CATEGORIES.find(c => c.id === selectedCat).words]);
  cardIdx = 0;
  showPrepare();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ===== Prepare Screen =====
function showPrepare() {
  const name = players[currentPlayerIdx];
  document.getElementById('qse-prepare-who').textContent = `Vez de ${name}`;
  showScreen('prepare');
}

document.getElementById('qse-ready-btn').onclick = startCountdown;

// ===== Countdown =====
function startCountdown() {
  showScreen('countdown');
  const el = document.getElementById('qse-count-num');
  let n = 3;
  el.textContent = n;

  const tick = () => {
    n--;
    if (n === 0) {
      el.textContent = 'JÁ!';
      setTimeout(startRound, 600);
    } else {
      el.textContent = n;
      el.style.animation = 'none';
      el.offsetWidth; // reflow
      el.style.animation = '';
      setTimeout(tick, 800);
    }
  };
  setTimeout(tick, 800);
}

// ===== Round =====
function startRound() {
  roundCorrect = 0;
  timeLeft = roundTime;

  document.getElementById('qse-play-player').textContent = players[currentPlayerIdx];
  document.getElementById('qse-play-score').textContent = '0 ✓';

  showScreen('play');
  updateTimerRing();
  nextCard();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerRing();
    if (timeLeft <= 0) endRound();
  }, 1000);
}

function updateTimerRing() {
  const val = document.getElementById('qse-timer-val');
  const ring = document.getElementById('qse-ring-progress');
  val.textContent = timeLeft;
  const pct = timeLeft / roundTime;
  const circ = 2 * Math.PI * 34;
  ring.style.strokeDashoffset = circ * (1 - pct);
  ring.classList.toggle('warn', pct <= 0.4 && pct > 0.2);
  ring.classList.toggle('danger', pct <= 0.2);
}

function nextCard() {
  if (cardIdx >= cardPool.length) {
    cardPool = shuffle([...CATEGORIES.find(c => c.id === selectedCat).words]);
    cardIdx = 0;
  }
  const word = cardPool[cardIdx++];
  const card = document.getElementById('qse-card');
  const catName = CATEGORIES.find(c => c.id === selectedCat).label;

  card.className = 'qse-card';
  document.getElementById('qse-card-text').textContent = word;
  document.getElementById('qse-category-label').textContent = catName;
  card.style.animation = 'none';
  card.offsetWidth;
  card.style.animation = '';
  document.getElementById('qse-cards-left').textContent = '';
}

function markCorrect() {
  if (timeLeft <= 0) return;
  roundCorrect++;
  scores[currentPlayerIdx]++;
  document.getElementById('qse-play-score').textContent = `${roundCorrect} ✓`;

  const card = document.getElementById('qse-card');
  card.classList.add('correct');
  flash('#22c55e');
  setTimeout(() => nextCard(), 320);
}

function markPass() {
  if (timeLeft <= 0) return;
  const card = document.getElementById('qse-card');
  card.classList.add('passed');
  flash('#ef4444');
  setTimeout(() => nextCard(), 320);
}

function flash(color) {
  const div = document.createElement('div');
  div.className = 'qse-flash';
  div.style.background = color;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 420);
}

document.getElementById('qse-got-btn').onclick  = markCorrect;
document.getElementById('qse-pass-btn').onclick = markPass;

// ===== Round End =====
function endRound() {
  clearInterval(timerInterval);
  timerInterval = null;
  timeLeft = 0;

  const name = players[currentPlayerIdx];
  document.getElementById('qse-roundend-title').textContent = `Fim da vez de ${name}!`;
  document.getElementById('qse-roundend-score').textContent = `${roundCorrect} acerto${roundCorrect !== 1 ? 's' : ''} nessa rodada`;

  const isLast = currentPlayerIdx >= players.length - 1;
  const nextBtn = document.getElementById('qse-next-btn');
  nextBtn.textContent = isLast ? 'Ver resultado' : `Vez de ${players[currentPlayerIdx + 1]} →`;

  showScreen('roundend');
}

document.getElementById('qse-next-btn').onclick = () => {
  currentPlayerIdx++;
  if (currentPlayerIdx >= players.length) {
    showFinal();
  } else {
    showPrepare();
  }
};

// ===== Final =====
function showFinal() {
  const ranked = players
    .map((name, i) => ({ name, score: scores[i] }))
    .sort((a, b) => b.score - a.score);

  const medals = ['🥇', '🥈', '🥉'];
  const container = document.getElementById('qse-final-scores');
  container.innerHTML = '';

  ranked.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'qse-final-row' + (i === 0 ? ' winner' : '');
    row.innerHTML = `
      <span class="qse-final-rank">${medals[i] || (i + 1) + 'º'}</span>
      <span class="qse-final-name">${p.name}</span>
      <span class="qse-final-pts">${p.score} pt${p.score !== 1 ? 's' : ''}</span>
    `;
    container.appendChild(row);
  });

  showScreen('final');
}

document.getElementById('qse-restart-btn').onclick = () => {
  players = [];
  scores = [];
  currentPlayerIdx = 0;
  renderPlayers();
  updateStartBtn();
  showScreen('setup');
};
