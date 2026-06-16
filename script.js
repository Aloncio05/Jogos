window.GAME_VERSION = '13';
const ticBoardElement = document.querySelector('#tic-tac-toe-board');
const ticStatusElement = document.querySelector('#tic-tac-toe-status');
const resetTicButton = document.querySelector('#reset-tic-tac-toe');
const toggleBotButton = document.querySelector('#toggle-bot');

const memoryBoardElement = document.querySelector('#memory-board');
const memoryStatusElement = document.querySelector('#memory-status');
const resetMemoryButton = document.querySelector('#reset-memory');

const guessForm = document.querySelector('#guess-form');
const guessInput = document.querySelector('#guess-input');
const guessFeedback = document.querySelector('#guess-feedback');
const resetGuessButton = document.querySelector('#reset-guess');

const snakeCanvas = document.querySelector('#snake-canvas');
const snakeStatusElement = document.querySelector('#snake-status');
const startSnakeButton = document.querySelector('#start-snake');
const resetSnakeButton = document.querySelector('#reset-snake');
const directionButtons = document.querySelectorAll('[data-direction]');

const detectiveStoryElement = document.querySelector('#detective-story');
const detectiveCluesElement = document.querySelector('#detective-clues');
const detectiveSuspectsElement = document.querySelector('#detective-suspects');
const detectiveFeedbackElement = document.querySelector('#detective-feedback');
const resetDetectiveButton = document.querySelector('#reset-detective');

const roomCodeElement = document.querySelector('#room-code');
const copyRoomLinkButton = document.querySelector('#copy-room-link');
const playerForm = document.querySelector('#player-form');
const playerNameInput = document.querySelector('#player-name');
const playerFeedbackElement = document.querySelector('#player-feedback');
const addCardBotButton = document.querySelector('#add-card-bot');
const startCardGameButton = document.querySelector('#start-card-game');
const resetCardGameButton = document.querySelector('#reset-card-game');
const drawCardButton = document.querySelector('#draw-card');
const passTurnButton = document.querySelector('#pass-turn');
const cardGameStatusElement = document.querySelector('#card-game-status');
const turnTimerElement = document.querySelector('#turn-timer');
const turnTimerCountElement = document.querySelector('#turn-timer-count');
const playersListElement = document.querySelector('#players-list');
const cardTableElement = document.querySelector('#card-table');
const cardArenaElement = document.querySelector('#card-arena');
const cardAvatarsElement = document.querySelector('#card-avatars');
const playerHandElement = document.querySelector('#player-hand');
const deckCountLabel = document.querySelector('#deck-count-label');
const discardLabel = document.querySelector('#discard-label');
const lastCardVisualElement = document.querySelector('#last-card-visual');
const roundFinishOverlayElement = document.querySelector('#round-finish-overlay');
const roundFinishTitleElement = document.querySelector('#round-finish-title');
const roundFinishMessageElement = document.querySelector('#round-finish-message');
const restartRoundButton = document.querySelector('#restart-round');
const closeOnlineRoomButton = document.querySelector('#close-online-room');
const onlineStatusElement = document.querySelector('#online-status');
const createOnlineRoomButton = document.querySelector('#create-online-room');
const joinRoomForm = document.querySelector('#join-room-form');
const joinRoomCodeInput = document.querySelector('#join-room-code');
const callUnoButton = document.querySelector('#call-uno');
const catchUnoButton = document.querySelector('#catch-uno');
const challengePlusFourButton = document.querySelector('#challenge-plus-four');
const colorChoiceButtons = document.querySelectorAll('[data-card-color]');

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

let ticBoard = Array(9).fill('');
let currentPlayer = 'X';
let ticFinished = false;
let botEnabled = false;

function renderTicTacToe() {
  ticBoardElement.innerHTML = '';

  const winner = getTicWinner();
  ticBoard.forEach((value, index) => {
    const cell = document.createElement('button');
    cell.className = 'tic-cell';
    cell.type = 'button';
    cell.textContent = value;
    cell.setAttribute('aria-label', `Casa ${index + 1}`);

    if (winner?.line.includes(index)) {
      cell.classList.add('winner');
    }

    cell.addEventListener('click', () => playTicTurn(index));
    ticBoardElement.appendChild(cell);
  });
}

function playTicTurn(index) {
  if (ticBoard[index] || ticFinished || (botEnabled && currentPlayer === 'O')) return;

  ticBoard[index] = currentPlayer;
  finishTicTurn();
}

function finishTicTurn() {
  const winner = getTicWinner();

  if (winner) {
    ticFinished = true;
    ticStatusElement.textContent = `Jogador ${winner.player} venceu!`;
  } else if (ticBoard.every(Boolean)) {
    ticFinished = true;
    ticStatusElement.textContent = 'Deu velha!';
  } else {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    ticStatusElement.textContent = `Vez do jogador ${currentPlayer}`;
  }

  renderTicTacToe();

  if (!ticFinished && botEnabled && currentPlayer === 'O') {
    ticStatusElement.textContent = 'BOT pensando...';
    setTimeout(playBotTurn, 450);
  }
}

function playBotTurn() {
  const move = chooseBotMove();
  if (move === null) return;

  ticBoard[move] = 'O';
  finishTicTurn();
}

function chooseBotMove() {
  const emptyCells = ticBoard
    .map((value, index) => (value ? null : index))
    .filter((index) => index !== null);

  return (
    findBestTicMove('O') ??
    findBestTicMove('X') ??
    (ticBoard[4] ? null : 4) ??
    emptyCells[Math.floor(Math.random() * emptyCells.length)] ??
    null
  );
}

function findBestTicMove(player) {
  for (const line of winningLines) {
    const values = line.map((index) => ticBoard[index]);
    const playerCount = values.filter((value) => value === player).length;
    const emptyIndex = line.find((index) => !ticBoard[index]);

    if (playerCount === 2 && emptyIndex !== undefined) {
      return emptyIndex;
    }
  }

  return null;
}

function getTicWinner() {
  for (const line of winningLines) {
    const [a, b, c] = line;
    if (ticBoard[a] && ticBoard[a] === ticBoard[b] && ticBoard[a] === ticBoard[c]) {
      return { player: ticBoard[a], line };
    }
  }
  return null;
}

function resetTicTacToe() {
  ticBoard = Array(9).fill('');
  currentPlayer = 'X';
  ticFinished = false;
  ticStatusElement.textContent = botEnabled ? 'Sua vez: jogador X' : 'Vez do jogador X';
  renderTicTacToe();
}

function toggleBotMode() {
  botEnabled = !botEnabled;
  toggleBotButton.textContent = botEnabled ? 'Modo BOT: ligado' : 'Modo BOT: desligado';
  resetTicTacToe();
}

// ---- MEMORY GAME — sistema de fases ----
const ALL_MEMORY_SYMBOLS = [
  '🌟', '🔥', '🎯', '🎲', '🌈', '🦋',
  '🎸', '🚀', '🦊', '🎃', '💎', '🐸',
  '🌙', '⚡', '🦄', '🍀', '🎭', '🏆',
];

const MEMORY_PHASES = [
  { pairs: 4,  cols: 4, timer: 0,  flipDelay: 1200, label: 'Aquecimento' },
  { pairs: 5,  cols: 5, timer: 0,  flipDelay: 1100, label: 'Iniciante'   },
  { pairs: 6,  cols: 4, timer: 0,  flipDelay: 1000, label: 'Fácil'       },
  { pairs: 6,  cols: 4, timer: 90, flipDelay: 1000, label: 'Com tempo'   },
  { pairs: 8,  cols: 4, timer: 90, flipDelay: 900,  label: 'Médio'       },
  { pairs: 8,  cols: 4, timer: 75, flipDelay: 850,  label: 'Médio+'      },
  { pairs: 10, cols: 5, timer: 75, flipDelay: 800,  label: 'Difícil'     },
  { pairs: 10, cols: 5, timer: 65, flipDelay: 750,  label: 'Difícil+'    },
  { pairs: 12, cols: 6, timer: 60, flipDelay: 700,  label: 'Intenso'     },
  { pairs: 12, cols: 6, timer: 55, flipDelay: 650,  label: 'Intenso+'    },
  { pairs: 14, cols: 7, timer: 55, flipDelay: 600,  label: 'Expert'      },
  { pairs: 14, cols: 7, timer: 50, flipDelay: 550,  label: 'Expert+'     },
  { pairs: 16, cols: 8, timer: 50, flipDelay: 500,  label: 'Mestre'      },
  { pairs: 18, cols: 6, timer: 45, flipDelay: 500,  label: 'Mestre+'     },
  { pairs: 18, cols: 6, timer: 40, flipDelay: 450,  label: 'Lendário'    },
];

const memoryPhaseDisplay    = document.querySelector('#memory-phase-display');
const memoryTimerItem       = document.querySelector('#memory-timer-item');
const memoryTimerDisplay    = document.querySelector('#memory-timer-display');
const memoryMovesDisplay    = document.querySelector('#memory-moves-display');
const memoryPairsDisplay    = document.querySelector('#memory-pairs-display');
const memoryPhasesStrip     = document.querySelector('#memory-phases-strip');
const memoryNextPhaseButton = document.querySelector('#memory-next-phase');

let currentMemoryPhase = 0;
let memoryCards        = [];
let selectedCards      = [];
let memoryMovements    = 0;
let lockMemoryBoard    = false;
let memoryTimerSecs    = 0;
let memoryTimerInt     = null;

function startMemoryPhase(phaseIndex) {
  currentMemoryPhase = phaseIndex;
  const phase = MEMORY_PHASES[phaseIndex];
  const symbols = ALL_MEMORY_SYMBOLS.slice(0, phase.pairs);

  memoryCards = shuffle([...symbols, ...symbols]).map((symbol, index) => ({
    id: index, symbol, visible: false, matched: false,
  }));
  selectedCards   = [];
  memoryMovements = 0;
  lockMemoryBoard = false;

  if (memoryNextPhaseButton) memoryNextPhaseButton.hidden = true;
  if (resetMemoryButton) resetMemoryButton.textContent = 'Reiniciar fase';

  stopMemoryTimer();
  if (phase.timer > 0) {
    memoryTimerSecs = phase.timer;
    if (memoryTimerItem) memoryTimerItem.hidden = false;
    startMemoryTimer(phase);
  } else {
    memoryTimerSecs = 0;
    if (memoryTimerItem) memoryTimerItem.hidden = true;
  }

  if (memoryStatusElement) {
    memoryStatusElement.textContent = `Fase ${phaseIndex + 1}: ${phase.label} — ${phase.pairs} pares${phase.timer ? ', ' + phase.timer + 's' : ''}`;
  }

  updateMemoryHud();
  renderMemory();
  renderMemoryPhaseStrip();
}

function startMemoryTimer(phase) {
  updateMemoryTimerDisplay();
  memoryTimerInt = setInterval(() => {
    memoryTimerSecs -= 1;
    updateMemoryTimerDisplay();
    if (memoryTimerSecs <= 0) {
      stopMemoryTimer();
      lockMemoryBoard = true;
      if (memoryStatusElement) {
        memoryStatusElement.textContent = 'Tempo esgotado! Clique em "Reiniciar fase" para tentar novamente.';
      }
      if (resetMemoryButton) resetMemoryButton.textContent = 'Tentar novamente';
    }
  }, 1000);
}

function stopMemoryTimer() {
  clearInterval(memoryTimerInt);
  memoryTimerInt = null;
  if (memoryTimerItem) {
    memoryTimerItem.classList.remove('timer-warning', 'timer-danger');
  }
}

function updateMemoryTimerDisplay() {
  const s = memoryTimerSecs;
  if (memoryTimerDisplay) {
    memoryTimerDisplay.textContent = s < 10 ? '0' + s : String(s);
  }
  if (memoryTimerItem) {
    memoryTimerItem.classList.toggle('timer-warning', s <= 15 && s > 8);
    memoryTimerItem.classList.toggle('timer-danger',  s <= 8);
  }
}

function updateMemoryHud() {
  const phase = MEMORY_PHASES[currentMemoryPhase];
  if (memoryPhaseDisplay) memoryPhaseDisplay.textContent = (currentMemoryPhase + 1) + ' / 15';
  if (memoryMovesDisplay) memoryMovesDisplay.textContent = memoryMovements;
  const matched = memoryCards.filter(function(c) { return c.matched; }).length / 2;
  if (memoryPairsDisplay) memoryPairsDisplay.textContent = matched + ' / ' + phase.pairs;
}

