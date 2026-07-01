import { STRINGS, detectLang, saveLang } from "./strings.js";
import * as R3D from "./render3d.js";

/* ---------------- CONFIG (frozen agency metrics) ---------------- */
const WORLD = { w: 1700, h: 1300 };
const GATE = { x: 850, y: 150, r: 100, maxHp: 300 };
const PLAYER_START = { x: 850, y: 430 };
const CFG = {
  playerR: 22, playerSpeedBase: 230, playerMaxHpBase: 100,
  dashSpeed: 900, dashDuration: 0.16, dashCooldownBase: 1.3, dashIframe: 0.32, dashDamage: 22,
  fireCooldownBase: 0.42, fireCooldownMin: 0.15, arrowDmgBase: 14, arrowSpeed: 640, critChance: 0.12, critMult: 2,
  enemyArrowSpeed: 480,
  aggroRange: 230, deaggroRange: 320,
  trapCooldown: { spike: 6, barrel: 8, tower: 15 },
  trapUnlockWave: { spike: 1, barrel: 3, tower: 5 },
};
const ENEMY_DEF = {
  grunt:  { hp: 32, speed: 95, r: 20, contactDmg: 9,  atkCd: 0.6, gold: [2, 4] },
  archer: { hp: 22, speed: 75, r: 18, rangedDmg: 11, atkCd: 1.4, range: 320, gold: [4, 7] },
  boss:   { hp: 260, hpPerWave: 22, speed: 85, r: 40, contactDmg: 22, atkCd: 0.8,
            slamDmg: 30, slamRadius: 140, slamWindup: 1.1, slamCd: 4.2, gold: [50, 2] },
};
const OBSTACLES = [
  { x: 420, y: 560, r: 55 }, { x: 1280, y: 560, r: 55 },
  { x: 260, y: 900, r: 65 }, { x: 1440, y: 900, r: 65 },
  { x: 850, y: 1050, r: 70 }, { x: 620, y: 780, r: 40 }, { x: 1080, y: 780, r: 40 },
];
const SPAWN_POINTS = [
  { x: 120, y: 1200 }, { x: 850, y: 1260 }, { x: 1580, y: 1200 },
  { x: 60, y: 700 }, { x: 1640, y: 700 },
];

/* ---------------- seeded RNG (deterministic sim) ---------------- */
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
let rng = makeRng((Date.now() ^ 0x9e3779b9) >>> 0);
const rand = (a, b) => a + rng() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

/* ---------------- language / strings ---------------- */
let lang = detectLang();
let STR = STRINGS[lang];
function applyLangToDom() {
  document.documentElement.dir = STR.dir;
  $("startTitle").textContent = STR.startTitle;
  $("startSub").textContent = STR.startSubtitle;
  $("howto").textContent = isTouchDevice() ? STR.howToMobile : STR.howToDesktop;
  $("playBtn").textContent = STR.play;
  $("langBtn1").textContent = STR.lang;
  $("pauseTitle").textContent = STR.paused;
  $("resumeBtn").textContent = STR.resume;
  $("restartFromPauseBtn").textContent = STR.restart;
  $("menuFromPauseBtn").textContent = STR.quitToMenu;
  $("shopTitle").textContent = STR.shopTitle;
  $("shopSub").textContent = STR.shopSubtitle;
  $("rerollBtn").textContent = STR.reroll;
  $("nextWaveBtn").textContent = STR.nextWave;
  $("restartBtn").textContent = STR.restart;
  $("menuFromGoBtn").textContent = STR.quitToMenu;
  $("gateLbl").textContent = STR.gate;
  $("hpLbl").textContent = STR.king;
  $("dashKey").textContent = isTouchDevice() ? "" : "Space";
  $("updateMsg").textContent = STR.updateAvailable;
  $("updateReloadBtn").textContent = STR.updateReload;
  renderShop();
}
function isTouchDevice() { return matchMedia("(pointer:coarse)").matches; }
const $ = (id) => document.getElementById(id);

/* ---------------- audio (synth, no external files) ---------------- */
let actx = null;
function ensureAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } }
function tone(freq, dur, type = "sine", gain = 0.18, sweepTo = null) {
  if (!actx) return;
  const t0 = actx.currentTime;
  const osc = actx.createOscillator(); const g = actx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g); g.connect(actx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}
const SFX = {
  shoot: () => tone(880, 0.07, "triangle", 0.08, 500),
  hit: () => tone(180, 0.09, "square", 0.12, 80),
  crit: () => tone(1200, 0.1, "square", 0.14, 300),
  coin: () => { tone(1046, 0.06, "square", 0.1); setTimeout(() => tone(1568, 0.08, "square", 0.1), 40); },
  dash: () => tone(200, 0.15, "sawtooth", 0.1, 700),
  trap: () => tone(300, 0.08, "square", 0.1, 150),
  hurt: () => tone(140, 0.18, "sawtooth", 0.16, 60),
  waveClear: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.12, "triangle", 0.12), i * 90)); },
  bossWave: () => { [220, 165, 130].forEach((f, i) => setTimeout(() => tone(f, 0.3, "sawtooth", 0.14), i * 140)); },
  gameOver: () => { [392, 330, 261, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, "sine", 0.14), i * 180)); },
  upgrade: () => { tone(660, 0.08, "sine", 0.1); setTimeout(() => tone(990, 0.12, "sine", 0.1), 70); },
};

