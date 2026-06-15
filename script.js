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
const addCardBotButton = document.querySelector('#add-card-bot');
const startCardGameButton = document.querySelector('#start-card-game');
const resetCardGameButton = document.querySelector('#reset-card-game');
const drawCardButton = document.querySelector('#draw-card');
const passTurnButton = document.querySelector('#pass-turn');
const cardGameStatusElement = document.querySelector('#card-game-status');
const playersListElement = document.querySelector('#players-list');
const cardTableElement = document.querySelector('#card-table');
const playerHandElement = document.querySelector('#player-hand');

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

const symbols = ['★', '◆', '●', '▲', '☀', '♣'];
let memoryCards = [];
let selectedCards = [];
let movements = 0;
let lockMemoryBoard = false;

function createMemoryCards() {
  memoryCards = shuffle([...symbols, ...symbols]).map((symbol, index) => ({
    id: index,
    symbol,
    visible: false,
    matched: false,
  }));
  selectedCards = [];
  movements = 0;
  lockMemoryBoard = false;
  updateMemoryStatus();
  renderMemory();
}

function renderMemory() {
  memoryBoardElement.innerHTML = '';

  memoryCards.forEach((card) => {
    const cardButton = document.createElement('button');
    cardButton.className = 'memory-card';
    cardButton.type = 'button';
    cardButton.textContent = card.visible || card.matched ? card.symbol : '?';
    cardButton.setAttribute('aria-label', 'Carta do jogo da memória');

    if (card.matched) {
      cardButton.classList.add('matched');
    }

    cardButton.addEventListener('click', () => revealMemoryCard(card.id));
    memoryBoardElement.appendChild(cardButton);
  });
}

function revealMemoryCard(cardId) {
  const card = memoryCards.find((item) => item.id === cardId);
  if (lockMemoryBoard || !card || card.visible || card.matched) return;

  card.visible = true;
  selectedCards.push(card);
  renderMemory();

  if (selectedCards.length === 2) {
    movements += 1;
    updateMemoryStatus();
    checkMemoryPair();
  }
}

function checkMemoryPair() {
  const [first, second] = selectedCards;

  if (first.symbol === second.symbol) {
    first.matched = true;
    second.matched = true;
    selectedCards = [];
    renderMemory();

    if (memoryCards.every((card) => card.matched)) {
      memoryStatusElement.textContent = `Você venceu em ${movements} movimentos!`;
    }
    return;
  }

  lockMemoryBoard = true;
  setTimeout(() => {
    first.visible = false;
    second.visible = false;
    selectedCards = [];
    lockMemoryBoard = false;
    renderMemory();
  }, 750);
}

function updateMemoryStatus() {
  memoryStatusElement.textContent = `Movimentos: ${movements}`;
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

const snakeContext = snakeCanvas.getContext('2d');
const snakeGridSize = 18;
const snakeTileCount = snakeCanvas.width / snakeGridSize;
let snake = [];
let snakeFood = { x: 8, y: 8 };
let snakeDirection = { x: 1, y: 0 };
let nextSnakeDirection = { x: 1, y: 0 };
let snakeScore = 0;
let snakeTimer = null;
let snakeRunning = false;

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
  placeSnakeFood();
  snakeStatusElement.textContent = 'Use as setas do teclado ou os botões para jogar.';
  drawSnake();
}

function startSnakeGame() {
  if (snakeRunning) return;
  snakeRunning = true;
  snakeStatusElement.textContent = `Pontuação: ${snakeScore}`;
  snakeTimer = setInterval(moveSnake, 130);
}

function stopSnake() {
  snakeRunning = false;
  if (snakeTimer) {
    clearInterval(snakeTimer);
    snakeTimer = null;
  }
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
    snakeStatusElement.textContent = `Fim de jogo! Pontuação final: ${snakeScore}`;
    drawSnake();
    return;
  }

  snake.unshift(head);

  if (head.x === snakeFood.x && head.y === snakeFood.y) {
    snakeScore += 1;
    placeSnakeFood();
  } else {
    snake.pop();
  }

  snakeStatusElement.textContent = `Pontuação: ${snakeScore}`;
  drawSnake();
}

