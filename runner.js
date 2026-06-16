'use strict';
// ── Corrida do Aloncinho ─────────────────────────────────────────────────────

const canvas   = document.getElementById('runner-canvas');
const scoreEl  = document.getElementById('runner-score');
const bestEl   = document.getElementById('runner-best');
const speedEl  = document.getElementById('runner-speed');
const powersEl = document.getElementById('runner-powers');
if (!canvas) throw new Error('runner canvas not found');

const ctx = canvas.getContext('2d');
const W = 360, H = 600;
const LANES = [72, 180, 288];

// Card definitions
const CARD_DEF = {
  red:    { bg: '#ef4444', text: '#fff',    key: 'R', name: 'Fogo',   dur: 360 },
  blue:   { bg: '#3b82f6', text: '#fff',    key: 'B', name: 'Escudo', dur: 480 },
  yellow: { bg: '#facc15', text: '#1a1a1a', key: 'A', name: 'Ímã',    dur: 480 },
  green:  { bg: '#22c55e', text: '#fff',    key: 'V', name: 'Turbo',  dur: 300 },
  wild:   { bg: '#a855f7', text: '#fff',    key: '★', name: 'Super!', dur: 240 },
};
const CARD_KEYS = Object.keys(CARD_DEF);

// Obstacle types
const OBJ_TYPES = [
  { kind: 'box',     w: 58, h: 46 },
  { kind: 'cone',    w: 42, h: 54 },
  { kind: 'barrier', w: 100, h: 28 },
  { kind: 'hole',    w: 68, h: 50, lethal: true },
];

// ── State ─────────────────────────────────────────────────────────────────────
let state     = 'start';
let frame     = 0;
let score     = 0;
let baseSpeed = 3.2;
let best      = parseInt(localStorage.getItem('runner-best') || '0');

const P = {
  lane: 1, x: LANES[1], y: H - 110, w: 38, h: 56,
  targetX: LANES[1],
  shield: 0, magnet: 0, turbo: 0, fire: 0,
};

let obstacles = [], cards = [], parts = [];

// ── Input ─────────────────────────────────────────────────────────────────────
const held = {};

document.addEventListener('keydown', e => {
  if (held[e.key]) return;
  held[e.key] = true;
  onKey(e.key);
  if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key))
    e.preventDefault();
});
document.addEventListener('keyup', e => { delete held[e.key]; });

function onKey(k) {
  if (state !== 'play') { begin(); return; }
  if (k === 'ArrowLeft'  || k === 'a' || k === 'A') shiftLane(-1);
  if (k === 'ArrowRight' || k === 'd' || k === 'D') shiftLane(+1);
}

document.getElementById('runner-left')?.addEventListener('click', () => {
  if (state !== 'play') { begin(); return; }
  shiftLane(-1);
});
document.getElementById('runner-right')?.addEventListener('click', () => {
  if (state !== 'play') { begin(); return; }
  shiftLane(+1);
});
document.getElementById('runner-tap')?.addEventListener('click', () => {
  if (state !== 'play') begin();
});
canvas.addEventListener('click', () => {
  if (state !== 'play') begin();
});

// Touch swipe
let tsX = 0;
canvas.addEventListener('touchstart', e => {
  tsX = e.touches[0].clientX;
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - tsX;
  if (state !== 'play') { begin(); return; }
  if (Math.abs(dx) > 24) shiftLane(dx < 0 ? -1 : 1);
  e.preventDefault();
}, { passive: false });

function shiftLane(d) {
  const n = Math.max(0, Math.min(2, P.lane + d));
  if (n === P.lane) return;
  P.lane = n;
  P.targetX = LANES[n];
}

// ── Game control ──────────────────────────────────────────────────────────────
function begin() {
  score = 0; baseSpeed = 3.2; frame = 0;
  obstacles = []; cards = []; parts = [];
  P.lane = 1; P.x = LANES[1]; P.targetX = LANES[1];
  P.shield = P.magnet = P.turbo = P.fire = 0;
  state = 'play';
}

