import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";

const COLOR = {
  heroBody: 0x2b5fcf, heroDark: 0x1e3f8f, heroGold: 0xf0c443, skin: 0xf4cfa0,
  heroPurple: 0x7a3f74, heroPurpleDark: 0x5c2e57, heroSilver: 0xb9bfc7, heroCream: 0xf0e6d2, heroMace: 0x6e2430,
  enemyBody: 0xd13b3b, enemyDark: 0x8f2323, bossBody: 0xa4232f, bossDark: 0x6e1a1a,
  rock: 0x8b8b86, gate: 0x8a5a35, gateRoof: 0x6a3f22, gateCharred: 0x241a14,
  banner: 0x3468c9, amber: 0xf5a623, barrel: 0x8a5a2f, barrelBand: 0x4a3016,
  grass: 0x5fae4a, grassDark: 0x4f9a3d, path: 0xd9c08a,
};

let renderer, scene, camera, canvas;
let groundMat, groundEntity;
let gateMesh, gateBanner;
const staticGroup = new THREE.Group();
const shadowTexture = makeShadowTexture();

const registries = {
  enemies: new Map(), traps: new Map(), turrets: new Map(), pickups: new Map(),
  projectiles: new Map(), enemyProjectiles: new Map(), particles: new Map(), spawnMarkers: new Map(),
};

function makeShadowTexture() {
  const c = document.createElement("canvas"); c.width = 64; c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(0,0,0,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function makeGroundTexture(WORLD, SPAWN_POINTS, GATE) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 1024;
  const ctx = c.getContext("2d");
  const sx = c.width / WORLD.w, sy = c.height / WORLD.h;
  ctx.fillStyle = "#5fae4a"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#4f9a3d";
  const cell = 90;
  for (let gx = 0; gx < WORLD.w; gx += cell) for (let gy = 0; gy < WORLD.h; gy += cell) {
    if ((Math.floor(gx / cell) + Math.floor(gy / cell)) % 2 === 0) ctx.fillRect(gx * sx, gy * sy, cell * sx, cell * sy);
  }
  ctx.lineCap = "round";
  ctx.strokeStyle = "#c2a468"; ctx.lineWidth = 74 * sx;
  ctx.beginPath();
  for (const sp of SPAWN_POINTS) { ctx.moveTo(sp.x * sx, sp.y * sy); ctx.lineTo(GATE.x * sx, GATE.y * sy); }
  ctx.stroke();
  ctx.strokeStyle = "#d9c08a"; ctx.lineWidth = 60 * sx;
  ctx.beginPath();
  for (const sp of SPAWN_POINTS) { ctx.moveTo(sp.x * sx, sp.y * sy); ctx.lineTo(GATE.x * sx, GATE.y * sy); }
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, flatShading: true, ...opts });
}
function addShadowBlob(group, radius) {
  const plane = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.1, 16),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
  plane.rotation.x = -Math.PI / 2; plane.position.y = 0.02;
  group.add(plane);
  return plane;
}

function buildHumanoid({ scale = 1, bodyColor, darkColor, hatColor }) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34 * scale, 0.55 * scale, 3, 6), mat(bodyColor));
  body.position.y = 0.34 * scale + 0.5 * scale * 0.5;
  g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24 * scale, 0), mat(COLOR.skin));
  head.position.y = body.position.y + 0.55 * scale * 0.5 + 0.22 * scale;
  g.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22 * scale, 0.22 * scale, 5), mat(hatColor));
  hat.position.y = head.position.y + 0.22 * scale;
  g.add(hat);
  const armGeo = new THREE.CapsuleGeometry(0.09 * scale, 0.32 * scale, 2, 5);
  const armMat = mat(darkColor);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.32 * scale, body.position.y, 0.05 * scale);
  armR.rotation.z = -0.3; armR.rotation.x = -0.4;
  g.add(armR);
  const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.06 * scale, 0.06 * scale, 0.55 * scale), mat(hatColor, { roughness: 0.4, metalness: 0.4 }));
  weapon.position.set(0.34 * scale, body.position.y + 0.05 * scale, 0.32 * scale);
  g.add(weapon);
  addShadowBlob(g, 0.42 * scale);
  g.userData.body = body; g.userData.head = head; g.userData.hat = hat; g.userData.weapon = weapon;
  g.userData.parts = [body, head, hat, armR, weapon];
  g.userData.baseColors = { body: bodyColor, hat: hatColor };
  g.userData.height = head.position.y + 0.3 * scale;
  return g;
}

