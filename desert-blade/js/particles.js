"use strict";
/* =========================================================
   particles.js — pooled particle system + floating text +
   expanding rings + ambient dust motes.
   Dead particles are recycled through a free list so steady
   gameplay allocates (almost) nothing per frame.
   ========================================================= */

const PART_POOL = [];
const MAX_PARTS = 400;

function newPart(){
  return PART_POOL.length ? PART_POOL.pop()
       : { x:0, y:0, vx:0, vy:0, life:0, t:0, col:'', r:0, kind:'dot', txt:'', grav:280 };
}
function freePart(p){ if (PART_POOL.length < 200) PART_POOL.push(p); }

/* burst of round dust/spark particles */
function puff(x, y, n, col, spd, life){
  if (G.parts.length > MAX_PARTS) return;
  for (let i = 0; i < n; i++){
    const a = Math.random() * 6.28, s = (Math.random() * .6 + .4) * (spd || 120);
    const p = newPart();
    p.kind = 'dot'; p.x = x; p.y = y;
    p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - 40;
    p.life = (life || .5) * (Math.random() * .5 + .75);
    p.t = 0; p.col = col || '#f6b03c'; p.r = Math.random() * 4 + 2; p.grav = 280;
    G.parts.push(p);
  }
}
/* floating score/pickup text */
function popText(x, y, txt, col){
  const p = newPart();
  p.kind = 'txt'; p.x = x; p.y = y; p.vx = 0; p.vy = -60;
  p.life = .8; p.t = 0; p.col = col || '#ffd75e'; p.txt = txt; p.grav = 0;
  G.parts.push(p);
}
/* expanding shockwave ring (explosions, stomps) */
function ring(x, y, col, maxR){
  const p = newPart();
  p.kind = 'ring'; p.x = x; p.y = y; p.vx = 0; p.vy = 0;
  p.life = .35; p.t = 0; p.col = col || '#ffd75e'; p.r = maxR || 40; p.grav = 0;
  G.parts.push(p);
}

function updateParts(dt){
  for (let i = G.parts.length - 1; i >= 0; i--){
    const p = G.parts[i];
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt;
    if (p.t > p.life){ G.parts.splice(i, 1); freePart(p); }
  }
}
function drawParts(){
  for (const p of G.parts){
    const a = Math.max(0, 1 - p.t / p.life);
    ctx.globalAlpha = a;
    if (p.kind === 'dot'){
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    } else if (p.kind === 'txt'){
      ctx.fillStyle = p.col; ctx.font = 'bold 16px Tahoma'; ctx.textAlign = 'center';
      ctx.fillText(p.txt, p.x, p.y);
    } else if (p.kind === 'ring'){
      ctx.strokeStyle = p.col; ctx.lineWidth = 3 * a;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.t / p.life), 0, 7); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/* ---- ambient dust motes drifting through the camera view ---- */
function updateMotes(dt){
  const vw = VW / cam.z, vh = VH / cam.z;
  while (G.motes.length < 22){
    G.motes.push({ x: cam.x + Math.random() * vw, y: cam.y + Math.random() * vh,
      vx: 12 + Math.random() * 20, vy: -4 + Math.random() * 8,
      r: Math.random() * 1.8 + .7, a: Math.random() * .16 + .05,
      ph: Math.random() * 6.28 });
  }
  for (const m of G.motes){
    m.x += m.vx * dt; m.y += m.vy * dt + Math.sin(G.time * 2 + m.ph) * 8 * dt;
    if (m.x > cam.x + vw + 10) m.x = cam.x - 8;
    if (m.x < cam.x - 10) m.x = cam.x + vw + 8;
    if (m.y > cam.y + vh + 10) m.y = cam.y - 8;
    if (m.y < cam.y - 10) m.y = cam.y + vh + 8;
  }
}
function drawMotes(){
  ctx.fillStyle = '#ffe9b8';
  for (const m of G.motes){
    ctx.globalAlpha = m.a * (0.7 + 0.3 * Math.sin(G.time * 3 + m.ph));
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
