'use strict';
/* global THREE */

// ── Corrida do Aloncinho 3D — Cartoon Style ──────────────────────────────────

const W = 360, H = 600;
const LANE_X      = [-3, 0, 3];
const SPAWN_Z     = -130;
const DESPAWN_Z   = 12;
const BASE_SPEED  = 22;
const MAX_SPEED   = 70;
const SPEED_INC   = 1.5;
const SPEED_TICK  = 5;
const GRAV_UP     = -28;   // gravidade subindo (mais suave)
const GRAV_DOWN   = -54;   // gravidade descendo (queda rápida)
const JUMP_V      = 14;
const GROUND_Y    = 0;
const CROUCH_S    = 0.5;
const TILE_PERIOD = 8 * 24;
const REVIVE_COST = 50;

// ── State ────────────────────────────────────────────────────────────────────
let three = {};
let playerObj = {};
let obstacles = [], coins = [], keys = [];
let envTiles = [], envBuildings = [];
let gradMap;  // toon gradient texture

let state       = 'idle';
let score       = 0;
let best        = parseInt(localStorage.getItem('runner-best') || '0');
let speed       = BASE_SPEED;
let targetLane  = 1;
let playerY     = GROUND_Y;
let playerVY    = 0;
let crouching   = false;
let wasOnGround = true;
let laneLean    = 0;
let animFrame   = 0;
let spawnT = 0, coinT = 0, scoreT = 0, speedT = 0, powerUpT = 0, keyT = 0;

// ── Power-ups ─────────────────────────────────────────────────────────────────
let powerUps = [];
let magnetActive = 0, shieldActive = 0, multiplierActive = 0, jetpackActive = 0;
let invincibleT  = 0;

// ── Progressão ───────────────────────────────────────────────────────────────
let coinBank       = parseInt(localStorage.getItem('runner-coins') || '0');
let coinsThisRun   = 0;
let distance       = 0;
let coinStreak = 0, coinStreakT = 0;
let hasKey         = false;
let reviveCount = 0;
let jumpCount      = 0;
let powerUpsUsed   = 0;
let runTime        = 0;
let missions       = [];

// ── DOM ──────────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('runner-canvas');
const scoreEl  = document.getElementById('runner-score');
const bestEl   = document.getElementById('runner-best');
const speedEl  = document.getElementById('runner-speed');
const overlay  = document.getElementById('runner-overlay');
const powersEl = document.getElementById('runner-powers');
const bankEl   = document.getElementById('runner-bank');
const distEl   = document.getElementById('runner-dist');
const missEl   = document.getElementById('runner-miss');

bestEl.textContent = best;

// ── Web Audio (sons sem arquivos) ─────────────────────────────────────────────
let _audioCtx;
function audioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}
function _tone(freq, endFreq, dur, type, vol) {
  try {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch(e) {}
}
function sfxJump()  { _tone(300, 600, 0.13, 'square',   0.07); }
function sfxLand()  { _tone(160, 80,  0.10, 'sine',     0.06); }
function sfxCoin()  {
  _tone(800,  0,    0.08, 'sine',   0.12);
  setTimeout(() => _tone(1200, 0, 0.10, 'sine', 0.10), 60);
}
function sfxDie()   { _tone(380, 55,  0.55, 'sawtooth', 0.15); }
function sfxSpeed() {
  _tone(440, 0, 0.07, 'square', 0.07);
  setTimeout(() => _tone(660, 0, 0.09, 'square', 0.07), 70);
}
function sfxPower()     { _tone(500, 1100, 0.28, 'sine', 0.13); }
function sfxShieldHit() { _tone(350, 80,  0.35, 'sawtooth', 0.14); }
function sfxKey()       { _tone(900, 1400, 0.20, 'sine', 0.12); setTimeout(() => _tone(1600, 0, 0.14, 'sine', 0.09), 180); }
function sfxJetThrust() { _tone(140, 90, 0.16, 'sawtooth', 0.055); _tone(220, 170, 0.14, 'square', 0.03); }

// ── Banco de moedas ───────────────────────────────────────────────────────────
function updateCoinBankHUD() {
  if (bankEl) bankEl.textContent = coinBank + coinsThisRun;
}

// ── Missões diárias ───────────────────────────────────────────────────────────
const MISSION_DEFS = [
  { id: 'coins',    label: 'Colete {n} moedas',   targets: [15, 25, 40],    reward: 20 },
  { id: 'jumps',    label: 'Pule {n} vezes',       targets: [5, 10, 15],     reward: 15 },
  { id: 'powerups', label: 'Use {n} power-ups',    targets: [1, 2, 3],       reward: 15 },
  { id: 'dist',     label: 'Corra {n}m',           targets: [200, 400, 700], reward: 25 },
  { id: 'score',    label: 'Faça {n} pontos',      targets: [100, 250, 450], reward: 30 },
];

function missionSeed() {
  return new Date().toDateString().split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
}

function generateDailyMissions() {
  let s = missionSeed();
  const pool = MISSION_DEFS.map((_, i) => i);
  const result = [];
  while (result.length < 3 && pool.length) {
    s = ((s * 1664525) + 1013904223) | 0;
    const idx = Math.abs(s) % pool.length;
    const defIdx = pool.splice(idx, 1)[0];
    const def    = MISSION_DEFS[defIdx];
    s = ((s * 1664525) + 1013904223) | 0;
    const level = Math.abs(s) % 3;
    result.push({ id: def.id, label: def.label.replace('{n}', def.targets[level]),
      target: def.targets[level], reward: def.reward, progress: 0, done: false });
  }
  return result;
}

function loadDailyMissions() {
  const today = new Date().toDateString();
  try {
    const saved = JSON.parse(localStorage.getItem('runner-missions') || '{}');
    if (saved.date === today && saved.list) { missions = saved.list; updateMissionHUD(); return; }
  } catch(e) {}
  missions = generateDailyMissions();
  saveMissions();
  updateMissionHUD();
}

function saveMissions() {
  try { localStorage.setItem('runner-missions', JSON.stringify({ date: new Date().toDateString(), list: missions })); } catch(e) {}
}

function advanceMission(id, amount) {
  let changed = false;
  missions.forEach(m => {
    if (m.id !== id || m.done) return;
    m.progress = Math.min(m.target, m.progress + amount);
    if (m.progress >= m.target) {
      m.done = true;
      coinBank += m.reward;
      localStorage.setItem('runner-coins', coinBank);
      updateCoinBankHUD();
      showPowerNotif('✅ MISSÃO! +' + m.reward + '🪙', '#22c55e');
      sfxPower();
    }
    changed = true;
  });
  if (changed) { saveMissions(); updateMissionHUD(); }
}

function updateMissionHUD() {
  if (!missEl) return;
  const done = missions.filter(m => m.done).length;
  missEl.textContent = done + '/' + missions.length;
}

// ── HUD helpers ───────────────────────────────────────────────────────────────
function coinPop(val) {
  const wrap = canvas.parentElement;
  const div  = document.createElement('div');
  div.textContent = (val > 5 ? '×2 ' : '') + '+' + val;
  Object.assign(div.style, {
    position:'absolute', left:'50%', top:'52%',
    transform:'translateX(-50%)', color:'#ffee00',
    fontWeight:'900', fontSize:'1.8rem', lineHeight:'1',
    textShadow:'0 2px 8px #000, 0 0 16px #ff8800',
    pointerEvents:'none', zIndex:'10', transition:'all 0.65s ease-out',
  });
  wrap.appendChild(div);
  requestAnimationFrame(() => { div.style.top = '30%'; div.style.opacity = '0'; });
  setTimeout(() => div.remove(), 700);
}

function updatePowerHUD() {
  if (!powersEl) return;
  let html = '';
  if (magnetActive     > 0) html += `<span class="runner-power-chip" style="background:#3b82f6">🧲 ${Math.ceil(magnetActive)}s</span>`;
  if (shieldActive     > 0) html += `<span class="runner-power-chip" style="background:#22c55e">🛡️ ${Math.ceil(shieldActive)}s</span>`;
  if (multiplierActive > 0) html += `<span class="runner-power-chip" style="background:#a855f7">2× ${Math.ceil(multiplierActive)}s</span>`;
  if (jetpackActive    > 0) html += `<span class="runner-power-chip" style="background:#ff6600">🚀 ${Math.ceil(jetpackActive)}s</span>`;
  if (hasKey)               html += `<span class="runner-power-chip" style="background:#ccaa00">🗝️ CHAVE</span>`;
  powersEl.innerHTML = html;
}

function showPowerNotif(text, color) {
  const wrap = canvas.parentElement;
  const div  = document.createElement('div');
  div.textContent = text;
  Object.assign(div.style, {
    position:'absolute', left:'50%', top:'42%',
    transform:'translateX(-50%) scale(1)', color:'#fff',
    fontWeight:'900', fontSize:'1.2rem',
    background:color, borderRadius:'20px',
    padding:'5px 18px',
    textShadow:'0 2px 8px #000',
    pointerEvents:'none', zIndex:'10', whiteSpace:'nowrap',
    transition:'all 0.75s ease-out',
  });
  wrap.appendChild(div);
  requestAnimationFrame(() => { div.style.top = '26%'; div.style.opacity = '0'; });
  setTimeout(() => div.remove(), 850);
}

function flashScreen(color, ms) {
  const wrap = canvas.parentElement;
  const div  = document.createElement('div');
  Object.assign(div.style, {
    position:'absolute', inset:'0', background:color,
    pointerEvents:'none', zIndex:'8', borderRadius:'18px',
    transition:`opacity ${ms}ms ease-out`,
  });
  wrap.appendChild(div);
  requestAnimationFrame(() => { div.style.opacity = '0'; });
  setTimeout(() => div.remove(), ms + 50);
}

// ── Camera shake ──────────────────────────────────────────────────────────────
let camShake = 0;

// ── Toon helpers ─────────────────────────────────────────────────────────────
function makeToonGrad() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 1;
  const x = c.getContext('2d');
  // Cel-shading duro: sombra escura → destaque pleno (estilo cartoon)
  x.fillStyle = '#1e1e1e'; x.fillRect(0, 0, 1, 1);  // sombra profunda
  x.fillStyle = '#777777'; x.fillRect(1, 0, 1, 1);  // meio-tom
  x.fillStyle = '#ffffff'; x.fillRect(2, 0, 2, 1);  // luz total
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function toon(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradMap });
}