function drawSnake() {
  snakeContext.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);
  snakeContext.fillStyle = 'rgba(255, 255, 255, 0.05)';
  snakeContext.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

  snakeContext.fillStyle = '#22d3ee';
  snakeContext.fillRect(
    snakeFood.x * snakeGridSize + 3,
    snakeFood.y * snakeGridSize + 3,
    snakeGridSize - 6,
    snakeGridSize - 6,
  );

  snake.forEach((part, index) => {
    snakeContext.fillStyle = index === 0 ? '#a78bfa' : '#34d399';
    snakeContext.fillRect(
      part.x * snakeGridSize + 2,
      part.y * snakeGridSize + 2,
      snakeGridSize - 4,
      snakeGridSize - 4,
    );
  });
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

  const isOpposite = next.x + snakeDirection.x === 0 && next.y + snakeDirection.y === 0;
  if (!isOpposite) {
    nextSnakeDirection = next;
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
const cardValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Bloqueio', 'Reverso', '+2'];
const colorLabels = {
  red: 'Vermelho',
  blue: 'Azul',
  green: 'Verde',
  yellow: 'Amarelo',
};

let roomCode = '';
let cardPlayers = [];
let cardDeck = [];
let discardPile = [];
let currentCardPlayer = 0;
let cardDirection = 1;
let cardGameStarted = false;
let botCount = 0;

function resetCardRoom() {
  roomCode = createRoomCode();
  cardPlayers = [];
  cardDeck = [];
  discardPile = [];
  currentCardPlayer = 0;
  cardDirection = 1;
  cardGameStarted = false;
  botCount = 0;
  roomCodeElement.textContent = roomCode;
  cardGameStatusElement.textContent = 'Adicione pelo menos 2 jogadores para iniciar.';
  playerHandElement.innerHTML = '';
  renderCardPlayers();
  renderCardTable();
}

function createRoomCode() {
  return `ALON-${Math.floor(1000 + Math.random() * 9000)}`;
}

function addCardPlayer(name, isBot = false) {
  const cleanName = name.trim();
  if (!cleanName) {
    cardGameStatusElement.textContent = 'Informe um nome para adicionar o jogador.';
    return;
  }

  if (cardPlayers.length >= 8) {
    cardGameStatusElement.textContent = 'A sala já chegou ao limite máximo de 8 jogadores.';
    return;
  }

  if (cardPlayers.some((player) => player.name.toLowerCase() === cleanName.toLowerCase())) {
    cardGameStatusElement.textContent = 'Esse nome já está na sala. Use outro nome para identificar o amigo.';
    return;
  }

  cardPlayers.push({
    name: cleanName,
    isBot,
    hand: [],
  });
  cardGameStatusElement.textContent = `${cleanName} entrou na sala.`;
  renderCardPlayers();
}

function addCardBot() {
  botCount += 1;
  addCardPlayer(`BOT ${botCount}`, true);
}

function startCardGame() {
  if (cardPlayers.length < 2) {
    cardGameStatusElement.textContent = 'Adicione pelo menos 2 jogadores para iniciar.';
    return;
  }

  cardDeck = shuffle(createCardDeck());
  discardPile = [];
  currentCardPlayer = 0;
  cardDirection = 1;
  cardGameStarted = true;
  cardPlayers.forEach((player) => {
    player.hand = drawCards(5);
  });

  discardPile.push(drawFirstDiscard());
  cardGameStatusElement.textContent = `Partida iniciada. Vez de ${cardPlayers[currentCardPlayer].name}.`;
  renderCardGame();
  scheduleBotTurn();
}

function createCardDeck() {
  const deck = [];
  cardColors.forEach((color) => {
    cardValues.forEach((value) => {
      deck.push({ color, value });
      if (value !== '0') deck.push({ color, value });
    });
  });
  return deck;
}

function drawFirstDiscard() {
  let card = cardDeck.pop();
  while (['Bloqueio', 'Reverso', '+2'].includes(card.value)) {
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
  renderCardPlayers();
  renderCardTable();
  renderPlayerHand();
}

function renderCardPlayers() {
  playersListElement.innerHTML = '';

  if (!cardPlayers.length) {
    playersListElement.innerHTML = '<div class="player-chip">Nenhum jogador na sala ainda.</div>';
    return;
  }

  cardPlayers.forEach((player, index) => {
    const chip = document.createElement('div');
    chip.className = `player-chip ${cardGameStarted && index === currentCardPlayer ? 'active' : ''}`.trim();
    const name = document.createElement('strong');
    name.textContent = player.name;
    const details = document.createTextNode(`${player.isBot ? 'BOT' : 'Amigo'} · ${player.hand.length} cartas`);
    chip.append(name, details);
    playersListElement.appendChild(chip);
  });
}

function renderCardTable() {
  const topCard = discardPile[discardPile.length - 1];
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
  `;
}

function renderPlayerHand() {
  playerHandElement.innerHTML = '';
  if (!cardGameStarted) return;

  const player = cardPlayers[currentCardPlayer];
  if (player.isBot) {
    playerHandElement.innerHTML = '<p class="status">O BOT está analisando a jogada...</p>';
    return;
  }

  player.hand.forEach((card, index) => {
    const button = document.createElement('button');
    button.className = `uno-card uno-${card.color}`;
    button.type = 'button';
    button.disabled = !isCardPlayable(card);
    button.innerHTML = `${colorLabels[card.color]}<strong>${card.value}</strong>`;
    button.addEventListener('click', () => playCard(index));
    playerHandElement.appendChild(button);
  });
}

function formatCard(card) {
  return `${colorLabels[card.color]} ${card.value}`;
}

function isCardPlayable(card) {
  const topCard = discardPile[discardPile.length - 1];
  return !topCard || card.color === topCard.color || card.value === topCard.value;
}

function playCard(cardIndex) {
  if (!cardGameStarted) return;
  const player = cardPlayers[currentCardPlayer];
  const card = player.hand[cardIndex];
  if (!card || !isCardPlayable(card)) return;

  player.hand.splice(cardIndex, 1);
  discardPile.push(card);

  if (!player.hand.length) {
    cardGameStarted = false;
    cardGameStatusElement.textContent = `${player.name} venceu a partida!`;
    renderCardGame();
    return;
  }

  const steps = applyCardEffect(card);
  currentCardPlayer = getNextCardPlayerIndex(steps);
  cardGameStatusElement.textContent = `${player.name} jogou ${formatCard(card)}. Vez de ${cardPlayers[currentCardPlayer].name}.`;
  renderCardGame();
  scheduleBotTurn();
}

function applyCardEffect(card) {
  if (card.value === 'Reverso') {
    cardDirection *= -1;
    return cardPlayers.length === 2 ? 2 : 1;
  }

  if (card.value === 'Bloqueio') {
    return 2;
  }

  if (card.value === '+2') {
    const targetIndex = getNextCardPlayerIndex(1);
    cardPlayers[targetIndex].hand.push(...drawCards(2));
    return 2;
  }

  return 1;
}

function getNextCardPlayerIndex(steps) {
  const total = cardPlayers.length;
  return (currentCardPlayer + cardDirection * steps + total * 4) % total;
}

function drawForCurrentPlayer() {
  if (!cardGameStarted) return;
  const player = cardPlayers[currentCardPlayer];
  if (player.isBot) return;

  player.hand.push(...drawCards(1));
  cardGameStatusElement.textContent = `${player.name} comprou uma carta.`;
  renderCardGame();
}

function passCardTurn() {
  if (!cardGameStarted) return;
  const player = cardPlayers[currentCardPlayer];
  if (player.isBot) return;

  currentCardPlayer = getNextCardPlayerIndex(1);
  cardGameStatusElement.textContent = `${player.name} passou a vez. Vez de ${cardPlayers[currentCardPlayer].name}.`;
  renderCardGame();
  scheduleBotTurn();
}

function scheduleBotTurn() {
  if (!cardGameStarted) return;
  const player = cardPlayers[currentCardPlayer];
  if (!player.isBot) return;

  setTimeout(() => playBotCardTurn(), 800);
}

function playBotCardTurn() {
  if (!cardGameStarted) return;
  const player = cardPlayers[currentCardPlayer];
  const playableIndex = player.hand.findIndex((card) => isCardPlayable(card));

  if (playableIndex >= 0) {
    playCard(playableIndex);
    return;
  }

  player.hand.push(...drawCards(1));
  const newPlayableIndex = player.hand.findIndex((card) => isCardPlayable(card));
  if (newPlayableIndex >= 0) {
    playCard(newPlayableIndex);
    return;
  }

  currentCardPlayer = getNextCardPlayerIndex(1);
  cardGameStatusElement.textContent = `${player.name} comprou e passou. Vez de ${cardPlayers[currentCardPlayer].name}.`;
  renderCardGame();
  scheduleBotTurn();
}

function copyRoomInvite() {
  const invite = `${window.location.origin}${window.location.pathname}#cartas?room=${roomCode}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(invite);
  }
  cardGameStatusElement.textContent = `Convite copiado: ${roomCode}. Compartilhe o link e peça para o amigo informar o nome na sala.`;
}

resetTicButton.addEventListener('click', resetTicTacToe);
toggleBotButton.addEventListener('click', toggleBotMode);
resetMemoryButton.addEventListener('click', createMemoryCards);
guessForm.addEventListener('submit', submitGuess);
resetGuessButton.addEventListener('click', resetGuessGame);
startSnakeButton.addEventListener('click', startSnakeGame);
resetSnakeButton.addEventListener('click', resetSnakeGame);
resetDetectiveButton.addEventListener('click', createDetectiveCase);
playerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addCardPlayer(playerNameInput.value);
  playerNameInput.value = '';
  playerNameInput.focus();
});
addCardBotButton.addEventListener('click', addCardBot);
startCardGameButton.addEventListener('click', startCardGame);
resetCardGameButton.addEventListener('click', resetCardRoom);
drawCardButton.addEventListener('click', drawForCurrentPlayer);
passTurnButton.addEventListener('click', passCardTurn);
copyRoomLinkButton.addEventListener('click', copyRoomInvite);
directionButtons.forEach((button) => {
  button.addEventListener('click', () => changeSnakeDirection(button.dataset.direction));
});

window.addEventListener('keydown', (event) => {
  const keyDirections = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
  };

  if (keyDirections[event.key]) {
    event.preventDefault();
    changeSnakeDirection(keyDirections[event.key]);
  }
});

resetTicTacToe();
createMemoryCards();
resetSnakeGame();
createDetectiveCase();
resetCardRoom();
