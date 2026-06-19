'use strict';

const W = 500, H = 400;
let currentDrawing = 0;
let selectedColorIdx = 0;
let filling = false;

const canvas  = document.getElementById('pintar-canvas');
const ctx     = canvas.getContext('2d', { willReadFrequently: true });
const selEl   = document.getElementById('pintar-selector');
const palEl   = document.getElementById('pintar-palette');

canvas.width = W; canvas.height = H;

// ── Paleta ────────────────────────────────────────────────────────────────────
const COLORS = [
  [255, 40,  40 ], [255, 140, 0  ], [255, 210, 0  ], [60,  200, 60 ],
  [0,   110, 220], [150, 0,   230], [255, 90,  180], [160, 95,  45 ],
  [0,   210, 215], [200, 240, 60 ], [255, 155, 100], [30,  175, 115],
  [100, 180, 255], [230, 50,  130], [255, 255, 255], [40,  40,  40 ],
];

// ── Figuras (stroke-only — NÃO chamam fill, só stroke) ───────────────────────
const DRAWINGS = [
  { emoji: '☀️', label: 'Sol',        draw: drawSol       },
  { emoji: '🏠', label: 'Casa',       draw: drawCasa      },
  { emoji: '🦋', label: 'Borboleta',  draw: drawBorboleta },
  { emoji: '🐟', label: 'Peixe',      draw: drawPeixe     },
  { emoji: '🌸', label: 'Flor',       draw: drawFlor      },
  { emoji: '⭐', label: 'Estrela',    draw: drawEstrela   },
  { emoji: '❤️', label: 'Coração',   draw: drawCoracao   },
  { emoji: '🌈', label: 'Arco-íris', draw: drawArcoiris  },
];

function pen(c, lw) {
  c.strokeStyle = '#111111';
  c.lineWidth   = lw || 5;
  c.lineCap     = 'round';
  c.lineJoin    = 'round';
}

function drawSol(c) {
  pen(c, 5);
  const cx = 250, cy = 195, r = 82;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const sp = Math.PI / 10 * 0.65;
    c.beginPath();
    c.moveTo(cx + Math.cos(a - sp) * (r + 10), cy + Math.sin(a - sp) * (r + 10));
    c.lineTo(cx + Math.cos(a)       * (r + 58), cy + Math.sin(a)       * (r + 58));
    c.lineTo(cx + Math.cos(a + sp) * (r + 10), cy + Math.sin(a + sp) * (r + 10));
    c.closePath(); c.stroke();
  }
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
  [cx - 25, cx + 25].forEach(ex => {
    c.beginPath(); c.arc(ex, cy - 18, 10, 0, Math.PI * 2); c.stroke();
  });
  c.beginPath(); c.arc(cx, cy + 12, 30, 0.25, Math.PI - 0.25); c.stroke();
}

function drawCasa(c) {
  pen(c, 5);
  c.beginPath(); c.rect(115, 198, 270, 172); c.stroke();
  c.beginPath(); c.moveTo(95, 202); c.lineTo(250, 88); c.lineTo(405, 202); c.closePath(); c.stroke();
  c.beginPath(); c.rect(308, 100, 42, 78); c.stroke();
  c.beginPath(); c.rect(198, 278, 104, 92); c.stroke();
  c.beginPath(); c.arc(285, 328, 6, 0, Math.PI * 2); c.stroke();
  [[138, 226], [290, 226]].forEach(([x, y]) => {
    c.beginPath(); c.rect(x, y, 72, 65); c.stroke();
    c.beginPath();
    c.moveTo(x + 36, y); c.lineTo(x + 36, y + 65);
    c.moveTo(x, y + 32); c.lineTo(x + 72, y + 32);
    c.stroke();
  });
}

