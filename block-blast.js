'use strict';

const GRID = 8;
const DRAG_THRESHOLD = 6;

// ===== Piece definitions =====
const PIECE_DEFS = [
  { cells: [[0,0]], color: '#fbbf24' },
  { cells: [[0,0],[0,1]], color: '#34d399' },
  { cells: [[0,0],[1,0]], color: '#34d399' },
  { cells: [[0,0],[0,1],[0,2]], color: '#22d3ee' },
  { cells: [[0,0],[1,0],[2,0]], color: '#22d3ee' },
  { cells: [[0,0],[1,0],[1,1]], color: '#f472b6' },
  { cells: [[0,0],[0,1],[1,0]], color: '#f472b6' },
  { cells: [[0,0],[0,1],[1,1]], color: '#f472b6' },
  { cells: [[0,1],[1,0],[1,1]], color: '#f472b6' },
  { cells: [[0,0],[0,1],[1,0],[1,1]], color: '#fb923c' },
  { cells: [[0,0],[0,1],[0,2],[0,3]], color: '#818cf8' },
  { cells: [[0,0],[1,0],[2,0],[3,0]], color: '#818cf8' },
  { cells: [[0,0],[0,1],[0,2],[0,3],[0,4]], color: '#60a5fa' },
  { cells: [[0,0],[1,0],[2,0],[3,0],[4,0]], color: '#60a5fa' },
  { cells: [[0,0],[1,0],[2,0],[2,1]], color: '#c084fc' },
  { cells: [[0,1],[1,1],[2,0],[2,1]], color: '#c084fc' },
  { cells: [[0,0],[0,1],[0,2],[1,0]], color: '#c084fc' },
  { cells: [[0,0],[0,1],[0,2],[1,2]], color: '#c084fc' },
  { cells: [[0,0],[0,1],[1,0],[2,0]], color: '#c084fc' },
  { cells: [[0,0],[0,1],[1,1],[2,1]], color: '#c084fc' },
  { cells: [[0,0],[1,0],[1,1],[1,2]], color: '#c084fc' },
  { cells: [[0,2],[1,0],[1,1],[1,2]], color: '#c084fc' },
  { cells: [[0,0],[0,1],[0,2],[1,1]], color: '#f87171' },
  { cells: [[0,0],[1,0],[1,1],[2,0]], color: '#f87171' },
  { cells: [[0,1],[1,0],[1,1],[1,2]], color: '#f87171' },
  { cells: [[0,0],[0,1],[1,0],[2,0]], color: '#f87171' },
  { cells: [[0,1],[0,2],[1,0],[1,1]], color: '#4ade80' },
  { cells: [[0,0],[0,1],[1,1],[1,2]], color: '#4ade80' },
  { cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]], color: '#ef4444' },
  { cells: [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]], color: '#f97316' },
  { cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]], color: '#f97316' },
  { cells: [[0,0],[1,0],[2,0],[3,0],[3,1]], color: '#a78bfa' },
  { cells: [[0,0],[0,1],[0,2],[0,3],[1,0]], color: '#a78bfa' },
  { cells: [[0,0],[0,1],[1,0],[2,0],[3,0]], color: '#a78bfa' },
  { cells: [[0,3],[1,0],[1,1],[1,2],[1,3]], color: '#a78bfa' },
];

// ===== Game state =====
let grid, currentPieces, selectedIdx, score, hiScore, gameOver, animating, cellEls, hoverR, hoverC;

// ===== Drag state =====
let dragIdx    = null;
let dragEl     = null;
let dragStartX = 0;
let dragStartY = 0;
let wasDragging = false;
let dragIsTouch = false;

// ===== DOM =====
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

function rnd(n) { return Math.floor(Math.random() * n); }
function randomPiece() { return { ...PIECE_DEFS[rnd(PIECE_DEFS.length)] }; }
function flatIdx(r, c) { return r * GRID + c; }

// ===== Grid geometry helpers =====
function getGridInfo() {
  const r0 = cellEls[0].getBoundingClientRect();
  const r1 = cellEls[1].getBoundingClientRect();
  const rG = cellEls[GRID].getBoundingClientRect();
  return {
    left:    r0.left,
    top:     r0.top,
    cellW:   r0.width,
    cellH:   r0.height,
    hStride: r1.left - r0.left,   // cell width + gap
    vStride: rG.top  - r0.top,    // cell height + gap
  };
}

function pieceSize(piece) {
  const maxR = Math.max(...piece.cells.map(([r]) => r));
  const maxC = Math.max(...piece.cells.map(([,c]) => c));
  return { rows: maxR + 1, cols: maxC + 1 };
}

// ===== Init / New Game =====
function init() {
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

  hiScore = parseInt(localStorage.getItem('bb-hi') || '0', 10);
  hiScoreEl.textContent = hiScore;

  initEvents();
  newGame();
}

