'use strict';
// ── Corrida do Aloncinho v2 ──────────────────────────────────────────────────

const canvas   = document.getElementById('runner-canvas');
const scoreEl  = document.getElementById('runner-score');
const bestEl   = document.getElementById('runner-best');
const speedEl  = document.getElementById('runner-speed');
const powersEl = document.getElementById('runner-powers');
if (!canvas) throw new Error('runner canvas not found');

const ctx = canvas.getContext('2d');
const W = 360, H = 600;

const LANES   = [90, 180, 270];     // x centres of the 3 lanes
const BASE_Y  = H - 130;            // player ground y
const HORIZON_Y = 132;
const VANISH_X = W / 2;
const GRAV    = 0.62;               // gravity per frame
const JUMP_V  = 13.4;               // initial upward velocity
const JMP_CLR = 32;                 // min jumpH to clear a ground obstacle

// ── Card catalogue ────────────────────────────────────────────────────────────
const CARD_DEF = {
  red:    { bg:'#ef4444', fg:'#fff',    glyph:'R', name:'Fogo',   bonus:50  },
  blue:   { bg:'#3b82f6', fg:'#fff',    glyph:'B', name:'Escudo', bonus:30  },
  yellow: { bg:'#facc15', fg:'#1a1a1a', glyph:'A', name:'Ímã',    bonus:20  },
  green:  { bg:'#22c55e', fg:'#fff',    glyph:'V', name:'Turbo',  bonus:40  },
  wild:   { bg:'#a855f7', fg:'#fff',    glyph:'★', name:'Super!', bonus:100 },
};
const CARD_KEYS = Object.keys(CARD_DEF);

// ── Obstacle catalogue ────────────────────────────────────────────────────────
// layer  : 'ground' → jump over  |  'air' → crouch under
// span   : 1=one lane  2=two adjacent lanes  3=all lanes
const OBJ_POOL = [
  { kind:'train',   w:78,  h:104, layer:'ground', span:1 },
  { kind:'cone',    w:40,  h:48,  layer:'ground', span:1 },
  { kind:'barrier', w:96,  h:34,  layer:'ground', span:2 },   // 2 lanes → switch or jump
  { kind:'sign',    w:90,  h:32,  layer:'air',    span:1 },   // hanging → crouch under
  { kind:'lowbar',  w:300, h:22,  layer:'ground', span:3 },   // all lanes → must jump
  { kind:'highbar', w:300, h:20,  layer:'air',    span:3 },   // all lanes → must crouch
];

// ── Game state ────────────────────────────────────────────────────────────────
let state = 'start';
let frame = 0, score = 0, baseSpeed = 3.0;
let best  = parseInt(localStorage.getItem('runner-best') || '0');

const P = {
  lane:1, x:LANES[1], y:BASE_Y, w:36, h:54,
  targetX: LANES[1],
  jumpH:0, jumpVY:0,       // height above ground, current upward velocity
  crouching: false,
  turbo:0, magnet:0,       // power frame-timers
};

let obstacles = [], cards = [], parts = [], popups = [];

// ── Input ─────────────────────────────────────────────────────────────────────
const held = {};
document.addEventListener('keydown', e => {
  if (held[e.key]) return;
  held[e.key] = true;
  onKey(e.key);
  if ([' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => {
  delete held[e.key];
  if (['ArrowDown','s','S'].includes(e.key)) P.crouching = false;
});

function onKey(k) {
  if (state !== 'play') { begin(); return; }
  if (k==='ArrowLeft'  || k==='a' || k==='A') shiftLane(-1);
  if (k==='ArrowRight' || k==='d' || k==='D') shiftLane(+1);
  if (k==='ArrowUp'    || k==='w' || k==='W' || k===' ') jump();
  if (k==='ArrowDown'  || k==='s' || k==='S') P.crouching = true;
}

// Mobile buttons
function bindBtn(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('pointerdown', e => { e.preventDefault(); if (state!=='play') begin(); else fn(true); });
  el.addEventListener('pointerup',   e => { e.preventDefault(); fn(false); });
  el.addEventListener('pointerleave',e => { fn(false); });
}
bindBtn('runner-left',   b => { if (b) shiftLane(-1); });
bindBtn('runner-right',  b => { if (b) shiftLane(+1); });
bindBtn('runner-jump',   b => { if (b) jump(); });
bindBtn('runner-crouch', b => { P.crouching = b; });

canvas.addEventListener('click', () => { if (state !== 'play') begin(); });
canvas.focus();
document.addEventListener('touchmove', e => e.preventDefault(), { passive:false });
document.addEventListener('wheel', e => {
  if (state === 'play') e.preventDefault();
}, { passive:false });

// Touch swipe on canvas
let tsX=0, tsY=0;
canvas.addEventListener('touchstart', e => {
  tsX = e.touches[0].clientX; tsY = e.touches[0].clientY; e.preventDefault();
}, { passive:false });
canvas.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - tsX;
  const dy = e.changedTouches[0].clientY - tsY;
  if (state !== 'play') { begin(); return; }
  if (Math.abs(dy) > Math.abs(dx)) {
    if (dy < -20) jump();
    else if (dy > 20) { P.crouching = true; setTimeout(() => { P.crouching = false; }, 400); }
  } else if (Math.abs(dx) > 20) {
    shiftLane(dx < 0 ? -1 : 1);
  }
  e.preventDefault();
}, { passive:false });