// Adiciona contorno preto (backface trick — cel-shading outline)
function outline(mesh, scale = 1.18) {
  const o = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
  );
  o.scale.setScalar(scale);
  mesh.add(o);
}

function outlineGroup(group, scale = 1.18) {
  group.traverse(child => {
    if (child.isMesh && !child._isOutline) outline(child, scale);
  });
}

// ── Three.js init ─────────────────────────────────────────────────────────────
function initThree() {
  gradMap = makeToonGrad();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6ecfff); // céu azul aberto cartoon
  scene.fog = new THREE.Fog(0xaaddff, 100, 240);

  const camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 280);
  camera.position.set(0, 3.8, 9.5);
  camera.lookAt(0, 1.2, -22);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const clock = new THREE.Clock();
  three = { scene, camera, renderer, clock };

  setupLights(scene);
  buildEnvironment(scene);
  buildPlayer(scene);
}

function setupLights(scene) {
  // Ambiente forte e quente — céu aberto, dia ensolarado cartoon
  scene.add(new THREE.AmbientLight(0xfff0cc, 0.75));

  // Sol principal (diagonal, sombras suaves)
  const sun = new THREE.DirectionalLight(0xfffae0, 2.2);
  sun.position.set(10, 22, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left   = -22;
  sun.shadow.camera.right  =  22;
  sun.shadow.camera.top    =  22;
  sun.shadow.camera.bottom =  -6;
  sun.shadow.camera.far    =  80;
  scene.add(sun);

  // Luz de preenchimento (azul-céu suave, atenua sombras duras)
  const sky = new THREE.DirectionalLight(0x88ccff, 0.55);
  sky.position.set(-8, 8, 4);
  scene.add(sky);
}

// ── Environment ───────────────────────────────────────────────────────────────
function buildEnvironment(scene) {

  // ── Chão: terra marrom (corte urbano a céu aberto, estilo Subway Surfers) ─────
  const groundMats = [toon(0x7a5230), toon(0x6b4828)];
  const tileGeo  = new THREE.BoxGeometry(10.2, 0.50, 24);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(tileGeo, groundMats[i % 2]);
    m.position.set(0, -0.25, -i * 24 + 12);
    m.receiveShadow = true;
    scene.add(m);
    envTiles.push(m);
  }

  // Borda amarela de segurança (linha tátil dos trilhos)
  [-4.75, 4.75].forEach(x => {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 400), toon(0xffee00));
    edge.position.set(x, 0.02, -195);
    scene.add(edge);
  });

  // Linhas de faixa brancas tracejadas
  const dashGeo = new THREE.BoxGeometry(0.18, 0.06, 1.8);
  const dashMat = toon(0xddddff);
  [-1.5, 1.5].forEach(dx => {
    for (let i = 0; i < 10; i++) {
      for (let d = 0; d < 5; d++) {
        const m = new THREE.Mesh(dashGeo, dashMat);
        m.position.set(dx, 0.02, 10 - i * 24 - d * 4.8);
        scene.add(m); envTiles.push(m);
      }
    }
  });

  // Trilhos de aço (dois trilhos, um de cada lado)
  const railMat = toon(0x8899aa);
  [-3.1, 3.1].forEach(rx => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 400), railMat);
    rail.position.set(rx, -0.17, -195);
    scene.add(rail); outline(rail, 1.20);
  });

  // Dormentes (traços de madeira escura entre os trilhos)
  const sleeperMat = toon(0x3a2a18);
  for (let i = 0; i < 35; i++) {
    const sl = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.10, 0.25), sleeperMat);
    sl.position.set(0, -0.43, i * -14 + 6);
    scene.add(sl); envTiles.push(sl);
  }

  // ── Paredes do corte ferroviário a céu aberto ─────────────────────────────────
  // Parede de contenção vertical (concreto teal) + talude de terra acima
  [-1, 1].forEach(side => {
    // Parede de concreto — baixa, estilo corte urbano
    const cwall = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.5, 400), toon(0x2a7a8a));
    cwall.position.set(side * 5.85, 1.75, -195);
    scene.add(cwall); outline(cwall, 1.03);

    // Calha de drenagem na base da parede
    const drain = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 400), toon(0x1a5060));
    drain.position.set(side * 5.58, 0.09, -195);
    scene.add(drain);

    // Borda superior da parede (capstone)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 400), toon(0x3a9aaa));
    cap.position.set(side * 5.85, 3.59, -195);
    scene.add(cap);

    // Talude de terra/grama acima da parede
    const bank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 400), toon(0x5a8a3a));
    bank.position.set(side * 6.95, 4.5, -195);
    bank.rotation.z = side * -0.25;
    scene.add(bank);

    // Faixa de terra nua (mais escura, abaixo da grama)
    const dirt = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 400), toon(0x7a5230));
    dirt.position.set(side * 6.8, 3.6, -195);
    dirt.rotation.z = side * -0.25;
    scene.add(dirt);
  });

  // ── Grafites nas paredes de contenção ─────────────────────────────────────────
  const grafPalette = [0xff2299, 0x22ffcc, 0xff8800, 0x4488ff, 0xffee00, 0xcc44ff, 0xff3333, 0x00ee88, 0xff6600, 0x00ccff];
  for (let i = 0; i < 18; i++) {
    [-1, 1].forEach(side => {
      const col = grafPalette[(i * 3 + side + 5) % grafPalette.length];
      const gw  = 0.9 + (i % 3) * 0.7;
      const gh  = 0.25 + (i % 5) * 0.16;
      const grf = new THREE.Mesh(new THREE.BoxGeometry(0.06, gh, gw), toon(col));
      grf.position.set(side * 5.58, 0.6 + (i % 4) * 0.52, -i * 17 - 5);
      scene.add(grf); envBuildings.push(grf);
    });
  }

  // ── Edifícios coloridos acima do talude ───────────────────────────────────────
  const buildColors = [
    0xe74c3c, 0x3498db, 0xf39c12, 0x27ae60,
    0x9b59b6, 0xe67e22, 0x1abc9c, 0xc0392b,
    0x2980b9, 0xd35400, 0x16a085, 0x8e44ad
  ];
  for (let i = 0; i < 14; i++) {
    [-1, 1].forEach(side => {
      const bxOff = side * (9.0 + (i % 3) * 1.4);
      const bzOff = -i * 20 - 6;
      const bh = 4.0 + (i % 5) * 2.2;
      const bw = 1.8 + (i % 4) * 0.9;
      const bd = 2.0 + (i % 3) * 0.8;
      const bCol = buildColors[(i * 2 + (side > 0 ? 6 : 0)) % buildColors.length];

      // Corpo do edifício
      const bld = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), toon(bCol));
      bld.position.set(bxOff, 5.5 + bh * 0.5, bzOff);
      scene.add(bld); outline(bld, 1.04); envBuildings.push(bld);

      // Topo/cobertura
      const roof = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.3, 0.28, bd + 0.3), toon(0xdddddd));
      roof.position.set(bxOff, 5.5 + bh + 0.14, bzOff);
      scene.add(roof); envBuildings.push(roof);

      // Janelas (painéis escuros ou amarelados)
      const wRows = Math.min(4, Math.floor(bh / 1.6));
      for (let wr = 0; wr < wRows; wr++) {
        const wMat = new THREE.MeshBasicMaterial({ color: wr % 2 === 0 ? 0xfffde0 : 0x223344 });
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.5), wMat);
        win.position.set(bxOff - bw * 0.5 * side * 0.01, 6.2 + wr * 1.45, bzOff + 0.55);
        scene.add(win); envBuildings.push(win);
      }
    });
  }

  // ── Postes de sinalização laterais ────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    [-1, 1].forEach(side => {
      const pz = -i * 28 - 8;
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.2, 0.12), toon(0x445566));
      pole.position.set(side * 5.5, 2.1, pz);
      scene.add(pole); envBuildings.push(pole);

      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.36),
        new THREE.MeshBasicMaterial({ color: 0xffeeaa }));
      lamp.position.set(side * 5.5, 4.3, pz);
      scene.add(lamp); envBuildings.push(lamp);
    });
  }

  // ── Tufos de grama no talude ──────────────────────────────────────────────────
  const grassMat = toon(0x66bb44);
  for (let i = 0; i < 24; i++) {
    [-1, 1].forEach(side => {
      const gx = side * (6.4 + (i % 4) * 0.45);
      const gz2 = -i * 15 - 4;
      const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.18), grassMat);
      tuft.position.set(gx, 3.9 + (i % 3) * 0.12, gz2);
      scene.add(tuft); envBuildings.push(tuft);
    });
  }
}


