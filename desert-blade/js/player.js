"use strict";
/* =========================================================
   player.js — player movement, jumping (coyote time, jump
   buffer, variable height, double jump), ladders, attacks,
   pickups and damage. Death/respawn runs on in-game timers
   (G.deathT) so pausing pauses everything.
   ========================================================= */

function hurtPlayer(dmg, kx){
  if (P.inv > 0 || P.dead) return;
  P.hp -= dmg; P.inv = 1.5;
  P.vx = (kx || -P.face) * 220; P.vy = -330;
  G.shake = .35; G.hitstop = Math.max(G.hitstop, .06);
  SFX.hurt(); puff(P.x + P.w / 2, P.y + P.h / 2, 10, '#e05a4e', 150);
  if (P.hp <= 0) killPlayer();
}

function killPlayer(){
  if (P.dead) return;
  P.dead = true; P.vy = -500; P.inv = 0; G.deathT = 1.1; G.shake = .4;
  SFX.hurt();
}

/* called from the loop while G.deathT counts down */
function updateDeath(dt){
  if (G.deathT <= 0) return;
  G.deathT -= dt;
  G.fade = Math.min(1, G.fade + dt * 1.4);
  if (G.deathT <= 0){
    G.lives--;
    if (G.lives <= 0){ showOver(); return; }
    P.x = G.checkpoint.x; P.y = G.checkpoint.y; P.vx = 0; P.vy = 0;
    P.hp = P.maxHp; P.dead = false; P.inv = 2; G.fade = 0;
    camSnap();
  }
}

let jHeld = false, fHeld = false;