function newGame() {
  grid = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  score = 0;
  gameOver = false;
  animating = false;
  selectedIdx = null;
  hoverR = hoverC = null;
  dragIdx = null;
  if (dragEl) { dragEl.remove(); dragEl = null; }
  currentPieces = [randomPiece(), randomPiece(), randomPiece()];

  comboEl.textContent = '';
  piecesRow.querySelectorAll('.bb-piece-slot').forEach(s => s.classList.remove('no-fit', 'shaking'));
  gridEl.classList.remove('dying');
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
  const si = dragEl ? dragIdx : selectedIdx;
  if (si === null || hoverR === null || hoverC === null) return;
  const piece = currentPieces[si];
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
    slot.classList.toggle('selected', idx === selectedIdx && !dragEl);
    slot.classList.toggle('used', !currentPieces[idx]);
    slot.setAttribute('aria-pressed', (idx === selectedIdx && !dragEl) ? 'true' : 'false');

    const piece = currentPieces[idx];
    if (!piece) return;

    const { rows, cols } = pieceSize(piece);
    const mini = document.createElement('div');
    mini.className = 'bb-mini-grid';
    mini.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    mini.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
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

// ===== Drag: build floating element =====
function buildDragEl(piece) {
  const { cellW, cellH, hStride, vStride } = getGridInfo();
  const { rows, cols } = pieceSize(piece);

  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed', 'pointer-events:none', 'z-index:9999',
    'display:grid',
    `grid-template-columns:repeat(${cols},${cellW}px)`,
    `grid-template-rows:repeat(${rows},${cellH}px)`,
    `gap:${hStride - cellW}px`,
    'opacity:0.88',
  ].join(';');

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      if (piece.cells.some(([pr, pc]) => pr === r && pc === c)) {
        cell.style.cssText = `background:${piece.color};border-radius:5px;`
          + 'box-shadow:inset 0 -3px 0 rgba(0,0,0,.35),inset 0 2px 0 rgba(255,255,255,.15);';
      }
      el.appendChild(cell);
    }
  }
  return el;
}

// ===== Drag: compute position from cursor =====
function computeDragLayout(clientX, clientY) {
  const { left, top, cellW, cellH, hStride, vStride } = getGridInfo();
  const piece = currentPieces[dragIdx];
  const { rows, cols } = pieceSize(piece);

  const pW = cols * cellW + (cols - 1) * (hStride - cellW);
  const pH = rows * cellH + (rows - 1) * (vStride - cellH);

  // Floating element position (smooth, follows cursor)
  const elLeft = clientX - pW / 2;
  const elTop  = dragIsTouch ? clientY - pH - 18 : clientY - pH / 2;

  // Snap to nearest grid cell (top-left of piece)
  const snapCol = Math.round((elLeft - left) / hStride);
  const snapRow = Math.round((elTop  - top)  / vStride);

  return { elLeft, elTop, snapRow, snapCol };
}

// ===== Drag: start =====
function onDragStart(idx, clientX, clientY, touch) {
  if (!currentPieces[idx] || gameOver || animating) return;
  dragIdx    = idx;
  dragIsTouch = touch;
  dragStartX = clientX;
  dragStartY = clientY;
  selectedIdx = idx;
  renderPieces();
}

// ===== Drag: move =====
function onDragMove(clientX, clientY) {
  if (dragIdx === null) return;
  const dx = clientX - dragStartX, dy = clientY - dragStartY;

  if (!dragEl && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
    dragEl = buildDragEl(currentPieces[dragIdx]);
    document.body.appendChild(dragEl);
    renderPieces(); // hide "selected" highlight while dragging
  }

  if (!dragEl) return;

  const { elLeft, elTop, snapRow, snapCol } = computeDragLayout(clientX, clientY);
  dragEl.style.left = elLeft + 'px';
  dragEl.style.top  = elTop  + 'px';

  if (snapRow !== hoverR || snapCol !== hoverC) {
    hoverR = snapRow;
    hoverC = snapCol;
    clearGhost();
    applyGhost();
  }
}

// ===== Drag: end =====
function onDragEnd(clientX, clientY) {
  if (dragIdx === null) return;

  if (dragEl) {
    wasDragging = true;
    dragEl.remove();
    dragEl = null;

    const piece = currentPieces[dragIdx];
    const canDrop = piece && hoverR !== null && canPlace(piece, hoverR, hoverC);

    if (canDrop) {
      tryPlace(hoverR, hoverC);
    } else {
      selectedIdx = null;
      hoverR = hoverC = null;
      clearGhost();
      renderPieces();
    }
  }

  dragIdx = null;
}