// ── Player ────────────────────────────────────────────────────────────────────
function buildPlayer(scene) {
  const group = new THREE.Group();

  const skin   = toon(0xffddaa);  // pele clara/quente
  const hoodie = toon(0xff3300);  // vermelho-laranja vivo
  const pants  = toon(0x1166ff);  // azul-brilhante
  const capM   = toon(0xffee00);  // amarelo neon
  const shoe   = toon(0xffffff);  // branco puro
  const dark   = toon(0x222222);
  const red    = toon(0xff1111);  // vermelho puro

  function add(geo, mat, px, py, pz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    group.add(m);
    return m;
  }

  // Cabeça GRANDE (proporção cartoon exagerada)
  const head = add(new THREE.SphereGeometry(0.46, 16, 12), skin, 0, 1.95, 0);
  outline(head, 1.16);

  // Olhos grandes expressivos (bem à frente)
  add(new THREE.SphereGeometry(0.110, 8, 6), dark, -0.15, 2.04, -0.40);
  add(new THREE.SphereGeometry(0.110, 8, 6), dark,  0.15, 2.04, -0.40);
  // Pupila
  add(new THREE.SphereGeometry(0.058, 6, 4), toon(0x111133), -0.15, 2.04, -0.44);
  add(new THREE.SphereGeometry(0.058, 6, 4), toon(0x111133),  0.15, 2.04, -0.44);
  // Brilho nos olhos
  add(new THREE.SphereGeometry(0.038, 6, 4), toon(0xffffff), -0.12, 2.08, -0.46);
  add(new THREE.SphereGeometry(0.038, 6, 4), toon(0xffffff),  0.18, 2.08, -0.46);
  // Sobrancelhas (expressão cartoon)
  add(new THREE.BoxGeometry(0.22, 0.06, 0.06), dark, -0.15, 2.18, -0.41);
  add(new THREE.BoxGeometry(0.22, 0.06, 0.06), dark,  0.15, 2.18, -0.41);
  // Bochechas (rosadas, fofas)
  add(new THREE.SphereGeometry(0.09, 8, 6), toon(0xffaaaa), -0.33, 1.95, -0.34);
  add(new THREE.SphereGeometry(0.09, 8, 6), toon(0xffaaaa),  0.33, 1.95, -0.34);

  // Boné
  const cap = add(new THREE.CylinderGeometry(0.48, 0.45, 0.18, 14), capM, 0, 2.47, 0);
  outline(cap, 1.14);
  add(new THREE.BoxGeometry(0.90, 0.10, 0.42), capM, 0, 2.33, -0.34);

  // Torso chonky
  const torso = add(new THREE.BoxGeometry(0.76, 0.85, 0.50), hoodie, 0, 1.10, 0);
  outline(torso, 1.12);

  // Braços (cilindros mais grossos, largura do torso maior)
  const armGeo = new THREE.CylinderGeometry(0.13, 0.12, 0.60, 10);
  const armL = add(armGeo, hoodie, -0.56, 1.10, 0);
  const armR = add(armGeo, hoodie,  0.56, 1.10, 0);
  outline(armL); outline(armR);

  // Pernas (cilindros mais grossos)
  const legGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.58, 10);
  const legL = add(legGeo, pants, -0.21, 0.46, 0);
  const legR = add(legGeo, pants,  0.21, 0.46, 0);
  outline(legL); outline(legR);

  // Tênis
  add(new THREE.BoxGeometry(0.32, 0.20, 0.46), shoe, -0.21, 0.09, 0.04);
  add(new THREE.BoxGeometry(0.32, 0.20, 0.46), shoe,  0.21, 0.09, 0.04);
  add(new THREE.BoxGeometry(0.33, 0.06, 0.47), red,  -0.21, 0.19, 0.04);
  add(new THREE.BoxGeometry(0.33, 0.06, 0.47), red,   0.21, 0.19, 0.04);

  // Sombra no chão (plano escuro que acompanha o personagem)
  const shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.65, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.40 })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.01;
  group.add(shadowMesh);

  // Bolha de escudo — centrada no meio do corpo, cobre todo o personagem
  const shieldBubble = new THREE.Mesh(
    new THREE.SphereGeometry(1.75, 18, 14),
    new THREE.MeshBasicMaterial({ color: 0x22ff88, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
  );
  shieldBubble.position.y = 1.3;
  shieldBubble.visible = false;
  group.add(shieldBubble);

  // Anel de força — mesma altura do centro
  const shieldRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.80, 0.09, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.92 })
  );
  shieldRing.position.y = 1.3;
  shieldRing.visible = false;
  group.add(shieldRing);

  // ── Mochila Jetpack (visível nas costas quando ativo) ─────────────────────
  const jpBack = new THREE.Group();
  // Dois tanques cilíndricos (laranja-vivo)
  [-0.16, 0.16].forEach((ox, i) => {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.115, 0.62, 9), toon(0xff4400));
    tank.position.set(ox, 0, 0);
    jpBack.add(tank); outline(tank, 1.10);
    // Detalhe de faixa no tanque
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.09, 9), toon(0xffee00));
    band.position.set(ox, 0.14 * (i === 0 ? 1 : -1), 0);
    jpBack.add(band);
  });
  // Alça / conector central
  const jpBar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.10, 0.09), toon(0x888888));
  jpBack.add(jpBar);
  // Propulsores (abaixo dos tanques)
  const jpNozL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.28, 8), toon(0x777777));
  jpNozL.position.set(-0.16, -0.46, 0);
  jpBack.add(jpNozL); outline(jpNozL, 1.08);
  const jpNozR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.28, 8), toon(0x777777));
  jpNozR.position.set(0.16, -0.46, 0);
  jpBack.add(jpNozR); outline(jpNozR, 1.08);
  // Chamas (MeshBasicMaterial = sem sombra, sempre brilhante)
  const jpFlameL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.46, 8),
    new THREE.MeshBasicMaterial({ color: 0xffee00 }));
  jpFlameL.position.set(-0.16, -0.73, 0);
  jpFlameL.rotation.x = Math.PI;
  jpBack.add(jpFlameL);
  const jpFlameR = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.46, 8),
    new THREE.MeshBasicMaterial({ color: 0xffee00 }));
  jpFlameR.position.set(0.16, -0.73, 0);
  jpFlameR.rotation.x = Math.PI;
  jpBack.add(jpFlameR);
  // Posição: local +Z = costas do personagem (câmera vê frente)
  jpBack.position.set(0, 1.12, 0.30);
  jpBack.visible = false;
  group.add(jpBack);

  group.position.set(LANE_X[1], 0, 0);
  group.rotation.y = 0;
  scene.add(group);
  playerObj = { group, meshes: { head, torso, armL, armR, legL, legR, cap },
                shadowMesh, shieldBubble, shieldRing, jpBack, jpFlameL, jpFlameR };
}

// ── Obstacles ─────────────────────────────────────────────────────────────────
// ── Obstáculos de rua ─────────────────────────────────────────────────────────

// Paleta de cores dos trens de metrô NYC
const TRAIN_COLORS = [
  { body: 0xcc0000, stripe: 0xff4444, door: 0xaa0000 }, // linha vermelha
  { body: 0xf5a200, stripe: 0xffcc44, door: 0xcc8800 }, // linha amarela
  { body: 0xd0d0d8, stripe: 0x778899, door: 0xaaaabc }, // prata/branco
  { body: 0x1144cc, stripe: 0x4477ff, door: 0x0033aa }, // linha azul
];

