'use strict';
/* global THREE */

// ── Corrida do Aloncinho 3D — Three.js ───────────────────────────────────────

const W = 360, H = 600;
const LANE_X    = [-3, 0, 3];
const SPAWN_Z   = -130;
const DESPAWN_Z = 12;
const BASE_SPEED = 15;   // units/sec
const MAX_SPEED  = 38;
const SPEED_INC  = 0.5;
const GRAVITY    = -30;
const JUMP_V     = 13;
const GROUND_Y   = 0;
const CROUCH_S   = 0.5;  // y-scale when crouching

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
  scene.background = new THREE.Color(0x0d0620);
  scene.fog = new THREE.FogExp2(0x0d0620, 0.0085);

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
  scene.add(new THREE.AmbientLight(0x5533aa, 0.7));

  const sun = new THREE.DirectionalLight(0xff88cc, 2.5);
  sun.position.set(4, 20, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left   = -15;
  sun.shadow.camera.right  =  15;
  sun.shadow.camera.top    =  15;
  sun.shadow.camera.bottom =  -5;
  sun.shadow.camera.far    =  60;
  scene.add(sun);

  [[-5, 2, -8, 0x00ffff], [5, 2, -8, 0xff44aa]].forEach(([x, y, z, col]) => {
    const l = new THREE.PointLight(col, 3.5, 28);
    l.position.set(x, y, z);
    scene.add(l);
  });
}

// ── Environment ──────────────────────────────────────────────────────────────
function buildEnvironment(scene) {
  // Ground tiles (recycled)
  const tileGeo = new THREE.BoxGeometry(14, 0.4, 24);
  const tileMat = new THREE.MeshLambertMaterial({ color: 0x1a0830 });
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(tileGeo, tileMat);
    m.position.set(0, -0.2, -i * 24 + 12);
    m.receiveShadow = true;
    scene.add(m);
    envTiles.push(m);
  }

  // Lane dividers (neon pink)
  const divGeo = new THREE.BoxGeometry(0.08, 0.06, 400);
  [-1.5, 1.5].forEach(x => {
    const m = new THREE.Mesh(divGeo, new THREE.MeshBasicMaterial({ color: 0xff33aa }));
    m.position.set(x, 0.03, -195);
    scene.add(m);
  });

  // Outer rails
  const railGeo = new THREE.BoxGeometry(0.2, 0.4, 400);
  [[-6.2, 0x00ffff], [6.2, 0xff44aa]].forEach(([x, col]) => {
    const m = new THREE.Mesh(railGeo, new THREE.MeshBasicMaterial({ color: col }));
    m.position.set(x, 0.05, -195);
    scene.add(m);
  });

  // Subway tunnel arches (decorative, recycled)
  const archMat = new THREE.MeshLambertMaterial({ color: 0x2d0e50 });
  for (let i = 0; i < 10; i++) {
    // Left pillar
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 0.4), archMat);
    pl.position.set(-6.5, 2.5, -i * 30);
    scene.add(pl);
    // Right pillar
    const pr = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 0.4), archMat);
    pr.position.set(6.5, 2.5, -i * 30);
    scene.add(pr);
    // Top bar
    const tb = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 0.4), archMat);
    tb.position.set(0, 5.2, -i * 30);
    scene.add(tb);
  }

  // Buildings (recycled)
  const bCols = [0x2d1055, 0x0d2060, 0x551030, 0x105040, 0x332266, 0x5c1a00];
  for (let i = 0; i < 14; i++) {
    [-1, 1].forEach(side => {
      const h = 6 + Math.random() * 22;
      const w = 3 + Math.random() * 5;
      const d = 4 + Math.random() * 3;
      const col = bCols[Math.floor(Math.random() * bCols.length)];
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: col })
      );
      m.position.set(side * (9 + Math.random() * 4), h / 2, -i * 18);
      m.castShadow = true;
      scene.add(m);
      envBuildings.push(m);

      // Neon window strips on buildings
      const wm = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.6, 0.15, 0.05),
        new THREE.MeshBasicMaterial({ color: side < 0 ? 0x00ffff : 0xff44aa })
      );
      wm.position.set(side * (9 + Math.random() * 4), h * 0.6, -i * 18 + d / 2 + 0.01);
      scene.add(wm);
      envBuildings.push(wm);
    });
  }

  // Stars
  const sv = [];
  for (let i = 0; i < 900; i++) {
    sv.push(
      (Math.random() - 0.5) * 300,
      8 + Math.random() * 50,
      -Math.random() * 300
    );
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.17 })));

  // Moon
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(3.8, 16, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffcc })
  );
  moon.position.set(-25, 42, -170);
  scene.add(moon);
}

// ── Player ───────────────────────────────────────────────────────────────────
function buildPlayer(scene) {
  const group = new THREE.Group();

  const skin  = new THREE.MeshLambertMaterial({ color: 0xffaa77 });
  const body  = new THREE.MeshLambertMaterial({ color: 0xff5500 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2244cc });
  const hair  = new THREE.MeshLambertMaterial({ color: 0x221100 });
  const shoe  = new THREE.MeshLambertMaterial({ color: 0x111111 });

  function box(w, h, d, mat, px, py, pz) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    group.add(m);
    return m;
  }

  const meshes = {
    head:  box(0.52, 0.52, 0.52, skin,  0,     1.74, 0),
    hair:  box(0.56, 0.22, 0.56, hair,  0,     2.03, 0),
    torso: box(0.66, 0.76, 0.42, body,  0,     1.10, 0),
    armL:  box(0.24, 0.58, 0.28, body, -0.48,  1.10, 0),
    armR:  box(0.24, 0.58, 0.28, body,  0.48,  1.10, 0),
    legL:  box(0.29, 0.56, 0.32, pants,-0.20,  0.47, 0),
    legR:  box(0.29, 0.56, 0.32, pants, 0.20,  0.47, 0),
    shoeL: box(0.31, 0.20, 0.40, shoe, -0.20,  0.10, 0.04),
    shoeR: box(0.31, 0.20, 0.40, shoe,  0.20,  0.10, 0.04),
  };

  group.position.set(LANE_X[1], 0, 0);
  scene.add(group);
  playerObj = { group, meshes };
}

