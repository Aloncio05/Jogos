'use strict';
/* global THREE */

// ── Corrida do Aloncinho 3D — Subway Surfers style ───────────────────────────

const W = 360, H = 600;
const LANE_X     = [-3, 0, 3];
const SPAWN_Z    = -130;
const DESPAWN_Z  = 12;
const BASE_SPEED = 22;
const MAX_SPEED  = 58;
const SPEED_INC  = 1.0;
const GRAVITY    = -30;
const JUMP_V     = 13;
const GROUND_Y   = 0;
const CROUCH_S   = 0.5;
const TILE_PERIOD = 8 * 24; // recycle period for ground objects

// ── State ────────────────────────────────────────────────────────────────────
let three = {};
let playerObj = {};
let obstacles = [], coins = [];
let envTiles = [], envBuildings = [];

let state      = 'idle';
let score      = 0;
let best       = parseInt(localStorage.getItem('runner-best') || '0');
let speed      = BASE_SPEED;
let targetLane = 1;
let playerY    = GROUND_Y;
let playerVY   = 0;
let crouching  = false;
let animFrame  = 0;
let spawnT = 0, coinT = 0, scoreT = 0, speedT = 0;

// ── DOM ──────────────────────────────────────────────────────────────────────
const canvas   = document.getElementById('runner-canvas');
const scoreEl  = document.getElementById('runner-score');
const bestEl   = document.getElementById('runner-best');
const speedEl  = document.getElementById('runner-speed');
const overlay  = document.getElementById('runner-overlay');

bestEl.textContent = best;

// ── Three.js init ────────────────────────────────────────────────────────────
function initThree() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // daytime sky blue
  scene.fog = new THREE.Fog(0xc8e8ff, 55, 200);

  const camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 260);
  camera.position.set(0, 5, 10);
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
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));

  const sun = new THREE.DirectionalLight(0xfff5d0, 3.2);
  sun.position.set(12, 32, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left   = -18;
  sun.shadow.camera.right  =  18;
  sun.shadow.camera.top    =  18;
  sun.shadow.camera.bottom =  -5;
  sun.shadow.camera.far    =  70;
  scene.add(sun);

  // Sky fill (blue-ish, from opposite side)
  const skyFill = new THREE.DirectionalLight(0x9ac8e8, 0.9);
  skyFill.position.set(-8, 18, -12);
  scene.add(skyFill);
}