function makeTrainMesh() {
  const tc    = TRAIN_COLORS[Math.floor(Math.random() * TRAIN_COLORS.length)];
  const group = new THREE.Group();
  const darkM = toon(0x222233);
  const glassM = new THREE.MeshBasicMaterial({ color: 0x99ccff });

  // Corpo principal do vagão (largo, alto, robusto)
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.9, 1.3), toon(tc.body));
  body.position.y = 0.95;
  body.castShadow = true;
  group.add(body); outline(body, 1.03);

  // Faixa colorida horizontal (característica dos trens NYC)
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.32, 0.06), toon(tc.stripe));
  stripe.position.set(0, 1.52, 0.68);
  group.add(stripe);

  // Janelas em fileira na frente
  [-0.85, -0.15, 0.55].forEach(wx => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.44, 0.07), glassM);
    win.position.set(wx, 1.12, 0.69);
    group.add(win);
  });

  // Porta central (duas folhas)
  [-0.14, 0.14].forEach(px => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.15, 0.07), toon(tc.door));
    door.position.set(px, 0.68, 0.69);
    group.add(door);
  });
  // Linha divisória da porta
  const divider = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.15, 0.09), toon(0xaaaaaa));
  divider.position.set(0, 0.68, 0.70);
  group.add(divider);

  // Faixa amarela de segurança (linha na base)
  const safetyStripe = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.10, 0.07),
    new THREE.MeshBasicMaterial({ color: 0xffee00 }));
  safetyStripe.position.set(0, 0.08, 0.68);
  group.add(safetyStripe);

  // Número do vagão (placa branca)
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.07), toon(0xffffff));
  plate.position.set(-1.0, 1.7, 0.69);
  group.add(plate);

  // Rodas de trem (mais planas que rodas de carro)
  const wheelMat = toon(0x444455);
  [[-1.1, -0.42], [1.1, -0.42], [-1.1, 0.42], [1.1, 0.42]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.22, 10), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.20, wz);
    group.add(w);
  });

  // Conector elétrico no teto (pantógrafo simplificado)
  const panto = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.10, 0.10), toon(0x888899));
  panto.position.set(0, 1.98, 0);
  group.add(panto);

  return group;
}

function makeMotorcycleMesh() {
  const col   = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  const group = new THREE.Group();
  const darkM = toon(0x111111);
  const chromeM = toon(0xcccccc);

  // Corpo da moto
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 1.0), toon(col));
  body.position.y = 0.60;
  body.castShadow = true;
  group.add(body); outline(body, 1.08);

  // Tanque
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.38, 0.55), toon(col));
  tank.position.set(0, 0.94, 0.12);
  group.add(tank);

  // Guidão
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.08, 0.08), chromeM);
  bar.position.set(0, 1.0, 0.42);
  group.add(bar);

  // Rodas (grandes, visíveis de cima)
  [-0.44, 0.44].forEach(wz => {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.09, 8, 14), darkM);
    w.rotation.x = Math.PI / 2;
    w.position.set(0, 0.30, wz);
    group.add(w);
  });

  // Piloto (capacete + corpo simples)
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), toon(0x222222));
  helmet.position.set(0, 1.28, 0.10);
  group.add(helmet); outline(helmet, 1.10);

  const rider = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.40, 0.45), toon(0x333344));
  rider.position.set(0, 0.98, 0.06);
  group.add(rider);

  return group;
}

function makePotholeMesh() {
  const group = new THREE.Group();

  // Buraco escuro
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 0.18, 16),
    toon(0x111111)
  );
  hole.position.y = 0.04;
  group.add(hole); outline(hole, 1.05);

  // Borda amarela de aviso (bem visível no asfalto escuro)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.90, 0.18, 6, 16),
    toon(0xffee00)
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.10;
  group.add(rim); outline(rim, 1.05);

  // Setas de aviso apontando para o buraco
  [-1.6, 0, 1.6].forEach(xOff => {
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.45, 4),
      toon(0xff3300)
    );
    arrow.position.set(xOff, 0.30, -1.4);
    arrow.rotation.x = -Math.PI / 2;
    group.add(arrow); outline(arrow, 1.08);
  });

  return group;
}

function makeTrafficConeMesh() {
  const group = new THREE.Group();
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.90, 10),
    toon(0xff4400)
  );
  cone.position.y = 0.45;
  cone.castShadow = true;
  group.add(cone); outline(cone, 1.10);

  // Faixa branca
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.12, 10), toon(0xffffff));
  band.position.y = 0.55;
  group.add(band);

  // Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.10, 0.65), toon(0x222222));
  base.position.y = 0.05;
  group.add(base);

  return group;
}

function makeLowBarrierMesh() {
  const group = new THREE.Group();
  // Barreira laranja vivo (estilo canteiro de obras SS)
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.70, 0.55), toon(0xff6600));
  body.position.y = 0.35;
  body.castShadow = true;
  group.add(body); outline(body, 1.05);

  // Listras amarelas de aviso (contraste máximo)
  [0.55, 0, -0.55].forEach(x => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.72, 0.08), toon(0xffee00));
    s.position.set(x, 0.35, 0.28);
    group.add(s);
  });
  // Luz de aviso no topo
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2200 }));
  light.position.set(0, 0.82, 0);
  group.add(light); outline(light, 1.15);
  return group;
}

// ── Power-up meshes ───────────────────────────────────────────────────────────
function makeMagnetMesh() {
  const g = new THREE.Group();
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.13, 8, 14, Math.PI), toon(0x3b82f6));
  arc.rotation.z = -Math.PI / 2;
  g.add(arc); outline(arc, 1.08);
  [-0.38, 0.38].forEach((x, i) => {
    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 8), toon(i === 0 ? 0xff3333 : 0xaaaaaa));
    prong.position.set(x, -0.17, 0);
    g.add(prong); outline(prong, 1.08);
  });
  return g;
}

function makeShieldMesh() {
  const g = new THREE.Group();
  // Topo do escudo (semicírculo)
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    toon(0x22c55e)
  );
  g.add(top); outline(top, 1.08);
  // Corpo principal do escudo (cilindro achatado)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.30, 0.52, 12), toon(0x22c55e));
  body.position.y = -0.26;
  g.add(body); outline(body, 1.08);
  // Ponta inferior
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.36, 10), toon(0x22c55e));
  tip.position.y = -0.68;
  tip.rotation.x = Math.PI;
  g.add(tip); outline(tip, 1.10);
  // Cruz no centro
  const barV = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.60, 0.10), toon(0x86efac));
  barV.position.y = -0.20;
  g.add(barV);
  const barH = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.10), toon(0x86efac));
  barH.position.y = -0.10;
  g.add(barH);
  return g;
}

function makeJetpackMesh() {
  const g = new THREE.Group();
  // Corpo principal (tanque vermelho-laranja)
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.80, 10), toon(0xff4400));
  g.add(tank); outline(tank, 1.10);
  // Dois propulsores (cinza metálico)
  [-0.28, 0.28].forEach(ox => {
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.40, 8), toon(0xaaaaaa));
    noz.position.set(ox, -0.45, 0);
    g.add(noz); outline(noz, 1.10);
    // Chama saindo dos propulsores
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.35, 8), toon(0xffee00));
    flame.position.set(ox, -0.72, 0);
    flame.rotation.x = Math.PI;
    g.add(flame); outline(flame, 1.12);
  });
  // Asas laterais
  [-1, 1].forEach(side => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.10, 0.38), toon(0xff6600));
    wing.position.set(side * 0.38, 0.10, 0);
    g.add(wing); outline(wing, 1.08);
  });
  return g;
}

function makeMultiplierMesh() {
  const g = new THREE.Group();
  const star = new THREE.Mesh(new THREE.IcosahedronGeometry(0.44), toon(0xa855f7));
  g.add(star); outline(star, 1.10);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 6, 14), toon(0xd8b4fe));
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

function makeKeyMesh() {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.09, 8, 14), toon(0xffee00));
  head.position.y = 0.22;
  g.add(head); outline(head, 1.12);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52, 0.09), toon(0xffee00));
  shaft.position.y = -0.10;
  g.add(shaft); outline(shaft, 1.14);
  [0.10, -0.07].forEach(ty => {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.08, 0.09), toon(0xffcc00));
    tooth.position.set(0.13, ty, 0);
    g.add(tooth);
  });
  return g;
}

// ── Dificuldade ───────────────────────────────────────────────────────────────
function getDiff() {
  return Math.min(5, Math.floor((speed - BASE_SPEED) / ((MAX_SPEED - BASE_SPEED) / 6)));
}

