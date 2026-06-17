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
let spawnT = 0, coinT = 0, scoreT = 0, speedT = 0;

// ── DOM ──────────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('runner-canvas');
const scoreEl  = document.getElementById('runner-score');
const bestEl   = document.getElementById('runner-best');
const speedEl  = document.getElementById('runner-speed');
const overlay  = document.getElementById('runner-overlay');
const powersEl = document.getElementById('runner-powers');

bestEl.textContent = best;

// ── Toon helpers ─────────────────────────────────────────────────────────────
function makeToonGrad() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 1;
  const x = c.getContext('2d');
  x.fillStyle = '#555'; x.fillRect(0, 0, 1, 1);
  x.fillStyle = '#aaa'; x.fillRect(1, 0, 1, 1);
  x.fillStyle = '#fff'; x.fillRect(2, 0, 2, 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function toon(color, emissive = 0x000000) {
  return new THREE.MeshToonMaterial({
    color,
    emissive: new THREE.Color(emissive),
    gradientMap: gradMap,
  });
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
  // Toon precisa de ambient baixo para sombras duras ficarem visíveis
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const sun = new THREE.DirectionalLight(0xfff8d0, 4.5);
  sun.position.set(10, 28, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left   = -20;
  sun.shadow.camera.right  =  20;
  sun.shadow.camera.top    =  20;
  sun.shadow.camera.bottom =  -6;
  sun.shadow.camera.far    =  75;
  scene.add(sun);

  // Fill light azul suave
  const fill = new THREE.DirectionalLight(0xaaddff, 0.6);
  fill.position.set(-10, 15, -15);
  scene.add(fill);
}

// ── Environment ───────────────────────────────────────────────────────────────
function buildEnvironment(scene) {

  // Pista — verde grama com listras
  const groundMat  = toon(0x55cc44, 0x115500);
  const groundMat2 = toon(0x44bb33);
  const tileGeo    = new THREE.BoxGeometry(14, 0.5, 24);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(tileGeo, i % 2 === 0 ? groundMat : groundMat2);
    m.position.set(0, -0.25, -i * 24 + 12);
    m.receiveShadow = true;
    scene.add(m);
    envTiles.push(m);
  }

  // Faixas da calçada/pista (concreto cinza entre trilhos)
  const concMat = toon(0xccccbb);
  const concGeo = new THREE.BoxGeometry(7.8, 0.52, 24);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(concGeo, concMat);
    m.position.set(0, -0.24, -i * 24 + 12);
    m.receiveShadow = true;
    scene.add(m);
    envTiles.push(m);
  }

  // Dormentes (madeira escura)
  const sleeperMat = toon(0x5c3010);
  const sleeperGeo = new THREE.BoxGeometry(7.4, 0.22, 0.60);
  for (let i = 0; i < 55; i++) {
    const m = new THREE.Mesh(sleeperGeo, sleeperMat);
    m.position.set(0, 0.11, 12 - i * (TILE_PERIOD / 55));
    m.receiveShadow = true;
    scene.add(m);
    envTiles.push(m);
  }

  // Trilhos metálicos
  const railMat = toon(0xddddcc, 0x222200);
  [-1.8, 1.8].forEach(x => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 400), railMat);
    m.position.set(x, 0.28, -195);
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
  const lampMat = toon(0xffff88, 0xaaaa00);
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
  const bCols = [0xff4444, 0xffaa00, 0x44cc44, 0x4488ff, 0xcc44cc, 0xff6622, 0x22cccc, 0xddcc00];
  const winCol = toon(0xeeffff, 0x004488);

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
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), toon(0xff3333, 0x880000));
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
  const cloudMat = toon(0xffffff, 0x8888aa);
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

  const skin   = toon(0xffcc88, 0x221100);
  const hoodie = toon(0xff5500, 0x220000);
  const pants  = toon(0x2255cc, 0x000822);
  const capM   = toon(0xffdd00, 0x443300);
  const shoe   = toon(0xfafafa, 0x111111);
  const dark   = toon(0x111111);
  const red    = toon(0xee2222, 0x220000);

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

  group.position.set(LANE_X[1], 0, 0);
  group.rotation.y = Math.PI;
  scene.add(group);
  playerObj = { group, meshes: { head, torso, armL, armR, legL, legR, cap } };
}