// ── Obstacle spawning ────────────────────────────────────────────────────────
const OBS_DEFS = [
  { id:'train',    w:2.5, h:2.9, d:0.9, yBot:0,    color:0xdd2020, emit:0x330000 },
  { id:'train2',   w:2.5, h:2.9, d:0.9, yBot:0,    color:0x22aaee, emit:0x002244 },
  { id:'barrier',  w:2.2, h:0.65,d:0.7, yBot:0,    color:0xffaa00, emit:0x442200 },
  { id:'barrier2', w:2.2, h:0.65,d:0.7, yBot:0,    color:0x44ee44, emit:0x114411 },
  { id:'overhead', w:13,  h:0.38,d:0.55,yBot:1.45, color:0x4488ff, emit:0x001144, allLanes:true },
];

function makeMesh(def) {
  const mat = new THREE.MeshLambertMaterial({
    color: def.color,
    emissive: new THREE.Color(def.emit || 0x000000),
  });
  const m = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.h, def.d), mat);
  m.castShadow = true;
  return m;
}

function spawnObstacle() {
  const r = Math.random();

  if (r < 0.18) {
    // Overhead bar
    const def = OBS_DEFS[4];
    const mesh = makeMesh(def);
    mesh.position.set(0, def.yBot + def.h / 2, SPAWN_Z);
    three.scene.add(mesh);
    obstacles.push({ mesh, lane:-1, w:def.w, yBot:def.yBot, yTop:def.yBot + def.h });
    return;
  }

  if (r < 0.38) {
    // Double train — two lanes blocked, one open
    const def = r < 0.28 ? OBS_DEFS[0] : OBS_DEFS[1];
    const open = Math.floor(Math.random() * 3);
    [0, 1, 2].filter(l => l !== open).forEach(l => {
      const mesh = makeMesh(def);
      mesh.position.set(LANE_X[l], def.yBot + def.h / 2, SPAWN_Z);
      three.scene.add(mesh);
      obstacles.push({ mesh, lane:l, w:def.w * 0.88, yBot:def.yBot, yTop:def.yBot + def.h });
    });
    return;
  }

  // Single obstacle
  const def = OBS_DEFS[Math.floor(Math.random() * 4)];
  const l   = Math.floor(Math.random() * 3);
  const mesh = makeMesh(def);
  mesh.position.set(LANE_X[l], def.yBot + def.h / 2, SPAWN_Z);
  three.scene.add(mesh);
  obstacles.push({ mesh, lane:l, w:def.w * 0.88, yBot:def.yBot, yTop:def.yBot + def.h });
}

function spawnCoin() {
  const l = Math.floor(Math.random() * 3);
  const y = 0.7 + Math.random() * 1.0;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 7),
    new THREE.MeshLambertMaterial({ color: 0xffcc00, emissive: new THREE.Color(0xaa6600) })
  );
  mesh.position.set(LANE_X[l], y, SPAWN_Z);
  three.scene.add(mesh);
  coins.push({ mesh, lane:l, y });
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
    playerObj.meshes.head.position.y  = 1.74 + bob;
    playerObj.meshes.hair.position.y  = 2.03 + bob;
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

  // Player bounding values
  const pX   = playerObj.group.position.x;
  const pHW  = 0.38;
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
        // Overhead bar — hits if head doesn't clear
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
    c.mesh.rotation.y += dt * 3.5;

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

  // Recycle ground tiles
  envTiles.forEach(t => {
    t.position.z += speed * dt;
    if (t.position.z > 14) t.position.z -= 8 * 24;
  });

  // Recycle buildings & arches (all non-tile env objects)
  envBuildings.forEach(b => {
    b.position.z += speed * dt;
    if (b.position.z > 14) b.position.z -= 14 * 18;
  });

  // Camera smooth follow
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
  playerObj.group.rotation.set(0, 0, 0);
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
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowDown') endCrouch();
});

document.getElementById('runner-left')  ?.addEventListener('click',       moveLeft);
document.getElementById('runner-right') ?.addEventListener('click',       moveRight);
document.getElementById('runner-jump')  ?.addEventListener('click',       doJump);
document.getElementById('runner-crouch')?.addEventListener('pointerdown', doCrouch);
document.getElementById('runner-crouch')?.addEventListener('pointerup',   endCrouch);
document.getElementById('runner-crouch')?.addEventListener('pointercancel', endCrouch);

// Swipe
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
    if (dx < -25) moveLeft();
    else if (dx > 25) moveRight();
  } else {
    if (dy < -25) doJump();
    else if (dy > 25) { doCrouch(); setTimeout(endCrouch, 600); }
  }
}, { passive: false });

canvas.addEventListener('click', () => { if (state !== 'playing') begin(); });
overlay?.addEventListener('click', () => { if (state !== 'playing') begin(); });

// ── Boot ──────────────────────────────────────────────────────────────────────
initThree();
showOverlay(false);
gameLoop();