function spawnLowBridge() {
  const group = new THREE.Group();

  // Placa de sinalização de metrô (HATS — Low Clearance)
  // Estrutura principal: vermelho com branco — estilo NYC subway sign
  const sign = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.55, 0.70), toon(0xcc1111));
  sign.castShadow = true;
  group.add(sign); outline(sign, 1.03);

  // Faixa branca no centro
  const whiteBar = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.18, 0.06), toon(0xffffff));
  whiteBar.position.set(0, 0, 0.38);
  group.add(whiteBar);

  // Listras diagonais brancas (padrão de aviso)
  [-4.0, -2.0, 0.0, 2.0, 4.0].forEach(bx => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.57, 0.06), toon(0xffffff));
    stripe.position.set(bx, 0, 0.38);
    stripe.rotation.z = 0.55;
    group.add(stripe);
  });

  // Suportes verticais nas laterais
  [-5.5, 5.5].forEach(sx => {
    const sup = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.5, 0.22), toon(0x888899));
    sup.position.set(sx, -1.5, 0);
    group.add(sup); outline(sup, 1.08);
  });

  const yBot = 1.38;
  group.position.set(0, yBot + 0.275, SPAWN_Z);
  three.scene.add(group);
  obstacles.push({ mesh: group, lane: -1, w: 11.5, yBot, yTop: yBot + 0.55 });
}

function spawnCar(laneOverride) {
  const l    = laneOverride !== undefined ? laneOverride : Math.floor(Math.random() * 3);
  const mesh = makeTrainMesh();
  // Vagão de metrô: mais alto e largo que carro
  mesh.position.set(LANE_X[l], 0, SPAWN_Z);
  three.scene.add(mesh);
  obstacles.push({ mesh, lane: l, w: 2.50, yBot: 0, yTop: 1.95 });
}

function spawnMoto(laneOverride) {
  const l    = laneOverride !== undefined ? laneOverride : Math.floor(Math.random() * 3);
  const mesh = makeMotorcycleMesh();
  mesh.position.set(LANE_X[l], 0, SPAWN_Z);
  three.scene.add(mesh);
  obstacles.push({ mesh, lane: l, w: 0.85, yBot: 0, yTop: 1.55 });
}

function spawnPothole(laneOverride) {
  const l    = laneOverride !== undefined ? laneOverride : Math.floor(Math.random() * 3);
  const mesh = makePotholeMesh();
  mesh.position.set(LANE_X[l], 0, SPAWN_Z);
  three.scene.add(mesh);
  // Buraco baixo — player deve pular para evitar
  obstacles.push({ mesh, lane: l, w: 1.60, yBot: 0, yTop: 0.25 });
}

function spawnCones(laneOverride) {
  const l = laneOverride !== undefined ? laneOverride : Math.floor(Math.random() * 3);
  // Grupo de 3 cones em linha
  for (let i = 0; i < 3; i++) {
    const mesh = makeTrafficConeMesh();
    mesh.position.set(LANE_X[l] + (i - 1) * 0.65, 0, SPAWN_Z - i * 0.4);
    three.scene.add(mesh);
    obstacles.push({ mesh, lane: l, w: 1.80, yBot: 0, yTop: 0.95 });
  }
}

function spawnBarrier(laneOverride) {
  const l    = laneOverride !== undefined ? laneOverride : Math.floor(Math.random() * 3);
  const mesh = makeLowBarrierMesh();
  mesh.position.set(LANE_X[l], 0, SPAWN_Z);
  three.scene.add(mesh);
  obstacles.push({ mesh, lane: l, w: 1.95, yBot: 0, yTop: 0.72 });
}

function spawnObstacle() {
  const diff = getDiff();
  const r    = Math.random();

  // Chance de viaduto baixo (abaixar) aumenta com dificuldade
  const bridgeP = 0.08 + diff * 0.03;
  if (r < bridgeP) {
    spawnLowBridge();
    if (diff >= 3 && Math.random() < 0.4) spawnPothole();
    return;
  }

  // Dois trens bloqueando, uma faixa livre + arco de moedas guiando o caminho
  const doubleP = bridgeP + 0.18 + diff * 0.04;
  if (r < doubleP) {
    const open = Math.floor(Math.random() * 3);
    [0, 1, 2].filter(l => l !== open).forEach(l => spawnCar(l));
    if (diff >= 4 && Math.random() < 0.5) spawnBarrier(open);
    // Arco parabólico sobre a faixa livre para guiar o jogador
    if (Math.random() < 0.65) spawnCoinArc(open, 1.6);
    return;
  }

  // Obstáculos simples sorteados por tipo
  const pick = Math.random();
  if      (pick < 0.30) spawnCar();
  else if (pick < 0.52) spawnMoto();
  else if (pick < 0.68) spawnPothole();
  else if (pick < 0.82) spawnCones();
  else                  spawnBarrier();

  // Arco de moedas ocasional após trem simples (desenha trajetória de pulo)
  if (pick < 0.30 && Math.random() < 0.35) {
    const freeLane = Math.floor(Math.random() * 3);
    spawnCoinArc(freeLane, 2.2);
  }

  // Em dificuldade máxima spawna um extra
  if (diff >= 5 && Math.random() < 0.4) spawnCar();
}

// Arco parabólico de moedas — desenha a trajetória ideal de pulo
function spawnCoinArc(lane, arcHeight) {
  const l   = lane !== undefined ? lane : Math.floor(Math.random() * 3);
  const n   = 8;
  const ah  = arcHeight || 2.4;
  for (let i = 0; i < n; i++) {
    const t    = i / (n - 1);
    const y    = 0.7 + Math.sin(t * Math.PI) * ah;
    const zOff = i * -2.6;
    const coin = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.10, 8, 18), toon(0xffcc00));
    coin.add(ring); outline(ring, 1.08);
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.26, 12),
      new THREE.MeshBasicMaterial({ color: 0xffdd44, side: THREE.DoubleSide })
    );
    coin.add(face);
    coin.position.set(LANE_X[l], y, SPAWN_Z + zOff);
    three.scene.add(coin);
    coins.push({ mesh: coin, lane: l, y });
  }
}

function spawnCoin() {
  const l    = Math.floor(Math.random() * 3);
  const y    = jetpackActive > 0
    ? playerY + 0.3 + Math.random() * 1.2
    : 0.7 + Math.random() * 1.0;
  const coin = new THREE.Group();
  // Anel externo
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.10, 8, 18), toon(0xffcc00));
  coin.add(ring); outline(ring, 1.08);
  // Disco dourado interno (face-on, gira como moeda real)
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.26, 12),
    new THREE.MeshBasicMaterial({ color: 0xffdd44, side: THREE.DoubleSide })
  );
  coin.add(face);
  coin.position.set(LANE_X[l], y, SPAWN_Z);
  three.scene.add(coin);
  coins.push({ mesh: coin, lane: l, y });
}

function spawnKey() {
  const l    = Math.floor(Math.random() * 3);
  const mesh = makeKeyMesh();
  mesh.position.set(LANE_X[l], 1.2, SPAWN_Z);
  three.scene.add(mesh);
  keys.push({ mesh, lane: l });
}

function spawnPowerUp() {
  const types = ['magnet', 'shield', 'multiplier', 'jetpack'];
  const type  = types[Math.floor(Math.random() * types.length)];
  const l     = Math.floor(Math.random() * 3);
  const mesh  = type === 'magnet' ? makeMagnetMesh()
              : type === 'shield' ? makeShieldMesh()
              : type === 'jetpack' ? makeJetpackMesh()
              : makeMultiplierMesh();
  mesh.position.set(LANE_X[l], 1.3, SPAWN_Z);
  three.scene.add(mesh);
  powerUps.push({ mesh, lane: l, type });
}

function activatePowerUp(type) {
  sfxPower();
  powerUpsUsed++;
  advanceMission('powerups', 1);
  if (type === 'magnet') {
    magnetActive = 10;
    flashScreen('rgba(59,130,246,0.28)', 350);
    showPowerNotif('🧲 ÍMÃ DE MOEDAS!', '#3b82f6');
  } else if (type === 'shield') {
    shieldActive = 10;
    flashScreen('rgba(34,197,94,0.28)', 350);
    showPowerNotif('🛡️ ESCUDO ATIVO!', '#22c55e');
  } else if (type === 'multiplier') {
    multiplierActive = 10;
    flashScreen('rgba(168,85,247,0.28)', 350);
    showPowerNotif('2× PONTUAÇÃO!', '#a855f7');
  } else {
    jetpackActive = 9;
    flashScreen('rgba(255,120,0,0.30)', 350);
    showPowerNotif('🚀 JETPACK!', '#ff6600');
  }
}

