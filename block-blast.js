'use strict';

const GRID = 8;

// ===== Piece definitions =====
const PIECE_DEFS = [
  // 1-cell
  { cells: [[0,0]], color: '#fbbf24' },

  // 2-cell
  { cells: [[0,0],[0,1]], color: '#34d399' },
  { cells: [[0,0],[1,0]], color: '#34d399' },

  // 3-cell straight
  { cells: [[0,0],[0,1],[0,2]], color: '#22d3ee' },
  { cells: [[0,0],[1,0],[2,0]], color: '#22d3ee' },

  // 3-cell L/corner
  { cells: [[0,0],[1,0],[1,1]], color: '#f472b6' },
  { cells: [[0,0],[0,1],[1,0]], color: '#f472b6' },
  { cells: [[0,0],[0,1],[1,1]], color: '#f472b6' },
  { cells: [[0,1],[1,0],[1,1]], color: '#f472b6' },

  // 2x2 square
  { cells: [[0,0],[0,1],[1,0],[1,1]], color: '#fb923c' },

  // 4-cell straight
  { cells: [[0,0],[0,1],[0,2],[0,3]], color: '#818cf8' },
  { cells: [[0,0],[1,0],[2,0],[3,0]], color: '#818cf8' },

  // 5-cell straight
  { cells: [[0,0],[0,1],[0,2],[0,3],[0,4]], color: '#60a5fa' },
  { cells: [[0,0],[1,0],[2,0],[3,0],[4,0]], color: '#60a5fa' },

  // L shapes 4-cell (all 4 rotations)
  { cells: [[0,0],[1,0],[2,0],[2,1]], color: '#c084fc' },
  { cells: [[0,1],[1,1],[2,0],[2,1]], color: '#c084fc' },
  { cells: [[0,0],[0,1],[0,2],[1,0]], color: '#c084fc' },
  { cells: [[0,0],[0,1],[0,2],[1,2]], color: '#c084fc' },
  { cells: [[0,0],[0,1],[1,0],[2,0]], color: '#c084fc' },
  { cells: [[0,0],[0,1],[1,1],[2,1]], color: '#c084fc' },
  { cells: [[0,0],[1,0],[1,1],[1,2]], color: '#c084fc' },
  { cells: [[0,2],[1,0],[1,1],[1,2]], color: '#c084fc' },

  // T shapes
  { cells: [[0,0],[0,1],[0,2],[1,1]], color: '#f87171' },
  { cells: [[0,0],[1,0],[1,1],[2,0]], color: '#f87171' },
  { cells: [[0,1],[1,0],[1,1],[1,2]], color: '#f87171' },
  { cells: [[0,0],[0,1],[1,0],[2,0]], color: '#f87171' },

  // S/Z
  { cells: [[0,1],[0,2],[1,0],[1,1]], color: '#4ade80' },
  { cells: [[0,0],[0,1],[1,1],[1,2]], color: '#4ade80' },

  // 3x3 square
  { cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]], color: '#ef4444' },

  // 2x3 and 3x2 rectangles
  { cells: [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]], color: '#f97316' },
  { cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]], color: '#f97316' },

  // Big L (5-cell)
  { cells: [[0,0],[1,0],[2,0],[3,0],[3,1]], color: '#a78bfa' },
  { cells: [[0,0],[0,1],[0,2],[0,3],[1,0]], color: '#a78bfa' },
  { cells: [[0,0],[0,1],[1,0],[2,0],[3,0]], color: '#a78bfa' },
  { cells: [[0,3],[1,0],[1,1],[1,2],[1,3]], color: '#a78bfa' },
];

// ===== State =====
let grid;
let currentPieces;
let selectedIdx;
let score;
let hiScore;
let gameOver;
let animating;
let cellEls;
let hoverR, hoverC;

function rnd(n) { return Math.floor(Math.random() * n); }
function randomPiece() { return { ...PIECE_DEFS[rnd(PIECE_DEFS.length)] }; }
function flatIdx(r, c) { return r * GRID + c; }

// ===== DOM refs =====
const gridEl     = document.getElementById('bb-grid');
const scoreEl    = document.getElementById('bb-score');
const hiScoreEl  = document.getElementById('bb-hiscore');
const piecesRow  = document.getElementById('bb-pieces-row');
const comboEl    = document.getElementById('bb-combo');
const screenPlay = document.getElementById('bb-play');
const screenOver = document.getElementById('bb-over');
const finalScEl  = document.getElementById('bb-final-score');
const finalHiEl  = document.getElementById('bb-final-hi');
const restartBtn = document.getElementById('bb-restart');

