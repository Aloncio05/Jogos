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

// ── State ────────────────────────────────────────────────────────────────────
let three = {};
let playerObj = {};
let obstacles = [], coins = [];
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
let spawnT = 0, coinT = 0, scoreT = 0, speedT = 0, powerUpT = 0;

// ── Power-ups ─────────────────────────────────────────────────────────────────
let powerUps = [];
let magnetActive = 0, shieldActive = 0, multiplierActive = 0;

// ── DOM ──────────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('runner-canvas');
const scoreEl  = document.getElementById('runner-score');
const bestEl   = document.getElementById('runner-best');
const speedEl  = document.getElementById('runner-speed');
const overlay  = document.getElementById('runner-overlay');
const powersEl = document.getElementById('runner-powers');

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

// ── HUD helpers ───────────────────────────────────────────────────────────────
function coinPop() {
  const wrap = canvas.parentElement;
  const div  = document.createElement('div');
  div.textContent = '+5';
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
  c.width = 3; c.height = 1;
  const x = c.getContext('2d');
  // sombra clara (70%) → highlight (100%) — cores aparecem vivas mesmo na sombra
  x.fillStyle = '#b4b4b4'; x.fillRect(0, 0, 1, 1);
  x.fillStyle = '#ffffff'; x.fillRect(1, 0, 2, 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function toon(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradMap });
}

// Adiciona contorno preto (backface trick — cel-shading outline)
function outline(mesh, scale = 1.10) {
  const o = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide })
  );
  o.scale.setScalar(scale);
  mesh.add(o);
}

function outlineGroup(group, scale = 1.10) {
  group.traverse(child => {
    if (child.isMesh && !child._isOutline) outline(child, scale);
  });
}

// ── Three.js init ─────────────────────────────────────────────────────────────
function initThree() {
  gradMap = makeToonGrad();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4dd8fa); // cartoon sky blue
  scene.fog = new THREE.Fog(0x99eaff, 60, 210);

  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 260);
  camera.position.set(0, 5.5, 11);
  camera.lookAt(0, 1.5, -30);

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
  // Ambient alto = cores vivas em todas as faces
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));

  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(8, 20, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left   = -20;
  sun.shadow.camera.right  =  20;
  sun.shadow.camera.top    =  20;
  sun.shadow.camera.bottom =  -6;
  sun.shadow.camera.far    =  75;
  scene.add(sun);
}