// ── Update (física) ───────────────────────────────────────────────────────────
function update(dt) {
  animFrame++;

  // Speed ramp
  speedT += dt;
  if (speedT > SPEED_TICK) {
    speedT = 0;
    const prevDiff = getDiff();
    speed = Math.min(speed + SPEED_INC, MAX_SPEED);
    speedEl.textContent = (Math.round((speed / BASE_SPEED) * 10) / 10).toFixed(1) + '×';
    speedEl.style.color = '#ff6600';
    speedEl.style.transform = 'scale(1.5)';
    setTimeout(() => { speedEl.style.color = ''; speedEl.style.transform = ''; }, 500);
    sfxSpeed();
    flashScreen('rgba(255,180,0,0.18)', 300);
    if (getDiff() > prevDiff && powersEl) {
      const LABELS = ['','🔥 MAIS RÁPIDO!','🔥🔥 VELOZ!','⚡ ULTRA!','⚡⚡ INSANO!','💥 MAX!'];
      const label = LABELS[getDiff()] || '💥 MAX!';
      powersEl.innerHTML = `<span class="runner-power-chip" style="background:#ff4400;color:#fff;padding:4px 14px;border-radius:20px;font-weight:700;font-size:0.9rem;">${label}</span>`;
      setTimeout(() => { if (powersEl) powersEl.innerHTML = ''; }, 1800);
    }
  }

  // Distância e tempo de corrida
  runTime += dt;
  distance += speed * dt * 0.1;
  if (distEl) distEl.textContent = Math.floor(distance) + 'm';
  advanceMission('dist', speed * dt * 0.1);

  // Score (distância + multiplicador)
  scoreT += dt;
  if (scoreT > 0.08) {
    scoreT = 0;
    const pts = multiplierActive > 0 ? 2 : 1;
    score += pts;
    scoreEl.textContent = score;
    advanceMission('score', pts);
    if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('runner-best', best); }
  }

  // Power-up timers
  if (magnetActive     > 0) magnetActive     = Math.max(0, magnetActive     - dt);
  if (shieldActive     > 0) shieldActive     = Math.max(0, shieldActive     - dt);
  if (multiplierActive > 0) multiplierActive = Math.max(0, multiplierActive - dt);
  if (jetpackActive    > 0) jetpackActive    = Math.max(0, jetpackActive    - dt);
  updatePowerHUD();

  // Escudo: bolha + anel visual
  if (playerObj.shieldBubble) {
    const on = shieldActive > 0;
    playerObj.shieldBubble.visible = on;
    playerObj.shieldRing.visible   = on;
    if (on) {
      playerObj.shieldBubble.rotation.y += dt * 2.2;
      // Pulso dramático: escala 0.93 ↔ 1.08
      const p = 1 + Math.sin(animFrame * 0.28) * 0.08;
      playerObj.shieldBubble.scale.setScalar(p);
      // Opacidade pulsante
      playerObj.shieldBubble.material.opacity = 0.30 + Math.sin(animFrame * 0.28) * 0.18;
      // Anel orbita em ângulo diferente
      playerObj.shieldRing.rotation.y += dt * 3.5;
      playerObj.shieldRing.rotation.z  = Math.sin(animFrame * 0.08) * 0.55;
    }
  }

  // Lane transition
  const tX = LANE_X[targetLane];
  playerObj.group.position.x += (tX - playerObj.group.position.x) * Math.min(dt * 14, 1);

  // ── Jetpack: flutua em altitude, ignora gravidade normal ─────────────────
  if (jetpackActive > 0) {
    const flyY = jetpackActive > 1.5 ? 4.2 : GROUND_Y;
    playerY  += (flyY - playerY) * Math.min(dt * 4.0, 1);
    playerVY  = 0;
    crouching = false;
  }

  // ── Física do pulo (gravidade variável + fast fall) ──────────────────────
  const rising = playerVY > 0;
  if (jetpackActive <= 0) {
    // Fast fall: apertar ↓ no ar cancela pulo e multiplica gravidade
    const fastFall = crouching && playerY > GROUND_Y + 0.15 && !rising;
    playerVY += (rising ? GRAV_UP : GRAV_DOWN) * (fastFall ? 3.0 : 1.0) * dt;
    playerY  += playerVY * dt;
  }

  const onGround = playerY <= GROUND_Y + 0.01;

  // Landing squash + som
  if (!wasOnGround && onGround && playerVY < -2) {
    playerObj.group.scale.set(1.40, 0.60, 1.40);
    sfxLand();
  }
  wasOnGround = onGround;
  if (onGround) { playerY = GROUND_Y; playerVY = 0; }
  playerObj.group.position.y = playerY;

  // Sombra: encolhe e esmaece conforme o personagem sobe
  if (playerObj.shadowMesh) {
    const sh = Math.max(0.15, 1 - playerY * 0.12);
    playerObj.shadowMesh.scale.set(sh, sh, 1);
    playerObj.shadowMesh.material.opacity = sh * 0.40;
    playerObj.shadowMesh.position.y = 0.01 - playerY; // fica no chão
  }

  // ── Squash & stretch spring ───────────────────────────────────────────────
  const tSY  = (crouching && onGround) ? CROUCH_S : 1.0;
  const sSpd = Math.min(dt * 18, 1);
  playerObj.group.scale.x += (1.0 - playerObj.group.scale.x) * sSpd;
  playerObj.group.scale.z += (1.0 - playerObj.group.scale.z) * sSpd;
  playerObj.group.scale.y += (tSY  - playerObj.group.scale.y) * sSpd;

  // ── Lean na mudança de faixa ─────────────────────────────────────────────
  const leanTarget = (playerObj.group.position.x - tX) * 0.07;
  laneLean += (leanTarget - laneLean) * Math.min(dt * 10, 1);
  playerObj.group.rotation.z = laneLean;

  // ── Animação de corrida ───────────────────────────────────────────────────
  const t = animFrame * 0.18;
  if (onGround && !crouching) {
    const leg = Math.sin(t) * 0.70;
    playerObj.meshes.legL.rotation.x =  leg;
    playerObj.meshes.legR.rotation.x = -leg;
    playerObj.meshes.armL.rotation.x = -leg * 0.65;
    playerObj.meshes.armR.rotation.x =  leg * 0.65;
    const bob = Math.abs(Math.sin(t)) * 0.05;
    playerObj.meshes.torso.position.y = 1.10 + bob;
    playerObj.meshes.head.position.y  = 1.95 + bob;
    playerObj.meshes.cap.position.y   = 2.47 + bob;
  } else if (!onGround) {
    if (jetpackActive > 0) {
      // Pose de voo: braços abertos estilo Superman, pernas levemente dobradas para trás
      playerObj.meshes.armL.rotation.x = -0.80;
      playerObj.meshes.armR.rotation.x = -0.80;
      playerObj.meshes.armL.rotation.z =  0.55;
      playerObj.meshes.armR.rotation.z = -0.55;
      playerObj.meshes.legL.rotation.x =  0.30;
      playerObj.meshes.legR.rotation.x =  0.30;
    } else {
      // Pulo normal: abre as pernas
      playerObj.meshes.legL.rotation.x = -0.55;
      playerObj.meshes.legR.rotation.x =  0.55;
      playerObj.meshes.armL.rotation.x = -1.0;
      playerObj.meshes.armR.rotation.x =  1.0;
    }
  }

  // ── Mochila Jetpack — visual e animação ────────────────────────────────────
  if (playerObj.jpBack) {
    const jpOn = jetpackActive > 0;
    playerObj.jpBack.visible = jpOn;
    if (jpOn) {
      // Inclinar o grupo para frente durante voo (nariz para cima)
      playerObj.group.rotation.x = -0.14;
      // Chamas: flicker rápido com escala e cor variável
      const fScale = 0.65 + Math.sin(animFrame * 0.72) * 0.40 + (animFrame % 3 === 0 ? 0.15 : 0);
      playerObj.jpFlameL.scale.y = Math.max(0.25, fScale);
      playerObj.jpFlameR.scale.y = Math.max(0.25, fScale);
      const fCols = [0xffee00, 0xff8800, 0xff6600, 0xffdd00, 0xff4400];
      playerObj.jpFlameL.material.color.setHex(fCols[animFrame % fCols.length]);
      playerObj.jpFlameR.material.color.setHex(fCols[(animFrame + 2) % fCols.length]);
      // Som de propulsão intermitente a cada ~0.25s
      if (animFrame % 16 === 0) sfxJetThrust();
    } else {
      // Suavizar volta da inclinação
      playerObj.group.rotation.x += (0 - playerObj.group.rotation.x) * Math.min(dt * 10, 1);
      // Suavizar rotação dos braços de volta
      playerObj.meshes.armL.rotation.z += (0 - playerObj.meshes.armL.rotation.z) * Math.min(dt * 8, 1);
      playerObj.meshes.armR.rotation.z += (0 - playerObj.meshes.armR.rotation.z) * Math.min(dt * 8, 1);
    }
  }

  // ── Efeito de velocidade (vinheta CSS) ────────────────────────────────────
  const vfxEl = document.getElementById('runner-vfx');
  if (vfxEl) vfxEl.style.opacity = Math.max(0, (speed - 44) / (MAX_SPEED - 44) * 0.72).toFixed(2);

  // Decay do streak de moedas
  if (coinStreakT > 0) { coinStreakT -= dt; if (coinStreakT <= 0) { coinStreakT = 0; coinStreak = 0; } }

  // ── Spawn ─────────────────────────────────────────────────────────────────
  spawnT += dt;
  const diff     = getDiff();
  const interval = Math.max(0.50, 2.5 - speed / 17 - diff * 0.06);
  if (spawnT > interval) { spawnT = 0; spawnObstacle(); }

  coinT += dt;
  if (coinT > Math.max(0.45, 0.70 - diff * 0.04)) { coinT = 0; spawnCoin(); }

  powerUpT += dt;
  if (powerUpT > Math.max(8, 15 - diff * 1.2)) { powerUpT = 0; spawnPowerUp(); }

  keyT += dt;
  if (!hasKey && keyT > Math.max(14, 22 - diff * 1.5)) { keyT = 0; spawnKey(); }

  // ── Invencibilidade pós-escudo ────────────────────────────────────────────
  if (invincibleT > 0) {
    invincibleT -= dt;
    // Piscar o personagem: visível nos frames pares, invisível nos ímpares
    playerObj.group.visible = (Math.floor(invincibleT * 10) % 2 === 0);
    if (invincibleT <= 0) { invincibleT = 0; playerObj.group.visible = true; }
  }

  // ── Bounding ──────────────────────────────────────────────────────────────
  const pX    = playerObj.group.position.x;
  const pHW   = 0.38;
  const pYBot = playerY;
  const pYTop = playerY + 2.2 * playerObj.group.scale.y;

  // Move & collide obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.mesh.position.z += speed * dt;
    if (o.mesh.position.z > DESPAWN_Z) { three.scene.remove(o.mesh); obstacles.splice(i, 1); continue; }
    if (o.mesh.position.z > -2.5 && o.mesh.position.z < 2.5) {
      let hit = false;
      if (o.lane === -1) {
        if (pYTop > o.yBot + 0.08 && pYBot < o.yTop + 0.5) hit = true;
      } else {
        if (Math.abs(pX - LANE_X[o.lane]) < pHW + o.w / 2 && pYBot < o.yTop && pYTop > o.yBot + 0.08) hit = true;
      }
      if (hit && invincibleT <= 0) { die(); return; }
    }
  }

  // Move & collect coins
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.mesh.position.z += speed * dt;
    c.mesh.rotation.y += dt * 4;
    if (c.mesh.position.z > DESPAWN_Z) { three.scene.remove(c.mesh); coins.splice(i, 1); continue; }

    // Ímã: puxa moeda em direção ao player
    if (magnetActive > 0 && c.mesh.position.z > -40) {
      c.mesh.position.x += (pX - c.mesh.position.x) * Math.min(dt * 7, 1);
      c.mesh.position.y += (playerY + 1.0 - c.mesh.position.y) * Math.min(dt * 4, 1);
    }
    // Jetpack: moedas sobem para a altitude do player
    if (jetpackActive > 0 && magnetActive <= 0) {
      c.mesh.position.y += (playerY + 0.8 - c.mesh.position.y) * Math.min(dt * 3.5, 1);
    }

    const collectR = magnetActive > 0 ? 3.0 : 1.5;
    if (c.mesh.position.z > -3.5 && c.mesh.position.z < 2.5) {
      if (Math.abs(pX - c.mesh.position.x) < collectR && Math.abs(playerY + 1.0 - c.mesh.position.y) < collectR) {
        three.scene.remove(c.mesh); coins.splice(i, 1);
        const coinVal = multiplierActive > 0 ? 10 : 5;
        score += coinVal; scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('runner-best', best); }
        sfxCoin(); coinPop(coinVal);
        coinsThisRun++;
        advanceMission('coins', 1);
        updateCoinBankHUD();
        // Streak de moedas
        coinStreak++;
        coinStreakT = 0.55;
        if (coinStreak === 5)  showPowerNotif('🔥 COMBO x5!',  '#ffcc00');
        else if (coinStreak === 10) showPowerNotif('🔥🔥 x10!', '#ff8800');
        else if (coinStreak === 20) showPowerNotif('💥 x20!',    '#ff4400');
      }
    }
  }

  // Move & collect power-ups
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    p.mesh.position.z += speed * dt;
    p.mesh.rotation.y += dt * 2.5;
    p.mesh.position.y = 1.3 + Math.sin(animFrame * 0.12 + i) * 0.18; // flutuação
    if (p.mesh.position.z > DESPAWN_Z) { three.scene.remove(p.mesh); powerUps.splice(i, 1); continue; }
    if (p.mesh.position.z > -2.5 && p.mesh.position.z < 2.5) {
      if (Math.abs(pX - LANE_X[p.lane]) < 1.6 && playerY < 2.8) {
        three.scene.remove(p.mesh); powerUps.splice(i, 1);
        activatePowerUp(p.type);
      }
    }
  }

  // Move & collect keys
  for (let i = keys.length - 1; i >= 0; i--) {
    const k = keys[i];
    k.mesh.position.z += speed * dt;
    k.mesh.rotation.y += dt * 3;
    k.mesh.position.y = 1.2 + Math.sin(animFrame * 0.14 + i * 2) * 0.18;
    if (k.mesh.position.z > DESPAWN_Z) { three.scene.remove(k.mesh); keys.splice(i, 1); continue; }
    if (k.mesh.position.z > -2.5 && k.mesh.position.z < 2.5) {
      if (Math.abs(pX - LANE_X[k.lane]) < 1.6 && playerY < 2.8) {
        three.scene.remove(k.mesh); keys.splice(i, 1);
        hasKey = true;
        sfxKey();
        showPowerNotif('🗝️ CHAVE! (reviver grátis)', '#ffee00');
        flashScreen('rgba(255,238,0,0.3)', 300);
      }
    }
  }

  // Recycle tiles
  envTiles.forEach(t => { t.position.z += speed * dt; if (t.position.z > 14) t.position.z -= TILE_PERIOD; });
  envBuildings.forEach(b => { b.position.z += speed * dt; if (b.position.z > 14) b.position.z -= 14 * 18; });

  // Camera lean
  three.camera.position.x += (playerObj.group.position.x * 0.22 - three.camera.position.x) * Math.min(dt * 9, 1);
}