// ===== Init / New Game =====
function init() {
  // Build 64 cells
  gridEl.innerHTML = '';
  cellEls = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const el = document.createElement('div');
      el.className = 'bb-cell';
      el.dataset.r = r;
      el.dataset.c = c;
      el.setAttribute('role', 'gridcell');
      gridEl.appendChild(el);
      cellEls.push(el);
    }
  }

  gridEl.addEventListener('mouseover', onGridHover);
  gridEl.addEventListener('mouseleave', () => { hoverR = hoverC = null; clearGhost(); });
  gridEl.addEventListener('click', onGridClick);
  gridEl.addEventListener('touchend', onGridTouch, { passive: true });

  piecesRow.addEventListener('click', onPieceRowClick);
  piecesRow.addEventListener('touchend', onPieceRowClick, { passive: true });

  restartBtn.addEventListener('click', newGame);

  hiScore = parseInt(localStorage.getItem('bb-hi') || '0', 10);
  hiScoreEl.textContent = hiScore;

  newGame();
}

function newGame() {
  grid = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  score = 0;
  gameOver = false;
  animating = false;
  selectedIdx = null;
  hoverR = hoverC = null;
  currentPieces = [randomPiece(), randomPiece(), randomPiece()];

  comboEl.textContent = '';
  updateScore();
  renderGrid();
  renderPieces();

  screenPlay.classList.add('active');
  screenOver.classList.remove('active');
}

// ===== Rendering =====
function renderGrid() {
  cellEls.forEach((el, i) => {
    const r = Math.floor(i / GRID), c = i % GRID;
    const color = grid[r][c];
    el.style.background = color || '';
    el.classList.toggle('filled', !!color);
    el.classList.remove('ghost', 'ghost-invalid', 'clearing');
  });
  applyGhost();
}

function applyGhost() {
  if (selectedIdx === null || hoverR === null || hoverC === null) return;
  const piece = currentPieces[selectedIdx];
  if (!piece) return;
  const valid = canPlace(piece, hoverR, hoverC);
  piece.cells.forEach(([dr, dc]) => {
    const r = hoverR + dr, c = hoverC + dc;
    if (r >= 0 && r < GRID && c >= 0 && c < GRID && !grid[r][c]) {
      const el = cellEls[flatIdx(r, c)];
      el.style.background = piece.color;
      el.classList.add(valid ? 'ghost' : 'ghost-invalid');
    }
  });
}

function clearGhost() {
  cellEls.forEach(el => {
    if (!el.classList.contains('clearing')) {
      el.classList.remove('ghost', 'ghost-invalid');
      const r = +el.dataset.r, c = +el.dataset.c;
      el.style.background = grid[r][c] || '';
    }
  });
}

function renderPieces() {
  const slots = piecesRow.querySelectorAll('.bb-piece-slot');
  slots.forEach((slot, idx) => {
    slot.innerHTML = '';
    slot.classList.toggle('selected', idx === selectedIdx);
    slot.classList.toggle('used', !currentPieces[idx]);
    slot.setAttribute('aria-pressed', idx === selectedIdx ? 'true' : 'false');

    const piece = currentPieces[idx];
    if (!piece) return;

    const maxR = Math.max(...piece.cells.map(([r]) => r));
    const maxC = Math.max(...piece.cells.map(([, c]) => c));

    const mini = document.createElement('div');
    mini.className = 'bb-mini-grid';
    mini.style.gridTemplateColumns = `repeat(${maxC + 1}, 1fr)`;
    mini.style.gridTemplateRows = `repeat(${maxR + 1}, 1fr)`;

    for (let r = 0; r <= maxR; r++) {
      for (let c = 0; c <= maxC; c++) {
        const cell = document.createElement('div');
        cell.className = 'bb-mini-cell';
        if (piece.cells.some(([pr, pc]) => pr === r && pc === c)) {
          cell.style.background = piece.color;
          cell.classList.add('filled');
        }
        mini.appendChild(cell);
      }
    }
    slot.appendChild(mini);
  });
}

// ===== Events =====
function onPieceRowClick(e) {
  const slot = e.target.closest('.bb-piece-slot');
  if (!slot || gameOver || animating) return;
  const idx = +slot.dataset.idx;
  if (!currentPieces[idx]) return;
  selectedIdx = selectedIdx === idx ? null : idx;
  renderPieces();
  clearGhost();
  applyGhost();
}