// ── Environment ──────────────────────────────────────────────────────────────
function buildEnvironment(scene) {

  // ── Ground platform (concrete) ─────────────────────────────────────────────
  const concreteMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
  const tileGeo     = new THREE.BoxGeometry(14, 0.4, 24);
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(tileGeo, concreteMat);
    m.position.set(0, -0.2, -i * 24 + 12);
    m.receiveShadow = true;
    scene.add(m);
    envTiles.push(m);
  }

  // ── Railroad sleepers (dark wood, across track) ────────────────────────────
  const sleeperMat = new THREE.MeshLambertMaterial({ color: 0x3d2200 });
  const sleeperGeo = new THREE.BoxGeometry(11.5, 0.18, 0.55);
  const sleeperCount = 55;
  for (let i = 0; i < sleeperCount; i++) {
    const m = new THREE.Mesh(sleeperGeo, sleeperMat);
    m.position.set(0, 0.09, 12 - i * (TILE_PERIOD / sleeperCount));
    m.receiveShadow = true;
    scene.add(m);
    envTiles.push(m);
  }

  // ── Steel rails — material metálico brilhante ─────────────────────────────
  const railMat = new THREE.MeshPhongMaterial({ color: 0xdddddd, shininess: 150 });
  const railGeo = new THREE.BoxGeometry(0.2, 0.22, 400);
  [-1.8, 1.8].forEach(x => {
    const m = new THREE.Mesh(railGeo, railMat);
    m.position.set(x, 0.26, -195);
    scene.add(m);
  });

  // Outer rail edges of the platform
  const edgeGeo = new THREE.BoxGeometry(0.2, 0.22, 400);
  [-6.0, 6.0].forEach(x => {
    const m = new THREE.Mesh(edgeGeo, railMat.clone());
    m.position.set(x, 0.26, -195);
    scene.add(m);
  });

  // ── Postes de luz cilíndricos (reciclados) ────────────────────────────────
  const poleMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 50 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
  for (let i = 0; i < 12; i++) {
    [-1, 1].forEach(side => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 4.5, 8), poleMat);
      pole.position.set(side * 6.0, 2.25, -i * 22);
      scene.add(pole);
      envBuildings.push(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), lampMat);
      lamp.position.set(side * 6.0, 4.7, -i * 22);
      scene.add(lamp);
      envBuildings.push(lamp);
    });
  }

  // ── Low platform walls / fences ───────────────────────────────────────────
  const fenceH   = 1.8;
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
  const fenceGeo = new THREE.BoxGeometry(0.35, fenceH, 400);
  [-6.4, 6.4].forEach(x => {
    const m = new THREE.Mesh(fenceGeo, fenceMat);
    m.position.set(x, fenceH / 2, -195);
    scene.add(m);
  });

  // Fence horizontal bars
  const barMat = new THREE.MeshBasicMaterial({ color: 0xbbbbbb });
  [0.5, 1.2].forEach(y => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(400, 0.08, 0.08), barMat);
    m.position.set(-6.4, y, -195);
    scene.add(m);
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(400, 0.08, 0.08), barMat);
    m2.position.set(6.4, y, -195);
    scene.add(m2);
  });

  // ── Graffiti on fences / walls ────────────────────────────────────────────
  const grafColors = [0xff2244, 0x44aaff, 0xffcc00, 0x44ff88, 0xff6622, 0xcc44ff, 0xff44cc, 0x22ffcc];
  for (let i = 0; i < 40; i++) {
    const col  = grafColors[Math.floor(Math.random() * grafColors.length)];
    const w2   = 0.6 + Math.random() * 2.2;
    const h2   = 0.25 + Math.random() * 0.9;
    const side = Math.random() < 0.5 ? -1 : 1;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, h2, w2),
      new THREE.MeshBasicMaterial({ color: col })
    );
    m.position.set(side * 6.38, 0.3 + Math.random() * 1.2, -5 - Math.random() * 220);
    scene.add(m);
    envBuildings.push(m);
  }

  // ── City buildings — mix de geometrias ────────────────────────────────────
  const bPalette = [0xf5a623, 0x7b9fba, 0xc0392b, 0x27ae60, 0x8e44ad, 0x2980b9, 0xe67e22, 0xd4a800];
  const winMat  = new THREE.MeshBasicMaterial({ color: 0xffffcc });

  for (let i = 0; i < 14; i++) {
    [-1, 1].forEach(side => {
      const bx   = side * (10 + Math.random() * 5);
      const bz   = -i * 18;
      const col  = bPalette[Math.floor(Math.random() * bPalette.length)];
      const mat  = new THREE.MeshPhongMaterial({ color: col, shininess: 20 });
      const h    = 7 + Math.random() * 22;
      const type = Math.random();

      let base;

      if (type < 0.35) {
        // Prédio retangular clássico
        const w = 3.5 + Math.random() * 4;
        const d = 2.5 + Math.random() * 3;
        base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        base.position.set(bx, h / 2, bz);

        // Janelas em faixas
        for (let wr = 0; wr < 4; wr++) {
          const row = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.28, 0.06), winMat);
          row.position.set(bx, h * 0.2 + wr * h * 0.18, bz + d / 2 + 0.02);
          scene.add(row);
          envBuildings.push(row);
        }
        // Topo plano com bordas
        const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3),
          new THREE.MeshPhongMaterial({ color: 0x555555 }));
        top.position.set(bx, h + 0.17, bz);
        scene.add(top);
        envBuildings.push(top);

      } else if (type < 0.65) {
        // Torre cilíndrica
        const r = 1.6 + Math.random() * 1.8;
        base = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, h, 12), mat);
        base.position.set(bx, h / 2, bz);

        // Cúpula no topo
        const dome = new THREE.Mesh(new THREE.SphereGeometry(r * 0.88, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
        dome.position.set(bx, h, bz);
        scene.add(dome);
        envBuildings.push(dome);

        // Janelas em anel
        for (let wr = 0; wr < 3; wr++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.04, 0.1, 4, 12), winMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.set(bx, h * 0.25 + wr * h * 0.22, bz);
          scene.add(ring);
          envBuildings.push(ring);
        }

      } else {
        // Arranha-céu fino com antena
        const w = 2.5 + Math.random() * 2;
        const d = 2 + Math.random() * 2;
        base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        base.position.set(bx, h / 2, bz);

        // Antena cilíndrica
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, h * 0.28, 6),
          new THREE.MeshPhongMaterial({ color: 0x888888 }));
        ant.position.set(bx, h + h * 0.14, bz);
        scene.add(ant);
        envBuildings.push(ant);

        // Ponta da antena
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xff3333 }));
        tip.position.set(bx, h + h * 0.28, bz);
        scene.add(tip);
        envBuildings.push(tip);

        // Janelas
        for (let wr = 0; wr < 5; wr++) {
          const row = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.22, 0.06), winMat);
          row.position.set(bx, h * 0.15 + wr * h * 0.15, bz + d / 2 + 0.02);
          scene.add(row);
          envBuildings.push(row);
        }
      }

      base.castShadow = true;
      scene.add(base);
      envBuildings.push(base);
    });
  }

  // ── Clouds ────────────────────────────────────────────────────────────────
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cloudPositions = [
    [-12, 25, -40], [8, 22, -80], [-5, 28, -130], [15, 24, -170], [-18, 26, -200],
  ];
  cloudPositions.forEach(([cx, cy, cz]) => {
    [0, 2, -2, 1, -1].forEach((ox, i) => {
      const r = 1.4 + Math.random() * 1.2;
      const c = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), cloudMat);
      c.position.set(cx + ox * 2.2, cy + (i % 2 === 0 ? 0 : -0.8), cz);
      scene.add(c);
      envBuildings.push(c);
    });
  });

  // ── Sun disc ──────────────────────────────────────────────────────────────
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(5, 16),
    new THREE.MeshBasicMaterial({ color: 0xffee88, side: THREE.DoubleSide })
  );
  sunDisc.position.set(18, 32, -210);
  scene.add(sunDisc);
}