function renderMemory() {
  if (!memoryBoardElement) return;
  const phase = MEMORY_PHASES[currentMemoryPhase];
  memoryBoardElement.style.setProperty('--memory-cols', phase.cols);
  memoryBoardElement.innerHTML = '';

  memoryCards.forEach(function(card) {
    var btn = document.createElement('button');
    btn.className = 'memory-card';
    btn.type = 'button';
    btn.setAttribute('aria-label', card.visible || card.matched ? card.symbol : 'Carta virada');

    if (card.visible) btn.classList.add('visible');
    if (card.matched) btn.classList.add('matched');

    var front = document.createElement('span');
    front.className = 'mc-front';
    front.textContent = card.symbol;

    var back = document.createElement('span');
    back.className = 'mc-back';
    back.textContent = '?';

    btn.appendChild(front);
    btn.appendChild(back);
    btn.addEventListener('click', (function(id) {
      return function() { revealMemoryCard(id); };
    })(card.id));
    memoryBoardElement.appendChild(btn);
  });
}

function revealMemoryCard(cardId) {
  var card = memoryCards.find(function(c) { return c.id === cardId; });
  if (lockMemoryBoard || !card || card.visible || card.matched) return;

  card.visible = true;
  selectedCards.push(card);
  renderMemory();

  if (selectedCards.length === 2) {
    memoryMovements += 1;
    updateMemoryHud();
    checkMemoryPair();
  }
}

function checkMemoryPair() {
  var first  = selectedCards[0];
  var second = selectedCards[1];
  var phase  = MEMORY_PHASES[currentMemoryPhase];

  if (first.symbol === second.symbol) {
    first.matched  = true;
    second.matched = true;
    selectedCards  = [];
    renderMemory();
    updateMemoryHud();

    if (memoryCards.every(function(c) { return c.matched; })) {
      stopMemoryTimer();
      var isLast = currentMemoryPhase >= MEMORY_PHASES.length - 1;
      if (memoryStatusElement) {
        memoryStatusElement.textContent = isLast
          ? 'Parabéns! Você completou todas as 15 fases em ' + memoryMovements + ' movimentos!'
          : 'Fase ' + (currentMemoryPhase + 1) + ' concluída em ' + memoryMovements + ' movimentos!';
      }
      if (!isLast && memoryNextPhaseButton) {
        memoryNextPhaseButton.hidden = false;
      }
      renderMemoryPhaseStrip();
    }
    return;
  }

  lockMemoryBoard = true;
  setTimeout(function() {
    first.visible  = false;
    second.visible = false;
    selectedCards  = [];
    lockMemoryBoard = false;
    renderMemory();
  }, phase.flipDelay);
}

function renderMemoryPhaseStrip() {
  if (!memoryPhasesStrip) return;
  memoryPhasesStrip.innerHTML = '';
  MEMORY_PHASES.forEach(function(p, i) {
    var dot = document.createElement('button');
    dot.className = 'memory-phase-dot';
    dot.type = 'button';
    dot.title = 'Fase ' + (i + 1) + ': ' + p.label;
    dot.setAttribute('aria-label', 'Fase ' + (i + 1));
    if (i < currentMemoryPhase)   dot.classList.add('done');
    if (i === currentMemoryPhase) dot.classList.add('current');
    dot.addEventListener('click', (function(idx) {
      return function() { stopMemoryTimer(); startMemoryPhase(idx); };
    })(i));
    memoryPhasesStrip.appendChild(dot);
  });
}

function createMemoryCards() {
  startMemoryPhase(currentMemoryPhase);
}

function shuffle(items) {
  return items
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

let secretNumber = createSecretNumber();
let attempts = 0;

function createSecretNumber() {
  return Math.floor(Math.random() * 100) + 1;
}

function submitGuess(event) {
  event.preventDefault();
  const guess = Number(guessInput.value);

  if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
    setGuessFeedback('Digite um número válido entre 1 e 100.', 'error');
    return;
  }

  attempts += 1;

  if (guess === secretNumber) {
    setGuessFeedback(`Acertou! O número era ${secretNumber}. Tentativas: ${attempts}.`, 'success');
    guessInput.disabled = true;
    return;
  }

  const hint = guess < secretNumber ? 'maior' : 'menor';
  setGuessFeedback(`O número secreto é ${hint}. Tentativas: ${attempts}.`, '');
  guessInput.value = '';
  guessInput.focus();
}

function setGuessFeedback(message, type) {
  guessFeedback.textContent = message;
  guessFeedback.className = `feedback ${type}`.trim();
}

function resetGuessGame() {
  secretNumber = createSecretNumber();
  attempts = 0;
  guessInput.disabled = false;
  guessInput.value = '';
  setGuessFeedback('Novo número criado. Digite um palpite para começar.', '');
  guessInput.focus();
}

const snakeContext = snakeCanvas ? snakeCanvas.getContext('2d') : null;
const snakeGridSize = 18;
const snakeTileCount = snakeCanvas ? snakeCanvas.width / snakeGridSize : 0;
let snake = [];
let snakeFood = { x: 8, y: 8 };
let snakeDirection = { x: 1, y: 0 };
let nextSnakeDirection = { x: 1, y: 0 };
let snakeScore = 0;
let snakeTimer = null;
let snakeRunning = false;

const SNAKE_PHASES = [
  { speed: 180, foodToAdvance: 3,  label: 'Devagar'    },
  { speed: 160, foodToAdvance: 4,  label: 'Animando'   },
  { speed: 140, foodToAdvance: 4,  label: 'Acordada'   },
  { speed: 124, foodToAdvance: 5,  label: 'Esperta'    },
  { speed: 110, foodToAdvance: 5,  label: 'Rápida'     },
  { speed: 100, foodToAdvance: 6,  label: 'Veloz'      },
  { speed: 90,  foodToAdvance: 6,  label: 'Turbinada'  },
  { speed: 82,  foodToAdvance: 7,  label: 'Acelerada'  },
  { speed: 74,  foodToAdvance: 7,  label: 'Furiosa'    },
  { speed: 68,  foodToAdvance: 8,  label: 'Louca'      },
  { speed: 62,  foodToAdvance: 8,  label: 'Insana'     },
  { speed: 56,  foodToAdvance: 9,  label: 'Absurda'    },
  { speed: 50,  foodToAdvance: 9,  label: 'Impossível' },
  { speed: 46,  foodToAdvance: 10, label: 'Lendária'   },
  { speed: 42,  foodToAdvance: 999,label: 'Aloncinho!' },
];
let snakePhase = 0;
let snakePhaseFood = 0;

function resetSnakeGame() {
  stopSnake();
  snake = [
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 },
  ];
  snakeDirection = { x: 1, y: 0 };
  nextSnakeDirection = { x: 1, y: 0 };
  snakeScore = 0;
  snakePhase = 0;
  snakePhaseFood = 0;
  placeSnakeFood();
  updateSnakeHud();
  if (snakeStatusElement) snakeStatusElement.textContent = 'Use as setas do teclado ou os botões para jogar.';
  drawSnake();
}

function startSnakeGame() {
  if (snakeRunning) return;

  // Sempre recomeça da posição inicial
  snake = [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }];
  snakeDirection = { x: 1, y: 0 };
  nextSnakeDirection = { x: 1, y: 0 };
  snakeScore = 0;
  snakePhase = 0;
  snakePhaseFood = 0;
  placeSnakeFood();
  updateSnakeHud();
  drawSnake();

  snakeRunning = true;
  if (startSnakeButton) startSnakeButton.textContent = 'Jogando...';
  if (snakeCanvas) snakeCanvas.focus();
  const phase = SNAKE_PHASES[snakePhase];
  if (snakeStatusElement) snakeStatusElement.textContent = `Fase 1: ${phase.label} — Pontuação: 0`;
  snakeTimer = setInterval(moveSnake, phase.speed);
}

function stopSnake() {
  snakeRunning = false;
  if (snakeTimer) {
    clearInterval(snakeTimer);
    snakeTimer = null;
  }
  if (startSnakeButton) startSnakeButton.textContent = 'Começar';
}

function moveSnake() {
  snakeDirection = nextSnakeDirection;
  const head = {
    x: snake[0].x + snakeDirection.x,
    y: snake[0].y + snakeDirection.y,
  };

  const hitWall = head.x < 0 || head.y < 0 || head.x >= snakeTileCount || head.y >= snakeTileCount;
  const hitBody = snake.some((part) => part.x === head.x && part.y === head.y);

  if (hitWall || hitBody) {
    stopSnake();
    if (snakeStatusElement) snakeStatusElement.textContent = `Fim de jogo! Fase ${snakePhase + 1} — Pontuação final: ${snakeScore}`;
    drawSnake();
    return;
  }

  snake.unshift(head);

  if (head.x === snakeFood.x && head.y === snakeFood.y) {
    snakeScore += snakePhase + 1;
    snakePhaseFood += 1;
    placeSnakeFood();

    const phase = SNAKE_PHASES[snakePhase];
    if (snakePhaseFood >= phase.foodToAdvance && snakePhase < SNAKE_PHASES.length - 1) {
      snakePhase += 1;
      snakePhaseFood = 0;
      clearInterval(snakeTimer);
      snakeTimer = setInterval(moveSnake, SNAKE_PHASES[snakePhase].speed);
    }
  } else {
    snake.pop();
  }

  updateSnakeHud();
  const cur = SNAKE_PHASES[snakePhase];
  if (snakeStatusElement) snakeStatusElement.textContent = `Fase ${snakePhase + 1}: ${cur.label} — Pontuação: ${snakeScore}`;
  drawSnake();
}

function updateSnakeHud() {
  const phaseEl = document.querySelector('#snake-phase-display');
  const scoreEl = document.querySelector('#snake-score-display');
  const nextEl  = document.querySelector('#snake-next-display');
  const speedEl = document.querySelector('#snake-speed-display');
  const phase = SNAKE_PHASES[snakePhase];
  if (phaseEl) phaseEl.textContent = (snakePhase + 1) + ' / 15';
  if (scoreEl) scoreEl.textContent = snakeScore;
  if (nextEl) {
    const rem = phase.foodToAdvance - snakePhaseFood;
    nextEl.textContent = snakePhase >= SNAKE_PHASES.length - 1 ? '—' : rem + (rem === 1 ? ' comida' : ' comidas');
  }
  if (speedEl) speedEl.textContent = phase.label;
}

function drawSnake() {
  if (!snakeContext) return;
  snakeContext.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);

  snakeContext.fillStyle = 'rgba(0, 0, 0, 0.22)';
  snakeContext.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

  snakeContext.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  snakeContext.lineWidth = 0.5;
  for (let i = 0; i <= snakeTileCount; i++) {
    snakeContext.beginPath();
    snakeContext.moveTo(i * snakeGridSize, 0);
    snakeContext.lineTo(i * snakeGridSize, snakeCanvas.height);
    snakeContext.stroke();
    snakeContext.beginPath();
    snakeContext.moveTo(0, i * snakeGridSize);
    snakeContext.lineTo(snakeCanvas.width, i * snakeGridSize);
    snakeContext.stroke();
  }

  snakeContext.shadowColor = '#22d3ee';
  snakeContext.shadowBlur = 10;
  snakeContext.fillStyle = '#22d3ee';
  snakeContext.beginPath();
  snakeContext.arc(
    snakeFood.x * snakeGridSize + snakeGridSize / 2,
    snakeFood.y * snakeGridSize + snakeGridSize / 2,
    snakeGridSize / 2 - 2, 0, Math.PI * 2,
  );
  snakeContext.fill();
  snakeContext.shadowBlur = 0;

  snake.forEach((part, index) => {
    const x = part.x * snakeGridSize + 2;
    const y = part.y * snakeGridSize + 2;
    const size = snakeGridSize - 4;
    if (index === 0) {
      snakeContext.shadowColor = '#a78bfa';
      snakeContext.shadowBlur = 12;
      snakeContext.fillStyle = '#a78bfa';
    } else {
      snakeContext.shadowBlur = 0;
      const alpha = Math.max(0.35, 1 - (index / snake.length) * 0.6);
      snakeContext.fillStyle = `rgba(52, 211, 153, ${alpha})`;
    }
    snakeContext.fillRect(x, y, size, size);
  });
  snakeContext.shadowBlur = 0;
}

function placeSnakeFood() {
  do {
    snakeFood = {
      x: Math.floor(Math.random() * snakeTileCount),
      y: Math.floor(Math.random() * snakeTileCount),
    };
  } while (snake.some((part) => part.x === snakeFood.x && part.y === snakeFood.y));
}