/* ---------------- state ---------------- */
const S = {
  mode: "start", // start | playing | paused | shop | gameover
  wave: 1,
  gate: { hp: GATE.maxHp },
  player: null,
  enemies: [], projectiles: [], enemyProjectiles: [], traps: [], turrets: [],
  pickups: [], particles: [], spawnQueue: [], spawnMarkers: [],
  dashHitSet: null,
  bestWave: 0,
  unlocked: { spike: true, barrel: false, tower: false },
  upgrades: { hp: 0, dmg: 0, firerate: 0, dash: 0, gateRepair: 0 },
  shopOffers: [],
};
try { S.bestWave = parseInt(localStorage.getItem("ks_best_wave") || "0", 10) || 0; } catch (e) {}

function newPlayer() {
  return {
    x: PLAYER_START.x, y: PLAYER_START.y, r: CFG.playerR,
    hp: CFG.playerMaxHpBase, maxHp: CFG.playerMaxHpBase,
    speed: CFG.playerSpeedBase, gold: 0,
    facing: { x: 0, y: -1 }, aimDir: { x: 0, y: -1 },
    fireCooldown: CFG.fireCooldownBase, fireTimer: 0, arrowDmg: CFG.arrowDmgBase,
    dashCooldown: CFG.dashCooldownBase, dashCdTimer: 0, dashTimer: 0, dashDir: { x: 0, y: -1 },
    invulnTimer: 0, downedTimer: 0, hitFlash: 0,
    trapCd: { spike: 0, barrel: 0, tower: 0 },
  };
}

/* ---------------- input ---------------- */
const BIND = { KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Space: "dash" };
const TRAP_KEYS = { Digit1: "spike", Digit2: "barrel", Digit3: "tower" };
const held = new Set();
const heldEdge = new Set();
addEventListener("keydown", (e) => {
  if (BIND[e.code]) { if (!held.has(BIND[e.code])) heldEdge.add(BIND[e.code]); held.add(BIND[e.code]); e.preventDefault(); }
  if (TRAP_KEYS[e.code]) { heldEdge.add("trap:" + TRAP_KEYS[e.code]); e.preventDefault(); }
  if (e.code === "KeyP" || e.code === "Escape") togglePause();
});
addEventListener("keyup", (e) => { if (BIND[e.code]) held.delete(BIND[e.code]); });

let mouseAim = null; // {x,y} in screen space
addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") mouseAim = { x: e.clientX, y: e.clientY }; });
addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") { ensureAudio(); mouseAim = { x: e.clientX, y: e.clientY }; } });

// gamepad
const padEdge = new Set();
let padPrev = { dash: false, spike: false, barrel: false, tower: false };
function pollGamepad(moveVec, aimVec) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp) continue;
    const lx = gp.axes[0] || 0, ly = gp.axes[1] || 0;
    const rx = gp.axes[2] || 0, ry = gp.axes[3] || 0;
    if (Math.hypot(lx, ly) > 0.2) { moveVec.x += lx; moveVec.y += ly; }
    if (Math.hypot(rx, ry) > 0.3) { aimVec.x += rx; aimVec.y += ry; aimVec.active = true; }
    const dash = !!(gp.buttons[0] && gp.buttons[0].pressed);
    const spike = !!(gp.buttons[1] && gp.buttons[1].pressed);
    const barrel = !!(gp.buttons[2] && gp.buttons[2].pressed);
    const tower = !!(gp.buttons[3] && gp.buttons[3].pressed);
    if (dash && !padPrev.dash) heldEdge.add("dash");
    if (spike && !padPrev.spike) heldEdge.add("trap:spike");
    if (barrel && !padPrev.barrel) heldEdge.add("trap:barrel");
    if (tower && !padPrev.tower) heldEdge.add("trap:tower");
    padPrev = { dash, spike, barrel, tower };
  }
}

/* ---- virtual joysticks (touch) ---- */
function makeStick(baseEl, nubEl, { deadzone = 6, radius = 48 } = {}) {
  const st = { active: false, pointerId: null, cx: 0, cy: 0, vec: { x: 0, y: 0 } };
  function show(x, y) { st.cx = x; st.cy = y; baseEl.style.left = x - 50 + "px"; baseEl.style.top = y - 50 + "px"; baseEl.style.display = "block"; nubEl.style.display = "block"; setNub(x, y); }
  function setNub(x, y) { nubEl.style.left = x - 23 + "px"; nubEl.style.top = y - 23 + "px"; }
  function hide() { baseEl.style.display = "none"; nubEl.style.display = "none"; st.active = false; st.pointerId = null; st.vec = { x: 0, y: 0 }; }
  st.down = (id, x, y) => { st.active = true; st.pointerId = id; show(x, y); };
  st.move = (id, x, y) => {
    if (!st.active || id !== st.pointerId) return;
    let dx = x - st.cx, dy = y - st.cy;
    const d = Math.hypot(dx, dy);
    if (d > radius) { dx = (dx / d) * radius; dy = (dy / d) * radius; }
    setNub(st.cx + dx, st.cy + dy);
    st.vec = (Math.hypot(dx, dy) < deadzone) ? { x: 0, y: 0 } : { x: dx / radius, y: dy / radius };
  };
  st.up = (id) => { if (id === st.pointerId) hide(); };
  return st;
}
const moveStick = makeStick($("moveBase"), $("moveNub"));
const aimStick = makeStick($("aimBase"), $("aimNub"));
const activeTouchZone = new Map(); // pointerId -> 'move'|'aim'

addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse") return;
  if (e.target.closest("button, .modal")) return;
  const barTop = innerHeight - 92;
  if (e.clientY > barTop) return;
  const zone = e.clientX < innerWidth / 2 ? "move" : "aim";
  activeTouchZone.set(e.pointerId, zone);
  (zone === "move" ? moveStick : aimStick).down(e.pointerId, e.clientX, e.clientY);
  ensureAudio();
}, { passive: true });
addEventListener("pointermove", (e) => {
  const zone = activeTouchZone.get(e.pointerId);
  if (!zone) return;
  (zone === "move" ? moveStick : aimStick).move(e.pointerId, e.clientX, e.clientY);
});
addEventListener("pointerup", (e) => { const zone = activeTouchZone.get(e.pointerId); if (zone) { (zone === "move" ? moveStick : aimStick).up(e.pointerId); activeTouchZone.delete(e.pointerId); } });
addEventListener("pointercancel", (e) => { const zone = activeTouchZone.get(e.pointerId); if (zone) { (zone === "move" ? moveStick : aimStick).up(e.pointerId); activeTouchZone.delete(e.pointerId); } });

/* action bar buttons */
function bindHoldButton(el, fn) {
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); ensureAudio(); fn(); });
}
bindHoldButton($("dashBtn"), () => heldEdge.add("dash"));
bindHoldButton($("trapBtn1"), () => heldEdge.add("trap:spike"));
bindHoldButton($("trapBtn2"), () => heldEdge.add("trap:barrel"));
bindHoldButton($("trapBtn3"), () => heldEdge.add("trap:tower"));
$("pauseBtn").addEventListener("pointerdown", (e) => { e.preventDefault(); togglePause(); });

/* ---------------- 3D scene ---------------- */
const canvas = $("c");
R3D.init(canvas, { WORLD, GATE, OBSTACLES, SPAWN_POINTS, ENEMY_DEF });
addEventListener("resize", R3D.resize); addEventListener("orientationchange", R3D.resize);

function worldToScreen(x, y) { return R3D.worldToScreen(x, y, 0.5); }

/* ---------------- helpers ---------------- */
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function norm(x, y) { const d = Math.hypot(x, y) || 1; return { x: x / d, y: y / d }; }
function clampVec(v, max) { const d = Math.hypot(v.x, v.y); if (d > max) return { x: v.x / d * max, y: v.y / d * max }; return v; }
function pushOutOfObstacles(e) {
  for (const o of OBSTACLES) {
    const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy), min = o.r + e.r;
    if (d < min && d > 0.001) { const p = (min - d) / d; e.x += dx * p; e.y += dy * p; }
  }
  e.x = Math.max(e.r, Math.min(WORLD.w - e.r, e.x));
  e.y = Math.max(e.r, Math.min(WORLD.h - e.r, e.y));
}
function floatText(text, x, y, color = "#fff") {
  const el = document.createElement("div");
  el.className = "floatText"; el.textContent = text; el.style.color = color;
  const s = worldToScreen(x, y); el.style.left = s.x + "px"; el.style.top = s.y + "px";
  $("floatTexts").appendChild(el);
  setTimeout(() => el.remove(), 820);
  const kids = $("floatTexts").children;
  if (kids.length > 24) kids[0].remove();
}
function spawnParticles(x, y, color, count, speed = 140, life = 0.4) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    S.particles.push({ x, y, vx: Math.cos(a) * speed * rand(0.3, 1), vy: Math.sin(a) * speed * rand(0.3, 1), life, maxLife: life, color, size: rand(2, 5) });
  }
}

/* ---------------- wave / economy config ---------------- */
function waveEnemyPlan(wave) {
  const isBoss = wave % 5 === 0;
  const list = [];
  if (isBoss) {
    const minionCount = 3 + wave;
    for (let i = 0; i < minionCount; i++) list.push(wave >= 3 && rng() < 0.4 ? "archer" : "grunt");
    list.push("boss");
  } else {
    const total = 5 + wave * 2;
    for (let i = 0; i < total; i++) list.push(wave >= 3 && rng() < 0.35 ? "archer" : "grunt");
  }
  return list;
}
function scaledHp(type, wave) {
  const def = ENEMY_DEF[type];
  const base = type === "boss" ? def.hp + def.hpPerWave * wave : def.hp;
  const mult = 1 + 0.045 * Math.max(0, wave - 1);
  return Math.round(base * mult);
}