// ── Player (Jake-inspired, formas arredondadas) ──────────────────────────────
function buildPlayer(scene) {
  const group = new THREE.Group();

  const skin   = new THREE.MeshPhongMaterial({ color: 0xffcc99, shininess: 40 });
  const hoodie = new THREE.MeshPhongMaterial({ color: 0xff5500, shininess: 25 });
  const pants  = new THREE.MeshPhongMaterial({ color: 0x224499, shininess: 20 });
  const capM   = new THREE.MeshPhongMaterial({ color: 0xffcc00, shininess: 35 });
  const shoe   = new THREE.MeshPhongMaterial({ color: 0xfafafa, shininess: 70 });
  const dark   = new THREE.MeshPhongMaterial({ color: 0x111111 });
  const accent = new THREE.MeshBasicMaterial({ color: 0xee2222 });

  function add(geo, mat, px, py, pz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    group.add(m);
    return m;
  }

  // Cabeça — esfera
  const head = add(new THREE.SphereGeometry(0.27, 14, 10), skin, 0, 1.76, 0);

  // Olhos
  add(new THREE.SphereGeometry(0.058, 6, 5), dark, -0.105, 1.83, 0.25);
  add(new THREE.SphereGeometry(0.058, 6, 5), dark,  0.105, 1.83, 0.25);

  // Boné — cilindro + aba
  const cap = add(new THREE.CylinderGeometry(0.30, 0.28, 0.15, 12), capM, 0, 2.09, 0);
  add(new THREE.BoxGeometry(0.64, 0.07, 0.30), capM, 0, 1.99, 0.22);

  // Torso
  const torso = add(new THREE.BoxGeometry(0.60, 0.80, 0.38), hoodie, 0, 1.10, 0);

  // Braços — cilindros
  const armGeo = new THREE.CylinderGeometry(0.10, 0.09, 0.56, 8);
  const armL = add(armGeo, hoodie, -0.46, 1.10, 0);
  const armR = add(armGeo, hoodie,  0.46, 1.10, 0);

  // Pernas — cilindros
  const legGeo = new THREE.CylinderGeometry(0.12, 0.10, 0.54, 8);
  const legL = add(legGeo, pants, -0.20, 0.47, 0);
  const legR = add(legGeo, pants,  0.20, 0.47, 0);

  // Tênis
  add(new THREE.BoxGeometry(0.30, 0.18, 0.43), shoe,  -0.20, 0.10, 0.04);
  add(new THREE.BoxGeometry(0.30, 0.18, 0.43), shoe,   0.20, 0.10, 0.04);
  // Listra colorida no tênis
  add(new THREE.BoxGeometry(0.31, 0.05, 0.44), accent, -0.20, 0.19, 0.04);
  add(new THREE.BoxGeometry(0.31, 0.05, 0.44), accent,  0.20, 0.19, 0.04);

  group.position.set(LANE_X[1], 0, 0);
  group.rotation.y = Math.PI; // costas para a câmera
  scene.add(group);
  playerObj = { group, meshes: { head, torso, armL, armR, legL, legR, cap } };
}