// ── Game actions ──────────────────────────────────────────────────────────────
function shiftLane(d) {
  const n = Math.max(0, Math.min(2, P.lane + d));
  if (n === P.lane) return;
  P.lane = n; P.targetX = LANES[n];
}

function jump() {
  if (P.jumpH < 2) { P.jumpVY = JUMP_V; P.crouching = false; }
}

function begin() {
  score=0; baseSpeed=3.0; frame=0;
  obstacles=[]; cards=[]; parts=[]; popups=[];
  P.lane=1; P.x=LANES[1]; P.targetX=LANES[1];
  P.jumpH=0; P.jumpVY=0; P.crouching=false; P.turbo=0; P.magnet=0;
  state='play';
}

// ── Spawning ──────────────────────────────────────────────────────────────────
function spawnObstacle() {
  const pool = OBJ_POOL.filter(o =>
    !(o.span > 1 && baseSpeed < 4.5) &&
    !(o.span > 2 && baseSpeed < 5.5)
  );
  const def = pool[Math.floor(Math.random() * pool.length)];

  if (def.span === 3) {
    obstacles.push({ ...def, lane:-1, x:W/2, y:-def.h - 10 });
  } else if (def.span === 2) {
    const sl = Math.floor(Math.random() * 2);
    obstacles.push({ ...def, lane:-2, startLane:sl, x:(LANES[sl]+LANES[sl+1])/2, y:-def.h - 10 });
  } else {
    const lane = Math.floor(Math.random() * 3);
    obstacles.push({ ...def, lane, x:LANES[lane], y:-def.h - 10 });
  }
}

function spawnCard() {
  const ck   = CARD_KEYS[Math.floor(Math.random() * CARD_KEYS.length)];
  const lane = Math.floor(Math.random() * 3);
  cards.push({ ck, x:LANES[lane], y:-28, w:28, h:40 });
}

// ── Collision ─────────────────────────────────────────────────────────────────
function obstacleKills(o) {
  // Lane check
  if      (o.lane === -1) { /* all lanes – always check */ }
  else if (o.lane === -2) { if (P.lane !== o.startLane && P.lane !== o.startLane+1) return false; }
  else                    { if (P.lane !== o.lane) return false; }

  // Height check
  if (o.layer === 'ground') { if (P.jumpH >= JMP_CLR) return false; }   // jumped over
  if (o.layer === 'air')    { if (P.crouching) return false;            // crouched under
                              if (P.jumpH >= 85) return false; }         // jumped over sign

  // Proximity on y-axis
  const playerY = P.y - P.jumpH;
  const dy = Math.abs(playerY - o.y);
  const dh = (P.crouching ? P.h*0.42 : P.h*0.58) / 2 + o.h * 0.46;
  return dy < dh;
}

// ── Card effect ───────────────────────────────────────────────────────────────
function collectCard(ck) {
  const d = CARD_DEF[ck];
  score += d.bonus;
  if (ck === 'yellow') P.magnet = 360;
  if (ck === 'green')  P.turbo  = 240;
  if (ck === 'wild')   { P.magnet=300; P.turbo=200; }
  burst(P.x, P.y - P.jumpH, d.bg, 12);
  popups.push({ x:P.x, y:P.y - P.jumpH - 40, text:`+${d.bonus}`, color:d.bg, life:1 });
}

function burst(x, y, color, n) {
  for (let i=0; i<n; i++) parts.push({
    x, y, vx:(Math.random()-0.5)*7, vy:(Math.random()-0.5)*7-1.5,
    r:3+Math.random()*4, color, life:1, decay:0.03+Math.random()*0.03,
  });
}