// ── Reviver ───────────────────────────────────────────────────────────────────
function showReviveOverlay() {
  if (!overlay || state !== 'dead') return;
  overlay.hidden = false;
  let countdown = 5;

  function render() {
    const cost    = REVIVE_COST * (reviveCount + 1);
    const keyBtn  = hasKey
      ? `<button id="ro-key"  class="ro-btn ro-btn--key">🗝️ CHAVE GRÁTIS</button>` : '';
    const coinBtn = coinBank >= cost
      ? `<button id="ro-coin" class="ro-btn ro-btn--coin">🪙 ${cost} MOEDAS</button>` : '';
    overlay.innerHTML =
      `<p class="ro-label">GAME OVER</p>` +
      `<p class="ro-score">${score}</p>` +
      `<p class="ro-revive-timer">Reviver? ${countdown}s</p>` +
      `<div class="ro-revive-btns">${keyBtn}${coinBtn}</div>` +
      `<p class="ro-hint ro-skip" id="ro-skip">Pular →</p>`;
    document.getElementById('ro-key')?.addEventListener('click',  () => { clearInterval(iv); revive(true);  });
    document.getElementById('ro-coin')?.addEventListener('click', () => { clearInterval(iv); revive(false); });
    document.getElementById('ro-skip')?.addEventListener('click', () => { clearInterval(iv); unlockScroll(); showOverlay(true); });
  }

  render();
  const iv = setInterval(() => {
    if (state !== 'dead') { clearInterval(iv); return; }
    countdown--;
    if (countdown <= 0) { clearInterval(iv); unlockScroll(); showOverlay(true); }
    else render();
  }, 1000);
}

