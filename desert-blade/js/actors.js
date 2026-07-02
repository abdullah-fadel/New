"use strict";
/* =========================================================
   actors.js — procedural character drawing: hero, scorpion,
   bandit, boss, princess. All vector-drawn, no sprites.
   ========================================================= */

/* ---- HERO: original Arabian adventurer (lean, bearded, ghutra + red bisht) ---- */
function drawHero(){
  if (!P.dead) drawShadow(P.x + P.w / 2, P.y + P.h, P.w);
  const x = P.x + P.w / 2, y = P.y, t = P.anim, run = P.state === 'run';
  const flick = P.inv > 0 && Math.floor(P.inv * 12) % 2 === 0;
  if (flick) return;
  ctx.save(); ctx.translate(x, y);
  /* squash & stretch anchored at the feet */
  const sq = P.squash, st = P.stretch;
  if (sq > 0 || st > 0){
    ctx.translate(0, 55);
    ctx.scale(1 + sq * .5 - st * .3, 1 - sq * .5 + st * .35);
    ctx.translate(0, -55);
  }
  ctx.scale(P.face, 1);
  if (P.dead) ctx.rotate(Math.sin(t * 3) * .3);
  const leg = run ? Math.sin(t * 13) * 1 : 0, arm = run ? Math.sin(t * 13 + 3.14) : 0;
  /* idle breathing */
  const br = P.state === 'idle' ? Math.sin(t * 2.4) * 1.2 : 0;
  /* --- cloak (red bisht) flowing behind --- */
  const flow = Math.min(1, Math.abs(P.vx) / 265), wob = Math.sin(t * 9) * 4 * flow;
  ctx.fillStyle = '#8E1F2F';
  ctx.beginPath(); ctx.moveTo(-4, 12);
  ctx.quadraticCurveTo(-20 - 24 * flow, 26 + wob, -16 - 30 * flow, 52 + wob * .6);
  ctx.lineTo(-8, 54); ctx.lineTo(-2, 20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-4, 14);
  ctx.quadraticCurveTo(-19 - 23 * flow, 27 + wob, -15 - 29 * flow, 51 + wob * .6); ctx.stroke();
  /* --- legs / white thobe skirt --- */
  ctx.fillStyle = '#F6F1E7';
  ctx.beginPath(); ctx.moveTo(-9, 26); ctx.lineTo(9, 26); ctx.lineTo(12, 50); ctx.lineTo(-12, 50); ctx.closePath(); ctx.fill();
  /* sandaled feet */
  ctx.fillStyle = '#c8935f';
  const f1 = leg * 7, f2 = -leg * 7;
  ctx.beginPath(); ctx.ellipse(-5 + f1, 55, 6, 4, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6 + f2, 55, 6, 4, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#6b3f1e'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9 + f1, 54); ctx.lineTo(-1 + f1, 54);
  ctx.moveTo(2 + f2, 54); ctx.lineTo(10 + f2, 54); ctx.stroke();
  /* --- torso: thobe + open bisht --- */
  ctx.fillStyle = '#F6F1E7'; rr(-9, 8 + br, 18, 22 - br, 6); ctx.fill();
  ctx.fillStyle = '#8E1F2F';
  ctx.beginPath(); ctx.moveTo(-10, 8 + br); ctx.lineTo(-4, 8 + br); ctx.lineTo(-6, 30); ctx.lineTo(-12, 28); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, 8 + br); ctx.lineTo(4, 8 + br); ctx.lineTo(6, 30); ctx.lineTo(12, 28); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-5, 9 + br); ctx.lineTo(-7, 29); ctx.moveTo(5, 9 + br); ctx.lineTo(7, 29); ctx.stroke();
  ctx.fillStyle = '#D4AF37'; ctx.fillRect(-8, 24, 16, 3); // belt
  /* --- arms (bare hands, tan skin) --- */
  ctx.strokeStyle = '#8E1F2F'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  if (P.state === 'attack'){
    ctx.beginPath(); ctx.moveTo(4, 13); ctx.lineTo(20, 12); ctx.stroke();
    ctx.fillStyle = '#d8a06b'; ctx.beginPath(); ctx.arc(23, 12, 4.4, 0, 7); ctx.fill();
    const fg = ctx.createRadialGradient(28, 12, 2, 28, 12, 20);
    fg.addColorStop(0, 'rgba(255,170,60,.8)'); fg.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(28, 12, 20, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4, 13); ctx.lineTo(-11, 20); ctx.stroke();
    ctx.fillStyle = '#d8a06b'; ctx.beginPath(); ctx.arc(-12, 21, 4, 0, 7); ctx.fill();
  } else if (P.state === 'climb'){
    const cy = Math.sin(t * 8) * 5;
    ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(8, -2 + cy); ctx.moveTo(-4, 12); ctx.lineTo(-8, -2 - cy); ctx.stroke();
    ctx.fillStyle = '#d8a06b';
    ctx.beginPath(); ctx.arc(8, -3 + cy, 4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-8, -3 - cy, 4, 0, 7); ctx.fill();
  } else if (P.state === 'jump' || P.state === 'fall'){
    ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(13, 4); ctx.moveTo(-4, 12); ctx.lineTo(-12, 18); ctx.stroke();
    ctx.fillStyle = '#d8a06b';
    ctx.beginPath(); ctx.arc(14, 3, 4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-13, 19, 4, 0, 7); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(4, 12 + br); ctx.lineTo(10 + arm * 6, 22 + br);
    ctx.moveTo(-4, 12 + br); ctx.lineTo(-10 - arm * 6, 22 + br); ctx.stroke();
    ctx.fillStyle = '#d8a06b';
    ctx.beginPath(); ctx.arc(10 + arm * 6, 24 + br, 4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-10 - arm * 6, 24 + br, 4, 0, 7); ctx.fill();
  }
  ctx.lineCap = 'butt';
  /* --- head --- */
  ctx.save(); ctx.translate(0, br);
  ctx.fillStyle = '#d8a06b'; ctx.beginPath(); ctx.ellipse(1, -3, 9.5, 10.5, 0, 0, 7); ctx.fill(); // face
  /* beard: trim around jaw */
  ctx.fillStyle = '#241a12';
  ctx.beginPath(); ctx.moveTo(-8, -4); ctx.quadraticCurveTo(-9, 10, 1, 11); ctx.quadraticCurveTo(11, 10, 10, -4);
  ctx.lineTo(8, -2); ctx.quadraticCurveTo(8, 5, 1, 6); ctx.quadraticCurveTo(-6, 5, -6, -2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 1.5, 4.5, 1.7, 0, 0, 7); ctx.fill(); // moustache
  /* mouth */
  if (P.state === 'victory'){ ctx.fillStyle = '#5a2b1c'; ctx.beginPath(); ctx.arc(4, 4, 2.4, 0, 3.14); ctx.fill(); }
  /* nose (small) */
  ctx.fillStyle = '#c78d59'; ctx.beginPath(); ctx.ellipse(8, -1, 2.6, 3.2, 0, 0, 7); ctx.fill();
  /* eyes (blink every few seconds) */
  const blink = (t % 3.7) > 3.55;
  if (!blink){
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(5.5, -6, 2.6, 3.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(6.3, -6, 1.5, 0, 7); ctx.fill();
  } else {
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(3, -6); ctx.lineTo(8, -6); ctx.stroke();
  }
  ctx.strokeStyle = '#241a12'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(3, -9.6); ctx.lineTo(8.6, -10.2); ctx.stroke(); // brow
  /* ghutra (white headdress) + black agal */
  ctx.fillStyle = '#F6F1E7';
  ctx.beginPath(); ctx.moveTo(-9, -8); ctx.quadraticCurveTo(-1, -17, 9, -8);
  ctx.lineTo(9, -5); ctx.quadraticCurveTo(-1, -13, -9, -5); ctx.closePath(); ctx.fill();
  /* draped tail flowing behind */
  const gt = Math.sin(t * 8) * 3 * Math.max(.3, flow);
  ctx.beginPath(); ctx.moveTo(-8, -8); ctx.quadraticCurveTo(-16, -2 + gt, -15 - 14 * flow, 14 + gt);
  ctx.quadraticCurveTo(-10, 10, -7, -2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  ctx.beginPath(); ctx.moveTo(-8, -7); ctx.quadraticCurveTo(-14, 0 + gt, -13 - 12 * flow, 12 + gt);
  ctx.lineTo(-9, 6); ctx.closePath(); ctx.fill();
  /* agal */
  ctx.strokeStyle = '#141414'; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.ellipse(0, -11, 9, 3.4, 0, 0, 7); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/* ---- scorpion ---- */
function drawScorp(e){
  if (!e.dead) drawShadow(e.x + e.w / 2, e.y + e.h, e.w * .8);
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h); ctx.scale(Math.sign(e.vx) || 1, 1);
  if (e.dead) ctx.scale(1, -1);
  const w = Math.sin(e.anim * 10) * 2;
  ctx.fillStyle = e.hurt > 0 ? '#ffb0a0' : '#a24a2e';
  ctx.beginPath(); ctx.ellipse(0, -12, 20, 11, 0, 0, 7); ctx.fill();
  ctx.fillStyle = e.hurt > 0 ? '#ffb0a0' : '#843a22';
  ctx.beginPath(); ctx.ellipse(-14, -14, 8, 7, 0, 0, 7); ctx.fill();
  /* tail */
  ctx.strokeStyle = '#843a22'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(14, -14); ctx.quadraticCurveTo(26, -30 + w, 18, -36 + w); ctx.stroke();
  ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(17, -38 + w, 3.4, 0, 7); ctx.fill();
  /* legs */
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++){
    const lw = Math.sin(e.anim * 12 + i) * 3;
    ctx.beginPath(); ctx.moveTo(-8 + i * 8, -8); ctx.lineTo(-11 + i * 8 + lw, 0); ctx.stroke();
  }
  /* pincers + eyes */
  ctx.fillStyle = '#843a22'; ctx.beginPath(); ctx.ellipse(20, -8, 6, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -17, 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(9, -17, 1.5, 0, 7); ctx.fill();
  ctx.lineCap = 'butt'; ctx.restore();
}

/* ---- bandit ---- */
function drawBandit(e){
  if (!e.dead) drawShadow(e.x + e.w / 2, e.y + e.h, e.w);
  ctx.save(); ctx.translate(e.x + e.w / 2, e.y); const d = Math.sign(e.vx) || 1; ctx.scale(d, 1);
  if (e.dead) ctx.rotate(.9);
  const run = Math.sin(e.anim * 11) * 5, hurt = e.hurt > 0;
  /* legs */
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(-8 + run * .4, 38, 7, 14); ctx.fillRect(2 - run * .4, 38, 7, 14);
  /* body */
  ctx.fillStyle = hurt ? '#ffb0a0' : '#7a5a3a'; rr(-11, 16, 22, 26, 7); ctx.fill();
  ctx.fillStyle = '#3a2c1c'; ctx.fillRect(-11, 28, 22, 4);
  /* sword arm — raised high during windup, thrust while lunging */
  ctx.strokeStyle = hurt ? '#ffb0a0' : '#7a5a3a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const sw = e.windup > 0 ? -1.6 : e.lunge > 0 ? -.9 : Math.sin(e.anim * 11) * .2;
  ctx.save(); ctx.translate(8, 20); ctx.rotate(sw);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 4); ctx.stroke();
  ctx.fillStyle = '#cfd3d8'; ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(30, -2); ctx.lineTo(11, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
  /* head */
  ctx.fillStyle = '#c78d59'; ctx.beginPath(); ctx.arc(2, 8, 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#241a12'; ctx.beginPath(); ctx.ellipse(2, 13, 6, 3, 0, 0, 7); ctx.fill(); // beard
  /* mask + eye */
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-6, 3, 16, 5);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6, 5.5, 2.4, 0, 7); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(6.8, 5.5, 1.2, 0, 7); ctx.fill();
  /* red turban */
  ctx.fillStyle = '#a83232'; ctx.beginPath(); ctx.arc(2, 3, 9.5, 3.14, 0); ctx.fill();
  ctx.fillStyle = '#8a2626'; ctx.fillRect(-8, 1, 20, 4);
  ctx.lineCap = 'butt'; ctx.restore();
  /* alert "!" when the bandit spots the player */
  if (e.alert > 0 && !e.dead){
    ctx.fillStyle = 'rgba(255,220,80,' + Math.min(1, e.alert * 2) + ')';
    ctx.font = 'bold 22px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x + e.w / 2, e.y - 10 - Math.sin(e.alert * 12) * 3);
  }
}