// ── Environment ───────────────────────────────────────────────────────────────
function buildEnvironment(scene) {

  // Pista — verde grama vivo
  const groundMat  = toon(0x44dd22);
  const groundMat2 = toon(0x33cc11);
  const tileGeo    = new THREE.BoxGeometry(14, 0.5, 24);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(tileGeo, i % 2 === 0 ? groundMat : groundMat2);
    m.position.set(0, -0.25, -i * 24 + 12);
    m.receiveShadow = true;
    scene.add(m);
    envTiles.push(m);
  }

  // Asfalto escuro (pista central)
  const concMat = toon(0x444444);
  const concGeo = new THREE.BoxGeometry(7.8, 0.52, 24);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(concGeo, concMat);
    m.position.set(0, -0.24, -i * 24 + 12);
    m.receiveShadow = true;
    scene.add(m);
    envTiles.push(m);
  }

  // Divisórias tracejadas amarelas — x=-1.5 e x=1.5 (entre as 3 faixas)
  // 5 traços por tile de 24u = espaçamento 4.8u cada
  const dashGeo = new THREE.BoxGeometry(0.18, 0.06, 1.6);
  const dashMat = toon(0xffee00);
  [-1.5, 1.5].forEach(dx => {
    for (let i = 0; i < 8; i++) {
      for (let d = 0; d < 5; d++) {
        const m = new THREE.Mesh(dashGeo, dashMat);
        m.position.set(dx, 0.02, 10 - i * 24 - d * 4.8);
        scene.add(m);
        envTiles.push(m);
      }
    }
  });

  // Bordas brancas sólidas (estáticas, 400u)
  [-3.75, 3.75].forEach(x => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.06, 400), toon(0xffffff));
    m.position.set(x, 0.02, -195);
    scene.add(m);
  });

  // Calçada lateral (cor cartoon laranja/vermelho — like SS)
  const sidewalkMat = toon(0xff8844);
  [-1, 1].forEach(side => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 400), sidewalkMat);
    m.position.set(side * 5.3, -0.22, -195);
    scene.add(m);
  });

  // Muros baixos com contorno
  const wallMat = toon(0xffeedd);
  [-1, 1].forEach(side => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 400), wallMat);
    wall.position.set(side * 6.5, 0.8, -195);
    scene.add(wall);
    outline(wall);
  });

  // Postes de luz cartoon
  const poleMat = toon(0x888888);
  const lampMat = toon(0xffff88);
  for (let i = 0; i < 12; i++) {
    [-1, 1].forEach(side => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 5, 8), poleMat);
      pole.position.set(side * 6.2, 2.5, -i * 22);
      scene.add(pole);
      envBuildings.push(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), lampMat);
      lamp.position.set(side * 6.2, 5.2, -i * 22);
      scene.add(lamp);
      outline(lamp);
      envBuildings.push(lamp);
    });
  }

  // Prédios cartoon (3 tipos, cores primárias vivas + contornos)
  // Cores de prédio super saturadas, cartoon
  const bCols = [0xff2222, 0xff8800, 0x22cc00, 0x0066ff, 0xcc00cc, 0xff4400, 0x00cccc, 0xeecc00];
  const winCol = toon(0xeeffff);

  for (let i = 0; i < 14; i++) {
    [-1, 1].forEach(side => {
      const bx  = side * (10.5 + Math.random() * 4.5);
      const bz  = -i * 18;
      const col = bCols[Math.floor(Math.random() * bCols.length)];
      const mat = toon(col);
      const h   = 8 + Math.random() * 20;
      const t   = Math.random();

      if (t < 0.33) {
        // Prédio retangular + topo diferente
        const w = 4 + Math.random() * 4, d = 3 + Math.random() * 3;
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        b.position.set(bx, h / 2, bz);
        b.castShadow = true;
        scene.add(b); envBuildings.push(b); outline(b, 1.04);
        // Janelas
        for (let r = 0; r < 4; r++) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 0.4, 0.07), winCol);
          win.position.set(bx, h * 0.18 + r * h * 0.18, bz + d / 2 + 0.02);
          scene.add(win); envBuildings.push(win);
        }
        // Teto plano colorido
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.55, d + 0.5), toon(0x333333));
        roof.position.set(bx, h + 0.27, bz);
        scene.add(roof); envBuildings.push(roof);

      } else if (t < 0.66) {
        // Torre redonda com cúpula
        const r = 1.8 + Math.random() * 1.8;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r, h, 14), mat);
        b.position.set(bx, h / 2, bz);
        b.castShadow = true;
        scene.add(b); envBuildings.push(b); outline(b, 1.04);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(r * 0.92, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xff4444));
        dome.position.set(bx, h, bz);
        scene.add(dome); envBuildings.push(dome); outline(dome, 1.06);

      } else {
        // Arranha-céu fino com antena
        const w = 2.8 + Math.random() * 2, d = 2.2 + Math.random() * 2;
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        b.position.set(bx, h / 2, bz);
        b.castShadow = true;
        scene.add(b); envBuildings.push(b); outline(b, 1.04);
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, h * 0.3, 6), toon(0x888888));
        ant.position.set(bx, h + h * 0.15, bz);
        scene.add(ant); envBuildings.push(ant);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), toon(0xff3333));
        tip.position.set(bx, h + h * 0.3, bz);
        scene.add(tip); envBuildings.push(tip); outline(tip, 1.15);
        for (let r = 0; r < 5; r++) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.32, 0.07), winCol);
          win.position.set(bx, h * 0.14 + r * h * 0.16, bz + d / 2 + 0.02);
          scene.add(win); envBuildings.push(win);
        }
      }
    });
  }

  // Nuvens cartoon (esferas brancas agrupadas)
  const cloudMat = toon(0xffffff);
  [[-12,26,-40],[9,23,-85],[-6,29,-135],[16,25,-175],[-20,27,-210]].forEach(([cx,cy,cz]) => {
    [0,2.5,-2.5,1.2,-1.2].forEach((ox, i) => {
      const r = 1.6 + Math.random() * 1.2;
      const c = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 7), cloudMat);
      c.position.set(cx + ox * 1.8, cy + (i % 2 ? -0.7 : 0), cz);
      scene.add(c);
      envBuildings.push(c);
    });
  });

  // Sol cartoon
  const sunGeo = new THREE.CircleGeometry(5.5, 20);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee44, side: THREE.DoubleSide });
  const sun2d  = new THREE.Mesh(sunGeo, sunMat);
  sun2d.position.set(18, 35, -215);
  scene.add(sun2d);
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

  // Cabeça grande (proporção cartoon)
  const head = add(new THREE.SphereGeometry(0.32, 16, 12), skin, 0, 1.80, 0);
  outline(head);

  // Olhos grandes expressivos
  add(new THREE.SphereGeometry(0.080, 8, 6), dark, -0.12, 1.88, -0.29);
  add(new THREE.SphereGeometry(0.080, 8, 6), dark,  0.12, 1.88, -0.29);
  // Brilho nos olhos
  add(new THREE.SphereGeometry(0.030, 6, 4), toon(0xffffff), -0.10, 1.91, -0.31);
  add(new THREE.SphereGeometry(0.030, 6, 4), toon(0xffffff),  0.14, 1.91, -0.31);

  // Boné
  const cap = add(new THREE.CylinderGeometry(0.33, 0.31, 0.16, 14), capM, 0, 2.14, 0);
  outline(cap);
  add(new THREE.BoxGeometry(0.70, 0.08, 0.34), capM, 0, 2.03, -0.25);

  // Torso
  const torso = add(new THREE.BoxGeometry(0.64, 0.82, 0.42), hoodie, 0, 1.10, 0);
  outline(torso, 1.06);

  // Braços (cilindros)
  const armGeo = new THREE.CylinderGeometry(0.11, 0.10, 0.58, 10);
  const armL = add(armGeo, hoodie, -0.48, 1.10, 0);
  const armR = add(armGeo, hoodie,  0.48, 1.10, 0);
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

  // Bolha de escudo (visível só quando shieldActive > 0)
  const shieldBubble = new THREE.Mesh(
    new THREE.SphereGeometry(1.35, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.22, side: THREE.FrontSide })
  );
  shieldBubble.visible = false;
  group.add(shieldBubble);

  group.position.set(LANE_X[1], 0, 0);
  group.rotation.y = Math.PI;
  scene.add(group);
  playerObj = { group, meshes: { head, torso, armL, armR, legL, legR, cap }, shadowMesh, shieldBubble };
}