function buildHeroMesh() {
  const g = new THREE.Group();
  const parts = [];

  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.22, 8), mat(COLOR.heroBody));
  legs.position.y = 0.12; g.add(legs); parts.push(legs);

  const robeY = 0.63;
  const robe = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.34, 3, 8), mat(COLOR.heroPurple));
  robe.position.y = robeY; g.add(robe); parts.push(robe);

  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.045, 6, 12), mat(COLOR.heroGold, { roughness: 0.4, metalness: 0.5 }));
  hem.rotation.x = Math.PI / 2; hem.position.y = robeY - 0.35; g.add(hem); parts.push(hem);

  const armor = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.5, 6), mat(COLOR.heroSilver, { roughness: 0.35, metalness: 0.55 }));
  armor.rotation.x = Math.PI; armor.scale.z = 0.55;
  armor.position.set(0, robeY + 0.02, 0.22); g.add(armor); parts.push(armor);

  const ruff = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.075, 6, 12), mat(COLOR.heroCream));
  ruff.rotation.x = Math.PI / 2; ruff.position.y = robeY + 0.42; g.add(ruff); parts.push(ruff);

  const padGeo = new THREE.SphereGeometry(0.22, 7, 5);
  for (const side of [-1, 1]) {
    const pad = new THREE.Mesh(padGeo, mat(COLOR.heroPurple));
    pad.scale.set(1, 0.85, 1);
    pad.position.set(side * 0.42, robeY + 0.34, 0);
    g.add(pad); parts.push(pad);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 5, 10), mat(COLOR.heroGold, { roughness: 0.4, metalness: 0.5 }));
    ring.position.copy(pad.position); ring.position.x += side * 0.02;
    ring.rotation.y = Math.PI / 2;
    g.add(ring); parts.push(ring);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.26, 2, 5), mat(COLOR.heroBody));
    arm.position.set(side * 0.4, robeY + 0.04, 0.06);
    arm.rotation.z = side * -0.25;
    g.add(arm); parts.push(arm);
  }

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), mat(COLOR.skin));
  head.position.y = robeY + 0.42 + 0.24; g.add(head); parts.push(head);
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 5), mat(0x4a3423));
  beard.position.set(0, head.position.y - 0.24, 0.08); beard.rotation.x = Math.PI;
  g.add(beard); parts.push(beard);
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6, 0, Math.PI * 2, 0, Math.PI / 1.7), mat(COLOR.heroPurpleDark));
  hat.position.y = head.position.y + 0.12; g.add(hat); parts.push(hat);

  const maceHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 6), mat(COLOR.heroGold, { roughness: 0.4, metalness: 0.5 }));
  const maceHead = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), mat(COLOR.heroMace, { roughness: 0.5, metalness: 0.3 }));
  const mace = new THREE.Group();
  maceHandle.position.y = -0.02; maceHead.position.y = 0.28;
  mace.add(maceHandle, maceHead);
  mace.position.set(0.5, robeY - 0.05, 0.15);
  mace.rotation.z = -0.5;
  g.add(mace); parts.push(maceHandle, maceHead);

  addShadowBlob(g, 0.36);
  g.userData.parts = parts;
  g.userData.height = head.position.y + 0.3;
  return g;
}
function buildEnemyMesh(type) {
  if (type === "boss") {
    const g = buildHumanoid({ scale: 1.7, bodyColor: COLOR.bossBody, darkColor: COLOR.bossDark, hatColor: 0x3a3a3a });
    const hornGeo = new THREE.ConeGeometry(0.06, 0.22, 4);
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(hornGeo, mat(0xe8e0d0));
      horn.position.set(side * 0.16, g.userData.head.position.y + 0.14, 0);
      horn.rotation.z = side * 0.5;
      g.add(horn);
    }
    return g;
  }
  return buildHumanoid({ scale: type === "archer" ? 0.9 : 1, bodyColor: COLOR.enemyBody, darkColor: COLOR.enemyDark, hatColor: 0x5a2a2a });
}
function buildHealthBar(width) {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.09), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthTest: false }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.07), new THREE.MeshBasicMaterial({ color: 0xff5b5b, depthTest: false }));
  fg.position.z = 0.001; fg.position.x = -width / 2;
  fg.geometry.translate(0.5, 0, 0);
  bg.renderOrder = 10; fg.renderOrder = 11;
  g.add(bg, fg);
  g.userData.fg = fg; g.userData.width = width;
  g.rotation.x = -CAM_TILT;
  return g;
}
function buildTrapMesh(type) {
  const g = new THREE.Group();
  if (type === "spike") {
    for (let i = -1; i <= 1; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 4), mat(COLOR.amber));
      s.position.set(i * 0.16, 0.16, 0); g.add(s);
    }
  } else if (type === "barrel") {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.55, 8), mat(COLOR.barrel));
    body.position.y = 0.27; g.add(body);
    for (const dy of [-0.13, 0.13]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 6, 10), mat(COLOR.barrelBand, { roughness: 0.5 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.27 + dy; g.add(ring);
    }
  }
  addShadowBlob(g, 0.4);
  return g;
}
function buildTurretMesh() {
  const g = new THREE.Group();
  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5);
  const legMat = mat(0x7a5230);
  for (const [dx, dz] of [[0.18, 0.18], [-0.18, 0.18], [0.18, -0.18], [-0.18, -0.18]]) {
    const leg = new THREE.Mesh(legGeo, legMat); leg.position.set(dx, 0.25, dz); g.add(leg);
  }
  const plat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat(0x7a5230));
  plat.position.y = 0.54; g.add(plat);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.28, 5), mat(COLOR.amber));
  roof.position.y = 0.82; g.add(roof);
  addShadowBlob(g, 0.4);
  return g;
}
function buildPickupMesh() {
  const g = new THREE.Group();
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 8), mat(0xffd766, { roughness: 0.35, metalness: 0.5 }));
  coin.rotation.z = Math.PI / 2; coin.position.y = 0.22; g.add(coin);
  g.userData.coin = coin;
  addShadowBlob(g, 0.25);
  return g;
}
function buildProjectileMesh(isPlayer) {
  const geo = new THREE.CylinderGeometry(0.03, 0.05, 0.42, 5);
  geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat(isPlayer ? COLOR.amber : COLOR.enemyBody, { roughness: 0.4 }));
  return m;
}
function buildParticleMesh(color) {
  return new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color }));
}
function buildSpawnMarkerMesh() {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 20), new THREE.MeshBasicMaterial({ color: 0xe34b4b, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  return ring;
}
function buildSlamRing() {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 24), new THREE.MeshBasicMaterial({ color: 0xff5028, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; ring.visible = false;
  return ring;
}

const CAM_TILT = Math.PI / 3.1; // ~58deg elevation, isometric-like

export function init(canvasEl, { WORLD, GATE, OBSTACLES, SPAWN_POINTS, ENEMY_DEF }) {
  canvas = canvasEl;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd0e8);
  scene.fog = new THREE.Fog(0x8fd0e8, 26, 42);

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  scene.add(staticGroup);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x5a7a4a, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.2);
  sun.position.set(-6, 10, 8);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  groundMat = new THREE.MeshStandardMaterial({ map: makeGroundTexture(WORLD, SPAWN_POINTS, GATE), roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.w / 30, WORLD.h / 30), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD.w / 2 / 30, 0, WORLD.h / 2 / 30);
  staticGroup.add(ground);

  for (const o of OBSTACLES) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(o.r / 30, 0), mat(COLOR.rock));
    rock.position.set(o.x / 30, o.r / 30 * 0.55, o.y / 30);
    rock.scale.y = 0.7;
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    staticGroup.add(rock);
    addShadowBlob(rock, o.r / 30 * 1.1);
  }

  gateMesh = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(180 / 30, 90 / 30, 90 / 30), mat(COLOR.gate));
  walls.position.y = 45 / 30; gateMesh.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(140 / 30 * 0.72, 70 / 30, 4), mat(COLOR.gateRoof));
  roof.rotation.y = Math.PI / 4; roof.position.y = 90 / 30 + 35 / 30; gateMesh.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(52 / 30, 45 / 30, 4 / 30), mat(0x2a1a10));
  door.position.set(0, 22 / 30, 90 / 30 / 2 + 0.02); gateMesh.add(door);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 40 / 30, 5), mat(0x3a2a1a));
  pole.position.y = 90 / 30 + 70 / 30 + 20 / 30; gateMesh.add(pole);
  gateBanner = new THREE.Mesh(new THREE.PlaneGeometry(34 / 30, 24 / 30), mat(COLOR.banner, { side: THREE.DoubleSide }));
  gateBanner.position.set(17 / 30, 90 / 30 + 70 / 30 + 10 / 30, 0);
  gateMesh.add(gateBanner);
  gateMesh.position.set(GATE.x / 30, 0, GATE.y / 30);
  gateMesh.userData.wallsMat = walls.material;
  staticGroup.add(gateMesh);

  const heroMesh = buildHeroMesh();
  scene.add(heroMesh);
  registries.hero = heroMesh;
  loadHeroModel(heroMesh);

  resize();
  return { camera, scene, renderer };
}