function changeSnakeDirection(direction) {
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const next = directions[direction];
  if (!next) return;

  const isOpposite = next.x + nextSnakeDirection.x === 0 && next.y + nextSnakeDirection.y === 0;
  if (!isOpposite) {
    nextSnakeDirection = next;
  }

  if (!snakeRunning && snakeCanvas) {
    startSnakeGame();
  }
}

const detectiveCases = [
  {
    story: 'O troféu do campeonato sumiu da sala de jogos. Só quatro pessoas passaram por lá.',
    culprit: 'Lia',
    clues: [
      'A câmera mostrou alguém usando jaqueta azul.',
      'O troféu foi encontrado perto da mochila de quem gosta de xadrez.',
      'A pessoa culpada disse que nem entrou na sala, mas seu cartão registrou entrada.',
    ],
    suspects: [
      { name: 'Lia', detail: 'Usava jaqueta azul, joga xadrez e negou ter entrado na sala.' },
      { name: 'Theo', detail: 'Usava camisa verde e estava na cantina.' },
      { name: 'Bia', detail: 'Entrou na sala, mas estava sem mochila.' },
      { name: 'Noah', detail: 'Usava jaqueta azul, mas estava no laboratório registrado por câmera.' },
    ],
  },
  {
    story: 'O controle do videogame desapareceu antes da final. O detetive precisa achar o responsável.',
    culprit: 'Rafa',
    clues: [
      'Quem pegou o controle deixou cheiro de pipoca doce.',
      'A pessoa culpada estava treinando para a final.',
      'Uma testemunha viu um boné vermelho saindo da sala.',
    ],
    suspects: [
      { name: 'Mila', detail: 'Comeu pipoca salgada e não participou da final.' },
      { name: 'Rafa', detail: 'Usava boné vermelho, comeu pipoca doce e treinava para a final.' },
      { name: 'Davi', detail: 'Treinava para a final, mas usava boné preto.' },
      { name: 'Nina', detail: 'Usava boné vermelho, mas estava jogando memória.' },
    ],
  },
];

let currentDetectiveCase = null;
let detectiveAttempts = 0;

function createDetectiveCase() {
  currentDetectiveCase = detectiveCases[Math.floor(Math.random() * detectiveCases.length)];
  detectiveAttempts = 0;
  detectiveStoryElement.textContent = currentDetectiveCase.story;
  detectiveFeedbackElement.textContent = 'Escolha um suspeito para resolver o caso.';
  detectiveFeedbackElement.className = 'feedback';

  detectiveCluesElement.innerHTML = '';
  currentDetectiveCase.clues.forEach((clue, index) => {
    const clueElement = document.createElement('div');
    clueElement.className = 'clue-item';
    clueElement.textContent = `Pista ${index + 1}: ${clue}`;
    detectiveCluesElement.appendChild(clueElement);
  });

  detectiveSuspectsElement.innerHTML = '';
  currentDetectiveCase.suspects.forEach((suspect) => {
    const button = document.createElement('button');
    button.className = 'suspect-card';
    button.type = 'button';
    button.innerHTML = `<strong>${suspect.name}</strong><span>${suspect.detail}</span>`;
    button.addEventListener('click', () => chooseSuspect(suspect.name));
    detectiveSuspectsElement.appendChild(button);
  });
}

function chooseSuspect(name) {
  detectiveAttempts += 1;

  if (name === currentDetectiveCase.culprit) {
    detectiveFeedbackElement.textContent = `Caso resolvido! ${name} era a pessoa culpada. Tentativas: ${detectiveAttempts}.`;
    detectiveFeedbackElement.className = 'feedback success';
    return;
  }

  detectiveFeedbackElement.textContent = `${name} não parece ser a pessoa culpada. Revise as pistas e tente novamente.`;
  detectiveFeedbackElement.className = 'feedback error';
}

const cardColors = ['red', 'blue', 'green', 'yellow'];
const actionCardValues = ['+2', 'Inverter', 'Pular'];
const colorLabels = {
  red: 'Vermelho',
  blue: 'Azul',
  green: 'Verde',
  yellow: 'Amarelo',
};

const maxCardPlayers = 10;
const gameWinningScore = 500;
const turnDurationSeconds = 35;

let roomCode = '';
let cardPlayers = [];
let cardDeck = [];
let discardPile = [];
let currentCardPlayer = 0;
let cardDirection = 1;
let cardGameStarted = false;
let botCount = 0;
let currentDeclaredColor = '';
let pendingWildColorCardIndex = null;
let lastPlusFour = null;
let hasDrawnThisTurn = false;
let unoPenaltyTargetIndex = null;
let lastPlayedByName = '';
let roundWinnerName = '';
let roundWinnerId = '';
let lastRoundScore = 0;
let turnStartedAt = 0;
let turnTimerInterval = null;
let firebaseDb = null;
let onlineRoomRef = null;
let onlineRoomCode = '';
let onlineHostId = '';
let applyingRemoteCardState = false;
const onlinePlayerId = getOnlinePlayerId();
let selectedCardPlayerId = localStorage.getItem('aloncinho_selected_card_player_id') || '';

function resetCardRoom(options = {}) {
  const { sync = false } = options;
  roomCode = createRoomCode();
  cardPlayers = [];
  cardDeck = [];
  discardPile = [];
  currentCardPlayer = 0;
  cardDirection = 1;
  cardGameStarted = false;
  botCount = 0;
  currentDeclaredColor = '';
  pendingWildColorCardIndex = null;
  lastPlusFour = null;
  hasDrawnThisTurn = false;
  unoPenaltyTargetIndex = null;
  lastPlayedByName = '';
  roundWinnerName = '';
  roundWinnerId = '';
  lastRoundScore = 0;
  turnStartedAt = 0;
  roomCodeElement.textContent = roomCode;
  cardGameStatusElement.textContent = 'Adicione pelo menos 2 jogadores para iniciar.';
  playerHandElement.innerHTML = '';
  document.body.classList.remove('card-match-active');
  if (cardArenaElement) cardArenaElement.classList.remove('game-active');
  renderCardPlayers();
  renderCardTable();
  renderRoundFinishOverlay();
  updateCardControls();
  updateTurnTimerDisplay();
  if (sync) syncOnlineCardState();
}

function createRoomCode() {
  return `ALON-${Math.floor(1000 + Math.random() * 9000)}`;
}

function addCardPlayer(name, isBot = false) {
  const cleanName = name.trim();
  if (!cleanName) {
    showPlayerFeedback('Digite seu nome antes de entrar na mesa.', 'error');
    playerNameInput?.focus();
    return;
  }

  if (onlineRoomRef && !applyingRemoteCardState) {
    addOnlineCardPlayer(cleanName, isBot);
    return;
  }

  if (cardPlayers.length >= maxCardPlayers) {
    showPlayerFeedback(`A sala já chegou ao limite máximo de ${maxCardPlayers} jogadores.`, 'error');
    return;
  }

  if (cardPlayers.some((player) => player.name.toLowerCase() === cleanName.toLowerCase())) {
    showPlayerFeedback('Esse nome já está na sala. Use outro nome para identificar o amigo.', 'error');
    return;
  }

  if (!isBot && cardPlayers.some((player) => player.id === onlinePlayerId && !player.isBot)) {
    showPlayerFeedback('Você já entrou nessa sala. Para trocar o nome, crie ou entre em outra sala.', 'error');
    return;
  }

  cardPlayers.push({
    id: isBot ? `bot_${Date.now()}_${botCount}` : onlinePlayerId,
    name: cleanName,
    isBot,
    saidUno: false,
    score: 0,
    hand: [],
  });
  cardGameStatusElement.textContent = `${cleanName} entrou na sala.`;
  if (!isBot) {
    selectedCardPlayerId = onlinePlayerId;
    localStorage.setItem('aloncinho_selected_card_player_id', selectedCardPlayerId);
  }
  showPlayerFeedback(`${cleanName} entrou na mesa com sucesso.`, 'success');
  renderCardPlayers();
  syncOnlineCardState();
}

function addOnlineCardPlayer(cleanName, isBot = false) {
  let validationError = '';
  const playerId = isBot ? `bot_${Date.now()}_${botCount}` : onlinePlayerId;
  const playerToAdd = {
    id: playerId,
    name: cleanName,
    isBot,
    saidUno: false,
    score: 0,
    hand: [],
  };

  onlineRoomRef.transaction((state) => {
    validationError = '';
    const roomState = state || getCardGameState();
    const players = Array.isArray(roomState.cardPlayers) ? roomState.cardPlayers : [];

    if (roomState.cardGameStarted) {
      validationError = 'A partida já começou. Crie ou entre em outra sala.';
      return undefined;
    }
    if (players.length >= maxCardPlayers) {
      validationError = `A sala já chegou ao limite máximo de ${maxCardPlayers} jogadores.`;
      return undefined;
    }
    if (players.some((player) => player.name.toLowerCase() === cleanName.toLowerCase())) {
      validationError = 'Esse nome já está na sala. Use outro nome para identificar o amigo.';
      return undefined;
    }
    if (!isBot && players.some((player) => player.id === onlinePlayerId && !player.isBot)) {
      validationError = 'Você já entrou nessa sala. Para trocar o nome, crie ou entre em outra sala.';
      return undefined;
    }

    return {
      ...roomState,
      roomCode,
      cardPlayers: [...players, playerToAdd],
      botCount: isBot ? Math.max(Number(roomState.botCount) || 0, botCount) : roomState.botCount,
      updatedAt: Date.now(),
      updatedBy: onlinePlayerId,
      hostId: roomState.hostId || onlineHostId || onlinePlayerId,
    };
  }, (error, committed, snapshot) => {
    if (error) {
      showPlayerFeedback(`Erro ao entrar na sala: ${error.message}`, 'error');
      return;
    }
    if (!committed) {
      showPlayerFeedback(validationError || 'Não foi possível entrar nessa sala agora.', 'error');
      return;
    }

    const state = snapshot.val();
    if (state) applyOnlineCardState(state);
    if (!isBot) {
      selectedCardPlayerId = onlinePlayerId;
      localStorage.setItem('aloncinho_selected_card_player_id', selectedCardPlayerId);
    }
    showPlayerFeedback(`${cleanName} entrou na mesa com sucesso.`, 'success');
  });
}

function showPlayerFeedback(message, type = '') {
  if (!playerFeedbackElement) return;
  playerFeedbackElement.textContent = message;
  playerFeedbackElement.className = `form-hint ${type}`.trim();
}

function addCardBot() {
  botCount += 1;
  addCardPlayer(`BOT ${botCount}`, true);
}

function startCardGame() {
  if (onlineRoomRef && onlineHostId !== onlinePlayerId) {
    setCardStatus('Somente quem criou a sala pode iniciar a partida.');
    showPlayerFeedback('Aguarde o dono da sala iniciar a partida.', 'error');
    return;
  }

  if (cardPlayers.length < 2) {
    cardGameStatusElement.textContent = 'Adicione seu nome e pelo menos mais 1 jogador ou BOT para iniciar.';
    showPlayerFeedback('Entre na mesa e adicione um amigo ou BOT antes de iniciar.', 'error');
    return;
  }

  cardDeck = shuffle(createCardDeck());
  discardPile = [];
  currentCardPlayer = 0;
  cardDirection = 1;
  cardGameStarted = true;
  cardPlayers.forEach((player) => {
    player.hand = drawCards(7);
    player.saidUno = false;
    player.score = Number(player.score) || 0;
  });

  discardPile.push(drawFirstDiscard());
  currentDeclaredColor = discardPile[discardPile.length - 1].color;
  lastPlusFour = null;
  hasDrawnThisTurn = false;
  unoPenaltyTargetIndex = null;
  lastPlayedByName = '';
  roundWinnerName = '';
  roundWinnerId = '';
  lastRoundScore = 0;
  startCardTurnTimer();
  cardGameStatusElement.textContent = `Partida iniciada. Vez de ${cardPlayers[currentCardPlayer].name}.`;
  renderCardGame();
  syncOnlineCardState();
  scheduleBotTurn();
}

function createCardDeck() {
  const deck = [];
  cardColors.forEach((color) => {
    deck.push({ color, value: '0', type: 'number' });

    for (let value = 1; value <= 9; value += 1) {
      deck.push({ color, value: String(value), type: 'number' });
      deck.push({ color, value: String(value), type: 'number' });
    }

    actionCardValues.forEach((value) => {
      deck.push({ color, value, type: 'action' });
      deck.push({ color, value, type: 'action' });
    });
  });

  for (let index = 0; index < 4; index += 1) {
    deck.push({ color: 'wild', value: 'Curinga', type: 'wild' });
    deck.push({ color: 'wild', value: '+4', type: 'wild4' });
  }

  return deck;
}