function updatePlayer(dt){
  if (P.dead){ P.vy += 2200 * dt; P.y += P.vy * dt; P.anim += dt; return; }
  G.fade = Math.max(0, G.fade - dt * 2);
  if (G.cine > 0){ P.anim += dt; P.state = 'idle'; return; }

  if (P.winWalk){ // victory: walk to the princess
    const tx = G.princess.x - 40;
    P.face = Math.sign(tx - P.x) || 1;
    if (Math.abs(tx - P.x) > 6){ P.vx = P.face * 120; P.state = 'run'; }
    else { P.vx = 0; P.state = 'victory'; }
    P.x += P.vx * dt; P.vy += 2200 * dt; P.y += P.vy * dt; collideY(P, true);
    P.anim += dt;
    return;
  }

  /* ---- horizontal movement ---- */
  const acc = P.onG ? PHYS.acc : PHYS.accAir;
  let mx = 0; if (inL()) mx = -1; if (inR()) mx = 1;
  if (mx){
    P.vx += mx * acc * dt; P.face = mx;
    P.vx = Math.max(-PHYS.top, Math.min(PHYS.top, P.vx));
  } else {
    const f = P.onG ? PHYS.fric : PHYS.fricAir;
    const s = Math.sign(P.vx);
    P.vx -= s * f * dt;
    if (Math.sign(P.vx) !== s) P.vx = 0;
  }

  /* ---- ladders ---- */
  const lad = overlapTile(P, 'L', 8);
  if (lad && (inUp() || inDn() || P.climb)){
    if (inUp() || inDn()) P.climb = true;
    if (P.climb){
      P.vy = (inUp() ? -140 : 0) + (inDn() ? 140 : 0);
      P.x += (lad.c * TILE + TILE / 2 - (P.x + P.w / 2)) * 8 * dt;
      P.jumps = 0;
    }
  } else P.climb = false;
  if (!lad) P.climb = false;

  /* ---- jumping: coyote time + jump buffer + double jump ---- */
  if (P.onG){ P.coyote = PHYS.coyote; P.jumps = 0; }
  else {
    P.coyote -= dt;
    if (P.coyote <= 0 && P.jumps === 0) P.jumps = 1; // walked off a ledge: first jump is spent
  }
  const jp = inJ();
  P.jbuf = jp && !jHeld ? PHYS.jumpBuffer : Math.max(0, P.jbuf - dt);
  if (P.jbuf > 0){
    if (P.climb){
      P.climb = false; P.vy = -560; P.jbuf = 0; P.cut = false; SFX.jump();
    } else if (P.coyote > 0){
      P.vy = PHYS.jumpV; P.coyote = 0; P.jumps = 1; P.jbuf = 0; P.cut = false;
      P.stretch = .14; SFX.jump();
      puff(P.x + P.w / 2, P.y + P.h, 6, '#d9c9a8', 80, .35);
    } else if (P.jumps < 2){
      P.vy = PHYS.doubleJumpV; P.jumps = 2; P.jbuf = 0; P.cut = false;
      P.stretch = .14; SFX.djump();
      puff(P.x + P.w / 2, P.y + P.h / 2, 8, '#ffe9b0', 110, .4);
      ring(P.x + P.w / 2, P.y + P.h, '#ffe9b0', 26);
    }
  }
  /* jump cut: release early for a shorter hop */
  if (!jp && P.vy < 0 && !P.cut && !P.climb){ P.vy *= PHYS.jumpCut; P.cut = true; }
  jHeld = jp;

  /* ---- gravity (shaped: floaty apex, snappy fall) ---- */
  if (!P.climb){
    const g = P.vy < 0 ? (jp ? PHYS.gravUp : PHYS.grav) : PHYS.gravDown;
    P.vy += g * dt;
    P.vy = Math.min(P.vy, PHYS.maxFall);
  }
  P.dropDown = inDn() && !P.climb;

  const fallV = P.vy;
  P.x += P.vx * dt; collideX(P);
  P.y += P.vy * dt; collideY(P, true);
  P.x = Math.max(0, Math.min(P.x, G.W * TILE - P.w));

  /* ---- riding movers / fallers ---- */
  for (const e of G.ents){
    if (e.t === 'mover' || e.t === 'faller'){
      const feet = { x:P.x, y:P.y + P.h, w:P.w, h:6 };
      if (P.vy >= 0 && aabb(feet, e) && P.y + P.h - P.vy * G.dt <= e.y + 8){
        P.y = e.y - P.h; P.vy = 0; P.onG = true; P.jumps = 0; P.coyote = PHYS.coyote;
        if (e.t === 'mover') P.x += e.dx || 0;
        if (e.t === 'faller' && e.timer < 0) e.timer = .55;
      }
    }
  }

  /* ---- landing feedback ---- */
  if (P.onG && !P.wasG && fallV > 340){
    P.squash = .16; SFX.land();
    puff(P.x + P.w / 2, P.y + P.h, fallV > 700 ? 10 : 5, '#d9c9a8', 90, .35);
    if (fallV > 800) G.shake = Math.max(G.shake, .12);
  }
  P.wasG = P.onG;
  P.squash = Math.max(0, P.squash - dt * 1.4);
  P.stretch = Math.max(0, P.stretch - dt * 1.4);

  /* ---- running dust ---- */
  if (P.onG && Math.abs(P.vx) > 180){
    P.stepT -= dt;
    if (P.stepT <= 0){ P.stepT = .22; puff(P.x + P.w / 2 - P.face * 10, P.y + P.h - 2, 1, 'rgba(217,201,168,.9)', 40, .3); }
  }

  /* ---- fire attack ---- */
  const fp = inF();
  P.cool -= dt;
  if (fp && !fHeld && P.cool <= 0 && P.fire > 0){
    P.fire--; P.cool = .38; SFX.fire();
    G.fireballs.push({ x:P.x + P.w / 2 + P.face * 20, y:P.y + 22, vx:P.face * 520, vy:0, t:0, r:11 });
    P.state = 'attack'; P.atkT = .25;
  }
  fHeld = fp;
  if (P.atkT > 0) P.atkT -= dt;

  /* ---- tile interactions ---- */
  const cn = overlapTile(P, 'C', 10);
  if (cn){ G.grid[cn.r][cn.c] = ' '; G.coins++; G.score += 100; SFX.coin();
    puff(cn.c * TILE + 24, cn.r * TILE + 24, 6, '#ffd75e', 90, .4);
    popText(cn.c * TILE + 24, cn.r * TILE + 8, '+100'); }
  const hh = overlapTile(P, 'H', 10);
  if (hh){ G.grid[hh.r][hh.c] = ' '; P.hp = Math.min(P.maxHp, P.hp + 1); SFX.chest();
    puff(hh.c * TILE + 24, hh.r * TILE + 24, 8, '#ff7b8a', 90, .5);
    popText(hh.c * TILE + 24, hh.r * TILE + 8, '+♥', '#ff7b8a'); }
  const pp = overlapTile(P, 'P', 10);
  if (pp){ G.grid[pp.r][pp.c] = ' '; P.fire += 4; SFX.chest();
    puff(pp.c * TILE + 24, pp.r * TILE + 24, 8, '#ffa63c', 110, .5);
    popText(pp.c * TILE + 24, pp.r * TILE + 8, '+4 🔥', '#ffa63c'); }
  const tc = overlapTile(P, 'T', 6);
  if (tc){ G.grid[tc.r][tc.c] = 't'; G.coins += 10; G.score += 1000; SFX.chest();
    puff(tc.c * TILE + 24, tc.r * TILE + 10, 16, '#ffd75e', 150, .7);
    ring(tc.c * TILE + 24, tc.r * TILE + 20, '#ffd75e', 46);
    popText(tc.c * TILE + 24, tc.r * TILE - 4, '+1000'); }
  const kc = overlapTile(P, 'K', 6);
  if (kc){
    const key = kc.c + ',' + kc.r;
    if (!G.cpDone.has(key)){
      G.cpDone.add(key);
      G.checkpoint = { x:kc.c * TILE + 8, y:kc.r * TILE - 20 };
      P.hp = Math.min(P.maxHp, P.hp + 1); // checkpoints heal a heart
      SFX.check();
      puff(kc.c * TILE + 24, kc.r * TILE, 10, '#7be07b', 100, .6);
      popText(kc.c * TILE + 24, kc.r * TILE - 12, 'نقطة حفظ ✓', '#7be07b');
    }
  }
  if (overlapTile(P, '^', 14)) hurtPlayer(1);
  if (overlapTile(P, 'W', 16)){
    // water: take a heart and get pulled back to the checkpoint
    hurtPlayer(1);
    if (!P.dead){ P.x = G.checkpoint.x; P.y = G.checkpoint.y; P.vx = 0; P.vy = 0; camSnap(); }
  }
  if (P.y > G.H * TILE + 100) killPlayer();
  const dr = overlapTile(P, 'D', 8);
  if (dr && !LEVELS[G.lvl].boss) levelComplete();

  /* ---- animation state ---- */
  P.inv = Math.max(0, P.inv - dt);
  P.anim += dt * (Math.abs(P.vx) > 20 ? 1.6 : 1);
  if (P.atkT > 0) P.state = 'attack';
  else if (P.climb) P.state = 'climb';
  else if (!P.onG) P.state = P.vy < 0 ? 'jump' : 'fall';
  else if (Math.abs(P.vx) > 20) P.state = 'run';
  else P.state = 'idle';
}