// ── Drawing helpers ───────────────────────────────────────────────────────────
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r ?? 6); }

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawQuad(points, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function drawSoftCloud(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.beginPath(); ctx.ellipse(0, 10, 36, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-18, 4, 18, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9, -2, 24, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(30, 7, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawRail(bottomX, horizonX, yTop, yBottom, widthBottom = 8, widthTop = 2.2) {
  drawQuad([
    [horizonX - widthTop / 2, yTop],
    [horizonX + widthTop / 2, yTop],
    [bottomX + widthBottom / 2, yBottom],
    [bottomX - widthBottom / 2, yBottom],
  ], '#172033', '#0b1220', 1);
  drawQuad([
    [horizonX - widthTop / 2, yTop],
    [horizonX - widthTop / 5, yTop],
    [bottomX - widthBottom / 5, yBottom],
    [bottomX - widthBottom / 2, yBottom],
  ], 'rgba(255,255,255,0.34)');
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function perspectiveT(y) {
  return clamp((y - HORIZON_Y) / (BASE_Y - HORIZON_Y), 0, 1.55);
}

function projectX(x, y) {
  const t = perspectiveT(y);
  return VANISH_X + (x - VANISH_X) * t;
}

function scaleAtY(y) {
  return 0.36 + perspectiveT(y) * 0.72;
}

function drawPalm(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.fillStyle = '#8b5a2b';
  rr(-5, 10, 10, 68, 5); ctx.fill();
  ctx.fillStyle = '#18a957';
  [-1.2, -0.75, -0.28, 0.28, 0.75, 1.2].forEach((rot) => {
    ctx.save(); ctx.rotate(rot);
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
  ctx.fillStyle = '#0f7f43'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBuilding(x, y, w, h, color) {
  const side = ctx.createLinearGradient(x, y, x + w, y + h);
  side.addColorStop(0, color);
  side.addColorStop(1, 'rgba(15,23,42,0.24)');
  ctx.fillStyle = 'rgba(36, 28, 18, 0.16)'; rr(x + 5, y + 7, w, h, 5); ctx.fill();
  ctx.fillStyle = side; rr(x, y, w, h, 6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.76)';
  for (let yy = y + 16; yy < y + h - 12; yy += 28) {
    rr(x + 8, yy, w - 16, 10, 3); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(18,31,52,0.28)'; ctx.lineWidth = 2;
  rr(x, y, w, h, 5); ctx.stroke();
}

function drawTrainShape(x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(72, 42, 18, 0.32)';
  ctx.beginPath(); ctx.ellipse(6, h * 0.44, w * 0.56, h * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  const body = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  body.addColorStop(0, '#4cc8ff'); body.addColorStop(0.28, '#1e9be0'); body.addColorStop(0.29, '#ff5a45'); body.addColorStop(1, '#b91c1c');
  ctx.fillStyle = body; rr(-w / 2, -h / 2, w, h, 15); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(-w * 0.38, -h * 0.44, w * 0.76, h * 0.08, 5); ctx.fill();
  ctx.fillStyle = '#e8fbff'; rr(-w * 0.33, -h * 0.34, w * 0.66, h * 0.24, 7); ctx.fill();
  ctx.fillStyle = '#1479b9'; rr(-w * 0.12, -h * 0.03, w * 0.24, h * 0.12, 4); ctx.fill();
  ctx.fillStyle = '#ffd43b';
  ctx.beginPath(); ctx.arc(-w * 0.25, h * 0.31, w * 0.095, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w * 0.25, h * 0.31, w * 0.095, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7f1d1d'; rr(-w * 0.42, h * 0.42, w * 0.84, h * 0.1, 5); ctx.fill();
  ctx.strokeStyle = '#102033'; ctx.lineWidth = Math.max(2, w * 0.04); rr(-w / 2, -h / 2, w, h, 14); ctx.stroke();
  ctx.restore();
}

function drawRoad() {
  const spd = baseSpeed + (P.turbo>0 ? 2 : 0);

  const sky = ctx.createLinearGradient(0, 0, 0, 245);
  sky.addColorStop(0, '#26aef1'); sky.addColorStop(0.54, '#8be4ff'); sky.addColorStop(1, '#ffd76a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 245);
  ctx.fillStyle = '#fff0a6'; ctx.beginPath(); ctx.arc(45, 48, 27, 0, Math.PI * 2); ctx.fill();
  drawSoftCloud(286, 42, 0.82);
  drawSoftCloud(126, 86, 0.38);

  // Big saturated background shapes, closer to a mobile runner art direction.
  drawBuilding(204, 38, 36, 128, '#ef4444');
  drawBuilding(244, 18, 45, 154, '#0ea5e9');
  drawBuilding(294, 70, 34, 104, '#f97316');
  drawBuilding(330, 20, 36, 156, '#22c55e');
  drawPalm(30, 138, 0.62);

  // Strong side walls/platforms to create a tunnel-like canyon.
  drawQuad([[0, 166], [116, 145], [62, H], [0, H]], '#c47027');
  drawQuad([[210, 142], [W, 118], [W, H], [304, H]], '#ffd84d');
  drawQuad([[226, 174], [W, 154], [W, 174], [226, 196]], 'rgba(190,112,18,0.18)');
  drawQuad([[0, 178], [96, 160], [72, 200], [0, 214]], 'rgba(255,235,160,0.16)');
  drawPalm(340, 205, 0.52);

  ctx.strokeStyle = 'rgba(24,44,70,0.34)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(74, 18); ctx.quadraticCurveTo(180, 34, 302, 18); ctx.stroke();
  ['#facc15', '#22c55e', '#ef4444', '#38bdf8', '#f97316'].forEach((color, i) => {
    const fx = 90 + i * 40;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(fx, 20); ctx.lineTo(fx + 13, 22); ctx.lineTo(fx + 5, 36); ctx.closePath(); ctx.fill();
  });

  const dirt = ctx.createLinearGradient(0, 138, 0, H);
  dirt.addColorStop(0, '#f2aa45'); dirt.addColorStop(0.6, '#d78331'); dirt.addColorStop(1, '#96501b');
  ctx.fillStyle = dirt; ctx.fillRect(0, 138, W, H - 138);

  // Side shadows and central highlight give the floor a finished game-art look.
  drawQuad([[96, HORIZON_Y], [264, HORIZON_Y], [356, H], [4, H]], '#d98a35');
  drawQuad([[146, HORIZON_Y], [214, HORIZON_Y], [250, H], [110, H]], 'rgba(255,232,140,0.22)');
  drawQuad([[96, HORIZON_Y], [134, HORIZON_Y], [76, H], [0, H]], 'rgba(106,55,18,0.16)');
  drawQuad([[226, HORIZON_Y], [264, HORIZON_Y], [360, H], [284, H]], 'rgba(106,55,18,0.16)');

  // Three lane beds with subtle separation.
  [
    [[106, HORIZON_Y + 5], [150, HORIZON_Y + 5], [118, H], [20, H]],
    [[158, HORIZON_Y + 5], [202, HORIZON_Y + 5], [230, H], [130, H]],
    [[210, HORIZON_Y + 5], [254, HORIZON_Y + 5], [340, H], [240, H]],
  ].forEach((lane, i) => drawQuad(lane, i === 1 ? 'rgba(255,203,94,0.16)' : 'rgba(92,48,16,0.1)'));

  for (let y = ((frame * spd * 1.1) % 48) + HORIZON_Y + 16; y < H + 36; y += 48) {
    const t = perspectiveT(y);
    const half = 18 + t * 132;
    ctx.strokeStyle = 'rgba(96,52,18,0.9)'; ctx.lineWidth = 1.5 + t * 4.2;
    ctx.beginPath(); ctx.moveTo(VANISH_X - half, y); ctx.lineTo(VANISH_X + half, y); ctx.stroke();
  }

  // Rails are filled polygons, not raw lines, so they read like actual metal tracks.
  [[58, 132], [142, 218], [226, 302]].forEach(pair => {
    pair.forEach(bottomX => drawRail(bottomX, VANISH_X + (bottomX - VANISH_X) * 0.1, HORIZON_Y + 7, H + 22));
  });

  // Distant train acts as a focal point.
  drawTrainShape(216, 184, 54, 68);

  const vignette = ctx.createRadialGradient(W / 2, H * 0.48, 120, W / 2, H * 0.58, 360);
  vignette.addColorStop(0, 'rgba(255,255,255,0)');
  vignette.addColorStop(1, 'rgba(56,27,10,0.13)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);

  // Turbo speed lines on sides
  if (P.turbo > 0) {
    ctx.save(); ctx.globalAlpha = 0.22;
    ctx.strokeStyle='#4ade80'; ctx.lineWidth=2;
    for (let i=0; i<6; i++) {
      const lx = 3 + i*2;
      const ly = ((i*44 + frame*(baseSpeed+2)*2.5) % (H+60)) - 30;
      ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx,ly+32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W-lx,ly); ctx.lineTo(W-lx,ly+32); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawObstacle(o) {
  const {kind,x,y,w,h} = o;
  const sx = projectX(x, y);
  const sc = scaleAtY(y);
  ctx.save();
  ctx.translate(sx, y);
  ctx.scale(sc, sc);

  if (kind === 'train') {
    drawTrainShape(0, 0, w, h);

  } else if (kind === 'sign') {
    // Hanging sign — air obstacle ("PLACA")
    const topY = -h / 2 - 46;
    ctx.strokeStyle='#475569'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-w/2+10,topY); ctx.lineTo(-w/2+10,-h/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w/2-10,topY); ctx.lineTo(w/2-10,-h/2); ctx.stroke();
    // Body
    ctx.fillStyle='#b91c1c'; rr(-w/2,-h/2,w,h,4); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(-w/2+4,-h/2+3,w-8,5);
    ctx.strokeStyle='#7f1d1d'; ctx.lineWidth=1.5; rr(-w/2,-h/2,w,h,4); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font='bold 11px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('ABAIXE', 0, 0);

  } else if (kind === 'lowbar') {
    // Ground bar across all lanes — must jump
    const grad = ctx.createLinearGradient(-w/2,0,w/2,0);
    grad.addColorStop(0,'#b45309'); grad.addColorStop(0.5,'#d97706'); grad.addColorStop(1,'#b45309');
    ctx.fillStyle=grad; rr(-w/2,-h/2,w,h,3); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.18)';
    for (let i=0; i<8; i++) ctx.fillRect(-w/2+i*40,-h/2,20,h);
    ctx.strokeStyle='#78350f'; ctx.lineWidth=1.5; rr(-w/2,-h/2,w,h,3); ctx.stroke();
    // Reflective top strip
    ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.fillRect(-w/2+4,-h/2+2,w-8,4);
    ctx.fillStyle='#fbbf24'; ctx.font='bold 11px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('PULE', 0, -h/2-13);

  } else if (kind === 'highbar') {
    // Overhead bar across all lanes — must crouch
    ctx.fillStyle='#334155';
    ctx.fillRect(-w/2+10,-h/2-22,8,22); ctx.fillRect(w/2-18,-h/2-22,8,22);
    const grad2 = ctx.createLinearGradient(0,-h/2,0,h/2);
    grad2.addColorStop(0,'#4b5563'); grad2.addColorStop(1,'#374151');
    ctx.fillStyle=grad2; rr(-w/2,-h/2,w,h,3); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.1)';
    for (let i=0; i<6; i++) ctx.fillRect(-w/2+i*54,-h/2,27,h);
    ctx.strokeStyle='#1e293b'; ctx.lineWidth=1.5; rr(-w/2,-h/2,w,h,3); ctx.stroke();
    ctx.fillStyle='#38bdf8'; ctx.font='bold 11px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('ABAIXE', 0, h/2+13);

  } else if (kind === 'barrier') {
    // 2-lane red barrier
    ctx.fillStyle='#dc2626'; rr(-w/2,-h/2,w,h,4); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.2)';
    for (let i=0; i<4; i++) ctx.fillRect(-w/2+i*26,-h/2,13,h);
    ctx.strokeStyle='#991b1b'; ctx.lineWidth=1.5; rr(-w/2,-h/2,w,h,4); ctx.stroke();
    // Poles
    ctx.fillStyle='#f59e0b';
    ctx.fillRect(-w/2-3,-h/2-10,7,h+20); ctx.fillRect(w/2-4,-h/2-10,7,h+20);

  } else if (kind === 'cone') {
    ctx.fillStyle='#f97316';
    ctx.beginPath(); ctx.moveTo(0,-h/2); ctx.lineTo(w/2,h/2); ctx.lineTo(-w/2,h/2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-w*0.28,h*0.1); ctx.lineTo(w*0.28,h*0.1); ctx.stroke();
    ctx.fillStyle='#78350f'; rr(-w/2,h*0.44,w,h*0.1,2); ctx.fill();
  }

  ctx.restore();
}

function drawCard(c) {
  const d = CARD_DEF[c.ck];
  const {x,y,w,h} = c;
  const sx = projectX(x, y);
  const sc = scaleAtY(y);
  const bob = Math.sin(frame*0.08 + x*0.05) * 3;
  ctx.save();
  ctx.translate(sx, y + bob);
  ctx.scale(sc, sc);
  ctx.shadowColor='#facc15'; ctx.shadowBlur=12;
  ctx.fillStyle='rgba(0,0,0,0.24)'; ctx.beginPath(); ctx.ellipse(3,5,w*0.48,h*0.34,0,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='#facc15'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle='#fff8bd'; ctx.beginPath(); ctx.arc(-4, -5, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle='#9a5c00'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle=d.bg; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  const {x,y,w,h,jumpH,crouching,turbo} = P;
  const renderY = y - jumpH;
  const bounce  = jumpH<2 ? Math.sin(frame*0.3)*2.2 : 0;
  const leg     = Math.sin(frame*0.38);
  const ch      = crouching ? h*0.46 : h;      // effective height
  const cOff    = crouching ? h*0.26 : 0;      // crouch offset (shift down so feet stay)

  // Jump shadow
  if (jumpH > 4) {
    const sc = Math.max(0.25, 1 - jumpH/150);
    ctx.save(); ctx.globalAlpha=0.32*sc;
    ctx.fillStyle='#000'; ctx.beginPath();
    ctx.ellipse(x, y+12, w*0.46*sc, 7*sc, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Magnet ring
  if (P.magnet > 0 && frame%24 < 12) {
    ctx.save(); ctx.globalAlpha=0.22;
    ctx.strokeStyle='#facc15'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x, renderY, 88+(frame%24)*2, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // Turbo trail
  if (turbo > 0) {
    for (let i=1; i<=4; i++) {
      ctx.save(); ctx.globalAlpha=0.08*(5-i);
      ctx.fillStyle='#4ade80';
      rr(x-w/2, renderY-ch/2+i*12, w, ch-i*10, 4); ctx.fill();
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(x, renderY + bounce + cOff);

  const bodyCol = turbo>0 ? '#22c55e' : '#f8fafc';
  const legCol  = turbo>0 ? '#15803d' : '#38bdf8';
  const outline = '#172033';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (!crouching) {
    // Legs and shoes, drawn as rounded limbs instead of raw rectangles.
    [[-w * 0.18, leg * 0.32], [w * 0.18, -leg * 0.32]].forEach(([lx, rot]) => {
      ctx.save(); ctx.translate(lx, ch * 0.15); ctx.rotate(rot);
      ctx.fillStyle = legCol; ctx.strokeStyle = outline; ctx.lineWidth = 3;
      rr(-6, 0, 12, ch * 0.34, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f8fafc'; rr(-10, ch * 0.32, 20, 8, 5); ctx.fill(); ctx.stroke();
      ctx.restore();
    });

    // Arms swinging behind the body.
    ctx.strokeStyle = outline; ctx.lineWidth = 3;
    ctx.fillStyle = '#ffbd83';
    [[-w * 0.54, -leg * 0.25], [w * 0.54, leg * 0.25]].forEach(([ax, rot]) => {
      ctx.save(); ctx.translate(ax, -ch * 0.12); ctx.rotate(rot);
      rr(-5, 0, 10, ch * 0.23, 6); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
  } else {
    ctx.fillStyle = legCol; ctx.strokeStyle = outline; ctx.lineWidth = 3;
    rr(-w * 0.44, ch * 0.08, w * 0.4, ch * 0.26, 7); ctx.fill(); ctx.stroke();
    rr(w * 0.04, ch * 0.08, w * 0.4, ch * 0.26, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    rr(-w * 0.44, ch * 0.34, w * 0.36, 9, 5); ctx.fill(); ctx.stroke();
    rr(w * 0.08, ch * 0.34, w * 0.36, 9, 5); ctx.fill(); ctx.stroke();
  }

  // Body
  ctx.fillStyle = bodyCol; ctx.strokeStyle = outline; ctx.lineWidth = 3;
  rr(-w / 2, -ch * 0.3, w, ch * 0.47, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#dbeafe'; rr(-w / 2 + 6, -ch * 0.2, w - 12, ch * 0.13, 5); ctx.fill();
  ctx.fillStyle = 'rgba(23,32,51,0.12)'; rr(-w * 0.22, -ch * 0.03, w * 0.44, ch * 0.16, 5); ctx.fill();

  // Head and cap from behind.
  const hR  = crouching ? w*0.22 : w*0.27;
  const hY  = crouching ? -ch*0.3 : -ch*0.37;
  ctx.fillStyle = '#ffbd83'; ctx.strokeStyle = outline; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, hY, hR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f8fafc'; rr(-hR * 1.05, hY - hR * 1.22, hR * 2.1, hR * 0.68, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#38bdf8'; rr(-hR * 0.48, hY - hR * 1.02, hR * 0.96, 5, 3); ctx.fill();

  ctx.restore();
}

function drawParticle(p) {
  ctx.save(); ctx.globalAlpha=p.life;
  ctx.fillStyle=p.color; ctx.beginPath();
  ctx.arc(p.x,p.y,p.r*Math.max(0.2,p.life),0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawPopup(p) {
  ctx.save(); ctx.globalAlpha=p.life;
  ctx.fillStyle=p.color; ctx.font='bold 15px sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(p.text, p.x, p.y); ctx.restore();
}

// ── Overlay screens ───────────────────────────────────────────────────────────
function drawStart() {
  drawRoad();
  ctx.save();
  ctx.fillStyle='rgba(5,8,20,0.84)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center'; ctx.textBaseline='middle';

  ctx.fillStyle='#facc15'; ctx.font='bold 25px sans-serif';
  ctx.fillText('Corrida do Aloncinho', W/2, 95);
  ctx.fillStyle='#cbd5e1'; ctx.font='13px sans-serif';
  ctx.fillText('Runner nos trilhos — trem, moedas, pulo e deslize!', W/2, 120);

  // Controls
  const ctrls = [
    { key:'← →',          desc:'Mudar de faixa' },
    { key:'↑ / Espaço',   desc:'Pular obstáculos do chão' },
    { key:'↓ (segurar)',  desc:'Abaixar de placas e barras' },
  ];
  ctrls.forEach((c,i) => {
    ctx.fillStyle='rgba(255,255,255,0.06)'; rr(W/2-138,158+i*36,276,28,6); ctx.fill();
    ctx.fillStyle='#facc15'; ctx.font='bold 12px sans-serif'; ctx.textAlign='left';
    ctx.fillText(c.key, W/2-130, 172+i*36);
    ctx.fillStyle='#94a3b8'; ctx.font='12px sans-serif'; ctx.textAlign='right';
    ctx.fillText(c.desc, W/2+130, 172+i*36);
    ctx.textAlign='center';
  });

  // Obstacle guide
  ctx.fillStyle='#e2e8f0'; ctx.font='bold 12px sans-serif';
  ctx.fillText('Guia de obstáculos', W/2, 278);

  const guide = [
    { col:'#ef4444', lbl:'Trem vermelho',  tip:'Mude de faixa' },
    { col:'#e2e8f0', lbl:'Espinhos',        tip:'Pule ↑' },
    { col:'#dc2626', lbl:'Placa vermelha',  tip:'Abaixe ↓' },
    { col:'#d97706', lbl:'Barra no chão',   tip:'Pule ↑ (todas as faixas)' },
    { col:'#64748b', lbl:'Barra suspensa',  tip:'Abaixe ↓ (todas as faixas)' },
  ];
  guide.forEach((g,i) => {
    ctx.fillStyle=g.col; ctx.fillRect(W/2-128, 295+i*24, 14, 14);
    ctx.fillStyle='#94a3b8'; ctx.font='11px sans-serif'; ctx.textAlign='left';
    ctx.fillText(`${g.lbl} — ${g.tip}`, W/2-108, 302+i*24);
    ctx.textAlign='center';
  });

  if (best > 0) {
    ctx.fillStyle='#475569'; ctx.font='13px sans-serif';
    ctx.fillText(`Recorde: ${best}`, W/2, 442);
  }
  ctx.fillStyle='#22d3ee'; ctx.font='bold 16px sans-serif';
  ctx.fillText('Toque ou qualquer tecla para começar', W/2, 478);
  ctx.restore();
}

function drawDead() {
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.76)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#fb7185'; ctx.font='bold 32px sans-serif';
  ctx.fillText('Fim de Jogo!', W/2, H/2-60);
  ctx.fillStyle='#fff'; ctx.font='bold 20px sans-serif';
  ctx.fillText(`Pontos: ${Math.floor(score)}`, W/2, H/2-12);
  ctx.fillStyle='#facc15'; ctx.font='16px sans-serif';
  ctx.fillText(`Recorde: ${best}`, W/2, H/2+22);
  ctx.fillStyle='#94a3b8'; ctx.font='14px sans-serif';
  ctx.fillText('Toque ou qualquer tecla para recomeçar', W/2, H/2+64);
  ctx.restore();
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function updateHUD() {
  if (scoreEl) scoreEl.textContent = Math.floor(score);
  if (bestEl)  bestEl.textContent  = best;
  const lvl = Math.ceil((baseSpeed-3.0)/0.38)+1;
  if (speedEl) speedEl.textContent = `${Math.min(9,lvl)}×`;
}

function updatePowers() {
  if (!powersEl) return;
  const chips = [];
  if (P.magnet>0) chips.push({label:'Ímã',   color:'#facc15', pct:P.magnet/360});
  if (P.turbo>0)  chips.push({label:'Turbo', color:'#22c55e', pct:P.turbo/240});
  powersEl.innerHTML = chips.map(c=>`
    <div class="runner-power-chip">
      <span>${c.label}</span>
      <div class="runner-chip-bar-bg">
        <div class="runner-chip-bar" style="width:${Math.min(100,Math.round(c.pct*100))}%;background:${c.color}"></div>
      </div>
    </div>`).join('');
}

// ── Main loop ─────────────────────────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);
  ctx.clearRect(0,0,W,H);

  if (state === 'start') { drawStart(); return; }

  drawRoad();

  if (state === 'dead') {
    obstacles.forEach(drawObstacle);
    cards.forEach(drawCard);
    parts.forEach(drawParticle);
    drawPlayer();
    drawDead(); return;
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  frame++;
  const spd = baseSpeed + (P.turbo>0 ? 2.0 : 0);

  // Difficulty ramp every 10 s
  if (frame % 600 === 0) baseSpeed = Math.min(baseSpeed+0.38, 8.6);

  score += spd*0.05;
  if (Math.floor(score) > best) {
    best = Math.floor(score);
    localStorage.setItem('runner-best', best);
  }

  // Jump physics
  if (P.jumpH > 0 || P.jumpVY > 0) {
    P.jumpVY -= GRAV;
    P.jumpH   = Math.max(0, P.jumpH + P.jumpVY);
    if (P.jumpH === 0) P.jumpVY = 0;
  }

  // Power timers
  if (P.turbo  > 0) P.turbo--;
  if (P.magnet > 0) P.magnet--;

  // Smooth lane switch
  P.x += (P.targetX - P.x) * 0.2;

  // Spawn
  const oRate = Math.max(46, 108-Math.floor(baseSpeed*7));
  if (frame % oRate === 0) spawnObstacle();
  const cRate = Math.max(26, 68-Math.floor(baseSpeed*4));
  if (frame % cRate === 0) spawnCard();

  // Obstacles
  let died = false;
  for (let i=obstacles.length-1; i>=0; i--) {
    const o = obstacles[i];
    o.y += spd;
    if (o.y > H+80) { obstacles.splice(i,1); continue; }
    if (obstacleKills(o)) { died=true; break; }
  }

  // Cards
  for (let i=cards.length-1; i>=0; i--) {
    const c = cards[i];
    c.y += spd;
    // Magnet pull
    if (P.magnet>0) {
      const dx=P.x-c.x, dy=(P.y-P.jumpH)-c.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if (dist<140&&dist>1) { c.x+=dx/dist*4; c.y+=dy/dist*4; }
    }
    if (c.y > H+50) { cards.splice(i,1); continue; }
    const pCY=P.y-P.jumpH, pCH=(P.crouching?P.h*0.46:P.h*0.6);
    if (Math.abs(P.x-c.x)<(P.w+c.w)*0.5 && Math.abs(pCY-c.y)<(pCH+c.h)*0.5) {
      collectCard(c.ck); cards.splice(i,1); continue;
    }
  }

  // Particles
  for (let i=parts.length-1; i>=0; i--) {
    const p=parts[i];
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.18; p.life-=p.decay;
    if (p.life<=0) { parts.splice(i,1); continue; }
  }

  // Popups
  for (let i=popups.length-1; i>=0; i--) {
    const p=popups[i];
    p.y-=1.8; p.life-=0.022;
    if (p.life<=0) { popups.splice(i,1); continue; }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  obstacles.forEach(drawObstacle);
  cards.forEach(drawCard);
  parts.forEach(drawParticle);
  drawPlayer();
  popups.forEach(drawPopup);

  // Jump / crouch HUD hint in-canvas
  if (P.crouching) {
    ctx.save(); ctx.globalAlpha=0.55;
    ctx.fillStyle='#38bdf8'; ctx.font='bold 10px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText('AGACHADO', P.x, P.y-P.jumpH-P.h*0.55);
    ctx.restore();
  } else if (P.jumpH > 10) {
    ctx.save(); ctx.globalAlpha=0.55;
    ctx.fillStyle='#fbbf24'; ctx.font='bold 10px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText('PULANDO!', P.x, P.y-P.jumpH-P.h*0.55);
    ctx.restore();
  }

  if (died) state='dead';
  if (frame%4===0) { updateHUD(); updatePowers(); }
}

// Init
bestEl && (bestEl.textContent=best);
loop();