// ── Obstacles ────────────────────────────────────────────────────────────────
const TRAIN_COLORS = [
  { body: 0xee2222, stripe: 0xffd700 },  // red + gold
  { body: 0x2266ee, stripe: 0xffffff },  // blue + white
  { body: 0x22aa44, stripe: 0xffee22 },  // green + yellow
  { body: 0xee8800, stripe: 0xffffff },  // orange + white
];

function makeTrainMesh(w, h, d) {
  const tc    = TRAIN_COLORS[Math.floor(Math.random() * TRAIN_COLORS.length)];
  const group = new THREE.Group();

  // Corpo principal — MeshPhong para brilho metálico
  const bodyMat = new THREE.MeshPhongMaterial({ color: tc.body, shininess: 60 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  body.castShadow = true;
  group.add(body);

  // Nariz arredondado (frente do trem)
  const noseMat = new THREE.MeshPhongMaterial({ color: tc.body, shininess: 80 });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(w * 0.38, 10, 8, 0, Math.PI), noseMat);
  nose.rotation.y = -Math.PI / 2;
  nose.position.set(0, 0, d / 2);
  group.add(nose);

  // Faixa horizontal decorativa
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.02, 0.30, d + 0.04),
    new THREE.MeshBasicMaterial({ color: tc.stripe })
  );
  stripe.position.set(0, h * 0.14, 0);
  group.add(stripe);

  // Janelas (arredondadas com CylinderGeometry lateral)
  const winMat = new THREE.MeshPhongMaterial({ color: 0xd4f4ff, shininess: 120 });
  [-w * 0.22, w * 0.22].forEach(wx => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.26, h * 0.26, 0.06), winMat);
    win.position.set(wx, h * 0.22, d / 2 + 0.02);
    group.add(win);
  });

  // Faróis circulares
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffbb });
  [-w * 0.3, w * 0.3].forEach(lx => {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.13, 10), lightMat);
    l.position.set(lx, -h * 0.30, d / 2 + 0.52);
    group.add(l);
  });

  // Rodas (cilindros horizontais)
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 30 });
  [-w * 0.3, w * 0.3].forEach(wx => {
    [-d * 0.3, d * 0.3].forEach(wz => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, -h / 2 + 0.06, wz);
      group.add(wheel);
    });
  });

  return group;
}