// ── Obstacles ─────────────────────────────────────────────────────────────────
// ── Obstáculos de rua ─────────────────────────────────────────────────────────

const CAR_COLORS = [0xff2222, 0x2255ff, 0x22bb44, 0xff8800, 0xcc22cc, 0xffee00, 0x00cccc];

function makeCarMesh() {
  const col   = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  const group = new THREE.Group();
  const darkM = toon(0x222222);
  const glassM = toon(0x88ddff);

  // Carroceria baixa
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 1.0), toon(col));
  chassis.position.y = 0.28;
  chassis.castShadow = true;
  group.add(chassis); outline(chassis, 1.05);

  // Cabine (teto arredondado simulado com box menor)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.9), toon(col));
  cabin.position.set(0, 0.83, 0.02);
  cabin.castShadow = true;
  group.add(cabin); outline(cabin, 1.05);

  // Para-brisas dianteiro e traseiro
  const windF = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.38, 0.06), glassM);
  windF.position.set(0, 0.80, 0.48);
  group.add(windF);
  const windR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.38, 0.06), glassM);
  windR.position.set(0, 0.80, -0.48);
  group.add(windR);

  // Rodas
  [[-0.85, -0.38], [0.85, -0.38], [-0.85, 0.38], [0.85, 0.38]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 12), darkM);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.22, wz);
    group.add(w);
  });

  // Faróis
  [-0.60, 0.60].forEach(lx => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xffffaa }));
    l.position.set(lx, 0.28, 0.53);
    group.add(l);
  });

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
  // Barreira de concreto (tipo New Jersey)
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.70, 0.55), toon(0xcccccc));
  body.position.y = 0.35;
  body.castShadow = true;
  group.add(body); outline(body, 1.05);

  // Listras laranjas de aviso
  [0.55, -0.55].forEach(x => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.08), toon(0xff6600));
    s.position.set(x, 0.35, 0.28);
    group.add(s);
  });
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
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.44), toon(0x22c55e));
  g.add(body); outline(body, 1.10);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 14), toon(0x86efac));
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
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

// ── Dificuldade ───────────────────────────────────────────────────────────────
function getDiff() {
  return Math.min(5, Math.floor((speed - BASE_SPEED) / ((MAX_SPEED - BASE_SPEED) / 6)));
}