/* ---- boss ---- */
function drawBoss(){
  const b = G.boss; if (!b) return;
  if (!b.dead) drawShadow(b.x + b.w / 2, b.y + b.h, b.w);
  ctx.save(); ctx.translate(b.x + b.w / 2, b.y); ctx.scale(b.face, 1);
  if (b.dead){
    ctx.translate(0, Math.min(60, b.dead * 80));
    ctx.rotate(Math.min(1.4, b.dead * 1.6));
    ctx.globalAlpha = Math.max(0, 1 - b.dead * .5);
  }
  const hurt = b.hurt > 0, wob = Math.sin(b.anim * 3) * 3;
  const wind = b.windup > 0; // slam telegraph: crouch + red tint
  const crouch = wind ? Math.sin(b.windup * 30) * 2 + 6 : 0;
  /* legs */
  ctx.fillStyle = '#4a2c1a'; rr(-26, 84, 20, 32, 7); ctx.fill(); rr(8, 84, 20, 32, 7); ctx.fill();
  /* huge robe body */
  ctx.fillStyle = hurt ? '#ffb0a0' : wind ? '#8a1c2c' : '#6e1622';
  ctx.beginPath(); ctx.moveTo(-40, 30 + wob + crouch); ctx.quadraticCurveTo(0, 4 + wob + crouch, 40, 30 + wob + crouch);
  ctx.lineTo(46, 96); ctx.lineTo(-46, 96); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-34, 36 + wob + crouch); ctx.lineTo(-40, 92);
  ctx.moveTo(34, 36 + wob + crouch); ctx.lineTo(40, 92); ctx.stroke();
  /* armor chest */
  ctx.fillStyle = '#8a6a3a'; rr(-20, 34 + wob + crouch, 40, 34, 9); ctx.fill();
  ctx.fillStyle = '#b8912a'; ctx.beginPath(); ctx.arc(0, 50 + wob + crouch, 8, 0, 7); ctx.fill();
  /* sword arm */
  const sl = wind ? -2.2 : b.act === 'slam' ? -1.6 : Math.sin(b.anim * 2.4) * .25 - .4;
  ctx.save(); ctx.translate(26, 36 + wob + crouch); ctx.rotate(sl);
  ctx.strokeStyle = hurt ? '#ffb0a0' : '#6e1622'; ctx.lineWidth = 13; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 10); ctx.stroke();
  ctx.fillStyle = '#d8a06b'; ctx.beginPath(); ctx.arc(26, 12, 7, 0, 7); ctx.fill();
  ctx.fillStyle = '#e8ecf0'; ctx.beginPath(); ctx.moveTo(28, 6);
  ctx.quadraticCurveTo(70, -6, 84, -30); ctx.quadraticCurveTo(60, -8, 30, 16); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a6a3a'; ctx.fillRect(24, 4, 8, 16);
  ctx.restore();
  /* other arm */
  ctx.strokeStyle = hurt ? '#ffb0a0' : '#6e1622'; ctx.lineWidth = 13; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-26, 38 + wob + crouch); ctx.lineTo(-38, 62 + wob + crouch); ctx.stroke();
  ctx.fillStyle = '#d8a06b'; ctx.beginPath(); ctx.arc(-40, 66 + wob + crouch, 7, 0, 7); ctx.fill();
  /* head */
  ctx.fillStyle = '#c78d59'; ctx.beginPath(); ctx.ellipse(4, 14 + wob + crouch, 16, 17, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.ellipse(4, 26 + wob + crouch, 13, 8, 0, 0, 7); ctx.fill(); // big beard
  ctx.beginPath(); ctx.ellipse(9, 18 + wob + crouch, 7, 3, 0, 0, 7); ctx.fill(); // moustache
  /* angry eyes */
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(11, 9 + wob + crouch, 4, 4.4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = wind ? '#e02020' : '#5a1010'; ctx.beginPath(); ctx.arc(12, 10 + wob + crouch, 2.2, 0, 7); ctx.fill();
  ctx.strokeStyle = '#1c1410'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(5, 3 + wob + crouch); ctx.lineTo(16, 7 + wob + crouch); ctx.stroke();
  /* grand turban + jewel */
  ctx.fillStyle = '#8a1f2e'; ctx.beginPath(); ctx.ellipse(3, 2 + wob + crouch, 18, 12, 0, 3.14, 0); ctx.fill();
  ctx.fillStyle = '#a32a3a'; ctx.beginPath(); ctx.ellipse(3, 0 + wob + crouch, 14, 8, 0, 3.14, 0); ctx.fill();
  ctx.fillStyle = '#d43a8a'; ctx.beginPath(); ctx.arc(3, -4 + wob + crouch, 3.4, 0, 7); ctx.fill();
  ctx.lineCap = 'butt'; ctx.restore();
  /* blades */
  for (const bl of b.blades){
    ctx.save(); ctx.translate(bl.x, bl.y);
    if (bl.ground){
      const fg = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
      fg.addColorStop(0, 'rgba(255,200,90,.95)'); fg.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill();
    } else {
      ctx.rotate(bl.t * 14);
      ctx.fillStyle = '#dfe4ea';
      for (let i = 0; i < 3; i++){
        ctx.rotate(2.09); ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(14, -4); ctx.lineTo(14, 4); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
}

/* ---- princess ---- */
function drawPrincess(dt){
  const pr = G.princess; if (!pr) return;
  pr.anim += dt;
  const t = pr.anim, b = Math.sin(t * 2.4) * 2;
  ctx.save(); ctx.translate(pr.x + 20, pr.y - 8);
  /* dress */
  ctx.fillStyle = '#c76a9e';
  ctx.beginPath(); ctx.moveTo(-8, 10 + b); ctx.quadraticCurveTo(0, 4 + b, 8, 10 + b);
  ctx.lineTo(14, 42); ctx.lineTo(-14, 42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d885b2'; rr(-7, 8 + b, 14, 16, 6); ctx.fill();
  ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-12, 40); ctx.lineTo(12, 40); ctx.stroke();
  /* arms */
  ctx.strokeStyle = '#d8a06b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-6, 14 + b); ctx.lineTo(-12, 24 + b);
  ctx.moveTo(6, 14 + b); ctx.lineTo(12, 24 + b); ctx.stroke();
  /* head */
  ctx.fillStyle = '#e0ab77'; ctx.beginPath(); ctx.arc(0, -2 + b, 9, 0, 7); ctx.fill();
  /* long hair */
  ctx.fillStyle = '#3a2416';
  ctx.beginPath(); ctx.arc(0, -5 + b, 9.6, 3.14, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-9, -4 + b); ctx.quadraticCurveTo(-14, 14 + b, -10, 26 + b); ctx.lineTo(-6, 12 + b); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(9, -4 + b); ctx.quadraticCurveTo(14, 14 + b, 10, 26 + b); ctx.lineTo(6, 12 + b); ctx.closePath(); ctx.fill();
  /* face */
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-3, -3 + b, 2, 2.6, 0, 0, 7); ctx.ellipse(3, -3 + b, 2, 2.6, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a2416'; ctx.beginPath(); ctx.arc(-3, -2.6 + b, 1.2, 0, 7); ctx.arc(3, -2.6 + b, 1.2, 0, 7); ctx.fill();
  ctx.fillStyle = '#b05a6a'; ctx.beginPath(); ctx.arc(0, 2.4 + b, 1.6, 0, 3.14); ctx.fill();
  /* tiara */
  ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.moveTo(-6, -11 + b); ctx.lineTo(0, -16 + b); ctx.lineTo(6, -11 + b); ctx.closePath(); ctx.fill();
  /* chains until freed */
  if (!pr.freed){
    ctx.strokeStyle = '#777f88'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(-12, 24 + b); ctx.quadraticCurveTo(-24, 32, -30, 42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 24 + b); ctx.quadraticCurveTo(24, 32, 30, 42); ctx.stroke();
  } else {
    const gl = ctx.createRadialGradient(0, 6, 4, 0, 6, 44);
    gl.addColorStop(0, 'rgba(255,230,150,.35)'); gl.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 6, 44, 0, 7); ctx.fill();
  }
  ctx.restore();
}