// ===== Events =====
function initEvents() {
  // --- Piece slot: start drag ---
  piecesRow.addEventListener('mousedown', e => {
    const slot = e.target.closest('.bb-piece-slot');
    if (slot) onDragStart(+slot.dataset.idx, e.clientX, e.clientY, false);
  });
  piecesRow.addEventListener('touchstart', e => {
    const slot = e.target.closest('.bb-piece-slot');
    if (slot) onDragStart(+slot.dataset.idx, e.touches[0].clientX, e.touches[0].clientY, true);
  }, { passive: true });

  // --- Piece slot: click to select (fallback for tap without drag) ---
  piecesRow.addEventListener('click', e => {
    if (wasDragging) { wasDragging = false; return; }
    const slot = e.target.closest('.bb-piece-slot');
    if (!slot || gameOver || animating || !currentPieces[+slot.dataset.idx]) return;
    const idx = +slot.dataset.idx;
    selectedIdx = selectedIdx === idx ? null : idx;
    hoverR = hoverC = null;
    clearGhost();
    renderPieces();
    applyGhost();
  });

  // --- Document: drag move ---
  document.addEventListener('mousemove', e => onDragMove(e.clientX, e.clientY));
  document.addEventListener('touchmove', e => {
    if (dragIdx === null) return;
    e.preventDefault();
    onDragMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  // --- Document: drag end ---
  document.addEventListener('mouseup',  e => onDragEnd(e.clientX, e.clientY));
  document.addEventListener('touchend', e => {
    onDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }, { passive: true });

  // --- Grid: hover ghost (click-to-place workflow) ---
  gridEl.addEventListener('mouseover', e => {
    if (dragEl || dragIdx !== null || gameOver || animating || selectedIdx === null) return;
    const cell = e.target.closest('.bb-cell');
    if (!cell) return;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    if (r === hoverR && c === hoverC) return;
    hoverR = r; hoverC = c;
    clearGhost(); applyGhost();
  });
  gridEl.addEventListener('mouseleave', () => {
    if (dragEl) return;
    hoverR = hoverC = null; clearGhost();
  });

  // --- Grid: click to place (click-to-place workflow) ---
  gridEl.addEventListener('click', e => {
    if (wasDragging) { wasDragging = false; return; }
    if (gameOver || animating || selectedIdx === null) return;
    const cell = e.target.closest('.bb-cell');
    if (!cell) return;
    tryPlace(+cell.dataset.r, +cell.dataset.c);
  });

  restartBtn.addEventListener('click', newGame);
}

// ===== Placement =====
function canPlace(piece, row, col) {
  return piece.cells.every(([dr, dc]) => {
    const r = row + dr, c = col + dc;
    return r >= 0 && r < GRID && c >= 0 && c < GRID && !grid[r][c];
  });
}

function tryPlace(row, col) {
  const piece = currentPieces[selectedIdx !== null ? selectedIdx : dragIdx];
  const si = selectedIdx !== null ? selectedIdx : dragIdx;
  if (!piece || !canPlace(piece, row, col)) return;

  animating = true;
  hoverR = hoverC = null;

  piece.cells.forEach(([dr, dc]) => {
    const r = row + dr, c = col + dc;
    grid[r][c] = piece.color;
    const el = cellEls[flatIdx(r, c)];
    el.style.background = piece.color;
    el.classList.add('filled');
    el.classList.remove('ghost', 'ghost-invalid');
  });

  score += piece.cells.length * 5;
  currentPieces[si] = null;
  selectedIdx = null;
  renderPieces();

  // Find full rows and cols
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

    const bonus = toClear.size * 20 + lineCount * lineCount * 30;
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

function pieceFits(piece) {
  if (!piece) return false;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (canPlace(piece, r, c)) return true;
    }
  }
  return false;
}

function afterPlace() {
  currentPieces = currentPieces.map(p => p === null ? randomPiece() : p);
  renderPieces();

  // Mark pieces that have no valid placement
  const slots = piecesRow.querySelectorAll('.bb-piece-slot');
  const fits = currentPieces.map(pieceFits);
  slots.forEach((slot, i) => {
    slot.classList.toggle('no-fit', currentPieces[i] !== null && !fits[i]);
  });

  animating = false;

  const anyFits = fits.some((f, i) => currentPieces[i] !== null && f);
  if (!anyFits) triggerGameOverSequence();
}

function triggerGameOverSequence() {
  gameOver = true;

  // Dim the grid
  gridEl.classList.add('dying');

  // Shake and redden all piece slots
  const slots = piecesRow.querySelectorAll('.bb-piece-slot');
  slots.forEach(slot => {
    slot.classList.add('no-fit', 'shaking');
    slot.addEventListener('animationend', () => slot.classList.remove('shaking'), { once: true });
  });

  // Show "SEM ESPAÇO..." warning overlay
  const warning = document.createElement('div');
  warning.className = 'bb-gameover-warning';
  warning.innerHTML = '<span class="bb-gameover-warning-text">SEM ESPAÇO... 😰</span>';
  document.body.appendChild(warning);

  setTimeout(() => {
    warning.remove();
    gridEl.classList.remove('dying');
    showGameOver();
  }, 1600);
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
  finalScEl.textContent = `Pontuação: ${score}`;
  finalHiEl.textContent = score >= hiScore ? '🏆 Novo recorde!' : `Recorde: ${hiScore}`;
  screenPlay.classList.remove('active');
  screenOver.classList.add('active');
}

init();