function drawFirstDiscard() {
  let card = cardDeck.pop();
  while (card.type !== 'number') {
    cardDeck.unshift(card);
    cardDeck = shuffle(cardDeck);
    card = cardDeck.pop();
  }
  return card;
}

function drawCards(amount) {
  const cards = [];
  for (let index = 0; index < amount; index += 1) {
    if (!cardDeck.length) reshuffleDiscardIntoDeck();
    const card = cardDeck.pop();
    if (card) cards.push(card);
  }
  return cards;
}

function reshuffleDiscardIntoDeck() {
  const topCard = discardPile.pop();
  cardDeck = shuffle(discardPile);
  discardPile = topCard ? [topCard] : [];
}

function renderCardGame() {
  document.body.classList.toggle('card-match-active', cardGameStarted);
  if (cardArenaElement) cardArenaElement.classList.toggle('game-active', cardGameStarted);
  renderCardPlayers();
  renderCardAvatars();
  renderCardTable();
  renderPlayerHand();
  renderRoundFinishOverlay();
  updateCardControls();
  ensureTurnTimerRunning();
}

function startCardTurnTimer() {
  turnStartedAt = Date.now();
  ensureTurnTimerRunning();
  updateTurnTimerDisplay();
}

function ensureTurnTimerRunning() {
  if (turnTimerInterval || !turnTimerElement) return;
  turnTimerInterval = setInterval(updateTurnTimerDisplay, 250);
}

function getTurnSecondsLeft() {
  if (!cardGameStarted || !turnStartedAt) return turnDurationSeconds;
  const elapsedSeconds = Math.floor((Date.now() - turnStartedAt) / 1000);
  return Math.max(0, turnDurationSeconds - elapsedSeconds);
}

function updateTurnTimerDisplay() {
  if (!turnTimerElement || !turnTimerCountElement) return;
  turnTimerElement.classList.toggle('active', cardGameStarted);
  const secondsLeft = getTurnSecondsLeft();
  turnTimerCountElement.textContent = String(secondsLeft).padStart(2, '0');
  turnTimerElement.classList.toggle('danger', cardGameStarted && secondsLeft <= 3);

  if (cardGameStarted && secondsLeft <= 0) {
    handleTurnTimeout();
  }
}

function handleTurnTimeout() {
  if (!cardGameStarted) return;
  if (onlineRoomRef && onlineHostId !== onlinePlayerId) return;

  const player = cardPlayers[currentCardPlayer];
  player.hand.push(...drawCards(2));
  closeUnoPenaltyWindow();
  hasDrawnThisTurn = false;
  pendingWildColorCardIndex = null;
  currentCardPlayer = getNextCardPlayerIndex(1);
  startCardTurnTimer();
  cardGameStatusElement.textContent = `${player.name} passou de ${turnDurationSeconds} segundos, comprou +2 e perdeu a vez. Vez de ${cardPlayers[currentCardPlayer].name}.`;
  renderCardGame();
  syncOnlineCardState();
  scheduleBotTurn();
}

function renderRoundFinishOverlay() {
  if (!roundFinishOverlayElement) return;
  const hasWinner = Boolean(roundWinnerName);
  roundFinishOverlayElement.hidden = !hasWinner;
  if (!hasWinner) return;

  const visiblePlayer = cardPlayers[getVisibleHandPlayerIndex()];
  const winnerIsVisiblePlayer = visiblePlayer && roundWinnerId && visiblePlayer.id === roundWinnerId;
  roundFinishTitleElement.textContent = winnerIsVisiblePlayer ? 'VOCÊ GANHOU!' : 'VOCÊ PERDEU😭';
  roundFinishMessageElement.textContent = `${roundWinnerName} venceu a rodada com ${lastRoundScore} pontos. Recomece com os mesmos participantes ou encerre a sala.`;
  const canManageRoom = !onlineRoomRef || onlineHostId === onlinePlayerId;
  restartRoundButton.disabled = !canManageRoom;
  closeOnlineRoomButton.disabled = !canManageRoom;
}

function updateCardControls() {
  if (!startCardGameButton) return;
  const canStartOnline = !onlineRoomRef || onlineHostId === onlinePlayerId;
  startCardGameButton.disabled = cardGameStarted || !canStartOnline;
  startCardGameButton.title = canStartOnline
    ? 'Iniciar partida'
    : 'Somente quem criou a sala pode iniciar a partida';
}

function renderCardAvatars() {
  if (!cardAvatarsElement) return;
  cardAvatarsElement.innerHTML = '';

  if (!cardPlayers.length) {
    const empty = document.createElement('div');
    empty.className = 'avatar-card empty-avatar-card';
    empty.innerHTML = '<strong>Participantes</strong><span>Nenhum jogador entrou ainda.</span>';
    cardAvatarsElement.appendChild(empty);
    return;
  }

  cardPlayers.forEach((player, index) => {
    const avatar = document.createElement('div');
    avatar.className = `avatar-card ${cardGameStarted && index === currentCardPlayer ? 'active' : ''}`.trim();

    const face = document.createElement('div');
    face.className = 'avatar-face';
    face.textContent = player.name.slice(0, 2).toUpperCase();

    const name = document.createElement('strong');
    name.textContent = player.name;

    const detail = document.createElement('span');
    detail.textContent = `${index + 1}/${maxCardPlayers} · ${player.isBot ? 'BOT' : 'Jogador'} · ${player.hand.length} cartas · ${Number(player.score) || 0} pts${player.saidUno ? ' · UNO!' : ''}`;

    avatar.append(face, name, detail);
    cardAvatarsElement.appendChild(avatar);
  });
}

function renderCardPlayers() {
  if (!playersListElement) return;
  playersListElement.innerHTML = '';

  if (!cardPlayers.length) {
    playersListElement.innerHTML = `<div class="player-chip">Participantes 0/${maxCardPlayers}<br>Nenhum jogador na sala ainda.</div>`;
    return;
  }

  const heading = document.createElement('div');
  heading.className = 'player-chip players-count-chip';
  heading.textContent = `Participantes na sala: ${cardPlayers.length}/${maxCardPlayers}`;
  playersListElement.appendChild(heading);

  cardPlayers.forEach((player, index) => {
    const chip = document.createElement('div');
    chip.className = `player-chip ${cardGameStarted && index === currentCardPlayer ? 'active' : ''}`.trim();
    const name = document.createElement('strong');
    name.textContent = player.name;
    const details = document.createTextNode(`${player.isBot ? 'BOT' : 'Amigo'} · ${player.hand.length} cartas · ${Number(player.score) || 0} pts`);
    chip.append(name, details);
    playersListElement.appendChild(chip);
  });
}

function renderCardTable() {
  if (!cardTableElement) return;
  const topCard = discardPile[discardPile.length - 1];
  if (deckCountLabel) deckCountLabel.textContent = `${cardDeck.length}`;
  if (discardLabel) discardLabel.textContent = topCard ? formatCard(topCard) : 'Vazio';
  renderLastCardVisual(topCard);
  cardTableElement.innerHTML = `
    <div class="table-card">
      <span>Sala</span>
      <strong>${roomCode || 'Sem sala'}</strong>
    </div>
    <div class="table-card">
      <span>Monte</span>
      <strong>${cardDeck.length} cartas</strong>
    </div>
    <div class="table-card">
      <span>Descarte</span>
      <strong>${topCard ? formatCard(topCard) : 'Vazio'}</strong>
    </div>
    <div class="table-card">
      <span>Cor vigente</span>
      <strong>${currentDeclaredColor ? colorLabels[currentDeclaredColor] : 'Sem cor'}</strong>
    </div>
  `;
}

function renderLastCardVisual(card) {
  if (!lastCardVisualElement) return;

  if (!card) {
    lastCardVisualElement.className = 'last-card-visual empty-card-visual';
    lastCardVisualElement.innerHTML = '<span>Descarte</span><strong>--</strong><small>Aguardando partida</small>';
    return;
  }

  lastCardVisualElement.className = `last-card-visual uno-card ${getCardClass(card)} table-last-card`;
  lastCardVisualElement.innerHTML = `${getCardFace(card, 'Última carta')}<em>Jogada por ${lastPlayedByName || 'mesa'}</em>`;
}

function renderPlayerHand() {
  if (!playerHandElement) return;
  playerHandElement.innerHTML = '';
  if (!cardGameStarted) return;

  const visiblePlayerIndex = getVisibleHandPlayerIndex();
  const player = cardPlayers[visiblePlayerIndex];
  if (!player) return;

  if (player.isBot) {
    playerHandElement.innerHTML = '<p class="status">O BOT está analisando a jogada...</p>';
    return;
  }

  const isPlayerTurn = visiblePlayerIndex === currentCardPlayer;
  const canControlVisiblePlayer = !onlineRoomRef || player.id === onlinePlayerId;

  if (!player.hand.length) {
    const message = document.createElement('p');
    message.className = 'status full-line';
    message.textContent = cardGameStarted
      ? `${player.name} ainda não tem cartas visíveis nesta rodada.`
      : 'Inicie a partida para receber as cartas.';
    playerHandElement.appendChild(message);
    return;
  }

  player.hand.forEach((card, index) => {
    const button = document.createElement('button');
    button.className = `uno-card ${getCardClass(card)}`;
    button.type = 'button';
    button.disabled = !isPlayerTurn || !canControlVisiblePlayer || !isCardPlayable(card);
    button.innerHTML = getCardFace(card);
    button.addEventListener('click', () => playCard(index));
    playerHandElement.appendChild(button);
  });

  if (!isPlayerTurn) {
    const message = document.createElement('p');
    message.className = 'status full-line';
    message.textContent = `Sua mão está visível. Aguarde a vez de ${cardPlayers[currentCardPlayer].name}.`;
    playerHandElement.appendChild(message);
  }
}

function getVisibleHandPlayerIndex() {
  const selectedIndex = cardPlayers.findIndex((player) => player.id === selectedCardPlayerId && !player.isBot);
  if (selectedIndex >= 0) return selectedIndex;

  const localIndex = cardPlayers.findIndex((player) => player.id === onlinePlayerId && !player.isBot);
  if (localIndex >= 0) return localIndex;

  const firstHumanIndex = cardPlayers.findIndex((player) => !player.isBot);
  if (firstHumanIndex >= 0) return firstHumanIndex;

  return currentCardPlayer;
}

function formatCard(card) {
  return card.color === 'wild' ? card.value : `${colorLabels[card.color]} ${card.value}`;
}

function getCardClass(card) {
  return card.color === 'wild' ? 'uno-wild' : `uno-${card.color}`;
}

function getCardFace(card, label = '') {
  const colorName = card.color === 'wild' ? 'Especial' : colorLabels[card.color];
  const faceLabel = label || colorName;
  return `
    <span class="card-corner card-corner-top">${card.value}</span>
    <strong class="card-main-value">${card.value}</strong>
    <small class="card-main-label">${faceLabel}</small>
    <span class="card-corner card-corner-bottom">${card.value}</span>
  `;
}

function isCardPlayable(card) {
  const topCard = discardPile[discardPile.length - 1];
  if (!topCard) return true;
  if (card.type === 'wild') return true;
  if (card.type === 'wild4') return !cardPlayers[currentCardPlayer].hand.some((item) => item.color === currentDeclaredColor);
  if (card.value === '+2') return card.color === currentDeclaredColor || topCard.value === '+2';
  return card.color === currentDeclaredColor || card.value === topCard.value;
}

function playCard(cardIndex) {
  if (!cardGameStarted) {
    setCardStatus('Inicie a partida antes de jogar uma carta.');
    return;
  }
  if (!canControlCurrentCardPlayer()) {
    setCardStatus(`Ainda não é sua vez. Agora é a vez de ${cardPlayers[currentCardPlayer].name}.`);
    return;
  }
  const player = cardPlayers[currentCardPlayer];
  const card = player.hand[cardIndex];
  closeUnoPenaltyWindow();
  if (!card || !isCardPlayable(card)) {
    setCardStatus('Essa carta não pode ser jogada agora. Use a mesma cor, mesmo número/símbolo ou um curinga válido.');
    return;
  }

  if (card.type === 'wild' || card.type === 'wild4') {
    pendingWildColorCardIndex = cardIndex;
    cardGameStatusElement.textContent = `${player.name}, escolha a próxima cor antes de jogar ${card.value}.`;
    renderCardGame();
    return;
  }

  playCardWithColor(cardIndex, card.color);
}