const UPGRADE_POOL = [
  { id: "hp", nameKey: "upgHp", descKey: "upgHpDesc", baseCost: 20,
    apply: () => { S.player.maxHp += 20; S.player.hp = S.player.maxHp; } },
  { id: "dmg", nameKey: "upgDmg", descKey: "upgDmgDesc", baseCost: 18,
    apply: () => { S.player.arrowDmg += 3; } },
  { id: "firerate", nameKey: "upgFireRate", descKey: "upgFireRateDesc", baseCost: 22,
    apply: () => { S.player.fireCooldown = Math.max(CFG.fireCooldownMin, S.player.fireCooldown - 0.045); } },
  { id: "dash", nameKey: "upgDash", descKey: "upgDashDesc", baseCost: 16,
    apply: () => { S.player.dashCooldown = Math.max(0.5, S.player.dashCooldown - 0.15); } },
  { id: "gateRepair", nameKey: "upgGate", descKey: "upgGateDesc", baseCost: 14,
    apply: () => { S.gate.hp = Math.min(GATE.maxHp, S.gate.hp + 80); } },
];
function upgradeCost(u) { return Math.round(u.baseCost * Math.pow(1.18, S.upgrades[u.id] || 0)); }

function rollShopOffers() {
  const pool = UPGRADE_POOL.slice();
  const offers = [];
  if (!S.unlocked.barrel) offers.push({ id: "unlockBarrel", nameKey: "upgUnlockBarrel", descKey: "upgUnlockBarrelDesc", cost: 30,
    apply: () => { S.unlocked.barrel = true; } });
  if (!S.unlocked.tower && S.wave >= 3) offers.push({ id: "unlockTower", nameKey: "upgUnlockTower", descKey: "upgUnlockTowerDesc", cost: 45,
    apply: () => { S.unlocked.tower = true; } });
  while (offers.length < 3 && pool.length) {
    const i = randInt(0, pool.length - 1);
    const u = pool.splice(i, 1)[0];
    offers.push({ id: u.id, nameKey: u.nameKey, descKey: u.descKey, cost: upgradeCost(u), apply: u.apply });
  }
  S.shopOffers = offers.slice(0, 3);
}

/* ---------------- spawning ---------------- */
function queueWave(wave) {
  S.spawnQueue = waveEnemyPlan(wave).map((type, i) => ({ type, t: i * 0.32 }));
  S.spawnMarkers = [];
}
function trySpawn(dt) {
  for (const item of S.spawnQueue) item.t -= dt;
  while (S.spawnQueue.length && S.spawnQueue[0].t <= -0.7) {
    const item = S.spawnQueue.shift();
    spawnEnemy(item.type);
  }
  for (const item of S.spawnQueue) {
    if (item.t <= 0 && !item.marked) {
      item.marked = true;
      const sp = pick(SPAWN_POINTS);
      item.sx = sp.x; item.sy = sp.y;
      S.spawnMarkers.push({ x: sp.x, y: sp.y, t: 0.7 });
    }
  }
  for (let i = S.spawnMarkers.length - 1; i >= 0; i--) {
    S.spawnMarkers[i].t -= dt;
    if (S.spawnMarkers[i].t <= 0) S.spawnMarkers.splice(i, 1);
  }
}
function spawnEnemy(type) {
  const sp = pick(SPAWN_POINTS);
  const def = ENEMY_DEF[type];
  const hp = scaledHp(type, S.wave);
  S.enemies.push({
    type, x: sp.x, y: sp.y, r: def.r, hp, maxHp: hp,
    speed: def.speed, target: "gate", atkTimer: rand(0, 0.4), slowTimer: 0,
    slamTimer: 0, slamming: false, hitFlash: 0,
  });
}

/* ---------------- combat actions ---------------- */
function fireArrow(from, dir, dmg, isPlayer) {
  const arr = isPlayer ? S.projectiles : S.enemyProjectiles;
  arr.push({ x: from.x, y: from.y, vx: dir.x * (isPlayer ? CFG.arrowSpeed : CFG.enemyArrowSpeed), vy: dir.y * (isPlayer ? CFG.arrowSpeed : CFG.enemyArrowSpeed), dmg, life: 1.4 });
  SFX.shoot();
}
function damageEnemy(e, dmg, crit) {
  e.hp -= dmg; e.hitFlash = 0.12;
  floatText((crit ? "★" : "") + Math.round(dmg), e.x, e.y - e.r - 6, crit ? "#ffd766" : "#fff");
  spawnParticles(e.x, e.y, "#e34b4b", crit ? 10 : 5, 120, 0.3);
  (crit ? SFX.crit : SFX.hit)();
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true;
  spawnParticles(e.x, e.y, "#e34b4b", 14, 180, 0.5);
  const def = ENEMY_DEF[e.type];
  const g = e.type === "boss" ? def.gold[0] + S.wave * def.gold[1] : randInt(def.gold[0], def.gold[1]);
  S.pickups.push({ x: e.x, y: e.y, vx: 0, vy: 0, value: g, r: 10 });
}
function damagePlayer(dmg) {
  if (S.player.invulnTimer > 0 || S.player.downedTimer > 0) return;
  S.player.hp -= dmg; S.player.hitFlash = 0.15; S.player.invulnTimer = 0.4;
  spawnParticles(S.player.x, S.player.y, "#4fa3ff", 8, 140, 0.35);
  SFX.hurt();
  if (S.player.hp <= 0) {
    S.player.hp = 0; S.player.downedTimer = 3;
    for (const e of S.enemies) e.target = "gate";
    floatText(lang === "ar" ? "!سقط الملك" : "King down!", S.player.x, S.player.y - 40, "#ff6b6b");
  }
}
function damageGate(dmg) {
  S.gate.hp = Math.max(0, S.gate.hp - dmg);
  spawnParticles(GATE.x, GATE.y, "#ffb84d", 6, 100, 0.3);
  if (S.gate.hp <= 0) endGame();
}