// ── Spawning ──────────────────────────────────────────────────────────────────
function spawnObstacle() {
  const def = OBJ_TYPES[Math.floor(Math.random() * OBJ_TYPES.length)];
  const lane = Math.floor(Math.random() * 3);
  obstacles.push({ ...def, lane, x: LANES[lane], y: -def.h - 10 });
}

function spawnCard() {
  const ck   = CARD_KEYS[Math.floor(Math.random() * CARD_KEYS.length)];
  const lane = Math.floor(Math.random() * 3);
  cards.push({ ck, x: LANES[lane], y: -28, w: 28, h: 42 });
}

// ── Collision ─────────────────────────────────────────────────────────────────
function hits(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) < (aw + bw) * 0.5
      && Math.abs(ay - by) < (ah + bh) * 0.5;
}

// ── Card effects ──────────────────────────────────────────────────────────────
function applyCard(ck) {
  const def = CARD_DEF[ck];
  if (ck === 'red')    P.fire   = def.dur;
  if (ck === 'blue')   P.shield = def.dur;
  if (ck === 'yellow') P.magnet = def.dur;
  if (ck === 'green')  P.turbo  = def.dur;
  if (ck === 'wild')   { P.shield = 300; P.magnet = 300; P.turbo = 200; P.fire = 300; }
  burst(P.x, P.y, def.bg, 14);
}

function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    parts.push({
      x, y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7 - 1.5,
      r: 3 + Math.random() * 4,
      color, life: 1,
      decay: 0.032 + Math.random() * 0.028,
    });
  }
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r ?? 6);
}

function drawRoad() {
  ctx.fillStyle = '#181f2e';
  ctx.fillRect(0, 0, W, H);
  // Sidewalks
  ctx.fillStyle = '#2d3a4a';
  ctx.fillRect(0, 0, 20, H);
  ctx.fillRect(W - 20, 0, 20, H);
  // Road
  ctx.fillStyle = '#0f141f';
  ctx.fillRect(20, 0, W - 40, H);
  // Road edges
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(20, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - 20, 0); ctx.lineTo(W - 20, H); ctx.stroke();
  // Lane dashes
  const spd = baseSpeed + (P.turbo > 0 ? 2.2 : 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.setLineDash([26, 18]);
  ctx.lineDashOffset = -(frame * spd * 0.65 % 44);
  for (const lx of [126, 234]) {
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, H); ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawObstacle(o) {
  const { kind, x, y, w, h } = o;
  ctx.save();
  if (kind === 'hole') {
    const g = ctx.createRadialGradient(x, y, 2, x, y, w * 0.5);
    g.addColorStop(0, '#000');
    g.addColorStop(0.65, '#0a1020');
    g.addColorStop(1, '#1e293b');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.5, h * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1.5; ctx.stroke();
  } else if (kind === 'barrier') {
    ctx.fillStyle = '#dc2626';
    rr(x - w / 2, y - h / 2, w, h, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - w / 2 + i * 26, y - h / 2, 13, h);
    ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 1.5;
    rr(x - w / 2, y - h / 2, w, h, 4); ctx.stroke();
    // Poles
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x - w / 2 - 3, y - h / 2 - 8, 7, h + 16);
    ctx.fillRect(x + w / 2 - 4, y - h / 2 - 8, 7, h + 16);
  } else if (kind === 'cone') {
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(x, y - h / 2);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.lineTo(x - w / 2, y + h / 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.3, y + h * 0.1);
    ctx.lineTo(x + w * 0.3, y + h * 0.1);
    ctx.stroke();
    ctx.fillStyle = '#78350f';
    rr(x - w / 2, y + h * 0.44, w, h * 0.1, 2); ctx.fill();
  } else {
    // Box / crate
    ctx.fillStyle = '#8b7355';
    rr(x - w / 2, y - h / 2, w, h, 5); ctx.fill();
    ctx.fillStyle = '#a0856b';
    rr(x - w / 2 + 3, y - h / 2, w - 6, h * 0.28, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.26)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 2, y); ctx.lineTo(x + w / 2 - 2, y);
    ctx.moveTo(x, y - h / 2 + 2); ctx.lineTo(x, y + h / 2 - 2);
    ctx.stroke();
    ctx.strokeStyle = '#5a4a36'; ctx.lineWidth = 1.5;
    rr(x - w / 2, y - h / 2, w, h, 5); ctx.stroke();
  }
  ctx.restore();
}

