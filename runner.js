'use strict';
// ── Corrida do Aloncinho v3 — Subway Surfers style ──────────────────────────

const canvas   = document.getElementById('runner-canvas');
const scoreEl  = document.getElementById('runner-score');
const bestEl   = document.getElementById('runner-best');
const speedEl  = document.getElementById('runner-speed');
const powersEl = document.getElementById('runner-powers');
if (!canvas) throw new Error('runner canvas not found');

const ctx = canvas.getContext('2d');
const W = 360, H = 600;

// Gameplay constants
const LANES   = [72, 180, 288];
const BASE_Y  = H - 130;
const GRAV    = 0.62;
const JUMP_V  = 13.4;
const JMP_CLR = 32;

// Perspective: vanishing point and lane edges at bottom of canvas
const VP_X   = W / 2;
const VP_Y   = 168;
const LANE_BX = [12, 126, 234, 348]; // left-edge, left-div, right-div, right-edge at bottom

// Card catalogue
const CARD_DEF = {
  red:    { bg:'#ef4444', fg:'#fff',    glyph:'R', name:'Fogo',   bonus:50  },
  blue:   { bg:'#3b82f6', fg:'#fff',    glyph:'B', name:'Escudo', bonus:30  },
  yellow: { bg:'#facc15', fg:'#1a1a1a', glyph:'A', name:'Ímã',    bonus:20  },
  green:  { bg:'#22c55e', fg:'#fff',    glyph:'V', name:'Turbo',  bonus:40  },
  wild:   { bg:'#a855f7', fg:'#fff',    glyph:'★', name:'Super!', bonus:100 },
};
const CARD_KEYS = Object.keys(CARD_DEF);

// Obstacle catalogue
const OBJ_POOL = [
  { kind:'train_red',  w:70,  h:88,  layer:'ground', span:1 },
  { kind:'train_blue', w:70,  h:88,  layer:'ground', span:1 },
  { kind:'cone',       w:42,  h:52,  layer:'ground', span:1 },
  { kind:'box',        w:56,  h:44,  layer:'ground', span:1 },
  { kind:'sign',       w:88,  h:30,  layer:'air',    span:1 },
  { kind:'barrier',    w:106, h:28,  layer:'ground', span:2 },
  { kind:'lowbar',     w:316, h:20,  layer:'ground', span:3 },
  { kind:'highbar',    w:316, h:18,  layer:'air',    span:3 },
];

// Game state
let state = 'start';
let frame = 0, score = 0, baseSpeed = 3.0;
let best  = parseInt(localStorage.getItem('runner-best') || '0');

const P = {
  lane:1, x:LANES[1], y:BASE_Y, w:36, h:54,
  targetX: LANES[1],
  jumpH:0, jumpVY:0,
  crouching: false,
  turbo:0, magnet:0,
};

let obstacles = [], cards = [], parts = [], popups = [];

// Animated clouds
const clouds = [
  { x:55,  y:72,  r:28, spd:0.10 },
  { x:195, y:50,  r:22, spd:0.07 },
  { x:295, y:90,  r:18, spd:0.13 },
  { x:130, y:38,  r:20, spd:0.09 },
];

// Buildings (left and right columns)
const BLDG_COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#2980b9'];
const leftBuildings  = [
  { x:-4,  w:28, h:90,  ci:0 }, { x:26,  w:22, h:70,  ci:2 },
  { x:50,  w:26, h:110, ci:4 }, { x:78,  w:18, h:60,  ci:6 },
];
const rightBuildings = [
  { x:314, w:28, h:85,  ci:1 }, { x:316, w:22, h:105, ci:3 },
  { x:290, w:26, h:65,  ci:5 }, { x:268, w:20, h:95,  ci:7 },
];

// ── INPUT ──────────────────────────────────────────────────────────────────────
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

// ── ACTIONS ────────────────────────────────────────────────────────────────────
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

// ── SPAWNING ───────────────────────────────────────────────────────────────────
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

// ── COLLISION ──────────────────────────────────────────────────────────────────
function obstacleKills(o) {
  if      (o.lane === -1) { /* all lanes */ }
  else if (o.lane === -2) { if (P.lane !== o.startLane && P.lane !== o.startLane+1) return false; }
  else                    { if (P.lane !== o.lane) return false; }

  if (o.layer === 'ground') { if (P.jumpH >= JMP_CLR) return false; }
  if (o.layer === 'air')    { if (P.crouching) return false;
                              if (P.jumpH >= 85) return false; }

  const playerY = P.y - P.jumpH;
  const dy = Math.abs(playerY - o.y);
  const dh = (P.crouching ? P.h*0.42 : P.h*0.58) / 2 + o.h * 0.46;
  return dy < dh;
}