// ── Obstacles ─────────────────────────────────────────────────────────────────
const TRAIN_COLORS = [
  { body: 0xff2222, stripe: 0xffee00 },
  { body: 0x2255ff, stripe: 0xffffff },
  { body: 0x22bb44, stripe: 0xffee22 },
  { body: 0xff8800, stripe: 0xffffff },
  { body: 0xcc22cc, stripe: 0xffaaff },
];

function makeTrainMesh(w, h, d) {
  const tc    = TRAIN_COLORS[Math.floor(Math.random() * TRAIN_COLORS.length)];
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(tc.body));
  body.castShadow = true;
  group.add(body);
  outline(body, 1.05);

  // Nariz arredondado
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(w * 0.40, 12, 8, 0, Math.PI),
    toon(tc.body)
  );
  nose.rotation.y = -Math.PI / 2;
  nose.position.set(0, 0, d / 2);
  group.add(nose);

  // Faixa
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.04, 0.32, d + 0.06),
    toon(tc.stripe)
  );
  stripe.position.set(0, h * 0.13, 0);
  group.add(stripe);

  // Janelas
  [-w * 0.22, w * 0.22].forEach(wx => {
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.28, h * 0.28, 0.07),
      toon(0xd4f4ff, 0x002244)
    );
    win.position.set(wx, h * 0.22, d / 2 + 0.02);
    group.add(win);
  });

  // Faróis
  [-w * 0.30, w * 0.30].forEach(lx => {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.15, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffbb }));
    l.position.set(lx, -h * 0.30, d / 2 + 0.55);
    group.add(l);
  });

  // Rodas
  const wheelMat = toon(0x222222);
  [-w * 0.28, w * 0.28].forEach(wx => {
    [-d * 0.28, d * 0.28].forEach(wz => {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.14, 12), wheelMat);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(wx, -h / 2 + 0.08, wz);
      group.add(wh);
    });
  });

  return group;
}

function makeBarrierMesh(w, h, d) {
  const group = new THREE.Group();
  const cols  = [0xffaa00, 0xff5500, 0xffdd00];
  const col   = cols[Math.floor(Math.random() * cols.length)];

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(col));
  body.castShadow = true;
  group.add(body);
  outline(body, 1.08);

  const stripeMat = toon(0x111111);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.20, h + 0.04, 0.06), stripeMat);
    s.position.set(-w * 0.3 + i * w * 0.3, 0, d / 2 + 0.02);
    group.add(s);
  }
  return group;
}

// ── Dificuldade ───────────────────────────────────────────────────────────────
function getDiff() {
  return Math.min(5, Math.floor((speed - BASE_SPEED) / ((MAX_SPEED - BASE_SPEED) / 6)));
}

function spawnOverheadBeam() {
  const group = new THREE.Group();
  const beam  = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.50, 0.70),
    toon(0x445566)
  );
  beam.castShadow = true;
  group.add(beam);
  outline(beam, 1.04);
  const wMat = toon(0xffcc00, 0x442200);
  [-5, -2.5, 0, 2.5, 5].forEach(x => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, 0.06), wMat);
    s.position.set(x, 0, 0.36);
    group.add(s);
  });
  const yBot = 1.45, h = 0.50;
  group.position.set(0, yBot + h / 2, SPAWN_Z);
  three.scene.add(group);
  obstacles.push({ mesh: group, lane: -1, w: 14, yBot, yTop: yBot + h });
}

function spawnSingleTrain(laneOverride) {
  const h = 3.0, w = 2.6, d = 0.95;
  const l = laneOverride !== undefined ? laneOverride : Math.floor(Math.random() * 3);
  const mesh = makeTrainMesh(w, h, d);
  mesh.position.set(LANE_X[l], h / 2, SPAWN_Z);
  three.scene.add(mesh);
  obstacles.push({ mesh, lane: l, w: w * 0.88, yBot: 0, yTop: h });
}