/* ---------------- update ---------------- */
const STEP = 1000 / 60;
function update(dtMs) {
  const dt = dtMs / 1000;
  if (S.mode !== "playing") { held.clear(); heldEdge.clear(); return; }

  const move = { x: 0, y: 0 };
  if (held.has("up")) move.y -= 1; if (held.has("down")) move.y += 1;
  if (held.has("left")) move.x -= 1; if (held.has("right")) move.x += 1;
  if (moveStick.vec) { move.x += moveStick.vec.x; move.y += moveStick.vec.y; }
  const aimVec = { x: 0, y: 0, active: false };
  pollGamepad(move, aimVec);
  const mv = clampVec(move, 1);

  const p = S.player;
  if (p.downedTimer > 0) {
    p.downedTimer -= dt;
    if (p.downedTimer <= 0) {
      p.hp = Math.round(p.maxHp * 0.5); p.invulnTimer = 2.2;
      p.x = GATE.x; p.y = GATE.y + 150;
      for (const e of S.enemies) {
        if (!e.dead && dist(p, e) < 160) { const kb = norm(e.x - p.x, e.y - p.y); e.x += kb.x * 90; e.y += kb.y * 90; }
      }
    }
  } else if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.x += p.dashDir.x * CFG.dashSpeed * dt; p.y += p.dashDir.y * CFG.dashSpeed * dt;
    for (const e of S.enemies) { if (!e.dead && !S.dashHitSet.has(e) && dist(p, e) < p.r + e.r + 6) { S.dashHitSet.add(e); damageEnemy(e, CFG.dashDamage, false); } }
  } else if (Math.hypot(mv.x, mv.y) > 0.05) {
    p.x += mv.x * p.speed * dt; p.y += mv.y * p.speed * dt;
    p.facing = norm(mv.x, mv.y);
  }
  pushOutOfObstacles(p);
  p.x = Math.max(p.r, Math.min(WORLD.w - p.r, p.x));
  p.y = Math.max(p.r, Math.min(WORLD.h - p.r, p.y));

  // aim
  if (aimVec.active) { p.aimDir = norm(aimVec.x, aimVec.y); p.facing = p.aimDir; }
  else if (aimStick.vec && Math.hypot(aimStick.vec.x, aimStick.vec.y) > 0.15) { p.aimDir = norm(aimStick.vec.x, aimStick.vec.y); p.facing = p.aimDir; }
  else if (mouseAim) { const g = R3D.screenToGroundXZ(mouseAim.x, mouseAim.y); if (g) { p.aimDir = norm(g.x - p.x, g.y - p.y); p.facing = p.aimDir; } }
  else { p.aimDir = p.facing; }

  if (p.invulnTimer > 0) p.invulnTimer -= dt;
  if (p.hitFlash > 0) p.hitFlash -= dt;
  if (p.dashCdTimer > 0) p.dashCdTimer -= dt;
  for (const k in p.trapCd) if (p.trapCd[k] > 0) p.trapCd[k] -= dt;

  if (heldEdge.has("dash") && p.dashCdTimer <= 0 && p.dashTimer <= 0 && p.downedTimer <= 0) {
    p.dashTimer = CFG.dashDuration; p.dashCdTimer = p.dashCooldown;
    p.dashDir = Math.hypot(mv.x, mv.y) > 0.05 ? norm(mv.x, mv.y) : p.aimDir;
    p.invulnTimer = CFG.dashIframe; S.dashHitSet = new Set();
    SFX.dash();
  }
  for (const type of ["spike", "barrel", "tower"]) {
    if (heldEdge.has("trap:" + type) && S.unlocked[type] && p.trapCd[type] <= 0 && p.downedTimer <= 0) {
      placeTrap(type); p.trapCd[type] = CFG.trapCooldown[type];
    }
  }

  if (p.downedTimer <= 0) {
    p.fireTimer -= dt;
    if (p.fireTimer <= 0) { p.fireTimer = p.fireCooldown; fireArrow(p, p.aimDir, p.arrowDmg, true); }
  }

  trySpawn(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateTraps(dt);
  updateTurrets(dt);
  updatePickups(dt);
  updateParticles(dt);

  if (S.spawnQueue.length === 0 && S.enemies.filter(e => !e.dead).length === 0) waveClear();

  heldEdge.clear();
  updateHud();
}