function drawBorboleta(c) {
  pen(c, 4);
  const cx = 250, cy = 205;
  const wings = [
    [cx-5,cy-20, cx-35,cy-85, cx-140,cy-115, cx-155,cy-52, cx-162,cy+2, cx-88,cy+22, cx-5,cy-20],
    [cx+5,cy-20, cx+35,cy-85, cx+140,cy-115, cx+155,cy-52, cx+162,cy+2, cx+88,cy+22, cx+5,cy-20],
    [cx-5,cy+20, cx-22,cy+55, cx-108,cy+95,  cx-118,cy+68, cx-132,cy+38, cx-78,cy+4, cx-5,cy+20],
    [cx+5,cy+20, cx+22,cy+55, cx+108,cy+95,  cx+118,cy+68, cx+132,cy+38, cx+78,cy+4, cx+5,cy+20],
  ];
  wings.forEach(([x0,y0, c1x,c1y, c2x,c2y, ex,ey, d1x,d1y, d2x,d2y, fx,fy]) => {
    c.beginPath();
    c.moveTo(x0, y0);
    c.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
    c.bezierCurveTo(d1x, d1y, d2x, d2y, fx, fy);
    c.closePath(); c.stroke();
  });
  c.beginPath(); c.ellipse(cx, cy, 11, 42, 0, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(cx, cy - 58, 14, 0, Math.PI * 2); c.stroke();
  pen(c, 2.5);
  [[-5,-1],[5,1]].forEach(([dx, d]) => {
    c.beginPath();
    c.moveTo(cx+dx, cy-70);
    c.quadraticCurveTo(cx+d*28, cy-106, cx+d*24, cy-118);
    c.stroke();
    c.beginPath(); c.arc(cx+d*24, cy-118, 5, 0, Math.PI*2); c.stroke();
  });
}

function drawPeixe(c) {
  pen(c, 5);
  const cx = 230, cy = 200;
  c.beginPath(); c.ellipse(cx, cy, 130, 72, 0, 0, Math.PI * 2); c.stroke();
  c.beginPath();
  c.moveTo(cx+130, cy); c.lineTo(cx+198, cy-62); c.lineTo(cx+198, cy+62);
  c.closePath(); c.stroke();
  c.beginPath();
  c.moveTo(cx-20, cy-72); c.quadraticCurveTo(cx+10, cy-128, cx+55, cy-72); c.stroke();
  c.beginPath();
  c.moveTo(cx+10, cy+72); c.quadraticCurveTo(cx+35, cy+118, cx+65, cy+72); c.stroke();
  c.beginPath(); c.arc(cx-72, cy-18, 22, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(cx-72, cy-18,  9, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(cx-135, cy+14, 22, -0.4, 0.4); c.stroke();
  pen(c, 3);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      c.beginPath();
      c.arc(cx - 40 + col * 38, cy - 22 + row * 30, 20, Math.PI, 0);
      c.stroke();
    }
  }
}

function drawFlor(c) {
  pen(c, 5);
  const cx = 250, cy = 175;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.beginPath();
    c.ellipse(cx + Math.cos(a) * 72, cy + Math.sin(a) * 72, 38, 22, a, 0, Math.PI * 2);
    c.stroke();
  }
  c.beginPath(); c.arc(cx, cy, 42, 0, Math.PI * 2); c.stroke();
  pen(c, 7);
  c.beginPath();
  c.moveTo(cx, cy + 42); c.quadraticCurveTo(cx - 25, cy + 155, cx - 12, cy + 225);
  c.stroke();
  pen(c, 5);
  c.beginPath();
  c.moveTo(cx-12, cy+148); c.bezierCurveTo(cx-68, cy+112, cx-88, cy+162, cx-24, cy+168);
  c.closePath(); c.stroke();
  c.beginPath();
  c.moveTo(cx-16, cy+185); c.bezierCurveTo(cx+42, cy+148, cx+68, cy+198, cx+8, cy+208);
  c.closePath(); c.stroke();
  pen(c, 6);
  c.beginPath(); c.moveTo(50, 358); c.lineTo(450, 358); c.stroke();
}

function drawEstrela(c) {
  pen(c, 5);
  const cx = 250, cy = 200, outerR = 148, innerR = 60;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    i === 0 ? c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
            : c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  c.closePath(); c.stroke();
  [cx - 22, cx + 22].forEach(ex => {
    c.beginPath(); c.arc(ex, cy - 12, 9, 0, Math.PI * 2); c.stroke();
  });
  c.beginPath(); c.arc(cx, cy + 16, 24, 0.2, Math.PI - 0.2); c.stroke();
}

function drawCoracao(c) {
  pen(c, 5);
  const cx = 250, cy = 218, s = 148;
  c.beginPath();
  c.moveTo(cx, cy + s * 0.65);
  c.bezierCurveTo(cx - s * 1.02, cy + s * 0.22, cx - s * 1.12, cy - s * 0.48, cx, cy - s * 0.22);
  c.bezierCurveTo(cx + s * 1.12, cy - s * 0.48, cx + s * 1.02, cy + s * 0.22, cx, cy + s * 0.65);
  c.closePath(); c.stroke();
  const s2 = 55, cy2 = cy + 18;
  c.beginPath();
  c.moveTo(cx, cy2 + s2 * 0.65);
  c.bezierCurveTo(cx - s2*1.02, cy2+s2*0.22, cx - s2*1.12, cy2-s2*0.48, cx, cy2-s2*0.22);
  c.bezierCurveTo(cx + s2*1.12, cy2-s2*0.48, cx + s2*1.02, cy2+s2*0.22, cx, cy2+s2*0.65);
  c.closePath(); c.stroke();
}

function drawArcoiris(c) {
  pen(c, 5);
  const cx = 250, cy = 340;
  const bands = [170, 140, 110, 80], bw = 28;
  bands.forEach(r => {
    c.beginPath(); c.arc(cx, cy, r,      Math.PI, 0); c.stroke();
    c.beginPath(); c.arc(cx, cy, r - bw, Math.PI, 0); c.stroke();
    c.beginPath(); c.moveTo(cx - r, cy); c.lineTo(cx - (r-bw), cy); c.stroke();
    c.beginPath(); c.moveTo(cx + r, cy); c.lineTo(cx + (r-bw), cy); c.stroke();
  });
  c.beginPath(); c.moveTo(cx - (bands[3]-bw), cy); c.lineTo(cx + (bands[3]-bw), cy); c.stroke();
  function cloud(ox, oy) {
    [[0,0,26],[28,-12,32],[56,-8,24],[80,4,20]].forEach(([dx,dy,r]) => {
      c.beginPath(); c.arc(ox+dx, oy+dy, r, 0, Math.PI*2); c.stroke();
    });
  }
  cloud(35, 292); cloud(332, 285);
  pen(c, 6);
  c.beginPath(); c.moveTo(20, 358); c.lineTo(480, 358); c.stroke();
}

