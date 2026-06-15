const ticBoardElement = document.querySelector('#tic-tac-toe-board');
const ticStatusElement = document.querySelector('#tic-tac-toe-status');
const resetTicButton = document.querySelector('#reset-tic-tac-toe');

const memoryBoardElement = document.querySelector('#memory-board');
const memoryStatusElement = document.querySelector('#memory-status');
const resetMemoryButton = document.querySelector('#reset-memory');

const guessForm = document.querySelector('#guess-form');
const guessInput = document.querySelector('#guess-input');
const guessFeedback = document.querySelector('#guess-feedback');
const resetGuessButton = document.querySelector('#reset-guess');

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
  if (ticBoard[index] || ticFinished) return;

  ticBoard[index] = currentPlayer;
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
  ticStatusElement.textContent = 'Vez do jogador X';
  renderTicTacToe();
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

resetTicButton.addEventListener('click', resetTicTacToe);
resetMemoryButton.addEventListener('click', createMemoryCards);
guessForm.addEventListener('submit', submitGuess);
resetGuessButton.addEventListener('click', resetGuessGame);

resetTicTacToe();
createMemoryCards();