function drawCard(c) {
  const d = CARD_DEF[c.ck];
  const { x, y, w, h } = c;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(x - w / 2 + 2, y - h / 2 + 2, w, h, 4); ctx.fill();
  ctx.fillStyle = d.bg;
  rr(x - w / 2, y - h / 2, w, h, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.3, h * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = d.text;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(d.key, x, y);
  ctx.restore();
}

function drawPlayer() {
  const { x, y, w, h } = P;
  const bounce   = Math.sin(frame * 0.28) * 2.5;
  const legSwing = Math.sin(frame * 0.38);

  // Magnet pulse
  if (P.magnet > 0 && frame % 24 < 12) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, 90 + (frame % 24) * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Turbo trail
  if (P.turbo > 0) {
    for (let i = 1; i <= 4; i++) {
      ctx.save();
      ctx.globalAlpha = 0.09 * (5 - i);
      ctx.fillStyle = '#4ade80';
      rr(x - w / 2, y - h / 2 + i * 13, w, h - i * 11, 4); ctx.fill();
      ctx.restore();
    }
  }

  // Shield bubble
  if (P.shield > 0) {
    ctx.save();
    ctx.globalAlpha = 0.28 + 0.07 * Math.sin(frame * 0.14);
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, w * 0.68, h * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x, y + bounce);

  // Legs
  const legColor = P.fire > 0 ? '#b45309' : '#1d4ed8';
  ctx.fillStyle = legColor;
  ctx.save(); ctx.translate(-w * 0.16, h * 0.16); ctx.rotate(legSwing * 0.36);
  ctx.fillRect(-7, 0, 14, h * 0.37); ctx.restore();
  ctx.save(); ctx.translate(w * 0.16, h * 0.16); ctx.rotate(-legSwing * 0.36);
  ctx.fillRect(-7, 0, 14, h * 0.37); ctx.restore();

  // Shoes
  ctx.fillStyle = '#1e293b';
  ctx.save(); ctx.translate(-w * 0.16 + legSwing * 4, h * 0.52);
  ctx.fillRect(-8, -5, 18, 8); ctx.restore();
  ctx.save(); ctx.translate(w * 0.16 - legSwing * 4, h * 0.52);
  ctx.fillRect(-10, -5, 18, 8); ctx.restore();

  // Body
  const bodyColor = P.fire > 0 ? '#dc2626'
    : P.turbo > 0 ? '#16a34a'
    : P.shield > 0 ? '#2563eb'
    : '#3b82f6';
  ctx.fillStyle = bodyColor;
  rr(-w / 2, -h * 0.28, w, h * 0.44, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  rr(-w / 2 + 4, -h * 0.28 + 3, w - 8, 7, 3); ctx.fill();

  // Arms
  const armSwing = -legSwing * 0.3;
  ctx.fillStyle = '#fbbf24';
  ctx.save(); ctx.translate(-w / 2 - 4, -h * 0.07); ctx.rotate(armSwing);
  ctx.fillRect(-6, 0, 10, h * 0.23); ctx.restore();
  ctx.save(); ctx.translate(w / 2 + 4, -h * 0.07); ctx.rotate(-armSwing);
  ctx.fillRect(-4, 0, 10, h * 0.23); ctx.restore();

  // Head
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.arc(0, -h * 0.37, w * 0.27, 0, Math.PI * 2); ctx.fill();
  // Hair
  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath(); ctx.arc(0, -h * 0.37 - 2, w * 0.27, Math.PI, 0); ctx.fill();
  // Eyes
  ctx.fillStyle = '#1c1c1c';
  ctx.beginPath();
  ctx.arc(-5, -h * 0.38, 2.5, 0, Math.PI * 2);
  ctx.arc(5, -h * 0.38, 2.5, 0, Math.PI * 2); ctx.fill();
  // Smile
  ctx.strokeStyle = '#1c1c1c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, -h * 0.32, 5, 0.2, Math.PI - 0.2); ctx.stroke();

  ctx.restore();

  // Fire aura
  if (P.fire > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.15 * Math.sin(frame * 0.25);
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.62, h * 0.52, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawParticle(p) {
  ctx.save();
  ctx.globalAlpha = p.life;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * Math.max(0.2, p.life), 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawStartScreen() {
  drawRoad();
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,20,0.8)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 25px sans-serif';
  ctx.fillText('Corrida do Aloncinho', W / 2, 118);

  ctx.fillStyle = '#94a3b8'; ctx.font = '13px sans-serif';
  ctx.fillText('Desvie de obstáculos, colete cartas', W / 2, 150);
  ctx.fillText('e ganhe poderes especiais!', W / 2, 170);

  // Card samples
  const sample = ['red', 'blue', 'yellow', 'green', 'wild'];
  sample.forEach((ck, i) => {
    const d  = CARD_DEF[ck];
    const cx = W / 2 - (sample.length - 1) * 26 + i * 52;
    const cy = 248;
    ctx.fillStyle = d.bg;
    rr(cx - 18, cy - 26, 36, 52, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = d.text; ctx.font = 'bold 13px sans-serif';
    ctx.fillText(d.key, cx, cy);
    ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '10px sans-serif';
    ctx.fillText(d.name, cx, cy + 31);
  });

  // Controls legend
  const ctrls = [
    { icon: '🟥 R', label: 'Destrói obstáculo' },
    { icon: '🟦 B', label: 'Escudo protetor' },
    { icon: '🟨 A', label: 'Ímã de cartas' },
    { icon: '🟩 V', label: 'Turbo de velocidade' },
    { icon: '★',   label: 'Super — tudo junto!' },
  ];
  ctrls.forEach((c, i) => {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    rr(W / 2 - 140, 322 + i * 26, 280, 22, 4); ctx.fill();
    ctx.fillStyle = '#e2e8f0'; ctx.font = '11px sans-serif';
    ctx.textAlign = 'left'; ctx.fillText(c.icon, W / 2 - 132, 333 + i * 26);
    ctx.fillStyle = '#64748b'; ctx.fillText(c.label, W / 2 - 72, 333 + i * 26);
    ctx.textAlign = 'center';
  });

  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif';
  ctx.fillText('← → para trocar de faixa', W / 2, 472);

  if (best > 0) {
    ctx.fillStyle = '#64748b'; ctx.font = '13px sans-serif';
    ctx.fillText(`Recorde: ${best}`, W / 2, 496);
  }

  ctx.fillStyle = '#22d3ee'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Toque ou qualquer tecla para começar', W / 2, 540);
  ctx.restore();
}

function drawDeadOverlay() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fb7185'; ctx.font = 'bold 32px sans-serif';
  ctx.fillText('Fim de Jogo!', W / 2, H / 2 - 54);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`Pontos: ${Math.floor(score)}`, W / 2, H / 2 - 6);
  ctx.fillStyle = '#facc15'; ctx.font = '16px sans-serif';
  ctx.fillText(`Recorde: ${best}`, W / 2, H / 2 + 28);
  ctx.fillStyle = '#94a3b8'; ctx.font = '14px sans-serif';
  ctx.fillText('Toque ou qualquer tecla para recomeçar', W / 2, H / 2 + 70);
  ctx.restore();
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function updateHUD() {
  if (scoreEl) scoreEl.textContent = Math.floor(score);
  if (bestEl)  bestEl.textContent  = best;
  const lvl = Math.ceil((baseSpeed - 3.2) / 0.4) + 1;
  if (speedEl) speedEl.textContent = `${Math.min(lvl, 9)}×`;
}

function updatePowers() {
  if (!powersEl) return;
  const chips = [];
  if (P.shield > 0) chips.push({ label: 'Escudo', color: '#3b82f6', pct: P.shield / 480 });
  if (P.magnet > 0) chips.push({ label: 'Ímã',    color: '#facc15', pct: P.magnet / 480 });
  if (P.turbo  > 0) chips.push({ label: 'Turbo',  color: '#22c55e', pct: P.turbo  / 300 });
  if (P.fire   > 0) chips.push({ label: 'Fogo',   color: '#ef4444', pct: P.fire   / 360 });
  powersEl.innerHTML = chips.map(c => `
    <div class="runner-power-chip">
      <span>${c.label}</span>
      <div class="runner-chip-bar-bg">
        <div class="runner-chip-bar" style="width:${Math.min(100, Math.round(c.pct * 100))}%;background:${c.color}"></div>
      </div>
    </div>`).join('');
}

// ── Main loop ─────────────────────────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);
  ctx.clearRect(0, 0, W, H);

  if (state === 'start') { drawStartScreen(); return; }

  drawRoad();

  if (state === 'dead') {
    obstacles.forEach(drawObstacle);
    cards.forEach(drawCard);
    parts.forEach(drawParticle);
    drawPlayer();
    drawDeadOverlay();
    return;
  }

  // ── Update ──
  frame++;
  const spd = baseSpeed + (P.turbo > 0 ? 2.2 : 0);

  if (frame % (60 * 12) === 0) baseSpeed = Math.min(baseSpeed + 0.4, 8.8);

  score += spd * 0.048;
  if (Math.floor(score) > best) {
    best = Math.floor(score);
    localStorage.setItem('runner-best', best);
  }

  const oRate = Math.max(50, 112 - Math.floor(baseSpeed * 7));
  if (frame % oRate === 0) spawnObstacle();
  const cRate = Math.max(30, 76 - Math.floor(baseSpeed * 5));
  if (frame % cRate === 0) spawnCard();

  P.x += (P.targetX - P.x) * 0.2;
  if (P.shield > 0) P.shield--;
  if (P.magnet > 0) P.magnet--;
  if (P.turbo  > 0) P.turbo--;
  if (P.fire   > 0) P.fire--;

  let died = false;

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.y += spd;
    if (o.y > H + 80) { obstacles.splice(i, 1); continue; }
    if (hits(P.x, P.y, P.w * 0.62, P.h * 0.6, o.x, o.y, o.w * 0.82, o.h * 0.82)) {
      if (o.kind === 'hole') { died = true; break; }
      if (P.fire > 0) {
        burst(o.x, o.y, '#f97316', 10);
        obstacles.splice(i, 1); P.fire = 0; continue;
      }
      if (P.shield > 0) {
        burst(o.x, o.y, '#60a5fa', 10);
        obstacles.splice(i, 1); P.shield = 0; continue;
      }
      died = true; break;
    }
  }

  for (let i = cards.length - 1; i >= 0; i--) {
    const c = cards[i];
    c.y += spd;
    if (P.magnet > 0) {
      const dx = P.x - c.x, dy = P.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 145 && dist > 1) { c.x += dx / dist * 4; c.y += dy / dist * 4; }
    }
    if (c.y > H + 50) { cards.splice(i, 1); continue; }
    if (hits(P.x, P.y, P.w, P.h * 0.9, c.x, c.y, c.w, c.h)) {
      applyCard(c.ck); cards.splice(i, 1); continue;
    }
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.18;
    p.life -= p.decay;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
  }

  // ── Draw ──
  obstacles.forEach(drawObstacle);
  cards.forEach(drawCard);
  parts.forEach(drawParticle);
  drawPlayer();

  if (died) state = 'dead';
  if (frame % 4 === 0) { updateHUD(); updatePowers(); }
}

// Init
bestEl && (bestEl.textContent = best);
loop();