function revive(usingKey) {
  if (state !== 'dead') return;
  if (usingKey) {
    if (!hasKey) return;
    hasKey = false;
  } else {
    const cost = REVIVE_COST * (reviveCount + 1);
    if (coinBank < cost) return;
    coinBank -= cost;
    localStorage.setItem('runner-coins', coinBank);
    updateCoinBankHUD();
  }
  reviveCount++;
  obstacles.forEach(o => three.scene.remove(o.mesh)); obstacles = [];
  targetLane = 1;
  playerY = GROUND_Y; playerVY = 0; crouching = false;
  playerObj.group.position.set(LANE_X[1], 0, 0);
  playerObj.group.rotation.set(0, 0, 0);
  playerObj.group.scale.set(1, 1, 1);
  shieldActive = 3; // 3s de invencibilidade
  state = 'playing';
  hideOverlay();
  flashScreen('rgba(255,220,0,0.45)', 500);
  showPowerNotif('🔄 REANIMADO! (3s imune)', '#ff8800');
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function gameLoop() {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(three.clock.getDelta(), 0.05);
  if (state === 'playing') update(dt);

  // Camera shake (pós-morte)
  if (camShake > 0.01) {
    three.camera.position.x += (Math.random() - 0.5) * camShake * 0.6;
    three.camera.position.y += (Math.random() - 0.5) * camShake * 0.35;
    camShake *= 0.82;
  } else if (camShake > 0) {
    // Restaura y padrão da câmera
    three.camera.position.y += (5.5 - three.camera.position.y) * 0.1;
    camShake = 0;
  }

  three.renderer.render(three.scene, three.camera);
}

// ── Start / Die ───────────────────────────────────────────────────────────────
function begin() {
  if (state === 'playing') return;
  score = 0; speed = BASE_SPEED; targetLane = 1;
  playerY = GROUND_Y; playerVY = 0; crouching = false;
  wasOnGround = true; laneLean = 0;
  animFrame = 0; spawnT = 0; coinT = 0; scoreT = 0; speedT = 0; keyT = 0;
  scoreEl.textContent = '0'; speedEl.textContent = '1.0×';
  magnetActive = 0; shieldActive = 0; multiplierActive = 0; jetpackActive = 0; invincibleT = 0; powerUpT = 0;
  playerObj.group.visible = true;
  coinsThisRun = 0; distance = 0; runTime = 0;
  hasKey = false; reviveCount = 0; jumpCount = 0; powerUpsUsed = 0;
  coinStreak = 0; coinStreakT = 0;
  playerObj.group.rotation.x = 0;
  keys.forEach(k => three.scene.remove(k.mesh)); keys = [];
  if (distEl) distEl.textContent = '0m';
  updateCoinBankHUD();
  powerUps.forEach(p => three.scene.remove(p.mesh)); powerUps = [];
  if (powersEl) powersEl.innerHTML = '';
  if (playerObj.shieldBubble) playerObj.shieldBubble.visible = false;
  if (playerObj.shieldRing)   playerObj.shieldRing.visible   = false;
  playerObj.group.position.set(LANE_X[1], 0, 0);
  playerObj.group.rotation.set(0, 0, 0);
  playerObj.group.scale.set(1, 1, 1);
  obstacles.forEach(o => three.scene.remove(o.mesh));
  coins.forEach(c => three.scene.remove(c.mesh));
  obstacles = []; coins = [];
  state = 'playing';
  hideOverlay();
  lockScroll();
}

function die() {
  if (state !== 'playing') return;
  // Escudo absorve o impacto
  if (shieldActive > 0) {
    shieldActive = 0;
    invincibleT  = 1.8; // 1.8s de invencibilidade pós-escudo
    sfxShieldHit();
    flashScreen('rgba(34,197,94,0.55)', 300);
    if (playerObj.shieldBubble) playerObj.shieldBubble.visible = false;
    if (playerObj.shieldRing)   playerObj.shieldRing.visible   = false;
    // Remove obstáculos que estavam na zona de colisão para evitar double-hit
    for (let j = obstacles.length - 1; j >= 0; j--) {
      if (obstacles[j].mesh.position.z > -5 && obstacles[j].mesh.position.z < 3) {
        three.scene.remove(obstacles[j].mesh);
        obstacles.splice(j, 1);
      }
    }
    return;
  }
  state = 'dead';
  playerObj.group.rotation.z = 0.6;
  playerObj.group.rotation.x = 0;
  playerObj.group.scale.set(1.3, 0.5, 1.3);
  if (playerObj.jpBack) playerObj.jpBack.visible = false;
  sfxDie();
  flashScreen('rgba(255,30,0,0.45)', 400);
  camShake = 1.0;

  // Bancar moedas da corrida
  coinBank += coinsThisRun;
  coinsThisRun = 0;
  localStorage.setItem('runner-coins', coinBank);
  updateCoinBankHUD();

  // Missões baseadas em tempo/pontuação (ao fim da corrida)
  advanceMission('score', 0); // já avançado em tempo real; apenas salva
  saveMissions();

  if (hasKey || coinBank >= REVIVE_COST * (reviveCount + 1)) {
    setTimeout(() => { if (state === 'dead') showReviveOverlay(); }, 600);
  } else {
    unlockScroll();
    setTimeout(() => { if (state === 'dead') showOverlay(true); }, 500);
  }
}

// ── Overlay ───────────────────────────────────────────────────────────────────
function showOverlay(dead) {
  if (!overlay) return;
  overlay.hidden = false;
  if (dead) {
    const missHtml = missions.map(m =>
      `<span style="display:inline-block;margin:1px 3px;font-size:0.72rem;color:${m.done?'#44ff88':'#aaa'}">${m.done?'✅':'○'} ${m.label} ${m.progress}/${m.target}</span>`
    ).join('');
    overlay.innerHTML =
      `<p class="ro-label">Game Over</p>` +
      `<p class="ro-score">${score}</p>` +
      `<p class="ro-sub">Recorde: ${best} &nbsp;·&nbsp; 💰 Banco: ${coinBank}</p>` +
      `<div style="margin:0.4rem 0 0.6rem;line-height:1.6;">${missHtml}</div>` +
      `<p class="ro-hint">Toque ou espaço para jogar de novo</p>`;
  } else {
    const missHtml = missions.map(m =>
      `<span style="display:inline-block;margin:1px 3px;font-size:0.70rem;color:${m.done?'#44ff88':'#ffee00'}">${m.done?'✅':'🎯'} ${m.label} ${m.progress}/${m.target}</span>`
    ).join('');
    overlay.innerHTML =
      `<p class="ro-title">Corrida do<br>Aloncinho</p>` +
      `<p style="color:#aaa;font-size:0.75rem;margin:0.2rem 0 0.4rem">← → faixa &nbsp;·&nbsp; ↑ pular &nbsp;·&nbsp; ↓ agachar</p>` +
      `<p style="color:#ffee00;font-size:0.72rem;font-weight:700;margin:0.3rem 0 0.1rem">🎯 MISSÕES DE HOJE</p>` +
      `<div style="margin-bottom:0.5rem;line-height:1.7">${missHtml}</div>` +
      `<p style="color:#aaa;font-size:0.72rem;margin-bottom:0.4rem">💰 Banco: ${coinBank} moedas (reviver custa ${REVIVE_COST})</p>` +
      `<p class="ro-hint">Toque ou pressione espaço para começar</p>`;
  }
}
function hideOverlay() { if (overlay) overlay.hidden = true; }

// ── Scroll lock ────────────────────────────────────────────────────────────────
function lockScroll() {
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  canvas.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function unlockScroll() {
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

// ── Input ──────────────────────────────────────────────────────────────────────
function moveLeft()  { if (state !== 'playing') { begin(); return; } if (targetLane > 0) targetLane--; }
function moveRight() { if (state !== 'playing') { begin(); return; } if (targetLane < 2) targetLane++; }
function doJump() {
  if (state !== 'playing') { begin(); return; }
  if (playerY <= 0.02) {
    playerVY = JUMP_V;
    crouching = false;
    sfxJump();
    playerObj.group.scale.set(0.78, 1.38, 0.78);
    jumpCount++;
    advanceMission('jumps', 1);
  }
}
function doCrouch()  { if (state === 'playing') crouching = true; }
function endCrouch() { crouching = false; }

document.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  switch (e.key) {
    case 'ArrowLeft':  moveLeft();  break;
    case 'ArrowRight': moveRight(); break;
    case 'ArrowUp': case ' ': doJump(); break;
    case 'ArrowDown': doCrouch(); break;
  }
});
document.addEventListener('keyup', e => { if (e.key === 'ArrowDown') endCrouch(); });

document.getElementById('runner-left')  ?.addEventListener('click',         moveLeft);
document.getElementById('runner-right') ?.addEventListener('click',         moveRight);
document.getElementById('runner-jump')  ?.addEventListener('click',         doJump);
document.getElementById('runner-crouch')?.addEventListener('pointerdown',   doCrouch);
document.getElementById('runner-crouch')?.addEventListener('pointerup',     endCrouch);
document.getElementById('runner-crouch')?.addEventListener('pointercancel', endCrouch);

let tx0 = 0, ty0 = 0;
canvas.addEventListener('touchstart', e => {
  e.preventDefault(); tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY;
}, { passive: false });
canvas.addEventListener('touchend', e => {
  e.preventDefault();
  const dx = e.changedTouches[0].clientX - tx0;
  const dy = e.changedTouches[0].clientY - ty0;
  if (state !== 'playing') { begin(); return; }
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx < -25) moveLeft(); else if (dx > 25) moveRight();
  } else {
    if (dy < -25) doJump(); else if (dy > 25) { doCrouch(); setTimeout(endCrouch, 600); }
  }
}, { passive: false });

canvas.addEventListener('click', () => { if (state !== 'playing') begin(); });
overlay?.addEventListener('click', () => { if (state !== 'playing') begin(); });

// ── Boot ───────────────────────────────────────────────────────────────────────
initThree();
loadDailyMissions();
updateCoinBankHUD();
showOverlay(false);
gameLoop();