function spawnLowBridge() {
  // Viaduto baixo — player precisa abaixar
  const group = new THREE.Group();
  const beam  = new THREE.Mesh(new THREE.BoxGeometry(14, 0.45, 0.80), toon(0x886644));
  beam.castShadow = true;
  group.add(beam); outline(beam, 1.03);
  const yBot = 1.40;
  group.position.set(0, yBot + 0.225, SPAWN_Z);
  three.scene.add(group);
  obstacles.push({ mesh: group, lane: -1, w: 14, yBot, yTop: yBot + 0.45 });
}

function spawnCar(laneOverride) {
  const l    = laneOverride !== undefined ? laneOverride : Math.floor(Math.random() * 3);
  const mesh = makeCarMesh();
  // Car height: carroceria top = 0.55 + 0.55 = 1.10
  mesh.position.set(LANE_X[l], 0, SPAWN_Z);
  three.scene.add(mesh);
  obstacles.push({ mesh, lane: l, w: 1.80, yBot: 0, yTop: 1.15 });
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

  // Dois carros bloqueando, uma faixa livre
  const doubleP = bridgeP + 0.18 + diff * 0.04;
  if (r < doubleP) {
    const open = Math.floor(Math.random() * 3);
    [0, 1, 2].filter(l => l !== open).forEach(l => spawnCar(l));
    if (diff >= 4 && Math.random() < 0.5) spawnBarrier(open);
    return;
  }

  // Obstáculos simples sorteados por tipo
  const pick = Math.random();
  if      (pick < 0.30) spawnCar();
  else if (pick < 0.52) spawnMoto();
  else if (pick < 0.68) spawnPothole();
  else if (pick < 0.82) spawnCones();
  else                  spawnBarrier();

  // Em dificuldade máxima spawna um extra
  if (diff >= 5 && Math.random() < 0.4) spawnCar();
}

function spawnCoin() {
  const l = Math.floor(Math.random() * 3);
  const y = 0.7 + Math.random() * 1.0;
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.09, 8, 18),
    toon(0xffcc00)
  );
  mesh.position.set(LANE_X[l], y, SPAWN_Z);
  mesh.rotation.x = Math.PI / 2;
  three.scene.add(mesh);
  coins.push({ mesh, lane: l, y });
}

function spawnPowerUp() {
  const types = ['magnet', 'shield', 'multiplier'];
  const type  = types[Math.floor(Math.random() * types.length)];
  const l     = Math.floor(Math.random() * 3);
  const mesh  = type === 'magnet' ? makeMagnetMesh() : type === 'shield' ? makeShieldMesh() : makeMultiplierMesh();
  mesh.position.set(LANE_X[l], 1.3, SPAWN_Z);
  three.scene.add(mesh);
  powerUps.push({ mesh, lane: l, type });
}