function playCardWithColor(cardIndex, chosenColor) {
  const player = cardPlayers[currentCardPlayer];
  const card = player.hand[cardIndex];
  const previousColor = currentDeclaredColor;

  player.hand.splice(cardIndex, 1);
  discardPile.push(card);
  currentDeclaredColor = chosenColor || card.color;
  lastPlayedByName = player.name;
  pendingWildColorCardIndex = null;

  if (!player.hand.length) {
    cardGameStarted = false;
    const score = calculateRoundScore();
    player.score = (Number(player.score) || 0) + score;
    roundWinnerName = player.name;
    roundWinnerId = player.id;
    lastRoundScore = score;
    turnStartedAt = 0;
    const reachedGameWin = player.score >= gameWinningScore;
    cardGameStatusElement.textContent = reachedGameWin
      ? `${player.name} venceu o jogo com ${player.score} pontos! Rodada: ${score} pontos.`
      : `${player.name} venceu a rodada e fez ${score} pontos. Total: ${player.score}/${gameWinningScore}. Inicie nova rodada para continuar.`;
    renderCardGame();
    syncOnlineCardState();
    return;
  }

  if (player.isBot && player.hand.length === 1) player.saidUno = true;
  markUnoPenaltyIfNeeded(player);

  const steps = applyCardEffect(card, previousColor);
  currentCardPlayer = getNextCardPlayerIndex(steps);
  hasDrawnThisTurn = false;
  startCardTurnTimer();
  cardGameStatusElement.textContent = `${player.name} jogou ${formatCard(card)}. Vez de ${cardPlayers[currentCardPlayer].name}.`;
  renderCardGame();
  syncOnlineCardState();
  scheduleBotTurn();
}

function applyCardEffect(card, previousColor) {
  lastPlusFour = null;

  if (card.value === 'Inverter') {
    cardDirection *= -1;
    return cardPlayers.length === 2 ? 2 : 1;
  }

  if (card.value === 'Pular') {
    return 2;
  }

  if (card.value === '+2') {
    const targetIndex = getNextCardPlayerIndex(1);
    cardPlayers[targetIndex].hand.push(...drawCards(2));
    return 2;
  }

  if (card.value === '+4') {
    const targetIndex = getNextCardPlayerIndex(1);
    cardPlayers[targetIndex].hand.push(...drawCards(4));
    lastPlusFour = {
      challengerIndex: targetIndex,
      challengedIndex: currentCardPlayer,
      previousColor,
    };
    return 2;
  }

  return 1;
}

function getNextCardPlayerIndex(steps) {
  const total = cardPlayers.length;
  return (currentCardPlayer + cardDirection * steps + total * 4) % total;
}

function drawForCurrentPlayer() {
  if (!cardGameStarted) {
    setCardStatus('Inicie a partida antes de comprar carta.');
    return;
  }
  if (!canControlCurrentCardPlayer()) {
    setCardStatus(`Você só pode comprar carta na sua vez. Agora é a vez de ${cardPlayers[currentCardPlayer].name}.`);
    return;
  }
  const player = cardPlayers[currentCardPlayer];
  if (player.isBot) {
    setCardStatus('Aguarde o BOT jogar automaticamente.');
    return;
  }

  closeUnoPenaltyWindow();

  if (player.hand.some((card) => isCardPlayable(card))) {
    setCardStatus('Você ainda tem carta jogável. Jogue uma carta da mesma cor, número/símbolo ou um curinga válido.');
    return;
  }

  const drawnCards = drawCards(1);
  player.hand.push(...drawnCards);
  hasDrawnThisTurn = true;
  const drawnCard = drawnCards[0];
  cardGameStatusElement.textContent = drawnCard && isCardPlayable(drawnCard)
    ? `${player.name} comprou ${formatCard(drawnCard)} e pode jogar essa carta agora.`
    : `${player.name} comprou uma carta e pode passar a vez.`;
  renderCardGame();
  syncOnlineCardState();
}

function passCardTurn() {
  if (!cardGameStarted) {
    setCardStatus('Inicie a partida antes de passar a vez.');
    return;
  }
  if (!canControlCurrentCardPlayer()) {
    setCardStatus(`Você só pode passar na sua vez. Agora é a vez de ${cardPlayers[currentCardPlayer].name}.`);
    return;
  }
  const player = cardPlayers[currentCardPlayer];
  if (player.isBot) {
    setCardStatus('Aguarde o BOT jogar automaticamente.');
    return;
  }

  closeUnoPenaltyWindow();

  if (!hasDrawnThisTurn) {
    setCardStatus('Você só pode passar depois de comprar uma carta quando não tiver jogada possível.');
    return;
  }

  if (player.hand.some((card) => isCardPlayable(card))) {
    setCardStatus('Você encontrou uma carta jogável. Jogue a carta antes de passar a vez.');
    return;
  }

  currentCardPlayer = getNextCardPlayerIndex(1);
  hasDrawnThisTurn = false;
  startCardTurnTimer();
  cardGameStatusElement.textContent = `${player.name} passou a vez. Vez de ${cardPlayers[currentCardPlayer].name}.`;
  renderCardGame();
  syncOnlineCardState();
  scheduleBotTurn();
}

function canControlCurrentCardPlayer() {
  return canControlPlayerIndex(currentCardPlayer);
}

function canControlPlayerIndex(playerIndex) {
  if (!onlineRoomRef) return true;
  const player = cardPlayers[playerIndex];
  return player && player.id === onlinePlayerId;
}

function chooseWildColor(color) {
  if (pendingWildColorCardIndex === null) {
    setCardStatus('Escolha uma cor apenas depois de selecionar um Curinga ou +4.');
    return;
  }
  if (!canControlCurrentCardPlayer()) {
    setCardStatus('A escolha de cor só vale na sua vez.');
    return;
  }
  playCardWithColor(pendingWildColorCardIndex, color);
}

function callUno() {
  if (!cardGameStarted) {
    setCardStatus('Inicie a partida antes de gritar UNO.');
    return;
  }
  const playerIndex = getVisibleHandPlayerIndex();
  if (!canControlPlayerIndex(playerIndex)) {
    setCardStatus('Você só pode gritar UNO para a sua própria mão.');
    return;
  }
  const player = cardPlayers[playerIndex];
  if (!player || player.hand.length !== 1) {
    setCardStatus('Grite UNO quando estiver com exatamente uma carta na mão.');
    return;
  }
  player.saidUno = true;
  if (unoPenaltyTargetIndex === playerIndex) unoPenaltyTargetIndex = null;
  cardGameStatusElement.textContent = `${player.name} gritou UNO!`;
  renderCardGame();
  syncOnlineCardState();
}

function markUnoPenaltyIfNeeded(player) {
  unoPenaltyTargetIndex = null;
  if (player.hand.length === 1 && !player.saidUno) {
    unoPenaltyTargetIndex = currentCardPlayer;
  }

  if (player.hand.length !== 1) {
    player.saidUno = false;
  }
}

function catchUno() {
  if (!cardGameStarted) {
    setCardStatus('Inicie a partida antes de cobrar UNO.');
    return;
  }
  if (unoPenaltyTargetIndex === null || !cardPlayers[unoPenaltyTargetIndex]) {
    setCardStatus('Ninguém esqueceu de gritar UNO agora.');
    return;
  }
  if (onlineRoomRef && canControlPlayerIndex(unoPenaltyTargetIndex)) {
    setCardStatus('Outro jogador precisa perceber a falta de UNO para aplicar a penalidade.');
    return;
  }

  const offender = cardPlayers[unoPenaltyTargetIndex];
  offender.hand.push(...drawCards(2));
  offender.saidUno = false;
  unoPenaltyTargetIndex = null;
  cardGameStatusElement.textContent = `${offender.name} esqueceu de gritar UNO e comprou 2 cartas de penalidade.`;
  renderCardGame();
  syncOnlineCardState();
}

function closeUnoPenaltyWindow() {
  if (unoPenaltyTargetIndex !== null && unoPenaltyTargetIndex !== currentCardPlayer) {
    unoPenaltyTargetIndex = null;
  }
}

function challengePlusFour() {
  if (!lastPlusFour) {
    setCardStatus('Não existe +4 ativo para desafiar agora.');
    return;
  }
  if (!cardGameStarted) {
    setCardStatus('A partida ainda não começou.');
    return;
  }
  if (!canControlPlayerIndex(lastPlusFour.challengerIndex)) {
    setCardStatus('Somente o jogador afetado pelo +4 pode desafiar.');
    return;
  }
  if (!cardPlayers[lastPlusFour.challengerIndex]) {
    cardGameStatusElement.textContent = 'Somente o jogador afetado pelo +4 pode desafiar.';
    return;
  }

  const challenger = cardPlayers[lastPlusFour.challengerIndex];
  const challenged = cardPlayers[lastPlusFour.challengedIndex];
  const wasBluffing = challenged.hand.some((card) => card.color === lastPlusFour.previousColor);

  if (wasBluffing) {
    challenged.hand.push(...drawCards(4));
    cardGameStatusElement.textContent = `${challenger.name} desafiou corretamente. ${challenged.name} comprou 4 cartas.`;
  } else {
    challenger.hand.push(...drawCards(2));
    cardGameStatusElement.textContent = `${challenger.name} errou o desafio e comprou 2 cartas de multa.`;
  }

  lastPlusFour = null;
  renderCardGame();
  syncOnlineCardState();
}

function setCardStatus(message) {
  if (cardGameStatusElement) cardGameStatusElement.textContent = message;
}

function calculateRoundScore() {
  return cardPlayers.reduce((total, player) => {
    return total + player.hand.reduce((subtotal, card) => subtotal + getCardScore(card), 0);
  }, 0);
}

function getCardScore(card) {
  if (card.type === 'number') return Number(card.value);
  if (card.type === 'action') return 20;
  return 50;
}

function scheduleBotTurn() {
  if (!cardGameStarted) return;
  const player = cardPlayers[currentCardPlayer];
  if (!player.isBot) return;
  if (onlineRoomRef && onlineHostId !== onlinePlayerId) return;

  setTimeout(() => playBotCardTurn(), 800);
}

function playBotCardTurn() {
  if (!cardGameStarted) return;
  const player = cardPlayers[currentCardPlayer];
  const playableIndex = player.hand.findIndex((card) => isCardPlayable(card));

  if (playableIndex >= 0) {
    const card = player.hand[playableIndex];
    const chosenColor = card.color === 'wild' ? chooseBestBotColor(player) : card.color;
    playCardWithColor(playableIndex, chosenColor);
    return;
  }

  player.hand.push(...drawCards(1));
  const newPlayableIndex = player.hand.findIndex((card) => isCardPlayable(card));
  if (newPlayableIndex >= 0) {
    const card = player.hand[newPlayableIndex];
    const chosenColor = card.color === 'wild' ? chooseBestBotColor(player) : card.color;
    playCardWithColor(newPlayableIndex, chosenColor);
    return;
  }

  currentCardPlayer = getNextCardPlayerIndex(1);
  startCardTurnTimer();
  cardGameStatusElement.textContent = `${player.name} comprou e passou. Vez de ${cardPlayers[currentCardPlayer].name}.`;
  renderCardGame();
  syncOnlineCardState();
  scheduleBotTurn();
}

function chooseBestBotColor(player) {
  const counts = cardColors.map((color) => ({
    color,
    total: player.hand.filter((card) => card.color === color).length,
  }));
  return counts.sort((a, b) => b.total - a.total)[0]?.color || 'red';
}