function makeBarrierMesh(w, h, d) {
  const group = new THREE.Group();
  const colors = [0xffaa00, 0xff5500, 0xffdd00];
  const col = colors[Math.floor(Math.random() * colors.length)];

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color: col })
  );
  body.castShadow = true;
  group.add(body);

  // Warning stripes (black)
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, h + 0.02, 0.04),
      stripeMat
    );
    s.position.set(-w * 0.3 + i * w * 0.3, 0, d / 2 + 0.01);
    group.add(s);
  }
  return group;
}

function spawnObstacle() {
  const r = Math.random();

  if (r < 0.18) {
    // Overhead bar (metal beam across all lanes)
    const group = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.45, 0.65),
      new THREE.MeshLambertMaterial({ color: 0x556677 })
    );
    beam.castShadow = true;
    group.add(beam);
    // Warning stripes on beam
    const wMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    [-5, -2.5, 0, 2.5, 5].forEach(x => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.47, 0.02), wMat);
      s.position.set(x, 0, 0.34);
      group.add(s);
    });
    const yBot = 1.45;
    const h    = 0.45;
    group.position.set(0, yBot + h / 2, SPAWN_Z);
    three.scene.add(group);
    obstacles.push({ mesh: group, lane: -1, w: 14, yBot, yTop: yBot + h });
    return;
  }

  if (r < 0.38) {
    // Double train: two lanes blocked
    const h = 3.0, w = 2.6, d = 0.9;
    const open = Math.floor(Math.random() * 3);
    [0, 1, 2].filter(l => l !== open).forEach(l => {
      const mesh = makeTrainMesh(w, h, d);
      mesh.position.set(LANE_X[l], h / 2, SPAWN_Z);
      three.scene.add(mesh);
      obstacles.push({ mesh, lane: l, w: w * 0.88, yBot: 0, yTop: h });
    });
    return;
  }

  // Single obstacle
  if (Math.random() < 0.55) {
    // Train
    const h = 3.0, w = 2.6, d = 0.9;
    const l = Math.floor(Math.random() * 3);
    const mesh = makeTrainMesh(w, h, d);
    mesh.position.set(LANE_X[l], h / 2, SPAWN_Z);
    three.scene.add(mesh);
    obstacles.push({ mesh, lane: l, w: w * 0.88, yBot: 0, yTop: h });
  } else {
    // Barrier (low — must jump)
    const h = 0.68, w = 2.2, d = 0.7;
    const l = Math.floor(Math.random() * 3);
    const mesh = makeBarrierMesh(w, h, d);
    mesh.position.set(LANE_X[l], h / 2, SPAWN_Z);
    three.scene.add(mesh);
    obstacles.push({ mesh, lane: l, w: w * 0.88, yBot: 0, yTop: h });
  }
}

function spawnCoin() {
  const l = Math.floor(Math.random() * 3);
  const y = 0.7 + Math.random() * 1.0;
  // Torus giratório — igual às moedas do Subway Surfers
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.085, 8, 18),
    new THREE.MeshPhongMaterial({ color: 0xffcc00, emissive: new THREE.Color(0x885500), shininess: 100 })
  );
  mesh.position.set(LANE_X[l], y, SPAWN_Z);
  mesh.rotation.x = Math.PI / 2; // anel de frente para o jogador
  three.scene.add(mesh);
  coins.push({ mesh, lane: l, y });
}