// ── CARD EFFECT ────────────────────────────────────────────────────────────────
function collectCard(ck) {
  const d = CARD_DEF[ck];
  score += d.bonus;
  if (ck === 'yellow') P.magnet = 360;
  if (ck === 'green')  P.turbo  = 240;
  if (ck === 'wild')   { P.magnet=300; P.turbo=200; }
  burst(P.x, P.y - P.jumpH, d.bg, 14);
  popups.push({ x:P.x, y:P.y - P.jumpH - 40, text:`+${d.bonus}`, color:d.bg, life:1 });
}

function burst(x, y, color, n) {
  for (let i=0; i<n; i++) parts.push({
    x, y,
    vx:(Math.random()-0.5)*8,
    vy:(Math.random()-0.5)*8 - 2,
    r:3+Math.random()*4, color, life:1,
    decay:0.03+Math.random()*0.03,
  });
}

// ── DRAW HELPERS ───────────────────────────────────────────────────────────────
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r ?? 6); }

function perspScale(y) {
  return Math.max(0, (y - VP_Y) / (H - VP_Y));
}

function trackX(bottomX, y) {
  const t = perspScale(y);
  return VP_X + (bottomX - VP_X) * t;
}

// ── DRAW BACKGROUND ────────────────────────────────────────────────────────────
function drawBackground() {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, VP_Y + 50);
  sky.addColorStop(0,   '#1565C0');
  sky.addColorStop(0.5, '#42A5F5');
  sky.addColorStop(1,   '#B3E5FC');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, VP_Y + 50);

  // Sun
  const sx=W*0.82, sy=52, sr=26;
  const sunHalo = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr*3);
  sunHalo.addColorStop(0,   'rgba(255,240,80,0.55)');
  sunHalo.addColorStop(0.6, 'rgba(255,200,0,0.15)');
  sunHalo.addColorStop(1,   'rgba(255,200,0,0)');
  ctx.fillStyle = sunHalo;
  ctx.beginPath(); ctx.arc(sx, sy, sr*3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FFE500';
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FFF176';
  ctx.beginPath(); ctx.arc(sx-4, sy-4, sr*0.45, 0, Math.PI*2); ctx.fill();
  // Sun rays
  ctx.save(); ctx.globalAlpha=0.3; ctx.strokeStyle='#FFD700'; ctx.lineWidth=2;
  for (let i=0; i<8; i++) {
    const a = (i/8)*Math.PI*2 + frame*0.006;
    ctx.beginPath();
    ctx.moveTo(sx+Math.cos(a)*sr*1.25, sy+Math.sin(a)*sr*1.25);
    ctx.lineTo(sx+Math.cos(a)*sr*2.3,  sy+Math.sin(a)*sr*2.3);
    ctx.stroke();
  }
  ctx.restore();

  // Clouds
  clouds.forEach(cl => {
    cl.x -= cl.spd;
    if (cl.x < -cl.r*4) cl.x = W + cl.r*3;
    drawCloud(cl.x, cl.y, cl.r);
  });

  // Buildings (drawn behind track edges)
  drawBuildingRow(leftBuildings,  'left');
  drawBuildingRow(rightBuildings, 'right');

  // Horizon glow
  const hGrad = ctx.createLinearGradient(0, VP_Y-10, 0, VP_Y+30);
  hGrad.addColorStop(0, 'rgba(255,230,100,0)');
  hGrad.addColorStop(0.4,'rgba(255,200,50,0.22)');
  hGrad.addColorStop(1, 'rgba(180,110,0,0)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, VP_Y-10, W, 40);

  drawTrack();
}

function drawCloud(cx, cy, r) {
  ctx.save();
  ctx.shadowColor = 'rgba(100,160,230,0.3)'; ctx.shadowBlur = 6;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const puffs = [{dx:0,dy:0,rr:r},{dx:-r*0.7,dy:r*0.22,rr:r*0.68},{dx:r*0.7,dy:r*0.22,rr:r*0.65},{dx:r*0.28,dy:-r*0.3,rr:r*0.58}];
  puffs.forEach(p => {
    ctx.beginPath(); ctx.arc(cx+p.dx, cy+p.dy, p.rr, 0, Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

function drawBuildingRow(list, side) {
  const isLeft = side === 'left';
  list.forEach((b, i) => {
    const top = VP_Y + 10 - b.h;
    const ci  = b.ci % BLDG_COLORS.length;
    const col = BLDG_COLORS[ci];
    const bx  = isLeft ? b.x : b.x;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(bx + (isLeft ? 4 : -4), top + 4, b.w, b.h);

    // Body
    ctx.fillStyle = col;
    ctx.fillRect(bx, top, b.w, b.h);

    // Roof accent
    ctx.fillStyle = BLDG_COLORS[(ci+3)%BLDG_COLORS.length];
    ctx.fillRect(bx - 2, top, b.w + 4, 5);

    // Windows
    ctx.fillStyle = 'rgba(255,255,200,0.75)';
    for (let wy = top + 10; wy < VP_Y - 4; wy += 12) {
      const ww = b.w * 0.28;
      ctx.fillRect(bx + 3,         wy, ww, 7);
      ctx.fillRect(bx + b.w*0.55,  wy, ww, 7);
    }

    // Building edge highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, top, b.w, b.h);
  });
}

function drawTrack() {
  const spd = baseSpeed + (P.turbo > 0 ? 2 : 0);

  // ── Ground fill (trapezoid) ──
  const gnd = ctx.createLinearGradient(0, VP_Y, 0, H);
  gnd.addColorStop(0,   '#795548');
  gnd.addColorStop(0.25,'#8D6E63');
  gnd.addColorStop(0.6, '#A1887F');
  gnd.addColorStop(1,   '#BCAAA4');
  ctx.fillStyle = gnd;
  ctx.beginPath();
  ctx.moveTo(0, VP_Y+15); ctx.lineTo(W, VP_Y+15); ctx.lineTo(W, H); ctx.lineTo(0, H);
  ctx.closePath(); ctx.fill();

  // ── Side grass ──
  const grassL = ctx.createLinearGradient(0, VP_Y, 0, H);
  grassL.addColorStop(0, '#388E3C'); grassL.addColorStop(1, '#2E7D32');
  ctx.fillStyle = grassL;
  // Left grass trapezoid
  ctx.beginPath();
  ctx.moveTo(0, VP_Y+15);
  ctx.lineTo(trackX(LANE_BX[0], VP_Y+15), VP_Y+15);
  ctx.lineTo(LANE_BX[0], H);
  ctx.lineTo(0, H);
  ctx.closePath(); ctx.fill();
  // Right grass trapezoid
  ctx.beginPath();
  ctx.moveTo(trackX(LANE_BX[3], VP_Y+15), VP_Y+15);
  ctx.lineTo(W, VP_Y+15);
  ctx.lineTo(W, H);
  ctx.lineTo(LANE_BX[3], H);
  ctx.closePath(); ctx.fill();

  // ── Crossties ──
  const tieOffset = (frame * spd * 1.1) % 50;
  for (let i = 0; i <= 16; i++) {
    const prog = ((i * 50 - tieOffset) / (H - VP_Y));
    if (prog < 0 || prog > 1) continue;
    const ty = VP_Y + prog * (H - VP_Y);
    const tx0 = trackX(LANE_BX[0], ty);
    const tx3 = trackX(LANE_BX[3], ty);
    const sc  = perspScale(ty);
    const tH  = Math.max(2, sc * 14);

    // Tie shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(tx0, ty, tx3-tx0, tH+2);
    // Tie body
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(tx0, ty-tH/2, tx3-tx0, tH);
    // Tie shine
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(tx0, ty-tH/2, tx3-tx0, tH*0.35);
  }

  // ── Rails (4 steel rails) ──
  for (let i = 0; i <= 3; i++) {
    const bx = LANE_BX[i];
    const railGrad = ctx.createLinearGradient(0, VP_Y, 0, H);
    railGrad.addColorStop(0, '#90A4AE');
    railGrad.addColorStop(1, '#546E7A');
    ctx.strokeStyle = railGrad;
    ctx.lineWidth = Math.max(0.8, perspScale(H) * 4);
    ctx.beginPath();
    ctx.moveTo(VP_X, VP_Y);
    ctx.lineTo(bx, H);
    ctx.stroke();
    // Rail shine
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(VP_X+0.5, VP_Y);
    ctx.lineTo(bx+1, H);
    ctx.stroke();
  }

  // ── Turbo effect ──
  if (P.turbo > 0) {
    ctx.save(); ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#69F0AE'; ctx.lineWidth = 3;
    for (let i=0; i<5; i++) {
      const lx = 4 + i*3;
      const ly = ((i*52 + frame*(spd)*2.6) % (H+80)) - 40;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly+50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W-lx, ly); ctx.lineTo(W-lx, ly+50); ctx.stroke();
    }
    ctx.restore();
  }
}

// ── DRAW OBSTACLE ──────────────────────────────────────────────────────────────
function drawObstacle(o) {
  const { kind, x, y, w, h } = o;
  ctx.save();

  if (kind === 'train_red' || kind === 'train_blue') {
    const isRed   = kind === 'train_red';
    const mainCol = isRed ? '#E53935' : '#1E88E5';
    const darkCol = isRed ? '#B71C1C' : '#0D47A1';
    const lightCol= isRed ? '#FF8A80' : '#82B1FF';
    const accentCol= isRed ? '#FF6F00' : '#00E5FF';
    const ty = y - h;

    // Train body
    ctx.fillStyle = mainCol;
    rr(x-w/2, ty, w, h, 7); ctx.fill();

    // Bottom darker section
    ctx.fillStyle = darkCol;
    ctx.fillRect(x-w/2, ty+h*0.58, w, h*0.42);
    rr(x-w/2, ty, w, h, 7); // re-clip bottom corners
    ctx.save(); ctx.clip(); ctx.fillRect(x-w/2, ty+h*0.58, w, h*0.42); ctx.restore();

    // Cab area top
    ctx.fillStyle = darkCol;
    ctx.fillRect(x-w/2+4, ty+3, w-8, h*0.28);

    // Front windows
    ctx.fillStyle = '#E3F2FD';
    const ww = (w-22)*0.44;
    ctx.fillRect(x-w/2+8,        ty+7, ww, h*0.2);
    ctx.fillRect(x-w/2+16+ww,    ty+7, ww, h*0.2);
    // Window glare
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x-w/2+10,       ty+8, ww*0.35, 4);
    ctx.fillRect(x-w/2+18+ww,    ty+8, ww*0.35, 4);

    // Headlights
    const hlGrad = ctx.createRadialGradient(x-w/2+14, ty+h*0.3, 0, x-w/2+14, ty+h*0.3, 10);
    hlGrad.addColorStop(0, 'rgba(255,255,180,0.9)');
    hlGrad.addColorStop(1, 'rgba(255,255,0,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath(); ctx.arc(x-w/2+14, ty+h*0.3, 10, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+w/2-14, ty+h*0.3, 10, 0, Math.PI*2); ctx.fill();

    // Accent stripe
    ctx.fillStyle = accentCol;
    ctx.fillRect(x-w/2, ty+h*0.34, w, 5);

    // Lower logo stripe
    ctx.fillStyle = lightCol;
    ctx.fillRect(x-w/2, ty+h*0.56, w, 3);

    // Wheels
    [x-w/2+13, x+w/2-13].forEach(wx => {
      ctx.fillStyle = '#212121';
      ctx.beginPath(); ctx.arc(wx, ty+h-5, 9, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#616161';
      ctx.beginPath(); ctx.arc(wx, ty+h-5, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#90A4AE';
      ctx.beginPath(); ctx.arc(wx, ty+h-5, 2, 0, Math.PI*2); ctx.fill();
    });

    // Bumper
    ctx.fillStyle = darkCol;
    rr(x-w/2+2, ty+h-16, w-4, 12, 3); ctx.fill();

    // Body shine
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    rr(x-w/2+4, ty+3, w-8, 10, 4); ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth=1.5;
    rr(x-w/2, ty, w, h, 7); ctx.stroke();

    // Warning label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=4;
    ctx.fillText('⚠ DESVIE!', x, ty + h*0.62);
    ctx.shadowBlur=0;

  } else if (kind === 'cone') {
    ctx.fillStyle = '#F57C00';
    ctx.beginPath(); ctx.moveTo(x,y-h/2); ctx.lineTo(x+w/2,y+h/2); ctx.lineTo(x-w/2,y+h/2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x-w*0.3, y-h*0.06, w*0.6, h*0.11);
    ctx.fillRect(x-w*0.28, y+h*0.22, w*0.56, h*0.11);
    ctx.fillStyle = '#BF360C';
    rr(x-w/2, y+h*0.44, w, h*0.1, 2); ctx.fill();

  } else if (kind === 'box') {
    ctx.fillStyle = '#8D6E63'; rr(x-w/2,y-h/2,w,h,5); ctx.fill();
    ctx.fillStyle = '#A1887F'; rr(x-w/2+3,y-h/2,w-6,h*0.28,4); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.22)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x-w/2+2,y); ctx.lineTo(x+w/2-2,y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,y-h/2+2); ctx.lineTo(x,y+h/2-2); ctx.stroke();
    ctx.strokeStyle='#4E342E'; ctx.lineWidth=1.5; rr(x-w/2,y-h/2,w,h,5); ctx.stroke();

  } else if (kind === 'sign') {
    const topY = Math.max(VP_Y+15, y-28);
    ctx.strokeStyle='#8D6E63'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(x-w/2+10,topY); ctx.lineTo(x-w/2+10,y-h/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w/2-10,topY); ctx.lineTo(x+w/2-10,y-h/2); ctx.stroke();
    ctx.fillStyle='#C62828'; rr(x-w/2,y-h/2,w,h,4); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(x-w/2+4,y-h/2+3,w-8,5);
    ctx.strokeStyle='#7f1d1d'; ctx.lineWidth=1.5; rr(x-w/2,y-h/2,w,h,4); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font='bold 11px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=3;
    ctx.fillText('⚠ ABAIXE!', x, y);
    ctx.shadowBlur=0;

  } else if (kind === 'lowbar') {
    const grad = ctx.createLinearGradient(x-w/2,0,x+w/2,0);
    grad.addColorStop(0,'#E65100'); grad.addColorStop(0.5,'#FF6D00'); grad.addColorStop(1,'#E65100');
    ctx.fillStyle=grad; rr(x-w/2,y-h/2,w,h,3); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.15)';
    for (let i=0; i<8; i++) ctx.fillRect(x-w/2+i*40,y-h/2,20,h);
    ctx.strokeStyle='#BF360C'; ctx.lineWidth=1.5; rr(x-w/2,y-h/2,w,h,3); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.fillRect(x-w/2+4,y-h/2+2,w-8,4);
    ctx.fillStyle='#FFF'; ctx.font='bold 11px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=3;
    ctx.fillText('▲  PULE!  ▲', x, y-h/2-13);
    ctx.shadowBlur=0;

  } else if (kind === 'highbar') {
    ctx.fillStyle='#37474F';
    ctx.fillRect(26,y-h/2-22,8,22); ctx.fillRect(W-34,y-h/2-22,8,22);
    const g2 = ctx.createLinearGradient(0,y-h/2,0,y+h/2);
    g2.addColorStop(0,'#546E7A'); g2.addColorStop(1,'#37474F');
    ctx.fillStyle=g2; rr(x-w/2,y-h/2,w,h,3); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.1)';
    for (let i=0; i<6; i++) ctx.fillRect(x-w/2+i*54,y-h/2,27,h);
    ctx.strokeStyle='#263238'; ctx.lineWidth=1.5; rr(x-w/2,y-h/2,w,h,3); ctx.stroke();
    ctx.fillStyle='#00E5FF'; ctx.font='bold 11px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=3;
    ctx.fillText('▼  ABAIXE!  ▼', x, y+h/2+13);
    ctx.shadowBlur=0;

  } else if (kind === 'barrier') {
    ctx.fillStyle='#D32F2F'; rr(x-w/2,y-h/2,w,h,4); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.2)';
    for (let i=0; i<4; i++) ctx.fillRect(x-w/2+i*27,y-h/2,13,h);
    ctx.strokeStyle='#B71C1C'; ctx.lineWidth=1.5; rr(x-w/2,y-h/2,w,h,4); ctx.stroke();
    ctx.fillStyle='#FFB300';
    ctx.fillRect(x-w/2-3,y-h/2-10,7,h+20);
    ctx.fillRect(x+w/2-4,y-h/2-10,7,h+20);
  }

  ctx.restore();
}

// ── DRAW COLLECTIBLE COIN ──────────────────────────────────────────────────────
function drawCard(c) {
  const d = CARD_DEF[c.ck];
  const { x, y } = c;
  const bob = Math.sin(frame * 0.1 + x * 0.05) * 3.5;
  const r   = 15;

  ctx.save();
  ctx.translate(0, bob);

  // Outer glow
  ctx.shadowColor = d.bg; ctx.shadowBlur = 18;
  ctx.fillStyle = d.bg;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;

  // Rim
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke();

  // Inner shine highlight
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.beginPath(); ctx.ellipse(x-3, y-3, r*0.48, r*0.32, -0.5, 0, Math.PI*2); ctx.fill();

  // Glyph label
  ctx.fillStyle = d.fg;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 3;
  ctx.fillText(d.glyph, x, y);
  ctx.shadowBlur = 0;

  ctx.restore();
}

// ── DRAW PLAYER (Subway Surfers inspired) ──────────────────────────────────────
function drawPlayer() {
  const { x, y, w, h, jumpH, crouching, turbo } = P;
  const ry     = y - jumpH;
  const bounce = jumpH < 2 ? Math.sin(frame * 0.3) * 2.2 : 0;
  const leg    = Math.sin(frame * 0.38);
  const ch     = crouching ? h*0.46 : h;
  const cOff   = crouching ? h*0.26 : 0;

  // Ground shadow when jumping
  if (jumpH > 4) {
    const sc = Math.max(0.18, 1 - jumpH/145);
    ctx.save(); ctx.globalAlpha = 0.28*sc;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, y+10, w*0.52*sc, 7*sc, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Magnet ring pulse
  if (P.magnet > 0 && frame%24 < 12) {
    ctx.save(); ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#FFD600'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, ry, 90+(frame%24)*2, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // Turbo ghost trail
  if (turbo > 0) {
    for (let i=1; i<=5; i++) {
      ctx.save(); ctx.globalAlpha = 0.06*(6-i);
      ctx.fillStyle = '#69F0AE';
      rr(x-w/2, ry-ch/2+cOff+i*9, w, ch-i*7, 5); ctx.fill();
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(x, ry + bounce + cOff);

  const jacketCol = turbo>0 ? '#00C853' : '#43A047';
  const pantsCol  = '#1565C0';
  const skinCol   = '#FFCC80';
  const shoeCol   = '#212121';

  if (!crouching) {
    // ── Legs ──
    ctx.save(); ctx.translate(-w*0.16, ch*0.18); ctx.rotate(leg*0.4);
    ctx.fillStyle = pantsCol; ctx.fillRect(-7, 0, 14, ch*0.36); ctx.restore();
    ctx.save(); ctx.translate( w*0.16, ch*0.18); ctx.rotate(-leg*0.4);
    ctx.fillStyle = pantsCol; ctx.fillRect(-7, 0, 14, ch*0.36); ctx.restore();

    // ── Shoes ──
    ctx.save(); ctx.translate(-w*0.16+leg*3, ch*0.52);
    ctx.fillStyle=shoeCol; ctx.fillRect(-9,-5,20,9);
    ctx.fillStyle='#E53935'; ctx.fillRect(-9,-1,6,2); // shoe stripe
    ctx.restore();
    ctx.save(); ctx.translate( w*0.16-leg*3, ch*0.52);
    ctx.fillStyle=shoeCol; ctx.fillRect(-11,-5,20,9);
    ctx.fillStyle='#E53935'; ctx.fillRect(-11,-1,6,2);
    ctx.restore();

    // ── Arms ──
    const arm = -leg*0.3;
    ctx.save(); ctx.translate(-w/2-5, -ch*0.06); ctx.rotate(arm);
    ctx.fillStyle=jacketCol; ctx.fillRect(-5,0,10,ch*0.24); ctx.restore();
    ctx.save(); ctx.translate( w/2+5, -ch*0.06); ctx.rotate(-arm);
    ctx.fillStyle=jacketCol; ctx.fillRect(-5,0,10,ch*0.24); ctx.restore();

    // ── Hands ──
    ctx.fillStyle = skinCol;
    ctx.beginPath(); ctx.arc(-w/2-4, -ch*0.06+ch*0.24, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( w/2+4, -ch*0.06+ch*0.24, 5, 0, Math.PI*2); ctx.fill();
  } else {
    // ── Crouching ──
    ctx.fillStyle=pantsCol;
    ctx.fillRect(-w*0.43,ch*0.06,w*0.38,ch*0.3);
    ctx.fillRect( w*0.05,ch*0.06,w*0.38,ch*0.3);
    ctx.fillStyle=shoeCol;
    ctx.fillRect(-w*0.43,ch*0.36,w*0.34,10);
    ctx.fillRect( w*0.05,ch*0.36,w*0.34,10);
  }

  // ── Body / jacket ──
  ctx.fillStyle=jacketCol;
  rr(-w/2,-ch*0.28,w,ch*0.46,7); ctx.fill();
  // Jacket number/logo
  ctx.fillStyle='rgba(255,255,255,0.22)';
  ctx.font='bold 9px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('11', 0, -ch*0.05);
  // Zipper
  ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(0,-ch*0.28+4); ctx.lineTo(0, ch*0.16); ctx.stroke();
  // Shine
  ctx.fillStyle='rgba(255,255,255,0.1)'; rr(-w/2+3,-ch*0.28+3,w-6,7,4); ctx.fill();

  // ── Head ──
  const hR = crouching ? w*0.22 : w*0.26;
  const hY = crouching ? -ch*0.3  : -ch*0.36;
  ctx.fillStyle=skinCol;
  ctx.beginPath(); ctx.arc(0,hY,hR,0,Math.PI*2); ctx.fill();

  // Eyes
  ctx.fillStyle='#3E2723';
  ctx.beginPath(); ctx.arc(-5,hY+1,2.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 5,hY+1,2.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(-4,hY,  1,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc( 6,hY,  1,0,Math.PI*2); ctx.fill();

  // Mouth
  if (!crouching) {
    ctx.strokeStyle='#3E2723'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(0,hY+5,4,0.2,Math.PI-0.2); ctx.stroke();
  }

  // ── Cap / hat ──
  if (!crouching) {
    // Brim (flat)
    ctx.fillStyle='#FAFAFA';
    ctx.fillRect(-hR*1.35, hY-hR*0.52, hR*2.7, hR*0.32);
    // Crown
    ctx.beginPath(); ctx.arc(0,hY-hR*0.72,hR*0.95,Math.PI,0); ctx.fill();
    ctx.fillRect(-hR*0.95,hY-hR*0.72,hR*1.9,hR*0.32); ctx.fill();
    // Red stripe
    ctx.fillStyle='#E53935';
    ctx.fillRect(-hR*0.95,hY-hR*0.75,hR*1.9,4);
    // Snap button
    ctx.fillStyle='#BDBDBD';
    ctx.beginPath(); ctx.arc(0,hY-hR*1.66,2.5,0,Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle='#FAFAFA';
    ctx.fillRect(-hR*1.1,hY-hR*0.5,hR*2.2,hR*0.28);
    ctx.beginPath(); ctx.arc(0,hY-hR*0.5,hR*0.82,Math.PI,0); ctx.fill();
    ctx.fillStyle='#E53935';
    ctx.fillRect(-hR*0.82,hY-hR*0.53,hR*1.64,3);
  }

  ctx.restore();
}

function drawParticle(p) {
  ctx.save(); ctx.globalAlpha=p.life;
  ctx.fillStyle=p.color;
  ctx.beginPath(); ctx.arc(p.x,p.y,p.r*Math.max(0.2,p.life),0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawPopup(p) {
  ctx.save(); ctx.globalAlpha=p.life;
  ctx.font='bold 16px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=5;
  ctx.fillStyle=p.color; ctx.fillText(p.text, p.x, p.y);
  ctx.restore();
}

// ── OVERLAY: START SCREEN ──────────────────────────────────────────────────────
function drawStart() {
  drawBackground();

  // Semi-transparent overlay
  ctx.fillStyle='rgba(0,8,30,0.78)';
  ctx.fillRect(0, 0, W, H);

  // Panel card
  ctx.save();
  ctx.fillStyle='rgba(13,25,65,0.92)';
  rr(22, 130, W-44, 340, 18); ctx.fill();
  ctx.strokeStyle='rgba(255,220,50,0.6)'; ctx.lineWidth=2.5;
  rr(22, 130, W-44, 340, 18); ctx.stroke();

  ctx.textAlign='center'; ctx.textBaseline='middle';

  // Title
  ctx.font='bold 28px sans-serif';
  ctx.shadowColor='#FFD600'; ctx.shadowBlur=20;
  ctx.fillStyle='#FFD600'; ctx.fillText('Corrida do Aloncinho', W/2, 168);
  ctx.shadowBlur=0;
  ctx.fillStyle='#90CAF9'; ctx.font='12px sans-serif';
  ctx.fillText('Subway Runner — desvie e colete!', W/2, 192);

  // Controls
  const ctrls=[
    {key:'← →',        desc:'Mudar de faixa'},
    {key:'↑ / Espaço', desc:'Pular obstáculos'},
    {key:'↓ (segurar)',desc:'Abaixar de placas'},
  ];
  ctrls.forEach((c,i)=>{
    ctx.fillStyle='rgba(255,255,255,0.06)';
    rr(W/2-136, 214+i*38, 272, 30, 8); ctx.fill();
    ctx.fillStyle='#FFD54F'; ctx.font='bold 12px sans-serif'; ctx.textAlign='left';
    ctx.fillText(c.key, W/2-128, 229+i*38);
    ctx.fillStyle='#B0BEC5'; ctx.font='12px sans-serif'; ctx.textAlign='right';
    ctx.fillText(c.desc, W/2+128, 229+i*38);
    ctx.textAlign='center';
  });

  if (best>0) {
    ctx.fillStyle='#FFD600'; ctx.font='14px sans-serif';
    ctx.fillText(`🏆 Recorde: ${best}`, W/2, 364);
  }

  // Play button
  const grad = ctx.createLinearGradient(W/2-105, 385, W/2+105, 423);
  grad.addColorStop(0,'#FFD600'); grad.addColorStop(1,'#FF6D00');
  ctx.fillStyle=grad;
  rr(W/2-105, 385, 210, 46, 23); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1.5;
  rr(W/2-105, 385, 210, 46, 23); ctx.stroke();
  ctx.fillStyle='#0D0D1A'; ctx.font='bold 18px sans-serif';
  ctx.fillText('▶  JOGAR AGORA!', W/2, 408);

  ctx.restore();
}

// ── OVERLAY: DEAD SCREEN ───────────────────────────────────────────────────────
function drawDead() {
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H);

  ctx.fillStyle='rgba(10,15,45,0.95)';
  rr(28, H/2-128, W-56, 258, 18); ctx.fill();
  ctx.strokeStyle='#EF5350'; ctx.lineWidth=2.5;
  rr(28, H/2-128, W-56, 258, 18); ctx.stroke();

  ctx.textAlign='center'; ctx.textBaseline='middle';

  ctx.font='bold 36px sans-serif';
  ctx.shadowColor='#EF5350'; ctx.shadowBlur=22;
  ctx.fillStyle='#EF5350'; ctx.fillText('GAME OVER!', W/2, H/2-88);
  ctx.shadowBlur=0;

  ctx.fillStyle='#ECEFF1'; ctx.font='bold 22px sans-serif';
  ctx.fillText(`${Math.floor(score)} pontos`, W/2, H/2-44);

  ctx.fillStyle='#FFD600'; ctx.font='16px sans-serif';
  ctx.fillText(`🏆 Recorde: ${best}`, W/2, H/2-12);

  if (Math.floor(score) >= best && score > 0) {
    ctx.fillStyle='#00E5FF'; ctx.font='bold 14px sans-serif';
    ctx.fillText('★ Novo recorde! ★', W/2, H/2+16);
  }

  // Retry button
  const grad = ctx.createLinearGradient(W/2-105, H/2+42, W/2+105, H/2+86);
  grad.addColorStop(0,'#00BCD4'); grad.addColorStop(1,'#006064');
  ctx.fillStyle=grad;
  rr(W/2-105, H/2+42, 210, 46, 23); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1.5;
  rr(W/2-105, H/2+42, 210, 46, 23); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 16px sans-serif';
  ctx.fillText('↻  TENTAR DE NOVO', W/2, H/2+65);

  ctx.restore();
}

// ── HUD ────────────────────────────────────────────────────────────────────────
function updateHUD() {
  if (scoreEl) scoreEl.textContent = Math.floor(score);
  if (bestEl)  bestEl.textContent  = best;
  const lvl = Math.ceil((baseSpeed-3.0)/0.38)+1;
  if (speedEl) speedEl.textContent = `${Math.min(9,lvl)}×`;
}

function updatePowers() {
  if (!powersEl) return;
  const chips = [];
  if (P.magnet>0) chips.push({label:'Ímã',   color:'#FFD600', pct:P.magnet/360});
  if (P.turbo>0)  chips.push({label:'Turbo', color:'#00C853', pct:P.turbo/240});
  powersEl.innerHTML = chips.map(c=>`
    <div class="runner-power-chip">
      <span>${c.label}</span>
      <div class="runner-chip-bar-bg">
        <div class="runner-chip-bar" style="width:${Math.min(100,Math.round(c.pct*100))}%;background:${c.color}"></div>
      </div>
    </div>`).join('');
}

// ── MAIN LOOP ──────────────────────────────────────────────────────────────────
function loop() {
  requestAnimationFrame(loop);
  ctx.clearRect(0,0,W,H);

  if (state==='start') { drawStart(); return; }

  drawBackground();

  if (state==='dead') {
    obstacles.forEach(drawObstacle);
    cards.forEach(drawCard);
    parts.forEach(drawParticle);
    drawPlayer();
    drawDead();
    return;
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  frame++;
  const spd = baseSpeed + (P.turbo>0 ? 2.0 : 0);

  if (frame%600===0) baseSpeed = Math.min(baseSpeed+0.38, 8.6);
  score += spd*0.05;
  if (Math.floor(score)>best) {
    best=Math.floor(score);
    localStorage.setItem('runner-best', best);
  }

  // Jump physics
  if (P.jumpH>0 || P.jumpVY>0) {
    P.jumpVY -= GRAV;
    P.jumpH   = Math.max(0, P.jumpH+P.jumpVY);
    if (P.jumpH===0) P.jumpVY=0;
  }

  if (P.turbo >0) P.turbo--;
  if (P.magnet>0) P.magnet--;

  P.x += (P.targetX - P.x) * 0.2;

  const oRate = Math.max(46, 108-Math.floor(baseSpeed*7));
  if (frame%oRate===0) spawnObstacle();
  const cRate = Math.max(26, 68-Math.floor(baseSpeed*4));
  if (frame%cRate===0) spawnCard();

  // Obstacles
  let died=false;
  for (let i=obstacles.length-1; i>=0; i--) {
    const o=obstacles[i];
    o.y+=spd;
    if (o.y>H+80) { obstacles.splice(i,1); continue; }
    if (obstacleKills(o)) { died=true; break; }
  }

  // Cards/coins
  for (let i=cards.length-1; i>=0; i--) {
    const c=cards[i];
    c.y+=spd;
    if (P.magnet>0) {
      const dx=P.x-c.x, dy=(P.y-P.jumpH)-c.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if (dist<140&&dist>1) { c.x+=dx/dist*4; c.y+=dy/dist*4; }
    }
    if (c.y>H+50) { cards.splice(i,1); continue; }
    const pCY=P.y-P.jumpH;
    const pCH=P.crouching?P.h*0.46:P.h*0.6;
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

  // ── DRAW ───────────────────────────────────────────────────────────────────
  obstacles.forEach(drawObstacle);
  cards.forEach(drawCard);
  parts.forEach(drawParticle);
  drawPlayer();
  popups.forEach(drawPopup);

  // In-game state hints
  const hintY = P.y - P.jumpH - P.h*0.6;
  if (P.crouching) {
    ctx.save(); ctx.globalAlpha=0.65;
    ctx.fillStyle='#00E5FF'; ctx.font='bold 10px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText('AGACHADO', P.x, hintY);
    ctx.restore();
  } else if (P.jumpH>10) {
    ctx.save(); ctx.globalAlpha=0.65;
    ctx.fillStyle='#FFD600'; ctx.font='bold 10px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText('PULANDO!', P.x, hintY);
    ctx.restore();
  }

  if (died) state='dead';
  if (frame%4===0) { updateHUD(); updatePowers(); }
}

// Init
bestEl && (bestEl.textContent=best);
loop();