function copyRoomInvite() {
  const code = onlineRoomCode || roomCode;
  const basePath = window.location.pathname.replace(/[^/]*$/, 'cartas.html');
  const invite = `${window.location.origin}${basePath}#cartas?room=${code}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(invite);
  }
  cardGameStatusElement.textContent = `Convite copiado: ${code}. Compartilhe o link e peça para o amigo informar o nome na sala.`;
}

function restartCardRound() {
  if (onlineRoomRef && onlineHostId !== onlinePlayerId) {
    setCardStatus('Somente quem criou a sala pode recomeçar o jogo.');
    return;
  }
  if (cardPlayers.length < 2) {
    setCardStatus('Mantenha pelo menos 2 participantes para recomeçar.');
    return;
  }
  startCardGame();
}

function closeCardRoom() {
  if (onlineRoomRef && onlineHostId !== onlinePlayerId) {
    setCardStatus('Somente quem criou a sala pode encerrar a sala.');
    return;
  }

  const roomRefToClose = onlineRoomRef;
  if (onlineRoomRef) onlineRoomRef.off();
  onlineRoomRef = null;
  onlineRoomCode = '';
  onlineHostId = '';
  selectedCardPlayerId = '';
  localStorage.removeItem('aloncinho_selected_card_player_id');
  resetCardRoom();
  onlineStatusElement.textContent = 'Sala encerrada. Crie uma nova sala online para jogar novamente.';

  if (roomRefToClose) {
    roomRefToClose.remove().catch((error) => {
      onlineStatusElement.textContent = `Sala local encerrada, mas houve erro ao apagar online: ${error.message}`;
    });
  }
}

function getOnlinePlayerId() {
  const savedId = localStorage.getItem('aloncinho_online_player_id');
  if (savedId) return savedId;

  const newId = `player_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem('aloncinho_online_player_id', newId);
  return newId;
}

function initFirebase() {
  const config = window.FIREBASE_CONFIG;
  const configured = config && config.apiKey && !config.apiKey.includes('COLE_') && config.databaseURL && !config.databaseURL.includes('COLE_');

  if (!onlineStatusElement) return false;

  if (!window.firebase) {
    onlineStatusElement.textContent = 'Firebase SDK não carregou. Verifique sua conexão ou bloqueador do navegador.';
    return false;
  }

  if (!configured) {
    onlineStatusElement.textContent = 'Firebase ainda não configurado. Confira as variáveis de ambiente na Vercel e faça Redeploy.';
    return false;
  }

  try {
    if (!firebaseDb) {
      if (!window.firebase.apps.length) window.firebase.initializeApp(config);
      firebaseDb = window.firebase.database();
    }
  } catch (error) {
    onlineStatusElement.textContent = `Erro ao conectar no Firebase: ${error.message}`;
    return false;
  }

  onlineStatusElement.textContent = 'Firebase conectado. Você pode criar ou entrar em uma sala online.';
  return true;
}

function createOnlineRoom() {
  if (!initFirebase()) return;
  roomCode = createRoomCode();
  onlineHostId = onlinePlayerId;
  roomCodeElement.textContent = roomCode;
  connectOnlineRoom(roomCode);
  syncOnlineCardState(true);
  onlineStatusElement.textContent = `Sala online criada: ${roomCode}. Compartilhe o convite com seus amigos.`;
  showPlayerFeedback('Agora digite seu nome e clique em Entrar na mesa.', '');
  playerNameInput?.focus();
}

function joinOnlineRoom(code) {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    onlineStatusElement.textContent = 'Digite o código da sala para entrar.';
    return;
  }

  if (!initFirebase()) return;
  connectOnlineRoom(normalizedCode);
  onlineStatusElement.textContent = `Conectado na sala ${normalizedCode}. Informe seu nome para entrar no jogo.`;
  showPlayerFeedback('Sala encontrada. Digite seu nome para aparecer para os amigos.', '');
  playerNameInput?.focus();
}

function connectOnlineRoom(code) {
  if (onlineRoomRef) onlineRoomRef.off();

  onlineRoomCode = code;
  roomCode = code;
  roomCodeElement.textContent = code;
  onlineRoomRef = firebaseDb.ref(`rooms/${code}`);
  onlineRoomRef.on('value', (snapshot) => {
    const state = snapshot.val();
    if (state) {
      applyOnlineCardState(state);
      return;
    }
    onlineStatusElement.textContent = `Sala ${code} ainda não tem dados. Confira o código ou crie uma nova sala.`;
  }, (error) => {
    onlineStatusElement.textContent = `Erro ao acessar sala online: ${error.message}`;
  });
}

function getCardGameState() {
  return {
    roomCode,
    cardPlayers,
    cardDeck,
    discardPile,
    currentCardPlayer,
    cardDirection,
    cardGameStarted,
    botCount,
    currentDeclaredColor,
    lastPlusFour,
    hasDrawnThisTurn,
    unoPenaltyTargetIndex,
    lastPlayedByName,
    roundWinnerName,
    roundWinnerId,
    lastRoundScore,
    turnStartedAt,
    status: cardGameStatusElement.textContent,
    updatedAt: Date.now(),
    updatedBy: onlinePlayerId,
    hostId: onlineHostId || onlinePlayerId,
  };
}

function applyOnlineCardState(state) {
  applyingRemoteCardState = true;
  roomCode = state.roomCode || onlineRoomCode;
  cardPlayers = state.cardPlayers || [];
  cardDeck = state.cardDeck || [];
  discardPile = state.discardPile || [];
  currentCardPlayer = state.currentCardPlayer || 0;
  cardDirection = state.cardDirection || 1;
  cardGameStarted = Boolean(state.cardGameStarted);
  botCount = state.botCount || 0;
  currentDeclaredColor = state.currentDeclaredColor || '';
  lastPlusFour = state.lastPlusFour || null;
  hasDrawnThisTurn = Boolean(state.hasDrawnThisTurn);
  unoPenaltyTargetIndex = state.unoPenaltyTargetIndex ?? null;
  lastPlayedByName = state.lastPlayedByName || '';
  roundWinnerName = state.roundWinnerName || '';
  roundWinnerId = state.roundWinnerId || '';
  lastRoundScore = Number(state.lastRoundScore) || 0;
  turnStartedAt = Number(state.turnStartedAt) || 0;
  onlineHostId = state.hostId || '';
  roomCodeElement.textContent = roomCode;
  cardGameStatusElement.textContent = state.status || 'Sala sincronizada.';
  renderCardGame();
  applyingRemoteCardState = false;
  scheduleBotTurn();
}

function syncOnlineCardState(force = false) {
  if (applyingRemoteCardState || !onlineRoomRef) return;
  if (!force && !onlineRoomCode) return;
  onlineRoomRef.set(getCardGameState());
}

if (resetTicButton) resetTicButton.addEventListener('click', resetTicTacToe);
if (toggleBotButton) toggleBotButton.addEventListener('click', toggleBotMode);
if (resetMemoryButton) resetMemoryButton.addEventListener('click', createMemoryCards);
if (memoryNextPhaseButton) memoryNextPhaseButton.addEventListener('click', function() { startMemoryPhase(currentMemoryPhase + 1); });
if (guessForm) guessForm.addEventListener('submit', submitGuess);
if (resetGuessButton) resetGuessButton.addEventListener('click', resetGuessGame);
if (startSnakeButton) startSnakeButton.addEventListener('click', () => {
  startSnakeGame();
  if (snakeCanvas) {
    snakeCanvas.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    snakeCanvas.focus();
  }
});
if (resetSnakeButton) resetSnakeButton.addEventListener('click', resetSnakeGame);
if (resetDetectiveButton) resetDetectiveButton.addEventListener('click', createDetectiveCase);
if (playerForm) {
  playerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addCardPlayer(playerNameInput.value);
    playerNameInput.value = '';
    playerNameInput.focus();
  });
}
if (addCardBotButton) addCardBotButton.addEventListener('click', addCardBot);
if (startCardGameButton) startCardGameButton.addEventListener('click', startCardGame);
if (resetCardGameButton) {
  resetCardGameButton.addEventListener('click', () => {
    if (onlineRoomRef) {
      createOnlineRoom();
      return;
    }
    resetCardRoom();
  });
}
if (drawCardButton) drawCardButton.addEventListener('click', drawForCurrentPlayer);
if (passTurnButton) passTurnButton.addEventListener('click', passCardTurn);
if (copyRoomLinkButton) copyRoomLinkButton.addEventListener('click', copyRoomInvite);
if (createOnlineRoomButton) createOnlineRoomButton.addEventListener('click', createOnlineRoom);
if (callUnoButton) callUnoButton.addEventListener('click', callUno);
if (catchUnoButton) catchUnoButton.addEventListener('click', catchUno);
if (challengePlusFourButton) challengePlusFourButton.addEventListener('click', challengePlusFour);
if (restartRoundButton) restartRoundButton.addEventListener('click', restartCardRound);
if (closeOnlineRoomButton) closeOnlineRoomButton.addEventListener('click', closeCardRoom);
colorChoiceButtons.forEach((button) => {
  button.addEventListener('click', () => chooseWildColor(button.dataset.cardColor));
});
if (joinRoomForm) joinRoomForm.addEventListener('submit', (event) => {
  event.preventDefault();
  joinOnlineRoom(joinRoomCodeInput.value);
});
directionButtons.forEach((button) => {
  const press = (e) => {
    e.preventDefault();
    changeSnakeDirection(button.dataset.direction);
  };
  button.addEventListener('mousedown', press);
  button.addEventListener('touchstart', press, { passive: false });
  button.addEventListener('click', press);
});

// Window-level capture: só age se o canvas da minhoca estiver visível na tela
window.addEventListener('keydown', (event) => {
  if (!snakeCanvas) return;
  const snakeDirs = {
    ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
    s: { x: 0, y: 1 },  S: { x: 0, y: 1 },
    a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
    d: { x: 1, y: 0 },  D: { x: 1, y: 0 },
  };
  const next = snakeDirs[event.key];
  if (!next) return;
  const rect = snakeCanvas.getBoundingClientRect();
  const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
  if (!isVisible) return;
  event.preventDefault();
  const isOpposite = next.x + nextSnakeDirection.x === 0 && next.y + nextSnakeDirection.y === 0;
  if (!isOpposite) {
    nextSnakeDirection = next;
  }
  if (!snakeRunning && snakeCanvas) {
    startSnakeGame();
  }
}, { capture: true, passive: false });

// Controle por clique/toque direto no canvas (zonas: topo=cima, base=baixo, esq=esq, dir=dir)
let swipeTouchStartX = 0, swipeTouchStartY = 0;
if (snakeCanvas) {
  snakeCanvas.addEventListener('click', (e) => {
    const r = snakeCanvas.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    const w = r.width;
    const h = r.height;
    let dir;
    if (cy < h * 0.33) dir = 'up';
    else if (cy > h * 0.67) dir = 'down';
    else if (cx < w * 0.33) dir = 'left';
    else dir = 'right';
    changeSnakeDirection(dir);
    if (!snakeRunning) startSnakeGame();
  });
  snakeCanvas.addEventListener('touchstart', (e) => {
    swipeTouchStartX = e.touches[0].clientX;
    swipeTouchStartY = e.touches[0].clientY;
  }, { passive: true });
  snakeCanvas.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - swipeTouchStartX;
    const dy = e.changedTouches[0].clientY - swipeTouchStartY;
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      changeSnakeDirection(dx > 0 ? 'right' : 'left');
    } else {
      changeSnakeDirection(dy > 0 ? 'down' : 'up');
    }
  }, { passive: true });
}

if (ticBoardElement) resetTicTacToe();
if (memoryBoardElement) startMemoryPhase(0);
if (snakeCanvas) resetSnakeGame();
if (detectiveStoryElement) createDetectiveCase();
if (roomCodeElement) {
  resetCardRoom();
  initFirebase();
}

const roomFromUrl = new URLSearchParams(window.location.hash.split('?')[1] || '').get('room');

// ─── SUDOKU DO ALONCINHO ──────────────────────────────────────────────────────

const sudokuBoardEl    = document.querySelector('#sudoku-board');
const sudokuStatusEl   = document.querySelector('#sudoku-status');
const resetSudokuBtn   = document.querySelector('#reset-sudoku');
const sudokuPhaseDisp  = document.querySelector('#sudoku-phase-display');
const sudokuErrorsDisp = document.querySelector('#sudoku-errors-display');
const sudokuTimerDisp  = document.querySelector('#sudoku-timer-display');
const sudokuLevelDisp  = document.querySelector('#sudoku-level-display');
const sudokuNumpadBtns = document.querySelectorAll('[data-num]');

const SUDOKU_PHASES = [
  { remove: 30, label: 'Fácil 1'    },
  { remove: 33, label: 'Fácil 2'    },
  { remove: 36, label: 'Fácil 3'    },
  { remove: 39, label: 'Médio 1'    },
  { remove: 41, label: 'Médio 2'    },
  { remove: 43, label: 'Médio 3'    },
  { remove: 46, label: 'Difícil 1'  },
  { remove: 48, label: 'Difícil 2'  },
  { remove: 50, label: 'Difícil 3'  },
  { remove: 52, label: 'Expert 1'   },
  { remove: 53, label: 'Expert 2'   },
  { remove: 54, label: 'Expert 3'   },
  { remove: 55, label: 'Mestre 1'   },
  { remove: 56, label: 'Mestre 2'   },
  { remove: 57, label: 'Aloncinho!' },
];