// ── Update ───────────────────────────────────────────────────────────────────
function update(dt) {
  animFrame++;

  // Speed ramp
  speedT += dt;
  if (speedT > 6) {
    speedT = 0;
    speed  = Math.min(speed + SPEED_INC, MAX_SPEED);
    speedEl.textContent = (Math.round((speed / BASE_SPEED) * 10) / 10) + '×';
  }

  // Score
  scoreT += dt;
  if (scoreT > 0.08) {
    scoreT = 0;
    score++;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem('runner-best', best);
    }
  }

  // Lane transition
  const tX = LANE_X[targetLane];
  playerObj.group.position.x += (tX - playerObj.group.position.x) * Math.min(dt * 13, 1);

  // Jump / gravity
  playerVY += GRAVITY * dt;
  playerY  += playerVY * dt;
  if (playerY <= GROUND_Y) { playerY = GROUND_Y; playerVY = 0; }
  playerObj.group.position.y = playerY;

  // Crouch scale
  const csTarget = (crouching && playerY <= 0.02) ? CROUCH_S : 1;
  playerObj.group.scale.y += (csTarget - playerObj.group.scale.y) * Math.min(dt * 20, 1);

  // Running animation
  const t = animFrame * 0.16;
  if (playerY <= 0.05) {
    const leg = Math.sin(t) * 0.65;
    playerObj.meshes.legL.rotation.x =  leg;
    playerObj.meshes.legR.rotation.x = -leg;
    playerObj.meshes.armL.rotation.x = -leg * 0.65;
    playerObj.meshes.armR.rotation.x =  leg * 0.65;
    const bob = Math.abs(Math.sin(t)) * 0.04;
    playerObj.meshes.torso.position.y = 1.10 + bob;
    playerObj.meshes.head.position.y  = 1.76 + bob;
    playerObj.meshes.cap.position.y   = 2.09 + bob;
  } else {
    playerObj.meshes.legL.rotation.x = -0.45;
    playerObj.meshes.legR.rotation.x =  0.45;
    playerObj.meshes.armL.rotation.x = -0.9;
    playerObj.meshes.armR.rotation.x =  0.9;
  }

  // Spawn
  spawnT += dt;
  const interval = Math.max(0.85, 2.4 - speed / 20);
  if (spawnT > interval) { spawnT = 0; spawnObstacle(); }

  coinT += dt;
  if (coinT > 0.65) { coinT = 0; spawnCoin(); }

  // Bounding values
  const pX    = playerObj.group.position.x;
  const pHW   = 0.38;
  const pYBot = playerY;
  const pYTop = playerY + 2.2 * playerObj.group.scale.y;

  // Move & collide obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.mesh.position.z += speed * dt;

    if (o.mesh.position.z > DESPAWN_Z) {
      three.scene.remove(o.mesh);
      obstacles.splice(i, 1);
      continue;
    }

    if (o.mesh.position.z > -2.5 && o.mesh.position.z < 2.5) {
      let hit = false;
      if (o.lane === -1) {
        if (pYTop > o.yBot + 0.08) hit = true;
      } else {
        const xOk = Math.abs(pX - LANE_X[o.lane]) < pHW + o.w / 2;
        const yOk = pYBot < o.yTop && pYTop > o.yBot + 0.08;
        if (xOk && yOk) hit = true;
      }
      if (hit) { die(); return; }
    }
  }

  // Move & collect coins
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.mesh.position.z += speed * dt;
    c.mesh.rotation.y += dt * 4; // spin coin

    if (c.mesh.position.z > DESPAWN_Z) {
      three.scene.remove(c.mesh);
      coins.splice(i, 1);
      continue;
    }

    if (c.mesh.position.z > -2.5 && c.mesh.position.z < 2.5) {
      const dx = Math.abs(pX - LANE_X[c.lane]);
      const dy = Math.abs(playerY + 1.0 - c.y);
      if (dx < 1.5 && dy < 1.3) {
        three.scene.remove(c.mesh);
        coins.splice(i, 1);
        score += 5;
        scoreEl.textContent = score;
        i--;
      }
    }
  }

  // Recycle ground tiles + sleepers
  envTiles.forEach(t => {
    t.position.z += speed * dt;
    if (t.position.z > 14) t.position.z -= TILE_PERIOD;
  });

  // Recycle buildings / graffiti / clouds
  envBuildings.forEach(b => {
    b.position.z += speed * dt;
    if (b.position.z > 14) b.position.z -= 14 * 18;
  });

  // Camera smooth follow player lane
  const camTX = playerObj.group.position.x * 0.22;
  three.camera.position.x += (camTX - three.camera.position.x) * Math.min(dt * 9, 1);
}