function onGridHover(e) {
  if (gameOver || animating || selectedIdx === null) return;
  const cell = e.target.closest('.bb-cell');
  if (!cell) return;
  const r = +cell.dataset.r, c = +cell.dataset.c;
  if (r === hoverR && c === hoverC) return;
  hoverR = r; hoverC = c;
  clearGhost();
  applyGhost();
}

function onGridClick(e) {
  if (gameOver || animating || selectedIdx === null) return;
  const cell = e.target.closest('.bb-cell');
  if (!cell) return;
  tryPlace(+cell.dataset.r, +cell.dataset.c);
}

function onGridTouch(e) {
  if (gameOver || animating || selectedIdx === null) return;
  const t = e.changedTouches[0];
  const el = document.elementFromPoint(t.clientX, t.clientY);
  const cell = el && el.closest('.bb-cell');
  if (!cell) return;
  tryPlace(+cell.dataset.r, +cell.dataset.c);
}

// ===== Game logic =====
function canPlace(piece, row, col) {
  return piece.cells.every(([dr, dc]) => {
    const r = row + dr, c = col + dc;
    return r >= 0 && r < GRID && c >= 0 && c < GRID && !grid[r][c];
  });
}

function tryPlace(row, col) {
  const piece = currentPieces[selectedIdx];
  if (!piece || !canPlace(piece, row, col)) return;

  animating = true;
  hoverR = hoverC = null;

  // Fill cells
  piece.cells.forEach(([dr, dc]) => {
    const r = row + dr, c = col + dc;
    grid[r][c] = piece.color;
    const el = cellEls[flatIdx(r, c)];
    el.style.background = piece.color;
    el.classList.add('filled');
    el.classList.remove('ghost', 'ghost-invalid');
  });

  score += piece.cells.length;
  currentPieces[selectedIdx] = null;
  selectedIdx = null;
  renderPieces();

  // Find full rows and columns
  const fullRows = [], fullCols = [];
  for (let r = 0; r < GRID; r++) {
    if (grid[r].every(v => v !== null)) fullRows.push(r);
  }
  for (let c = 0; c < GRID; c++) {
    if (grid.every(row => row[c] !== null)) fullCols.push(c);
  }

  const lineCount = fullRows.length + fullCols.length;

  if (lineCount > 0) {
    const toClear = new Set();
    fullRows.forEach(r => { for (let c = 0; c < GRID; c++) toClear.add(flatIdx(r, c)); });
    fullCols.forEach(c => { for (let r = 0; r < GRID; r++) toClear.add(flatIdx(r, c)); });

    toClear.forEach(i => cellEls[i].classList.add('clearing'));

    // Score: cells cleared + combo bonus
    const bonus = toClear.size + (lineCount > 1 ? lineCount * 15 : 0);
    score += bonus;

    if (lineCount > 1) {
      comboEl.textContent = `${lineCount}x COMBO! +${bonus}`;
      setTimeout(() => { comboEl.textContent = ''; }, 1400);
    }

    setTimeout(() => {
      fullRows.forEach(r => { for (let c = 0; c < GRID; c++) grid[r][c] = null; });
      fullCols.forEach(c => { for (let r = 0; r < GRID; r++) grid[r][c] = null; });
      updateScore();
      renderGrid();
      afterPlace();
    }, 380);
  } else {
    updateScore();
    afterPlace();
  }
}

function afterPlace() {
  if (currentPieces.every(p => p === null)) {
    currentPieces = [randomPiece(), randomPiece(), randomPiece()];
  }
  renderPieces();

  const anyFits = currentPieces.some(piece => {
    if (!piece) return false;
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (canPlace(piece, r, c)) return true;
      }
    }
    return false;
  });

  animating = false;
  if (!anyFits) setTimeout(showGameOver, 300);
}

function updateScore() {
  scoreEl.textContent = score;
  scoreEl.classList.remove('bb-score-pop');
  scoreEl.offsetWidth;
  scoreEl.classList.add('bb-score-pop');

  if (score > hiScore) {
    hiScore = score;
    localStorage.setItem('bb-hi', hiScore);
    hiScoreEl.textContent = hiScore;
  }
}

function showGameOver() {
  gameOver = true;
  finalScEl.textContent = `Pontuação: ${score}`;
  finalHiEl.textContent = score >= hiScore ? '🏆 Novo recorde!' : `Recorde: ${hiScore}`;
  screenPlay.classList.remove('active');
  screenOver.classList.add('active');
}

// ===== Start =====
init();