const SUDOKU_MAX_ERRORS = 5;
let sudokuPhase    = 0;
let sudokuPuzzle   = [];
let sudokuSolution = [];
let sudokuGiven    = [];
let sudokuErrors   = 0;
let sudokuSelected = -1;
let sudokuTimeSecs = 0;
let sudokuTimerInt = null;
let sudokuRunning  = false;
let sudokuSolved   = false;

function sdShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sdValid(board, pos, num) {
  const row = Math.floor(pos / 9), col = pos % 9;
  for (let c = 0; c < 9; c++) if (c !== col && board[row * 9 + c] === num) return false;
  for (let r = 0; r < 9; r++) if (r !== row && board[r * 9 + col] === num) return false;
  const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if ((r !== row || c !== col) && board[r * 9 + c] === num) return false;
  return true;
}

function sdSolve(board) {
  const pos = board.indexOf(0);
  if (pos === -1) return true;
  for (const num of sdShuffle([1,2,3,4,5,6,7,8,9])) {
    if (sdValid(board, pos, num)) {
      board[pos] = num;
      if (sdSolve(board)) return true;
      board[pos] = 0;
    }
  }
  return false;
}

function sdGenerate(remove) {
  const solution = Array(81).fill(0);
  sdSolve(solution);
  const puzzle = [...solution];
  sdShuffle(Array.from({length: 81}, (_, i) => i)).slice(0, remove).forEach(i => { puzzle[i] = 0; });
  return { puzzle, solution };
}

function sdUpdateHud() {
  if (sudokuPhaseDisp)  sudokuPhaseDisp.textContent  = `${sudokuPhase + 1} / 15`;
  if (sudokuErrorsDisp) sudokuErrorsDisp.textContent = `${sudokuErrors} / ${SUDOKU_MAX_ERRORS}`;
  if (sudokuLevelDisp)  sudokuLevelDisp.textContent  = SUDOKU_PHASES[sudokuPhase].label;
  if (sudokuTimerDisp) {
    const m = Math.floor(sudokuTimeSecs / 60);
    const s = sudokuTimeSecs % 60;
    sudokuTimerDisp.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }
}

function sdRender() {
  if (!sudokuBoardEl) return;
  sudokuBoardEl.innerHTML = '';
  const selRow = sudokuSelected >= 0 ? Math.floor(sudokuSelected / 9) : -1;
  const selCol = sudokuSelected >= 0 ? sudokuSelected % 9 : -1;

  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9), col = i % 9;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sudoku-cell';
    btn.dataset.index = i;
    btn.dataset.row = row;
    btn.dataset.col = col;
    const val = sudokuPuzzle[i];
    btn.textContent = val || '';

    if (sudokuGiven[i]) {
      btn.classList.add('given');
    } else if (val && val !== sudokuSolution[i]) {
      btn.classList.add('wrong');
    } else if (val && val === sudokuSolution[i]) {
      btn.classList.add('correct-entry');
    }

    if (i === sudokuSelected) {
      btn.classList.add('selected');
    } else if (selRow >= 0) {
      const br = Math.floor(selRow / 3), bc = Math.floor(selCol / 3);
      if (row === selRow || col === selCol || (Math.floor(row/3) === br && Math.floor(col/3) === bc)) {
        btn.classList.add('highlighted');
      }
    }

    btn.addEventListener('click', () => { sudokuSelected = i; sdRender(); });
    sudokuBoardEl.appendChild(btn);
  }
}

function sdInput(num) {
  if (sudokuSelected < 0 || sudokuSolved) return;
  if (sudokuGiven[sudokuSelected]) return;

  if (num === 0) { sudokuPuzzle[sudokuSelected] = 0; sdRender(); return; }
  if (sudokuPuzzle[sudokuSelected] === num) return;

  sudokuPuzzle[sudokuSelected] = num;

  if (num !== sudokuSolution[sudokuSelected]) {
    sudokuErrors++;
    sdUpdateHud();
    if (sudokuErrors >= SUDOKU_MAX_ERRORS) {
      sudokuRunning = false; sudokuSolved = true;
      clearInterval(sudokuTimerInt);
      if (sudokuStatusEl) sudokuStatusEl.textContent = 'Game Over! Muitos erros. Clique em "Novo jogo" para tentar de novo.';
      sdRender(); return;
    }
  }

  const allCorrect = sudokuPuzzle.every((v, i) => v === sudokuSolution[i]);
  if (allCorrect) {
    sudokuRunning = false; sudokuSolved = true;
    clearInterval(sudokuTimerInt);
    if (sudokuPhase >= SUDOKU_PHASES.length - 1) {
      if (sudokuStatusEl) sudokuStatusEl.textContent = 'Você zerou o Sudoku do Aloncinho! Incrível!';
    } else {
      if (sudokuStatusEl) sudokuStatusEl.textContent = `Fase ${sudokuPhase + 1} concluída! Próxima em 2s…`;
      setTimeout(() => sdStartPhase(sudokuPhase + 1), 2000);
    }
  }

  sdRender(); sdUpdateHud();
}

function sdStartPhase(phaseIndex) {
  sudokuPhase = phaseIndex;
  sudokuErrors = 0; sudokuSelected = -1; sudokuSolved = false;
  clearInterval(sudokuTimerInt);
  sudokuTimeSecs = 0; sudokuRunning = true;
  sudokuTimerInt = setInterval(() => { if (sudokuRunning) { sudokuTimeSecs++; sdUpdateHud(); } }, 1000);
  const { puzzle, solution } = sdGenerate(SUDOKU_PHASES[phaseIndex].remove);
  sudokuPuzzle = puzzle; sudokuSolution = solution;
  sudokuGiven = puzzle.map(v => v !== 0);
  sdUpdateHud(); sdRender();
  if (sudokuStatusEl) sudokuStatusEl.textContent = 'Selecione uma célula e escolha um número.';
}

if (sudokuBoardEl) {
  sdStartPhase(0);

  resetSudokuBtn && resetSudokuBtn.addEventListener('click', () => sdStartPhase(0));

  sudokuNumpadBtns.forEach(btn => {
    const handler = (e) => { e.preventDefault(); sdInput(parseInt(btn.dataset.num)); };
    btn.addEventListener('click', handler);
    btn.addEventListener('touchstart', handler, { passive: false });
  });

  document.addEventListener('keydown', (e) => {
    if (!sudokuBoardEl) return;
    if (e.key >= '1' && e.key <= '9') { e.preventDefault(); sdInput(parseInt(e.key)); return; }
    if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); sdInput(0); return; }
    const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
    const delta = moves[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    let next = sudokuSelected < 0 ? 40 : sudokuSelected + delta;
    if (e.key === 'ArrowLeft' && sudokuSelected % 9 === 0) return;
    if (e.key === 'ArrowRight' && sudokuSelected % 9 === 8) return;
    next = Math.max(0, Math.min(80, next));
    sudokuSelected = next; sdRender();
  });
}
if (roomFromUrl && joinRoomCodeInput) {
  joinRoomCodeInput.value = roomFromUrl.toUpperCase();
  joinOnlineRoom(roomFromUrl);
}

// ─── PAC-MAN DO ALONCINHO ─────────────────────────────────────────────────────

const pacCanvas = document.querySelector('#pac-canvas');
const pacStatusElement = document.querySelector('#pac-status');
const startPacButton = document.querySelector('#start-pacman');
const resetPacButton = document.querySelector('#reset-pacman');
const pacPhaseDisplay = document.querySelector('#pac-phase-display');
const pacScoreDisplay = document.querySelector('#pac-score-display');
const pacLivesDisplay = document.querySelector('#pac-lives-display');
const pacSpeedDisplay = document.querySelector('#pac-speed-display');
const pacDirButtons = document.querySelectorAll('[data-pac-direction]');

const PAC_PHASES = [
  { speed: 220, ghosts: 1, label: 'Iniciante'  },
  { speed: 205, ghosts: 1, label: 'Curioso'    },
  { speed: 190, ghosts: 2, label: 'Atento'     },
  { speed: 175, ghosts: 2, label: 'Esperto'    },
  { speed: 162, ghosts: 2, label: 'Ágil'       },
  { speed: 150, ghosts: 3, label: 'Rápido'     },
  { speed: 138, ghosts: 3, label: 'Veloz'      },
  { speed: 126, ghosts: 3, label: 'Turbinado'  },
  { speed: 115, ghosts: 4, label: 'Acelerado'  },
  { speed: 105, ghosts: 4, label: 'Furioso'    },
  { speed: 96,  ghosts: 4, label: 'Louco'      },
  { speed: 87,  ghosts: 4, label: 'Insano'     },
  { speed: 79,  ghosts: 4, label: 'Absurdo'    },
  { speed: 72,  ghosts: 4, label: 'Lendário'   },
  { speed: 65,  ghosts: 4, label: 'Aloncinho!' },
];

