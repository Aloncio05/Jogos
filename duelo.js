'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
const W  = 700;
const H  = 440;
const PR = 15;   // player radius
const BR = 5;    // bullet radius
const KILLS_TO_WIN = 3;

// Phase definitions: obstacles are {x,y,w,h} rects
const PHASES = [
  {
    name: 'Arena Aberta',
    desc: 'Campo aberto — sem obstáculos. Mira e atira!',
    obs: [],
  },
  {
    name: 'Pilar Central',
    desc: 'Um bloco no centro. Use-o como cobertura.',
    obs: [{ x: 310, y: 170, w: 80, h: 100 }],
  },
  {
    name: 'Duas Colunas',
    desc: 'Duas colunas dividem a arena.',
    obs: [
      { x: 195, y: 120, w: 28, h: 200 },
      { x: 477, y: 120, w: 28, h: 200 },
    ],
  },
  {
    name: 'Cruz',
    desc: 'Uma cruz no centro. Cuidado nos cantos!',
    obs: [
      { x: 310, y: 100, w: 80, h: 240 },
      { x: 170, y: 200, w: 360, h: 40 },
    ],
  },
  {
    name: 'Fortaleza',
    desc: 'Quatro torres e um bunker central.',
    obs: [
      { x: 110, y: 90,  w: 70, h: 70 },
      { x: 520, y: 90,  w: 70, h: 70 },
      { x: 110, y: 280, w: 70, h: 70 },
      { x: 520, y: 280, w: 70, h: 70 },
      { x: 300, y: 180, w: 100, h: 80 },
    ],
  },
  {
    name: 'Labirinto',
    desc: 'Paredes cruzadas. Bullets ricocheteiam!',
    obs: [
      { x: 160, y:  80, w: 20, h: 180 },
      { x: 520, y: 180, w: 20, h: 180 },
      { x: 160, y:  80, w: 200, h: 20 },
      { x: 340, y: 340, w: 200, h: 20 },
      { x: 295, y: 175, w: 110, h: 90 },
    ],
  },
  {
    name: 'Corredor Duplo',
    desc: 'Dois corredores — escolha seu caminho.',
    obs: [
      { x: 100, y: 180, w: 500, h: 22 },
      { x: 100, y: 238, w: 500, h: 22 },
      { x: 100, y: 180, w: 22,  h: 80 },
      { x: 578, y: 180, w: 22,  h: 80 },
    ],
  },
  {
    name: 'Arena Final',
    desc: 'Paredes externas + bunker central. Tudo ou nada!',
    obs: [
      { x:  70, y: 120, w: 22, h: 200 },
      { x: 608, y: 120, w: 22, h: 200 },
      { x: 190, y:  70, w: 320, h: 22 },
      { x: 190, y: 348, w: 320, h: 22 },
      { x: 305, y: 175, w: 90,  h: 90  },
    ],
  },
];

// Difficulty ramps per phase (0-indexed)
function phaseSpeed(ph)     { return 155 + ph * 14; }
function phaseBulletSpd(ph) { return 290 + ph * 24; }
function phaseFireCD(ph)    { return Math.max(0.26, 0.54 - ph * 0.038); }
function phaseBulletLife(ph){ return 2.6 - ph * 0.04; }

// ── State ─────────────────────────────────────────────────────────────────────
let canvas, ctx, overlay;
let phase = 0;
let wins  = [0, 0];
let state = 'idle'; // idle | countdown | playing | phaseOver | gameOver
let players, bullets, keys;
let animReq = null;
let lastTs  = 0;
let cdValue = 0; // countdown number shown

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  canvas  = document.getElementById('duelo-canvas');
  ctx     = canvas.getContext('2d');
  overlay = document.getElementById('duelo-overlay');

  keys = {};
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup',   e => { keys[e.code] = false; });
  canvas.addEventListener('click', () => {
    if (state === 'idle' || state === 'phaseOver' || state === 'gameOver') advanceState();
  });

  showStartOverlay();
  renderIdle();
  loop(performance.now());
});

function onKey(e) {
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === 'Enter') {
    e.preventDefault();
    if (state !== 'playing' && state !== 'countdown') advanceState();
  }
  if (e.code === 'Space' && state !== 'playing' && state !== 'countdown') {
    advanceState();
  }
}