function spawnObstacle() {
  const diff = getDiff();
  const r    = Math.random();
  const overheadP = 0.10 + diff * 0.04;
  const doubleP   = overheadP + 0.15 + diff * 0.05;

  if (r < overheadP) {
    spawnOverheadBeam();
    if (diff >= 3 && Math.random() < 0.45) {
      const h = 0.68, w = 2.2, d = 0.7;
      const l = Math.floor(Math.random() * 3);
      const mesh = makeBarrierMesh(w, h, d);
      mesh.position.set(LANE_X[l], h / 2, SPAWN_Z - 7);
      three.scene.add(mesh);
      obstacles.push({ mesh, lane: l, w: w * 0.88, yBot: 0, yTop: h });
    }
    return;
  }

  if (r < doubleP) {
    const h = 3.0, w = 2.6, d = 0.95;
    const open = Math.floor(Math.random() * 3);
    [0, 1, 2].filter(l => l !== open).forEach(l => {
      const mesh = makeTrainMesh(w, h, d);
      mesh.position.set(LANE_X[l], h / 2, SPAWN_Z);
      three.scene.add(mesh);
      obstacles.push({ mesh, lane: l, w: w * 0.88, yBot: 0, yTop: h });
    });
    if (diff >= 4 && Math.random() < 0.5) {
      const bh = 0.68, bw = 2.2, bd = 0.7;
      const mesh = makeBarrierMesh(bw, bh, bd);
      mesh.position.set(LANE_X[open], bh / 2, SPAWN_Z - 9);
      three.scene.add(mesh);
      obstacles.push({ mesh, lane: open, w: bw * 0.88, yBot: 0, yTop: bh });
    }
    return;
  }

  if (Math.random() < 0.55) {
    spawnSingleTrain();
  } else {
    const h = 0.68, w = 2.2, d = 0.7;
    const l = Math.floor(Math.random() * 3);
    const mesh = makeBarrierMesh(w, h, d);
    mesh.position.set(LANE_X[l], h / 2, SPAWN_Z);
    three.scene.add(mesh);
    obstacles.push({ mesh, lane: l, w: w * 0.88, yBot: 0, yTop: h });
  }

  if (diff >= 5 && Math.random() < 0.4) spawnSingleTrain();
}

function spawnCoin() {
  const l = Math.floor(Math.random() * 3);
  const y = 0.7 + Math.random() * 1.0;
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.09, 8, 18),
    toon(0xffcc00, 0x885500)
  );
  mesh.position.set(LANE_X[l], y, SPAWN_Z);
  mesh.rotation.x = Math.PI / 2;
  three.scene.add(mesh);
  coins.push({ mesh, lane: l, y });
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
    if (getDiff() > prevDiff && powersEl) {
      const LABELS = ['','🔥 MAIS RÁPIDO!','🔥🔥 VELOZ!','⚡ ULTRA!','⚡⚡ INSANO!','💥 MAX!'];
      const label = LABELS[getDiff()] || '💥 MAX!';
      powersEl.innerHTML = `<span class="runner-power-chip" style="background:#ff4400;color:#fff;padding:4px 14px;border-radius:20px;font-weight:700;font-size:0.9rem;">${label}</span>`;
      setTimeout(() => { if (powersEl) powersEl.innerHTML = ''; }, 1800);
    }
  }

  // Score
  scoreT += dt;
  if (scoreT > 0.08) {
    scoreT = 0; score++;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; localStorage.setItem('runner-best', best); }
  }

  // Lane transition
  const tX = LANE_X[targetLane];
  playerObj.group.position.x += (tX - playerObj.group.position.x) * Math.min(dt * 14, 1);

  // ── Física do pulo (gravidade variável) ───────────────────────────────────
  const rising = playerVY > 0;
  playerVY += (rising ? GRAV_UP : GRAV_DOWN) * dt;
  playerY  += playerVY * dt;

  const onGround = playerY <= GROUND_Y + 0.01;

  // Landing squash
  if (!wasOnGround && onGround && playerVY < -2) {
    playerObj.group.scale.set(1.40, 0.60, 1.40);
  }
  wasOnGround = onGround;
  if (onGround) { playerY = GROUND_Y; playerVY = 0; }
  playerObj.group.position.y = playerY;

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
    if (c.mesh.position.z > -2.5 && c.mesh.position.z < 2.5) {
      if (Math.abs(pX - LANE_X[c.lane]) < 1.5 && Math.abs(playerY + 1.0 - c.y) < 1.3) {
        three.scene.remove(c.mesh); coins.splice(i, 1); score += 5; scoreEl.textContent = score; i--;
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
  state = 'dead';
  playerObj.group.rotation.z = 0.6;
  playerObj.group.scale.set(1.3, 0.5, 1.3);
  unlockScroll();
  setTimeout(() => showOverlay(true), 500);
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