function updateEnemies(dt) {
  for (let i = S.enemies.length - 1; i >= 0; i--) {
    const e = S.enemies[i];
    if (e.dead) { S.enemies.splice(i, 1); continue; }
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.slowTimer > 0) e.slowTimer -= dt;
    const spd = e.speed * (e.slowTimer > 0 ? 0.5 : 1);
    const dToPlayer = dist(e, S.player);
    if (e.target === "gate" && dToPlayer < CFG.aggroRange && S.player.downedTimer <= 0) e.target = "player";
    else if (e.target === "player" && dToPlayer > CFG.deaggroRange) e.target = "gate";
    const targetPos = e.target === "player" ? S.player : { x: GATE.x, y: GATE.y };
    const targetR = e.target === "player" ? S.player.r : GATE.r;
    const d = dist(e, targetPos);
    const def = ENEMY_DEF[e.type];

    if (e.type === "archer") {
      const desired = def.range * 0.65;
      const dir = norm(targetPos.x - e.x, targetPos.y - e.y);
      if (d < desired - 30) { e.x -= dir.x * spd * dt; e.y -= dir.y * spd * dt; }
      else if (d > desired + 30) { e.x += dir.x * spd * dt; e.y += dir.y * spd * dt; }
      e.atkTimer -= dt;
      if (e.atkTimer <= 0 && d < def.range) { e.atkTimer = def.atkCd; fireArrow(e, dir, def.rangedDmg, false); }
    } else if (e.type === "boss") {
      if (e.slamming) {
        e.slamTimer -= dt;
        if (e.slamTimer <= 0) {
          e.slamming = false; e.atkTimer = def.slamCd;
          spawnParticles(e.x, e.y, "#ff9d3d", 20, 220, 0.5);
          if (dist(S.player, e) < def.slamRadius + S.player.r) damagePlayer(def.slamDmg);
          if (dist({ x: GATE.x, y: GATE.y }, e) < def.slamRadius + GATE.r) damageGate(def.slamDmg);
        }
      } else {
        if (d > targetR + e.r + 4) { const dir = norm(targetPos.x - e.x, targetPos.y - e.y); e.x += dir.x * spd * dt; e.y += dir.y * spd * dt; }
        e.atkTimer -= dt;
        if (e.atkTimer <= 0 && d < def.slamRadius + 20) { e.slamming = true; e.slamTimer = def.slamWindup; }
        else if (d < targetR + e.r + 6 && e.atkTimer <= 0) {
          e.atkTimer = def.atkCd;
          if (e.target === "player") damagePlayer(def.contactDmg); else damageGate(def.contactDmg);
        }
      }
    } else {
      if (d > targetR + e.r + 2) { const dir = norm(targetPos.x - e.x, targetPos.y - e.y); e.x += dir.x * spd * dt; e.y += dir.y * spd * dt; }
      e.atkTimer -= dt;
      if (d < targetR + e.r + 8 && e.atkTimer <= 0) {
        e.atkTimer = def.atkCd;
        if (e.target === "player") damagePlayer(def.contactDmg); else damageGate(def.contactDmg);
      }
    }
    pushOutOfObstacles(e);
    for (let j = i - 1; j >= 0; j--) {
      const o = S.enemies[j]; if (o.dead) continue;
      const dx = e.x - o.x, dy = e.y - o.y, dd = Math.hypot(dx, dy), min = e.r + o.r;
      if (dd < min && dd > 0.01) { const p = (min - dd) / dd * 0.5; e.x += dx * p; e.y += dy * p; o.x -= dx * p; o.y -= dy * p; }
    }
  }
}

function updateProjectiles(dt) {
  for (let i = S.projectiles.length - 1; i >= 0; i--) {
    const a = S.projectiles[i]; a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
    let hit = false;
    for (const e of S.enemies) {
      if (e.dead) continue;
      if (Math.hypot(a.x - e.x, a.y - e.y) < e.r + 6) {
        const crit = rng() < CFG.critChance;
        damageEnemy(e, a.dmg * (crit ? CFG.critMult : 1), crit);
        hit = true; break;
      }
    }
    if (hit || a.life <= 0 || a.x < 0 || a.y < 0 || a.x > WORLD.w || a.y > WORLD.h) S.projectiles.splice(i, 1);
  }
  for (let i = S.enemyProjectiles.length - 1; i >= 0; i--) {
    const a = S.enemyProjectiles[i]; a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
    let hit = false;
    if (S.player.downedTimer <= 0 && Math.hypot(a.x - S.player.x, a.y - S.player.y) < S.player.r + 6) { damagePlayer(a.dmg); hit = true; }
    if (hit || a.life <= 0 || a.x < 0 || a.y < 0 || a.x > WORLD.w || a.y > WORLD.h) S.enemyProjectiles.splice(i, 1);
  }
}