const HERO_TARGET_HEIGHT = 1.7;
const HERO_MODEL_YAW_OFFSET = Math.PI;
function loadHeroModel(group) {
  new GLTFLoader().load(
    "./assets/king.glb",
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3(); box.getSize(size);
      const scale = HERO_TARGET_HEIGHT / Math.max(0.001, size.y);
      const center = new THREE.Vector3(); box.getCenter(center);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
      const wrapper = new THREE.Group();
      wrapper.rotation.y = HERO_MODEL_YAW_OFFSET;
      wrapper.add(model);

      const parts = [];
      model.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); parts.push(o); } });

      while (group.children.length) group.remove(group.children[0]);
      group.add(wrapper);
      addShadowBlob(group, 0.4);
      group.userData.parts = parts;
      group.userData.height = HERO_TARGET_HEIGHT;
    },
    undefined,
    (err) => console.warn("king.glb failed to load, keeping placeholder king", err)
  );
}

function W(v) { return v / 30; }

function ensure(map, key, build) {
  let m = map.get(key);
  if (!m) { m = build(); scene.add(m); map.set(key, m); }
  return m;
}
function reap(map, liveSet) {
  for (const [key, mesh] of map) {
    if (!liveSet.has(key)) { scene.remove(mesh); map.delete(key); }
  }
}
function faceYaw(group, dirx, diry) {
  group.rotation.y = Math.atan2(dirx, diry);
}
function tintHit(group, on) {
  for (const part of group.userData.parts || []) {
    part.material.emissive = part.material.emissive || new THREE.Color(0);
    part.material.emissive.setScalar(on ? 0.9 : 0);
  }
}