function advanceState() {
  if (state === 'idle')      startCountdown();
  else if (state === 'phaseOver') {
    if (phase + 1 >= PHASES.length) showGameOver();
    else { phase++; startCountdown(); }
  }
  else if (state === 'gameOver') { phase = 0; wins = [0,0]; startCountdown(); }
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function loop(ts) {
  animReq = requestAnimationFrame(loop);
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs = ts;
  if (state === 'playing') { update(dt); render(); }
  else if (state === 'countdown') renderCountdown();
}

// ── Overlays ──────────────────────────────────────────────────────────────────
function showStartOverlay() {
  state = 'idle';
  overlay.hidden = false;
  overlay.innerHTML = `
    <div class="duelo-ol-box">
      <h3>Duelo do Aloncinho</h3>
      <p>2 jogadores · mesmo teclado</p>
      <div class="duelo-controls">
        <div class="duelo-ctrl duelo-ctrl-p1">
          <strong>🔵 Jogador 1</strong>
          <span>WASD — mover</span>
          <span>Espaço — atirar</span>
        </div>
        <div class="duelo-ctrl duelo-ctrl-p2">
          <strong>🔴 Jogador 2</strong>
          <span>Setas — mover</span>
          <span>Enter — atirar</span>
        </div>
      </div>
      <p class="duelo-ol-sub">Faça 3 kills para ganhar a fase · 8 fases · velocidade aumenta!</p>
      <button class="duelo-btn" id="duelo-start-btn">▶ Começar</button>
    </div>`;
  document.getElementById('duelo-start-btn').onclick = startCountdown;
}

function startCountdown() {
  state   = 'countdown';
  bullets = [];
  players = makePlayers();
  overlay.hidden = true;
  updateHUD();
  cdValue = 3;

  const tick = () => {
    if (state !== 'countdown') return;
    cdValue--;
    if (cdValue <= 0) { state = 'playing'; }
    else setTimeout(tick, 800);
  };
  setTimeout(tick, 800);
}

function renderCountdown() {
  render();
  const label = cdValue > 0 ? String(cdValue) : 'GO!';
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle   = '#0b1020';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.font = 'bold 110px Inter, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = cdValue > 1 ? '#f8fafc' : cdValue === 1 ? '#fbbf24' : '#34d399';
  ctx.shadowColor  = ctx.fillStyle;
  ctx.shadowBlur   = 60;
  ctx.fillText(label, W / 2, H / 2);

  // Phase name
  ctx.shadowBlur = 0;
  ctx.font = 'bold 18px Inter, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Fase ${phase + 1} — ${PHASES[phase].name}`, W / 2, H / 2 + 80);
  ctx.restore();
}

function showPhaseOver(winner) {
  state = 'phaseOver';
  wins[winner]++;
  updateHUD();

  const isLast = phase + 1 >= PHASES.length;
  const col    = winner === 0 ? '#38bdf8' : '#f87171';
  const nextPh = PHASES[phase + 1];

  overlay.hidden = false;
  overlay.innerHTML = `
    <div class="duelo-ol-box">
      <p class="duelo-ol-winner" style="color:${col}">
        ${winner === 0 ? '🔵 Jogador 1' : '🔴 Jogador 2'} venceu a fase!
      </p>
      <div class="duelo-score-line">
        <span style="color:#38bdf8">P1: ${wins[0]}</span>
        <span style="color:#475569">fases</span>
        <span style="color:#f87171">P2: ${wins[1]}</span>
      </div>
      ${isLast
        ? `<p>Todas as fases concluídas!</p>
           <button class="duelo-btn" id="duelo-next-btn">🏆 Ver resultado</button>`
        : `<p>Próxima: <strong>${nextPh.name}</strong> — ${nextPh.desc}</p>
           <button class="duelo-btn" id="duelo-next-btn">Próxima fase ▶</button>`
      }
    </div>`;

  document.getElementById('duelo-next-btn').onclick = advanceState;
}

function showGameOver() {
  state = 'gameOver';
  const tie   = wins[0] === wins[1];
  const champ = wins[0] > wins[1] ? 0 : 1;
  const col   = champ === 0 ? '#38bdf8' : '#f87171';
  const msg   = tie
    ? '🤝 Empate épico!'
    : `${champ === 0 ? '🔵 Jogador 1' : '🔴 Jogador 2'} é o Campeão!`;

  overlay.hidden = false;
  overlay.innerHTML = `
    <div class="duelo-ol-box">
      <h3>Duelo encerrado!</h3>
      <p class="duelo-ol-winner" style="color:${tie ? '#fbbf24' : col}">${msg}</p>
      <div class="duelo-score-line">
        <span style="color:#38bdf8">🔵 P1: ${wins[0]} fase${wins[0] !== 1 ? 's' : ''}</span>
        <span style="color:#475569">·</span>
        <span style="color:#f87171">🔴 P2: ${wins[1]} fase${wins[1] !== 1 ? 's' : ''}</span>
      </div>
      <button class="duelo-btn" id="duelo-next-btn">🔄 Jogar de novo</button>
    </div>`;

  document.getElementById('duelo-next-btn').onclick = advanceState;
}

// ── Player factory ─────────────────────────────────────────────────────────────
function makePlayers() {
  return [
    {
      x: 70, y: H / 2, dx: 1, dy: 0,
      kills: 0, fireCD: 0,
      color: '#38bdf8', outline: '#0369a1', glow: 'rgba(56,189,248,0.6)',
      up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire: 'Space',
      dead: false, respawnT: 0, flashT: 0,
      spawnX: 70, spawnY: H / 2,
    },
    {
      x: W - 70, y: H / 2, dx: -1, dy: 0,
      kills: 0, fireCD: 0,
      color: '#f87171', outline: '#b91c1c', glow: 'rgba(248,113,113,0.6)',
      up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: 'Enter',
      dead: false, respawnT: 0, flashT: 0,
      spawnX: W - 70, spawnY: H / 2,
    },
  ];
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  const obs  = PHASES[phase].obs;
  const spd  = phaseSpeed(phase);
  const bspd = phaseBulletSpd(phase);
  const fcd  = phaseFireCD(phase);
  const blife= phaseBulletLife(phase);

  // Players
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (p.flashT > 0) p.flashT -= dt;

    if (p.dead) {
      p.respawnT -= dt;
      if (p.respawnT <= 0) {
        p.dead = false;
        p.x = p.spawnX;
        p.y = p.spawnY + (Math.random() - 0.5) * 60;
        p.y = clamp(p.y, PR + 5, H - PR - 5);
      }
      continue;
    }

    // Input
    let mx = 0, my = 0;
    if (keys[p.up])    my -= 1;
    if (keys[p.down])  my += 1;
    if (keys[p.left])  mx -= 1;
    if (keys[p.right]) mx += 1;

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      p.dx = mx; p.dy = my;
    }

    // Move
    let nx = p.x + mx * spd * dt;
    let ny = p.y + my * spd * dt;
    nx = clamp(nx, PR, W - PR);
    ny = clamp(ny, PR, H - PR);
    [p.x, p.y] = resolveObs(nx, ny, obs);

    // Fire
    p.fireCD -= dt;
    if (keys[p.fire] && p.fireCD <= 0) {
      bullets.push({
        x: p.x + p.dx * (PR + BR + 3),
        y: p.y + p.dy * (PR + BR + 3),
        dx: p.dx, dy: p.dy,
        spd: bspd, life: blife,
        owner: i, bounces: 0,
      });
      p.fireCD = fcd;
    }
  }

  // Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.life -= dt;
    if (b.life <= 0) { bullets.splice(i, 1); continue; }

    b.x += b.dx * b.spd * dt;
    b.y += b.dy * b.spd * dt;

    // Arena wall bounce
    let bounced = false;
    if (b.x < BR)     { b.dx = Math.abs(b.dx);  b.x = BR;     bounced = true; }
    if (b.x > W - BR) { b.dx = -Math.abs(b.dx); b.x = W - BR; bounced = true; }
    if (b.y < BR)     { b.dy = Math.abs(b.dy);  b.y = BR;     bounced = true; }
    if (b.y > H - BR) { b.dy = -Math.abs(b.dy); b.y = H - BR; bounced = true; }
    if (bounced) b.bounces++;

    // Obstacle bounce
    for (const o of obs) {
      if (circleRect(b.x, b.y, BR, o)) {
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        const ex = b.x - cx, ey = b.y - cy;
        if (Math.abs(ex / o.w) > Math.abs(ey / o.h)) {
          b.dx *= -1;
          b.x   = ex > 0 ? o.x + o.w + BR : o.x - BR;
        } else {
          b.dy *= -1;
          b.y   = ey > 0 ? o.y + o.h + BR : o.y - BR;
        }
        b.bounces++;
        break;
      }
    }

    // Max bounces
    if (b.bounces > 6 + phase) { bullets.splice(i, 1); continue; }

    // Hit player
    let removed = false;
    for (let j = 0; j < players.length; j++) {
      if (b.owner === j || players[j].dead) continue;
      const p = players[j];
      if (Math.hypot(b.x - p.x, b.y - p.y) < PR + BR) {
        bullets.splice(i, 1);
        removed = true;
        p.dead = true;
        p.respawnT = 1.4;
        p.flashT   = 0.4;
        players[b.owner].kills++;
        popKillHUD(b.owner);
        if (players[b.owner].kills >= KILLS_TO_WIN) {
          setTimeout(() => { if (state === 'playing') showPhaseOver(b.owner); }, 300);
        }
        break;
      }
    }
    if (removed) continue;
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);

  // Floor
  ctx.fillStyle = '#0d1428';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Phase number watermark
  ctx.font = 'bold 140px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  ctx.fillText(phase + 1, W / 2, H / 2);

  // Obstacles
  for (const o of PHASES[phase].obs) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, o.x + 4, o.y + 4, o.w, o.h, 8);
    ctx.fill();

    // Body
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, o.x, o.y, o.w, o.h, 8);
    ctx.fill();

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top highlight
    ctx.fillStyle = 'rgba(148,163,184,0.10)';
    roundRect(ctx, o.x + 2, o.y + 2, o.w - 4, 8, [6, 6, 0, 0]);
    ctx.fill();
  }

  // Bullets
  for (const b of bullets) {
    const p     = players[b.owner];
    const alpha = Math.min(1, b.life / 0.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, BR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, BR - 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Trail
    ctx.globalAlpha *= 0.35;
    ctx.beginPath();
    ctx.arc(b.x - b.dx * 8, b.y - b.dy * 8, BR * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Players
  for (let i = 0; i < players.length; i++) {
    const p = players[i];

    if (p.dead) {
      // Respawn ghost pulse
      const t = Math.sin(performance.now() / 180) * 0.5 + 0.5;
      ctx.save();
      ctx.globalAlpha = 0.12 + t * 0.13;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.spawnX, p.spawnY, PR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.translate(p.x, p.y);

    // Hit flash
    if (p.flashT > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(p.flashT * 40) * 0.5;
    }

    // Glow
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 20;

    // Body circle
    ctx.fillStyle   = p.color;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(0, 0, PR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Specular shine
    ctx.shadowBlur = 0;
    ctx.fillStyle  = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.arc(-4, -5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator (gun barrel)
    const angle = Math.atan2(p.dy, p.dx);
    ctx.fillStyle   = p.outline;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth   = 1;
    ctx.save();
    ctx.rotate(angle);
    // Barrel
    ctx.fillRect(PR - 2, -3, 10, 6);
    ctx.strokeRect(PR - 2, -3, 10, 6);
    ctx.restore();

    // Player number
    ctx.shadowBlur = 0;
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#fff';
    ctx.globalAlpha  = Math.min(ctx.globalAlpha, 1);
    ctx.fillText(`P${i + 1}`, 0, 1);

    ctx.restore();
  }
}

function renderIdle() {
  ctx.fillStyle = '#0d1428';
  ctx.fillRect(0, 0, W, H);
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('duelo-phase-label').textContent = `Fase ${phase + 1} / ${PHASES.length}`;
  document.getElementById('duelo-phase-name').textContent  = PHASES[phase].name;

  for (let i = 0; i < 2; i++) {
    const kills = players ? players[i].kills : 0;
    document.getElementById(`duelo-wins-p${i + 1}`).textContent =
      `${wins[i]} fase${wins[i] !== 1 ? 's' : ''}`;
    const el = document.getElementById(`duelo-kills-p${i + 1}`);
    el.innerHTML = Array.from({ length: KILLS_TO_WIN }, (_, k) =>
      `<div class="duelo-pip${kills > k ? ' filled' : ''}"></div>`
    ).join('');
  }
}

function popKillHUD(playerIdx) {
  const el = document.getElementById(`duelo-kills-p${playerIdx + 1}`);
  const kills = players[playerIdx].kills;
  const pips  = el.querySelectorAll('.duelo-pip');
  if (pips[kills - 1]) {
    pips[kills - 1].classList.add('filled', 'just-earned');
    setTimeout(() => pips[kills - 1]?.classList.remove('just-earned'), 400);
  }
  const winsEl = document.getElementById(`duelo-wins-p${playerIdx + 1}`);
  winsEl.textContent = `${wins[playerIdx]} fase${wins[playerIdx] !== 1 ? 's' : ''}`;
}

// ── Collision helpers ─────────────────────────────────────────────────────────
function circleRect(cx, cy, cr, r) {
  const nx = clamp(cx, r.x, r.x + r.w);
  const ny = clamp(cy, r.y, r.y + r.h);
  return (cx - nx) ** 2 + (cy - ny) ** 2 < cr * cr;
}

function resolveObs(px, py, obs) {
  let x = px, y = py;
  for (const o of obs) {
    if (!circleRect(x, y, PR, o)) continue;
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    const ex = x - cx, ey = y - cy;
    if (Math.abs(ex / o.w) > Math.abs(ey / o.h)) {
      x = ex > 0 ? o.x + o.w + PR : o.x - PR;
    } else {
      y = ey > 0 ? o.y + o.h + PR : o.y - PR;
    }
  }
  return [clamp(x, PR, W - PR), clamp(y, PR, H - PR)];
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function roundRect(ctx, x, y, w, h, r) {
  const tl = typeof r === 'number' ? r : r[0];
  const tr = typeof r === 'number' ? r : r[1];
  const br2= typeof r === 'number' ? r : r[2];
  const bl = typeof r === 'number' ? r : r[3];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.arcTo(x + w, y,     x + w, y + h, tr);
  ctx.arcTo(x + w, y + h, x,     y + h, br2);
  ctx.arcTo(x,     y + h, x,     y,     bl);
  ctx.arcTo(x,     y,     x + w, y,     tl);
  ctx.closePath();
}