function placeTrap(type) {
  const p = S.player;
  const pos = { x: p.x + p.aimDir.x * 60, y: p.y + p.aimDir.y * 60 };
  SFX.trap();
  if (type === "spike") S.traps.push({ type, x: pos.x, y: pos.y, r: 26, life: 5, triggered: false });
  else if (type === "barrel") S.traps.push({ type, x: p.x + p.aimDir.x * 34, y: p.y + p.aimDir.y * 34, r: 22, dir: { ...p.aimDir }, life: 2.2, hitSet: new Set() });
  else if (type === "tower") S.turrets.push({ x: pos.x, y: pos.y, r: 22, life: 8, atkTimer: 0, range: 260 });
}
function updateTraps(dt) {
  for (let i = S.traps.length - 1; i >= 0; i--) {
    const t = S.traps[i]; t.life -= dt;
    if (t.type === "barrel") {
      t.x += t.dir.x * 300 * dt; t.y += t.dir.y * 300 * dt;
      const dx = t.x - GATE.x, dy = t.y - GATE.y;
      for (const e of S.enemies) {
        if (e.dead || t.hitSet.has(e)) continue;
        if (dist(t, e) < t.r + e.r) { t.hitSet.add(e); damageEnemy(e, 20, false);
          const kb = norm(e.x - t.x, e.y - t.y); e.x += kb.x * 30; e.y += kb.y * 30; }
      }
      let hitWall = t.x < t.r || t.x > WORLD.w - t.r || t.y < t.r || t.y > WORLD.h - t.r;
      for (const o of OBSTACLES) if (dist(t, o) < t.r + o.r) hitWall = true;
      if (hitWall) t.life = 0;
    } else if (t.type === "spike" && !t.triggered) {
      for (const e of S.enemies) {
        if (e.dead) continue;
        if (dist(t, e) < t.r + e.r) { t.triggered = true; damageEnemy(e, 26, false); e.slowTimer = 2; break; }
      }
    }
    if (t.life <= 0) S.traps.splice(i, 1);
  }
}
function updateTurrets(dt) {
  for (let i = S.turrets.length - 1; i >= 0; i--) {
    const t = S.turrets[i]; t.life -= dt; t.atkTimer -= dt;
    if (t.atkTimer <= 0) {
      let target = null, best = t.range;
      for (const e of S.enemies) { if (e.dead) continue; const d = dist(t, e); if (d < best) { best = d; target = e; } }
      if (target) { t.atkTimer = 0.9; fireArrow(t, norm(target.x - t.x, target.y - t.y), 10, true); }
    }
    if (t.life <= 0) S.turrets.splice(i, 1);
  }
}
function updatePickups(dt) {
  for (let i = S.pickups.length - 1; i >= 0; i--) {
    const c = S.pickups[i];
    const d = dist(c, S.player);
    if (d < 90) { const dir = norm(S.player.x - c.x, S.player.y - c.y); c.x += dir.x * 420 * dt; c.y += dir.y * 420 * dt; }
    if (d < S.player.r + c.r) {
      S.player.gold += c.value; floatText("+" + c.value, c.x, c.y, "#ffd766"); SFX.coin();
      S.pickups.splice(i, 1);
    }
  }
}
function updateParticles(dt) {
  for (let i = S.particles.length - 1; i >= 0; i--) {
    const p = S.particles[i]; p.life -= dt;
    if (p.life <= 0) { S.particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
  }
  if (S.particles.length > 240) S.particles.splice(0, S.particles.length - 240);
}

/* ---------------- wave flow ---------------- */
function waveClear() {
  if (S.mode !== "playing") return;
  S.mode = "shop";
  SFX.waveClear();
  showBanner(STR.waveClear);
  setTimeout(() => { rollShopOffers(); renderShop(); $("shopModal").classList.remove("hidden"); }, 550);
}
function startNextWave() {
  $("shopModal").classList.add("hidden");
  S.wave += 1;
  S.mode = "playing";
  queueWave(S.wave);
  if (S.wave % 5 === 0) { showBanner(STR.bossWave); SFX.bossWave(); }
  updateHud();
}
function showBanner(text) {
  const b = $("banner"); b.textContent = text; b.classList.add("show");
  clearTimeout(showBanner._t);
  showBanner._t = setTimeout(() => b.classList.remove("show"), 1300);
}

function endGame() {
  S.mode = "gameover";
  SFX.gameOver();
  if (S.wave > S.bestWave) { S.bestWave = S.wave; try { localStorage.setItem("ks_best_wave", String(S.bestWave)); } catch (e) {} }
  $("goTitle").textContent = STR.gameOverTitle;
  $("goSub").textContent = `${STR.gameOverSubtitle} ${S.wave}`;
  $("goBest").textContent = `${STR.bestWave}: ${S.bestWave}` + (S.wave >= S.bestWave ? "  " + STR.newBest : "");
  $("gameOverModal").classList.remove("hidden");
}

function resetRun() {
  S.wave = 1; S.gate.hp = GATE.maxHp; S.player = newPlayer();
  S.enemies = []; S.projectiles = []; S.enemyProjectiles = []; S.traps = []; S.turrets = [];
  S.pickups = []; S.particles = []; S.spawnQueue = []; S.spawnMarkers = [];
  S.unlocked = { spike: true, barrel: false, tower: false };
  rng = makeRng((Date.now() ^ 0x2545f491) >>> 0);
  queueWave(1);
  S.mode = "playing";
  $("gameOverModal").classList.add("hidden"); $("shopModal").classList.add("hidden"); $("pauseModal").classList.add("hidden");
  updateHud();
}

/* ---------------- HUD / modals wiring ---------------- */
function updateHud() {
  $("gateNum").textContent = `${Math.max(0, Math.round(S.gate.hp))}/${GATE.maxHp}`;
  $("gateBar").style.width = Math.max(0, S.gate.hp / GATE.maxHp * 100) + "%";
  if (S.player) {
    $("hpNum").textContent = `${Math.max(0, Math.round(S.player.hp))}/${S.player.maxHp}`;
    $("hpBar").style.width = Math.max(0, S.player.hp / S.player.maxHp * 100) + "%";
    $("goldLabel").textContent = "🪙 " + S.player.gold;
  }
  $("waveLabel").textContent = `${STR.wave} ${S.wave}`;
  for (const type of ["spike", "barrel", "tower"]) {
    const btn = $({ spike: "trapBtn1", barrel: "trapBtn2", tower: "trapBtn3" }[type]);
    const cdEl = $({ spike: "cd1", barrel: "cd2", tower: "cd3" }[type]);
    const unlocked = S.unlocked[type];
    btn.classList.toggle("locked", !unlocked);
    if (unlocked && S.player) {
      const pct = Math.max(0, Math.min(1, S.player.trapCd[type] / CFG.trapCooldown[type])) * 100;
      cdEl.style.setProperty("--p", pct + "%");
    } else cdEl.style.setProperty("--p", "0%");
  }
  if (S.player) $("cdDash").style.setProperty("--p", Math.max(0, Math.min(1, S.player.dashCdTimer / S.player.dashCooldown)) * 100 + "%");
}
function renderShop() {
  const list = $("upgradeList"); list.innerHTML = "";
  for (const off of S.shopOffers || []) {
    const row = document.createElement("div"); row.className = "upgcard";
    const info = document.createElement("div"); info.className = "info";
    const name = document.createElement("div"); name.className = "name"; name.textContent = STR[off.nameKey] || off.nameKey;
    const desc = document.createElement("div"); desc.className = "desc"; desc.textContent = STR[off.descKey] || off.descKey;
    info.append(name, desc);
    const btn = document.createElement("button");
    btn.textContent = off.cost + " " + STR.goldAbbrev;
    btn.disabled = !S.player || S.player.gold < off.cost;
    btn.addEventListener("click", () => {
      if (!S.player || S.player.gold < off.cost) return;
      S.player.gold -= off.cost; off.apply();
      if (S.upgrades[off.id] !== undefined) S.upgrades[off.id]++;
      SFX.upgrade();
      const idx = S.shopOffers.indexOf(off);
      const pool = UPGRADE_POOL.filter(u => u.id !== off.id);
      const repl = pool[randInt(0, pool.length - 1)];
      S.shopOffers[idx] = { id: repl.id, nameKey: repl.nameKey, descKey: repl.descKey, cost: upgradeCost(repl), apply: repl.apply };
      renderShop(); updateHud();
    });
    row.append(info, btn); list.appendChild(row);
  }
}
$("rerollBtn").addEventListener("click", () => { rollShopOffers(); renderShop(); });
$("nextWaveBtn").addEventListener("click", startNextWave);
$("playBtn").addEventListener("click", () => { ensureAudio(); $("startModal").classList.add("hidden"); resetRun(); });
$("restartBtn").addEventListener("click", () => { $("gameOverModal").classList.add("hidden"); resetRun(); });
$("restartFromPauseBtn").addEventListener("click", () => { $("pauseModal").classList.add("hidden"); resetRun(); });
$("menuFromGoBtn").addEventListener("click", () => { $("gameOverModal").classList.add("hidden"); showStart(); });
$("menuFromPauseBtn").addEventListener("click", () => { $("pauseModal").classList.add("hidden"); showStart(); });
$("resumeBtn").addEventListener("click", togglePause);
function showStart() { S.mode = "start"; $("startModal").classList.remove("hidden"); }
function togglePause() {
  if (S.mode === "playing") { S.mode = "paused"; $("pauseModal").classList.remove("hidden"); }
  else if (S.mode === "paused") { S.mode = "playing"; $("pauseModal").classList.add("hidden"); }
}
function setLang(l) { lang = l; STR = STRINGS[l]; saveLang(l); applyLangToDom(); }
$("langBtn1").addEventListener("click", () => setLang(lang === "ar" ? "en" : "ar"));

applyLangToDom();

/* ---------------- render ---------------- */
function render() {
  if (!S.player) return;
  R3D.sync(S, { GATE, ENEMY_DEF });
}

/* ---------------- main loop ---------------- */
let acc = 0, last = performance.now(), paused = false, frames = 0, fpsAt = last;
addEventListener("blur", () => paused = true);
addEventListener("focus", () => { paused = false; last = performance.now(); });
const dev = new URLSearchParams(location.search).has("dev");
if (dev) $("dev").style.display = "block";
function frame(now) {
  requestAnimationFrame(frame);
  if (paused) return;
  acc += now - last; last = now;
  let steps = 0;
  while (acc >= STEP && steps < 8) { update(STEP); acc -= STEP; steps++; }
  render();
  if (dev && (frames++, now - fpsAt >= 500)) {
    const fps = Math.round(frames * 1000 / (now - fpsAt)); frames = 0; fpsAt = now;
    $("dev").textContent = `${fps} ${STR.fps} | e:${S.enemies.length} p:${S.projectiles.length + S.enemyProjectiles.length} particles:${S.particles.length}`;
  }
}
requestAnimationFrame(frame);

if ("serviceWorker" in navigator) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
    let controllerAtLoad = navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!controllerAtLoad) { controllerAtLoad = navigator.serviceWorker.controller; return; }
      $("updateToast").classList.remove("hidden");
    });
  });
}
$("updateReloadBtn").addEventListener("click", () => location.reload());