export function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, true);
  const viewSize = 17;
  const aspect = w / h;
  camera.left = -viewSize * aspect / 2; camera.right = viewSize * aspect / 2;
  camera.top = viewSize / 2; camera.bottom = -viewSize / 2;
  camera.near = -50; camera.far = 60;
  camera.updateProjectionMatrix();
}

let camTarget = { x: 0, y: 0 };
function updateCamera(targetWx, targetWy) {
  camTarget.x += (W(targetWx) - camTarget.x) * 0.12;
  camTarget.y += (W(targetWy) - camTarget.y) * 0.12;
  const dist = 12;
  camera.position.set(camTarget.x, dist * Math.sin(CAM_TILT), camTarget.y + dist * Math.cos(CAM_TILT));
  camera.lookAt(camTarget.x, 0, camTarget.y);
}

export function worldToScreen(wx, wy, height = 0) {
  const v = new THREE.Vector3(W(wx), height, W(wy)).project(camera);
  return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (1 - (v.y * 0.5 + 0.5)) * innerHeight };
}
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
export function screenToGroundXZ(clientX, clientY) {
  const ndc = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const pt = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(groundPlane, pt)) return { x: pt.x * 30, y: pt.z * 30 };
  return null;
}

export function sync(S, ctx) {
  const { ENEMY_DEF } = ctx;
  updateCamera(S.player.x, S.player.y);

  gateMesh.userData.wallsMat.color.lerpColors(new THREE.Color(COLOR.gateCharred), new THREE.Color(COLOR.gate), Math.max(0, S.gate.hp / ctx.GATE.maxHp));

  const p = S.player;
  const hero = registries.hero;
  hero.position.set(W(p.x), 0, W(p.y));
  hero.visible = true;
  hero.scale.setScalar(p.downedTimer > 0 ? 0.001 : 1);
  faceYaw(hero, p.facing.x, p.facing.y);
  tintHit(hero, p.hitFlash > 0);
  hero.traverse((o) => { if (o.material) o.material.transparent = p.invulnTimer > 0, o.material.opacity = (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 20) % 2 === 0) ? 0.4 : 1; });

  const liveEnemies = new Set(S.enemies);
  for (const e of S.enemies) {
    const g = ensure(registries.enemies, e, () => {
      const grp = buildEnemyMesh(e.type);
      const hb = buildHealthBar(e.type === "boss" ? 1.2 : 0.6);
      hb.position.y = grp.userData.height + 0.18;
      grp.add(hb); grp.userData.hb = hb;
      const slam = buildSlamRing(); grp.add(slam); grp.userData.slam = slam;
      return grp;
    });
    g.position.set(W(e.x), 0, W(e.y));
    const aimx = (e.target === "player" ? S.player.x : ctx.GATE.x) - e.x;
    const aimy = (e.target === "player" ? S.player.y : ctx.GATE.y) - e.y;
    faceYaw(g, aimx, aimy);
    tintHit(g, e.hitFlash > 0);
    g.userData.hb.userData.fg.scale.x = Math.max(0, e.hp / e.maxHp);
    if (e.type === "boss" && e.slamming) {
      g.userData.slam.visible = true;
      const k = 1 - e.slamTimer / ENEMY_DEF.boss.slamWindup;
      g.userData.slam.scale.setScalar((ENEMY_DEF.boss.slamRadius / 30) * Math.max(0.05, k));
    } else g.userData.slam.visible = false;
  }
  reap(registries.enemies, liveEnemies);

  const liveTraps = new Set(S.traps);
  for (const t of S.traps) {
    const g = ensure(registries.traps, t, () => buildTrapMesh(t.type));
    g.position.set(W(t.x), 0, W(t.y));
    if (t.type === "barrel") faceYaw(g, t.dir.x, t.dir.y);
  }
  reap(registries.traps, liveTraps);

  const liveTurrets = new Set(S.turrets);
  for (const t of S.turrets) {
    const g = ensure(registries.turrets, t, buildTurretMesh);
    g.position.set(W(t.x), 0, W(t.y));
  }
  reap(registries.turrets, liveTurrets);

  const livePickups = new Set(S.pickups);
  for (const c of S.pickups) {
    const g = ensure(registries.pickups, c, buildPickupMesh);
    g.position.set(W(c.x), 0, W(c.y));
    g.userData.coin.rotation.y += 0.12;
  }
  reap(registries.pickups, livePickups);

  const liveProj = new Set(S.projectiles);
  for (const a of S.projectiles) {
    const g = ensure(registries.projectiles, a, () => buildProjectileMesh(true));
    g.position.set(W(a.x), 0.35, W(a.y));
    faceYaw(g, a.vx, a.vy);
  }
  reap(registries.projectiles, liveProj);

  const liveEProj = new Set(S.enemyProjectiles);
  for (const a of S.enemyProjectiles) {
    const g = ensure(registries.enemyProjectiles, a, () => buildProjectileMesh(false));
    g.position.set(W(a.x), 0.35, W(a.y));
    faceYaw(g, a.vx, a.vy);
  }
  reap(registries.enemyProjectiles, liveEProj);

  const liveParticles = new Set(S.particles);
  for (const pt of S.particles) {
    const g = ensure(registries.particles, pt, () => buildParticleMesh(pt.color));
    g.position.set(W(pt.x), 0.3, W(pt.y));
    const s = Math.max(0.001, pt.life / pt.maxLife);
    g.scale.setScalar(s);
  }
  reap(registries.particles, liveParticles);

  const liveMarkers = new Set(S.spawnMarkers);
  for (const m of S.spawnMarkers) {
    const g = ensure(registries.spawnMarkers, m, buildSpawnMarkerMesh);
    g.position.set(W(m.x), 0, W(m.y));
    const pulse = 1 - m.t / 0.7;
    g.scale.setScalar(0.4 + pulse * 0.9);
  }
  reap(registries.spawnMarkers, liveMarkers);

  renderer.render(scene, camera);
}
