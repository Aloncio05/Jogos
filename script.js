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
const playersListElement = document.querySelector('#players-list');
const cardTableElement = document.querySelector('#card-table');
const cardAvatarsElement = document.querySelector('#card-avatars');
const playerHandElement = document.querySelector('#player-hand');
const deckCountLabel = document.querySelector('#deck-count-label');
const discardLabel = document.querySelector('#discard-label');
const lastCardVisualElement = document.querySelector('#last-card-visual');
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
  if (startSnakeButton) startSnakeButton.textContent = 'Jogando...';
  snakeTimer = setInterval(moveSnake, 130);
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
  if (!snakeContext) return;
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
  roomCodeElement.textContent = roomCode;
  cardGameStatusElement.textContent = 'Adicione pelo menos 2 jogadores para iniciar.';
  playerHandElement.innerHTML = '';
  renderCardPlayers();
  renderCardTable();
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
  renderCardPlayers();
  renderCardAvatars();
  renderCardTable();
  renderPlayerHand();
}

function renderCardAvatars() {
  if (!cardAvatarsElement) return;
  cardAvatarsElement.innerHTML = '';

  cardPlayers.forEach((player, index) => {
    const avatar = document.createElement('div');
    avatar.className = `avatar-card ${cardGameStarted && index === currentCardPlayer ? 'active' : ''}`.trim();

    const face = document.createElement('div');
    face.className = 'avatar-face';
    face.textContent = player.name.slice(0, 2).toUpperCase();

    const name = document.createElement('strong');
    name.textContent = player.name;

    const detail = document.createElement('span');
    detail.textContent = `${player.isBot ? 'BOT' : 'Jogador'} · ${player.hand.length} cartas · ${Number(player.score) || 0} pts${player.saidUno ? ' · UNO!' : ''}`;

    avatar.append(face, name, detail);
    cardAvatarsElement.appendChild(avatar);
  });
}

function renderCardPlayers() {
  if (!playersListElement) return;
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
  lastCardVisualElement.innerHTML = getCardFace(card, 'Última carta');
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
  return `<span>${label || colorName}</span><strong>${card.value}</strong><small>${colorName}</small>`;
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
  pendingWildColorCardIndex = null;

  if (!player.hand.length) {
    cardGameStarted = false;
    const score = calculateRoundScore();
    player.score = (Number(player.score) || 0) + score;
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
  const canPlayDrawn = drawnCard && isCardPlayable(drawnCard);
  cardGameStatusElement.textContent = canPlayDrawn
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

  currentCardPlayer = getNextCardPlayerIndex(1);
  hasDrawnThisTurn = false;
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
if (guessForm) guessForm.addEventListener('submit', submitGuess);
if (resetGuessButton) resetGuessButton.addEventListener('click', resetGuessGame);
if (startSnakeButton) startSnakeButton.addEventListener('click', startSnakeGame);
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
colorChoiceButtons.forEach((button) => {
  button.addEventListener('click', () => chooseWildColor(button.dataset.cardColor));
});
joinRoomForm.addEventListener('submit', (event) => {
  event.preventDefault();
  joinOnlineRoom(joinRoomCodeInput.value);
});
directionButtons.forEach((button) => {
  button.addEventListener('click', () => changeSnakeDirection(button.dataset.direction));
});

window.addEventListener('keydown', (event) => {
  if (!snakeCanvas) return;
  const keyDirections = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    W: 'up',
    s: 'down',
    S: 'down',
    a: 'left',
    A: 'left',
    d: 'right',
    D: 'right',
  };

  if (keyDirections[event.key]) {
    event.preventDefault();
    changeSnakeDirection(keyDirections[event.key]);
  }
});

if (ticBoardElement) resetTicTacToe();
if (memoryBoardElement) createMemoryCards();
if (snakeCanvas) resetSnakeGame();
if (detectiveStoryElement) createDetectiveCase();
if (roomCodeElement) {
  resetCardRoom();
  initFirebase();
}

const roomFromUrl = new URLSearchParams(window.location.hash.split('?')[1] || '').get('room');
if (roomFromUrl && joinRoomCodeInput) {
  joinRoomCodeInput.value = roomFromUrl.toUpperCase();
  joinOnlineRoom(roomFromUrl);
}