// ── Flood fill ────────────────────────────────────────────────────────────────
function floodFill(sx, sy) {
  if (filling) return;
  filling = true;
  const [fillR, fillG, fillB] = COLORS[selectedColorIdx];
  const imgd = ctx.getImageData(0, 0, W, H);
  const data = imgd.data;
  const si   = (sy * W + sx) * 4;
  const tR = data[si], tG = data[si+1], tB = data[si+2];

  if (tR < 90 && tG < 90 && tB < 90) { filling = false; return; }
  if (Math.abs(tR-fillR)<10 && Math.abs(tG-fillG)<10 && Math.abs(tB-fillB)<10) { filling = false; return; }

  const TOL = 28;
  const visited = new Uint8Array(W * H);
  const stack   = [sy * W + sx];

  while (stack.length) {
    const pos = stack.pop();
    if (visited[pos]) continue;
    visited[pos] = 1;
    const i = pos * 4;
    const r = data[i], g = data[i+1], b = data[i+2];
    if (r < 90 && g < 90 && b < 90) continue;
    if (Math.abs(r-tR) > TOL || Math.abs(g-tG) > TOL || Math.abs(b-tB) > TOL) continue;
    data[i] = fillR; data[i+1] = fillG; data[i+2] = fillB; data[i+3] = 255;
    const x = pos % W, y = (pos / W) | 0;
    if (x > 0)   stack.push(pos - 1);
    if (x < W-1) stack.push(pos + 1);
    if (y > 0)   stack.push(pos - W);
    if (y < H-1) stack.push(pos + W);
  }

  ctx.putImageData(imgd, 0, 0);
  DRAWINGS[currentDrawing].draw(ctx); // reforça contornos
  filling = false;
}

// ── Carregar figura ───────────────────────────────────────────────────────────
function load(idx) {
  currentDrawing = idx;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  DRAWINGS[idx].draw(ctx);
  document.querySelectorAll('.pintar-thumb').forEach((el, i) => el.classList.toggle('active', i === idx));
}

// ── Coordenadas do canvas ─────────────────────────────────────────────────────
function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const cl = e.touches ? e.touches[0].clientX : e.clientX;
  const ct = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: Math.max(0, Math.min(W-1, Math.round((cl - rect.left)  * W / rect.width))),
    y: Math.max(0, Math.min(H-1, Math.round((ct - rect.top)   * H / rect.height))),
  };
}

// ── Build UI ──────────────────────────────────────────────────────────────────
function buildSelector() {
  DRAWINGS.forEach((d, i) => {
    const btn  = document.createElement('button');
    btn.className = 'pintar-thumb' + (i === 0 ? ' active' : '');
    btn.title = d.label;

    // Mini preview em canvas 200×160
    const mc  = document.createElement('canvas');
    mc.width  = 200; mc.height = 160;
    const mx  = mc.getContext('2d');
    mx.fillStyle = '#fff'; mx.fillRect(0, 0, 200, 160);
    mx.save(); mx.scale(200/W, 160/H); d.draw(mx); mx.restore();
    btn.appendChild(mc);

    const sp = document.createElement('span');
    sp.textContent = d.emoji + ' ' + d.label;
    btn.appendChild(sp);
    btn.addEventListener('click', () => load(i));
    selEl.appendChild(btn);
  });
}

function buildPalette() {
  COLORS.forEach(([r, g, b], i) => {
    const btn = document.createElement('button');
    btn.className = 'pintar-color' + (i === 0 ? ' selected' : '');
    btn.style.background = `rgb(${r},${g},${b})`;
    btn.setAttribute('aria-label', i === 14 ? 'Borracha branca' : `Cor ${i+1}`);
    if (i === 15) btn.style.border = '3px solid rgba(255,255,255,0.3)';
    btn.addEventListener('click', () => {
      selectedColorIdx = i;
      document.querySelectorAll('.pintar-color').forEach((el, j) => el.classList.toggle('selected', j === i));
    });
    palEl.appendChild(btn);
  });
}

// ── Eventos ───────────────────────────────────────────────────────────────────
canvas.addEventListener('click', e => {
  const { x, y } = canvasPos(e);
  floodFill(x, y);
});
canvas.addEventListener('touchend', e => {
  e.preventDefault();
  const { x, y } = canvasPos(e);
  floodFill(x, y);
}, { passive: false });

document.getElementById('pintar-clear').addEventListener('click', () => load(currentDrawing));
document.getElementById('pintar-save').addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = `pintura-${DRAWINGS[currentDrawing].label.toLowerCase()}.png`;
  a.href = canvas.toDataURL();
  a.click();
});

// ── Boot ──────────────────────────────────────────────────────────────────────
buildSelector();
buildPalette();
load(0);