// 0=pellet, 1=wall, 2=power pellet, 3=empty(no pellet), 9=ghost door
const PAC_MAZE_TEMPLATE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,2,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,3,3,0,0,0,1,0,0,0,1],
  [1,1,1,1,0,1,1,1,3,1,1,3,1,1,1,0,1,1,1],
  [1,1,1,1,0,1,3,3,3,3,3,3,3,3,1,0,1,1,1],
  [1,1,1,1,0,1,3,1,9,3,3,9,1,3,1,0,1,1,1],
  [3,3,3,3,0,3,3,1,3,3,3,3,1,3,3,0,3,3,3],
  [1,1,1,1,0,1,3,1,1,1,1,1,1,3,1,0,1,1,1],
  [1,1,1,1,0,1,3,3,3,3,3,3,3,3,1,0,1,1,1],
  [1,1,1,1,0,1,1,1,3,1,1,3,1,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1],
  [1,2,0,1,0,0,0,0,0,3,3,0,0,0,0,0,1,0,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,1,0,1,0,1,0,1],
  [1,0,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,1],
  [1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const PAC_ROWS = PAC_MAZE_TEMPLATE.length;
const PAC_COLS = PAC_MAZE_TEMPLATE[0].length;
const PAC_TILE = Math.floor(380 / PAC_COLS);

const GHOST_COLORS = ['#fb7185', '#f9a8d4', '#22d3ee', '#fb923c'];
const GHOST_START = [
  { row: 9, col: 9 }, { row: 9, col: 10 },
  { row: 10, col: 9 }, { row: 10, col: 10 },
];

let pacMaze = [];
let pacMan = null;
let pacGhosts = [];
let pacPhase = 0;
let pacScore = 0;
let pacLives = 3;
let pacRunning = false;
let pacInterval = null;
let pacPowerTimer = 0;
let pacTick = 0;
let pacGameOver = false;
let pacWon = false;
let pacPelletsTotal = 0;
let pacPelletsEaten = 0;
let pacNextDir = null;
let pacMouthOpen = true;
let pacMouthTick = 0;

function cloneMaze() {
  return PAC_MAZE_TEMPLATE.map(row => [...row]);
}

function countPellets(maze) {
  let count = 0;
  for (let r = 0; r < PAC_ROWS; r++)
    for (let c = 0; c < PAC_COLS; c++)
      if (maze[r][c] === 0 || maze[r][c] === 2) count++;
  return count;
}

function pacCanMove(maze, row, col) {
  if (row < 0 || row >= PAC_ROWS) return false;
  const c = (col + PAC_COLS) % PAC_COLS;
  const cell = maze[row][c];
  return cell !== 1 && cell !== 9;
}

function initPacGhosts(count) {
  return GHOST_START.slice(0, Math.min(count, 4)).map((pos, i) => ({
    row: pos.row, col: pos.col,
    dir: { dr: 0, dc: 1 },
    color: GHOST_COLORS[i],
    scared: false,
    dead: false,
    homeTick: 0,
  }));
}

function resetPacGame() {
  clearInterval(pacInterval);
  pacInterval = null;
  pacRunning = false;
  pacGameOver = false;
  pacWon = false;
  pacScore = 0;
  pacLives = 3;
  pacPhase = 0;
  pacMaze = cloneMaze();
  pacPelletsTotal = countPellets(pacMaze);
  pacPelletsEaten = 0;
  pacPowerTimer = 0;
  pacNextDir = null;
  pacMan = { row: 20, col: 9, dir: { dr: 0, dc: 1 } };
  pacGhosts = initPacGhosts(PAC_PHASES[0].ghosts);
  updatePacHud();
  drawPac();
  if (pacStatusElement) pacStatusElement.textContent = 'Use as setas do teclado ou os botões para jogar.';
}

function startPacGame() {
  if (pacGameOver || pacRunning) return;
  pacRunning = true;
  if (pacStatusElement) pacStatusElement.textContent = '';
  const speed = PAC_PHASES[pacPhase].speed;
  clearInterval(pacInterval);
  pacInterval = setInterval(pacStep, speed);
}

function pacDirFromKey(key) {
  const map = {
    ArrowUp: { dr: -1, dc: 0 }, ArrowDown: { dr: 1, dc: 0 },
    ArrowLeft: { dr: 0, dc: -1 }, ArrowRight: { dr: 0, dc: 1 },
    w: { dr: -1, dc: 0 }, W: { dr: -1, dc: 0 },
    s: { dr: 1, dc: 0 },  S: { dr: 1, dc: 0 },
    a: { dr: 0, dc: -1 }, A: { dr: 0, dc: -1 },
    d: { dr: 0, dc: 1 },  D: { dr: 0, dc: 1 },
  };
  return map[key] || null;
}

function pacStep() {
  pacTick++;
  pacMouthTick++;
  if (pacMouthTick >= 5) { pacMouthOpen = !pacMouthOpen; pacMouthTick = 0; }
  if (pacPowerTimer > 0) pacPowerTimer--;

  // Move Pac-Man
  const { row, col, dir } = pacMan;
  const tryNext = pacNextDir;
  let moved = false;
  if (tryNext) {
    const nr = row + tryNext.dr;
    const nc = (col + tryNext.dc + PAC_COLS) % PAC_COLS;
    if (pacCanMove(pacMaze, nr, nc)) {
      pacMan.dir = tryNext;
      pacMan.row = nr;
      pacMan.col = nc;
      pacNextDir = null;
      moved = true;
    }
  }
  if (!moved) {
    const nr = row + dir.dr;
    const nc = (col + dir.dc + PAC_COLS) % PAC_COLS;
    if (pacCanMove(pacMaze, nr, nc)) {
      pacMan.row = nr;
      pacMan.col = nc;
    }
  }

  // Eat pellet
  const cell = pacMaze[pacMan.row][pacMan.col];
  if (cell === 0) {
    pacMaze[pacMan.row][pacMan.col] = 3;
    pacPelletsEaten++;
    pacScore += 10;
  } else if (cell === 2) {
    pacMaze[pacMan.row][pacMan.col] = 3;
    pacPelletsEaten++;
    pacScore += 50;
    pacPowerTimer = Math.floor(3000 / PAC_PHASES[pacPhase].speed);
    pacGhosts.forEach(g => { if (!g.dead) g.scared = true; });
  }

  // Move ghosts
  pacGhosts.forEach(g => {
    if (g.dead) {
      g.homeTick--;
      if (g.homeTick <= 0) {
        g.dead = false;
        g.scared = false;
        const spawn = GHOST_START[pacGhosts.indexOf(g) % 4];
        g.row = spawn.row; g.col = spawn.col;
        g.dir = { dr: 0, dc: 1 };
      }
      return;
    }
    if (pacPowerTimer === 0 && g.scared) g.scared = false;
    moveGhost(g);
  });

  // Collision
  for (const g of pacGhosts) {
    if (g.dead) continue;
    if (g.row === pacMan.row && g.col === pacMan.col) {
      if (g.scared) {
        g.dead = true;
        g.scared = false;
        g.homeTick = Math.floor(4000 / PAC_PHASES[pacPhase].speed);
        pacScore += 200;
      } else {
        pacLives--;
        if (pacLives <= 0) {
          pacGameOver = true;
          pacRunning = false;
          clearInterval(pacInterval);
          pacInterval = null;
          if (pacStatusElement) pacStatusElement.textContent = `Game Over! Pontuação: ${pacScore}`;
          drawPac();
          updatePacHud();
          return;
        }
        pacMan = { row: 20, col: 9, dir: { dr: 0, dc: 1 } };
        pacNextDir = null;
        drawPac();
        updatePacHud();
        return;
      }
    }
  }

  // Check win phase
  if (pacPelletsEaten >= pacPelletsTotal) {
    if (pacPhase >= PAC_PHASES.length - 1) {
      pacRunning = false;
      pacWon = true;
      clearInterval(pacInterval);
      pacInterval = null;
      if (pacStatusElement) pacStatusElement.textContent = `Você zerou o Pac-Man! Pontuação: ${pacScore}`;
      drawPac();
      updatePacHud();
      return;
    }
    // Next phase
    pacPhase++;
    pacMaze = cloneMaze();
    pacPelletsTotal = countPellets(pacMaze);
    pacPelletsEaten = 0;
    pacPowerTimer = 0;
    pacMan = { row: 20, col: 9, dir: { dr: 0, dc: 1 } };
    pacGhosts = initPacGhosts(PAC_PHASES[pacPhase].ghosts);
    clearInterval(pacInterval);
    pacInterval = setInterval(pacStep, PAC_PHASES[pacPhase].speed);
    if (pacStatusElement) pacStatusElement.textContent = `Fase ${pacPhase + 1} — ${PAC_PHASES[pacPhase].label}!`;
  }

  updatePacHud();
  drawPac();
}

function moveGhost(g) {
  const dirs = [
    { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
    { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
  ];
  const reverse = { dr: -g.dir.dr, dc: -g.dir.dc };
  const valid = dirs.filter(d => {
    if (d.dr === reverse.dr && d.dc === reverse.dc) return false;
    const nr = g.row + d.dr;
    const nc = (g.col + d.dc + PAC_COLS) % PAC_COLS;
    return pacCanMove(pacMaze, nr, nc);
  });
  if (valid.length === 0) {
    const nr = g.row + reverse.dr;
    const nc = (g.col + reverse.dc + PAC_COLS) % PAC_COLS;
    if (pacCanMove(pacMaze, nr, nc)) { g.dir = reverse; g.row = nr; g.col = nc; }
    return;
  }
  let chosen;
  if (g.scared || valid.length === 1) {
    chosen = valid[Math.floor(Math.random() * valid.length)];
  } else {
    // Chase: pick direction that gets closer to pac-man
    chosen = valid.reduce((best, d) => {
      const nr = g.row + d.dr;
      const nc = (g.col + d.dc + PAC_COLS) % PAC_COLS;
      const distNew = Math.abs(nr - pacMan.row) + Math.abs(nc - pacMan.col);
      const nr2 = g.row + best.dr;
      const nc2 = (g.col + best.dc + PAC_COLS) % PAC_COLS;
      const distBest = Math.abs(nr2 - pacMan.row) + Math.abs(nc2 - pacMan.col);
      return distNew < distBest ? d : best;
    });
  }
  g.dir = chosen;
  g.row += chosen.dr;
  g.col = (g.col + chosen.dc + PAC_COLS) % PAC_COLS;
}

function updatePacHud() {
  if (pacPhaseDisplay) pacPhaseDisplay.textContent = `${pacPhase + 1} / 15`;
  if (pacScoreDisplay) pacScoreDisplay.textContent = pacScore;
  if (pacLivesDisplay) pacLivesDisplay.textContent = pacLives;
  if (pacSpeedDisplay) pacSpeedDisplay.textContent = PAC_PHASES[pacPhase].label;
}

function drawPac() {
  if (!pacCanvas) return;
  const ctx = pacCanvas.getContext('2d');
  const T = PAC_TILE;
  ctx.clearRect(0, 0, pacCanvas.width, pacCanvas.height);

  // Draw maze
  for (let r = 0; r < PAC_ROWS; r++) {
    for (let c = 0; c < PAC_COLS; c++) {
      const x = c * T;
      const y = r * T;
      const cell = pacMaze[r][c];
      if (cell === 1) {
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(x, y, T, T);
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
      } else if (cell === 0) {
        ctx.fillStyle = '#f7f8ff';
        ctx.beginPath();
        ctx.arc(x + T / 2, y + T / 2, T * 0.13, 0, Math.PI * 2);
        ctx.fill();
      } else if (cell === 2) {
        const pulse = 0.85 + 0.15 * Math.sin(pacTick * 0.3);
        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x + T / 2, y + T / 2, T * 0.28 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (cell === 9) {
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + T / 2);
        ctx.lineTo(x + T, y + T / 2);
        ctx.stroke();
      }
    }
  }

  // Draw ghosts
  for (const g of pacGhosts) {
    if (g.dead) continue;
    const gx = g.col * T + T / 2;
    const gy = g.row * T + T / 2;
    const r2 = T * 0.42;
    ctx.fillStyle = g.scared ? '#a78bfa' : g.color;
    ctx.beginPath();
    ctx.arc(gx, gy - r2 * 0.1, r2, Math.PI, 0, false);
    ctx.lineTo(gx + r2, gy + r2 * 0.9);
    const segs = 3;
    for (let s = segs; s >= 0; s--) {
      const sx = gx - r2 + (r2 * 2 / segs) * s;
      const sy = gy + r2 * 0.9 + (s % 2 === 0 ? r2 * 0.3 : 0);
      ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    // Eyes
    if (!g.scared) {
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(gx - r2 * 0.3, gy - r2 * 0.15, r2 * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(gx + r2 * 0.3, gy - r2 * 0.15, r2 * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e40af';
      ctx.beginPath(); ctx.arc(gx - r2 * 0.3 + g.dir.dc * 3, gy - r2 * 0.15 + g.dir.dr * 3, r2 * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(gx + r2 * 0.3 + g.dir.dc * 3, gy - r2 * 0.15 + g.dir.dr * 3, r2 * 0.12, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = 'white';
      ctx.font = `${T * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('~', gx, gy);
    }
  }

  // Draw Pac-Man
  const px = pacMan.col * T + T / 2;
  const py = pacMan.row * T + T / 2;
  const angle = pacMouthOpen ? 0.25 : 0.05;
  let baseAngle = 0;
  if (pacMan.dir.dc < 0) baseAngle = Math.PI;
  else if (pacMan.dir.dr < 0) baseAngle = -Math.PI / 2;
  else if (pacMan.dir.dr > 0) baseAngle = Math.PI / 2;
  ctx.fillStyle = '#fde047';
  ctx.shadowColor = '#fde047';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(px, py, T * 0.44, baseAngle + angle * Math.PI, baseAngle + (2 - angle) * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

if (pacCanvas) {
  resetPacGame();

  startPacButton && startPacButton.addEventListener('click', () => {
    if (!pacRunning && !pacGameOver) startPacGame();
  });

  resetPacButton && resetPacButton.addEventListener('click', () => {
    resetPacGame();
  });

  pacDirButtons.forEach(btn => {
    const press = (e) => {
      e.preventDefault();
      const dirMap = { up: { dr: -1, dc: 0 }, down: { dr: 1, dc: 0 }, left: { dr: 0, dc: -1 }, right: { dr: 0, dc: 1 } };
      pacNextDir = dirMap[btn.dataset.pacDirection];
      if (!pacRunning && !pacGameOver) startPacGame();
    };
    btn.addEventListener('mousedown', press);
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('click', press);
  });

  // Swipe no canvas do Pac-Man
  let pacSwipeX = 0, pacSwipeY = 0;
  pacCanvas.addEventListener('touchstart', (e) => {
    pacSwipeX = e.touches[0].clientX;
    pacSwipeY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });
  pacCanvas.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - pacSwipeX;
    const dy = e.changedTouches[0].clientY - pacSwipeY;
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
    const dirMap = { up: { dr: -1, dc: 0 }, down: { dr: 1, dc: 0 }, left: { dr: 0, dc: -1 }, right: { dr: 0, dc: 1 } };
    if (Math.abs(dx) > Math.abs(dy)) {
      pacNextDir = dx > 0 ? dirMap.right : dirMap.left;
    } else {
      pacNextDir = dy > 0 ? dirMap.down : dirMap.up;
    }
    if (!pacRunning && !pacGameOver) startPacGame();
  }, { passive: true });
}

window.addEventListener('keydown', (e) => {
  if (!pacCanvas) return;
  const next = pacDirFromKey(e.key);
  if (!next) return;
  const rect = pacCanvas.getBoundingClientRect();
  const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
  if (!isVisible) return;
  e.preventDefault();
  pacNextDir = next;
  if (!pacRunning && !pacGameOver) startPacGame();
}, { capture: true, passive: false });