// ── Game loop ────────────────────────────────────────────────────────────────
function gameLoop() {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(three.clock.getDelta(), 0.05);
  if (state === 'playing') update(dt);
  three.renderer.render(three.scene, three.camera);
}

// ── Start / Die ──────────────────────────────────────────────────────────────
function begin() {
  if (state === 'playing') return;

  score = 0; speed = BASE_SPEED; targetLane = 1;
  playerY = GROUND_Y; playerVY = 0; crouching = false;
  animFrame = 0; spawnT = 0; coinT = 0; scoreT = 0; speedT = 0;

  scoreEl.textContent = '0';
  speedEl.textContent = '1×';

  playerObj.group.position.set(LANE_X[1], 0, 0);
  playerObj.group.rotation.set(0, Math.PI, 0);
  playerObj.group.scale.set(1, 1, 1);

  obstacles.forEach(o => three.scene.remove(o.mesh));
  coins.forEach(c => three.scene.remove(c.mesh));
  obstacles = [];
  coins = [];

  state = 'playing';
  hideOverlay();
  lockScroll();
}

function die() {
  if (state !== 'playing') return;
  state = 'dead';
  playerObj.group.rotation.z = 0.55;
  unlockScroll();
  setTimeout(() => showOverlay(true), 450);
}

// ── Overlay ──────────────────────────────────────────────────────────────────
function showOverlay(dead) {
  if (!overlay) return;
  overlay.hidden = false;
  if (dead) {
    overlay.innerHTML = `
      <p class="ro-label">Game Over</p>
      <p class="ro-score">${score}</p>
      <p class="ro-sub">Recorde: ${best}</p>
      <p class="ro-hint">Toque ou espaço para jogar de novo</p>`;
  } else {
    overlay.innerHTML = `
      <p class="ro-title">Corrida do<br>Aloncinho</p>
      <p class="ro-controls">← → faixa &nbsp;·&nbsp; ↑ pular &nbsp;·&nbsp; ↓ agachar</p>
      <p class="ro-hint">Toque ou pressione espaço para começar</p>`;
  }
}

function hideOverlay() {
  if (overlay) overlay.hidden = true;
}

// ── Scroll lock ───────────────────────────────────────────────────────────────
function lockScroll() {
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  canvas.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function unlockScroll() {
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

// ── Input ────────────────────────────────────────────────────────────────────
function moveLeft()  {
  if (state !== 'playing') { begin(); return; }
  if (targetLane > 0) targetLane--;
}
function moveRight() {
  if (state !== 'playing') { begin(); return; }
  if (targetLane < 2) targetLane++;
}
function doJump() {
  if (state !== 'playing') { begin(); return; }
  if (playerY <= 0.02) { playerVY = JUMP_V; crouching = false; }
}
function doCrouch()  { if (state === 'playing') crouching = true; }
function endCrouch() { crouching = false; }

document.addEventListener('keydown', e => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  switch (e.key) {
    case 'ArrowLeft':  moveLeft();  break;
    case 'ArrowRight': moveRight(); break;
    case 'ArrowUp':
    case ' ':          doJump();    break;
    case 'ArrowDown':  doCrouch();  break;
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
  e.preventDefault();
  tx0 = e.touches[0].clientX;
  ty0 = e.touches[0].clientY;
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

// ── Boot ──────────────────────────────────────────────────────────────────────
initThree();
showOverlay(false);
gameLoop();