function activatePowerUp(type) {
  sfxPower();
  if (type === 'magnet') {
    magnetActive = 10;
    flashScreen('rgba(59,130,246,0.28)', 350);
    showPowerNotif('🧲 ÍMÃ DE MOEDAS!', '#3b82f6');
  } else if (type === 'shield') {
    shieldActive = 10;
    flashScreen('rgba(34,197,94,0.28)', 350);
    showPowerNotif('🛡️ ESCUDO ATIVO!', '#22c55e');
  } else {
    multiplierActive = 10;
    flashScreen('rgba(168,85,247,0.28)', 350);
    showPowerNotif('2× PONTUAÇÃO!', '#a855f7');
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

  // Score (distância + multiplicador)
  scoreT += dt;
  if (scoreT > 0.08) {
    scoreT = 0;
    score += multiplierActive > 0 ? 2 : 1;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('runner-best', best); }
  }

  // Power-up timers
  if (magnetActive     > 0) magnetActive     = Math.max(0, magnetActive     - dt);
  if (shieldActive     > 0) shieldActive     = Math.max(0, shieldActive     - dt);
  if (multiplierActive > 0) multiplierActive = Math.max(0, multiplierActive - dt);
  updatePowerHUD();

  // Escudo: bolha visual
  if (playerObj.shieldBubble) {
    playerObj.shieldBubble.visible = shieldActive > 0;
    if (shieldActive > 0) {
      playerObj.shieldBubble.rotation.y += dt * 1.8;
      const p = 1 + Math.sin(animFrame * 0.18) * 0.05;
      playerObj.shieldBubble.scale.setScalar(p);
    }
  }

  // Lane transition
  const tX = LANE_X[targetLane];
  playerObj.group.position.x += (tX - playerObj.group.position.x) * Math.min(dt * 14, 1);

  // ── Física do pulo (gravidade variável) ───────────────────────────────────
  const rising = playerVY > 0;
  playerVY += (rising ? GRAV_UP : GRAV_DOWN) * dt;
  playerY  += playerVY * dt;

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
    playerObj.meshes.head.position.y  = 1.80 + bob;
    playerObj.meshes.cap.position.y   = 2.14 + bob;
  } else if (!onGround) {
    // Abre as pernas no ar
    playerObj.meshes.legL.rotation.x = -0.55;
    playerObj.meshes.legR.rotation.x =  0.55;
    playerObj.meshes.armL.rotation.x = -1.0;
    playerObj.meshes.armR.rotation.x =  1.0;
  }

  // ── Spawn ─────────────────────────────────────────────────────────────────
  spawnT += dt;
  const diff     = getDiff();
  const interval = Math.max(0.50, 2.5 - speed / 17 - diff * 0.06);
  if (spawnT > interval) { spawnT = 0; spawnObstacle(); }

  coinT += dt;
  if (coinT > Math.max(0.45, 0.70 - diff * 0.04)) { coinT = 0; spawnCoin(); }

  powerUpT += dt;
  if (powerUpT > Math.max(8, 15 - diff * 1.2)) { powerUpT = 0; spawnPowerUp(); }

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
        if (pYTop > o.yBot + 0.08) hit = true;
      } else {
        if (Math.abs(pX - LANE_X[o.lane]) < pHW + o.w / 2 && pYBot < o.yTop && pYTop > o.yBot + 0.08) hit = true;
      }
      if (hit) { die(); return; }
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

    const collectR = magnetActive > 0 ? 3.0 : 1.5;
    if (c.mesh.position.z > -3.5 && c.mesh.position.z < 2.5) {
      if (Math.abs(pX - c.mesh.position.x) < collectR && Math.abs(playerY + 1.0 - c.mesh.position.y) < collectR) {
        three.scene.remove(c.mesh); coins.splice(i, 1);
        const coinVal = multiplierActive > 0 ? 10 : 5;
        score += coinVal; scoreEl.textContent = score;
        if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('runner-best', best); }
        sfxCoin(); coinPop();
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

  // Recycle tiles
  envTiles.forEach(t => { t.position.z += speed * dt; if (t.position.z > 14) t.position.z -= TILE_PERIOD; });
  envBuildings.forEach(b => { b.position.z += speed * dt; if (b.position.z > 14) b.position.z -= 14 * 18; });

  // Camera lean
  three.camera.position.x += (playerObj.group.position.x * 0.22 - three.camera.position.x) * Math.min(dt * 9, 1);
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
  animFrame = 0; spawnT = 0; coinT = 0; scoreT = 0; speedT = 0;
  scoreEl.textContent = '0'; speedEl.textContent = '1.0×';
  magnetActive = 0; shieldActive = 0; multiplierActive = 0; powerUpT = 0;
  powerUps.forEach(p => three.scene.remove(p.mesh)); powerUps = [];
  if (powersEl) powersEl.innerHTML = '';
  if (playerObj.shieldBubble) playerObj.shieldBubble.visible = false;
  playerObj.group.position.set(LANE_X[1], 0, 0);
  playerObj.group.rotation.set(0, Math.PI, 0);
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
    sfxShieldHit();
    flashScreen('rgba(34,197,94,0.55)', 300);
    if (playerObj.shieldBubble) playerObj.shieldBubble.visible = false;
    return;
  }
  state = 'dead';
  playerObj.group.rotation.z = 0.6;
  playerObj.group.scale.set(1.3, 0.5, 1.3);
  sfxDie();
  flashScreen('rgba(255,30,0,0.45)', 400);
  camShake = 1.0;
  unlockScroll();
  setTimeout(() => { if (state === 'dead') showOverlay(true); }, 500);
}

// ── Overlay ───────────────────────────────────────────────────────────────────
function showOverlay(dead) {
  if (!overlay) return;
  overlay.hidden = false;
  overlay.innerHTML = dead
    ? `<p class="ro-label">Game Over</p><p class="ro-score">${score}</p><p class="ro-sub">Recorde: ${best}</p><p class="ro-hint">Toque ou espaço para jogar de novo</p>`
    : `<p class="ro-title">Corrida do<br>Aloncinho</p><p class="ro-controls">← → faixa &nbsp;·&nbsp; ↑ pular &nbsp;·&nbsp; ↓ agachar</p><p class="ro-hint">Toque ou pressione espaço para começar</p>`;
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
    // Stretch no pulo
    playerObj.group.scale.set(0.78, 1.38, 0.78);
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
showOverlay(false);
gameLoop();
