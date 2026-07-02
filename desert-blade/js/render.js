"use strict";
/* =========================================================
   render.js — background (parallax sky, sun, clouds, city
   silhouettes, dunes, heat shimmer), tile drawing with
   view culling, moving platforms, fireballs, soft shadows
   and the screen-space vignette.
   ========================================================= */

function rr(x, y, w, h, r){
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* soft blob shadow projected onto the ground below (cx, footY) */
function drawShadow(cx, footY, w){
  const gy = findGroundY(cx, footY);
  if (gy < 0) return;
  const d = gy - footY;
  if (d < 0 || d > TILE * 5) return;
  const k = 1 - d / (TILE * 5);
  ctx.fillStyle = 'rgba(30,12,4,' + (0.28 * k) + ')';
  ctx.beginPath();
  ctx.ellipse(cx, gy + 3, (w / 2 + 6) * (0.6 + 0.4 * k), 5 * (0.6 + 0.4 * k), 0, 0, 7);
  ctx.fill();
}

/* ---- background: warm Arabian sunset with parallax ---- */
let skyGrad = null, vignette = null;
function drawBG(){
  if (!skyGrad){
    skyGrad = ctx.createLinearGradient(0, 0, 0, VH);
    skyGrad.addColorStop(0, '#f9c979'); skyGrad.addColorStop(.45, '#f0a668');
    skyGrad.addColorStop(.75, '#d97e5a'); skyGrad.addColorStop(1, '#b45f4d');
  }
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, VW, VH);
  /* sun with pulsing halo */
  const sx = VW * .72, sy = VH * .30;
  const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 180);
  sg.addColorStop(0, 'rgba(255,244,200,.95)'); sg.addColorStop(.25, 'rgba(255,214,130,.55)');
  sg.addColorStop(1, 'rgba(255,214,130,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 180, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff3cf'; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, 7); ctx.fill();
  /* clouds — two depths */
  ctx.fillStyle = 'rgba(255,235,200,.30)';
  for (let i = 0; i < 5; i++){
    const cx2 = ((i * 260 - cam.x * .05 - G.time * 4) % (VW + 300) + VW + 300) % (VW + 300) - 150, cy = 44 + i * 34;
    ctx.beginPath(); ctx.ellipse(cx2, cy, 80, 15, 0, 0, 7); ctx.ellipse(cx2 + 50, cy + 8, 55, 12, 0, 0, 7); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,235,200,.45)';
  for (let i = 0; i < 4; i++){
    const cx2 = ((i * 340 + 120 - cam.x * .09 - G.time * 7) % (VW + 340) + VW + 340) % (VW + 340) - 170, cy = 90 + i * 42;
    ctx.beginPath(); ctx.ellipse(cx2, cy, 62, 12, 0, 0, 7); ctx.ellipse(cx2 + 40, cy + 7, 42, 10, 0, 0, 7); ctx.fill();
  }
  /* far city silhouettes (domes & minarets) */
  drawCity(-cam.x * .15, VH * .62, 'rgba(150,84,66,.55)', 1);
  drawCity(-cam.x * .28 + 220, VH * .70, 'rgba(120,62,52,.7)', 1.25);
  /* heat shimmer above the horizon: faint drifting streaks */
  ctx.fillStyle = 'rgba(255,240,210,.06)';
  for (let i = 0; i < 3; i++){
    const hy = VH * .58 + i * 22 + Math.sin(G.time * 1.6 + i * 2.1) * 4;
    ctx.beginPath();
    ctx.ellipse(VW / 2 + Math.sin(G.time * .8 + i) * 120, hy, VW * .45, 5 + Math.sin(G.time * 3 + i) * 2, 0, 0, 7);
    ctx.fill();
  }
  /* dunes */
  ctx.fillStyle = 'rgba(96,48,42,.85)';
  ctx.beginPath(); ctx.moveTo(0, VH);
  for (let x = 0; x <= VW; x += 20){
    const y = VH * .82 + Math.sin((x + cam.x * .4) * .006) * 26;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VW, VH); ctx.fill();
}
function drawCity(off, base, col, s){
  ctx.fillStyle = col; const W = 560 * s;
  for (let k = -1; k < Math.ceil(VW / W) + 1; k++){
    const ox = ((off % W) + W) % W - W + k * W;
    ctx.save(); ctx.translate(ox, base); ctx.scale(s, s);
    ctx.fillRect(30, -60, 90, 120); ctx.beginPath(); ctx.arc(75, -60, 45, 3.14, 0); ctx.fill();
    ctx.fillRect(150, -130, 16, 190); ctx.beginPath(); ctx.arc(158, -130, 12, 3.14, 0); ctx.fill();
    ctx.fillRect(200, -40, 120, 100); ctx.beginPath(); ctx.arc(260, -40, 32, 3.14, 0); ctx.fill();
    ctx.fillRect(350, -90, 14, 150); ctx.beginPath(); ctx.arc(357, -90, 10, 3.14, 0); ctx.fill();
    ctx.fillRect(400, -30, 100, 90); ctx.beginPath(); ctx.arc(450, -30, 28, 3.14, 0); ctx.fill();
    ctx.restore();
  }
}

/* ---- tiles (culled to camera view) ---- */
function drawTiles(t){
  const vw = camViewW(), vh = camViewH();
  const c0 = Math.max(0, Math.floor(cam.x / TILE) - 1), c1 = Math.min(G.W - 1, Math.ceil((cam.x + vw) / TILE) + 1);
  const r0 = Math.max(0, Math.floor(cam.y / TILE) - 1), r1 = Math.min(G.H - 1, Math.ceil((cam.y + vh) / TILE) + 2);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++){
    const ch = G.grid[r][c], x = c * TILE, y = r * TILE;
    if (ch === '#'){
      ctx.fillStyle = '#b98a52'; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#a5764a'; ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      if ((c + r) % 2) ctx.fillRect(x + 6, y + TILE / 2, TILE - 12, 3);
      else ctx.fillRect(x + TILE / 2, y + 8, 3, TILE - 16);
      if (!solid(tileAt(c, r - 1))){ ctx.fillStyle = '#d9b077'; ctx.fillRect(x, y, TILE, 7); }
    }
    else if (ch === '='){
      ctx.fillStyle = '#8a5a34'; rr(x + 2, y + 4, TILE - 4, 14, 5); ctx.fill();
      ctx.fillStyle = '#c99a5e'; rr(x + 2, y + 4, TILE - 4, 6, 4); ctx.fill();
    }
    else if (ch === '^'){
      ctx.fillStyle = '#cfd3d8';
      for (let i = 0; i < 3; i++){
        ctx.beginPath(); ctx.moveTo(x + i * 16, y + TILE); ctx.lineTo(x + i * 16 + 8, y + 14);
        ctx.lineTo(x + i * 16 + 16, y + TILE); ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x, y + TILE - 4, TILE, 4);
    }
    else if (ch === 'L'){
      ctx.strokeStyle = '#7a4c26'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x + 12, y); ctx.lineTo(x + 12, y + TILE);
      ctx.moveTo(x + 36, y); ctx.lineTo(x + 36, y + TILE);
      ctx.moveTo(x + 12, y + 12); ctx.lineTo(x + 36, y + 12);
      ctx.moveTo(x + 12, y + 34); ctx.lineTo(x + 36, y + 34); ctx.stroke();
    }
    else if (ch === 'C'){
      const b = Math.sin(t * 5 + c) * 4, sq = Math.abs(Math.cos(t * 3 + c));
      ctx.fillStyle = '#8a6a12'; ctx.beginPath(); ctx.ellipse(x + 24, y + 26 + b, 12 * sq + 2, 14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.ellipse(x + 24, y + 24 + b, 12 * sq + 2, 14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff0b8'; ctx.beginPath(); ctx.ellipse(x + 24, y + 24 + b, (12 * sq + 2) * .5, 7, 0, 0, 7); ctx.fill();
      /* sparkle glint */
      const sp = Math.sin(t * 2.2 + c * 7.3);
      if (sp > 0.92){
        const sa = (sp - 0.92) / 0.08;
        ctx.strokeStyle = 'rgba(255,255,255,' + sa + ')'; ctx.lineWidth = 2;
        const gx = x + 32, gy = y + 14 + b;
        ctx.beginPath(); ctx.moveTo(gx - 6, gy); ctx.lineTo(gx + 6, gy);
        ctx.moveTo(gx, gy - 6); ctx.lineTo(gx, gy + 6); ctx.stroke();
      }
    }
    else if (ch === 'H'){
      const b = Math.sin(t * 4 + c) * 4; ctx.fillStyle = '#e04a5e';
      ctx.beginPath(); ctx.arc(x + 18, y + 20 + b, 8, 0, 7); ctx.arc(x + 30, y + 20 + b, 8, 0, 7);
      ctx.moveTo(x + 9, y + 23 + b); ctx.lineTo(x + 24, y + 40 + b); ctx.lineTo(x + 39, y + 23 + b); ctx.fill();
    }
    else if (ch === 'P'){
      const b = Math.sin(t * 4 + c) * 4;
      ctx.fillStyle = '#ff8c2e'; ctx.beginPath(); ctx.moveTo(x + 24, y + 8 + b);
      ctx.quadraticCurveTo(x + 40, y + 24 + b, x + 24, y + 42 + b);
      ctx.quadraticCurveTo(x + 8, y + 24 + b, x + 24, y + 8 + b); ctx.fill();
      ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.moveTo(x + 24, y + 18 + b);
      ctx.quadraticCurveTo(x + 32, y + 27 + b, x + 24, y + 38 + b);
      ctx.quadraticCurveTo(x + 16, y + 27 + b, x + 24, y + 18 + b); ctx.fill();
    }
    else if (ch === 'T' || ch === 't'){
      ctx.fillStyle = '#7a4c26'; rr(x + 4, y + 16, 40, 28, 5); ctx.fill();
      ctx.fillStyle = '#956036'; rr(x + 4, y + 10, 40, 14, 6); ctx.fill();
      ctx.fillStyle = '#ffd75e'; ctx.fillRect(x + 21, y + 18, 6, 10);
      if (ch === 't'){ ctx.fillStyle = '#ffe9a8'; ctx.fillRect(x + 8, y + 14, 32, 4); }
    }
    else if (ch === 'K'){
      const act = G.cpDone.has(c + ',' + r);
      const wave = Math.sin(t * 4 + c) * (act ? 3 : 1.5);
      ctx.strokeStyle = '#6b4a26'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x + 14, y + 46); ctx.lineTo(x + 14, y - 6); ctx.stroke();
      ctx.fillStyle = act ? '#4fc06a' : '#c9463c';
      ctx.beginPath(); ctx.moveTo(x + 16, y - 4);
      ctx.quadraticCurveTo(x + 30, y + wave, x + 42, y + 4 + wave);
      ctx.lineTo(x + 16, y + 13); ctx.fill();
      if (act){
        const gl = ctx.createRadialGradient(x + 14, y + 4, 2, x + 14, y + 4, 22);
        gl.addColorStop(0, 'rgba(123,224,123,.30)'); gl.addColorStop(1, 'rgba(123,224,123,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x + 14, y + 4, 22, 0, 7); ctx.fill();
      }
    }
    else if (ch === 'D'){
      ctx.fillStyle = '#5d3a1e'; rr(x + 4, y - TILE + 6, 40, TILE * 2 - 10, 8); ctx.fill();
      ctx.fillStyle = '#8a5a2e'; rr(x + 9, y - TILE + 11, 30, TILE * 2 - 20, 14); ctx.fill();
      ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.arc(x + 15, y + 8, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + 24, y - TILE + 22, 11, 3.14, 0); ctx.stroke();
      /* welcoming glow */
      const dg = ctx.createRadialGradient(x + 24, y, 6, x + 24, y, 44);
      dg.addColorStop(0, 'rgba(255,215,94,' + (0.12 + Math.sin(t * 3) * 0.05) + ')');
      dg.addColorStop(1, 'rgba(255,215,94,0)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(x + 24, y, 44, 0, 7); ctx.fill();
    }
    else if (ch === '*'){
      const gl = .6 + Math.sin(t * 6 + c) * .25;
      const sway = Math.sin(t * 2 + c * 1.7) * 2;
      ctx.strokeStyle = '#4a3016'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + 24, y); ctx.lineTo(x + 24 + sway, y + 10); ctx.stroke();
      const lg = ctx.createRadialGradient(x + 24 + sway, y + 26, 2, x + 24 + sway, y + 26, 30);
      lg.addColorStop(0, 'rgba(255,196,90,' + (gl * .85) + ')'); lg.addColorStop(1, 'rgba(255,196,90,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x + 24 + sway, y + 26, 30, 0, 7); ctx.fill();
      ctx.fillStyle = '#3d2a12'; rr(x + 16 + sway, y + 12, 16, 24, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,130,' + gl + ')'; rr(x + 19 + sway, y + 16, 10, 16, 3); ctx.fill();
    }
    else if (ch === 'p'){
      const sway = Math.sin(t * 1.4 + c * 2.3) * 3;
      ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 8; ctx.beginPath();
      ctx.moveTo(x + 24, y + 48); ctx.quadraticCurveTo(x + 30, y + 10, x + 22 + sway, y - 26); ctx.stroke();
      ctx.strokeStyle = '#4d8a3e'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (const a of [-1.0, -0.5, 0.15, 0.7, 1.2]){
        const fs = sway * (0.6 + Math.abs(a) * .3);
        ctx.beginPath(); ctx.moveTo(x + 22 + sway, y - 26);
        ctx.quadraticCurveTo(x + 22 + sway + Math.cos(a) * 34, y - 26 + Math.sin(a) * 10 - 16,
          x + 22 + fs + Math.cos(a) * 52, y - 26 + Math.sin(a) * 18 + 6);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    else if (ch === 'W'){
      ctx.fillStyle = 'rgba(52,140,190,.85)'; ctx.fillRect(x, y + 8, TILE, TILE - 8);
      ctx.fillStyle = 'rgba(90,180,220,.5)'; ctx.fillRect(x, y + 8, TILE, 10);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      const wy = y + 8 + Math.sin(t * 4 + c * 1.3) * 3; ctx.fillRect(x, wy, TILE, 3);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      const wy2 = y + 16 + Math.sin(t * 3 + c * 2.1 + 2) * 3; ctx.fillRect(x, wy2, TILE, 2);
    }
  }
}

/* ---- movers / fallers ---- */
function drawPlatforms(){
  for (const e of G.ents){
    if (e.t === 'mover'){
      ctx.fillStyle = '#6e4626'; rr(e.x, e.y, e.w, e.h, 6); ctx.fill();
      ctx.fillStyle = '#a5764a'; rr(e.x + 3, e.y + 3, e.w - 6, 6, 4); ctx.fill();
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(e.x + 10, e.y); ctx.lineTo(e.x + 10, e.y - 200);
      ctx.moveTo(e.x + e.w - 10, e.y); ctx.lineTo(e.x + e.w - 10, e.y - 200); ctx.stroke();
    }
    if (e.t === 'faller' && e.respawn <= 0){
      const sh = e.timer > 0 ? Math.sin(e.timer * 40) * 2 : 0;
      ctx.fillStyle = '#9a6a3e'; rr(e.x + sh, e.y, e.w, e.h, 4); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(e.x + sh + 4, e.y + e.h - 4, e.w - 8, 3);
    }
  }
}

/* ---- fireballs: glowing core + hot trail ---- */
function drawFireballs(){
  for (const f of G.fireballs){
    const fg = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r + 8);
    fg.addColorStop(0, '#fff3c0'); fg.addColorStop(.4, '#ffb03c'); fg.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 8, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.t * 10);
    ctx.fillStyle = '#ffdf7e'; ctx.beginPath(); ctx.ellipse(0, 0, f.r * .62, f.r * .45, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
}

/* ---- screen-space vignette + low-HP pulse (drawn after world) ---- */
function drawVignette(){
  if (!vignette){
    vignette = ctx.createRadialGradient(VW / 2, VH / 2, VH * .48, VW / 2, VH / 2, VH * .95);
    vignette.addColorStop(0, 'rgba(20,8,2,0)'); vignette.addColorStop(1, 'rgba(20,8,2,.38)');
  }
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, VW, VH);
  if (G.state === 'play' && !P.dead && P.hp === 1){
    const a = .10 + Math.sin(G.time * 5) * .06;
    const hg = ctx.createRadialGradient(VW / 2, VH / 2, VH * .4, VW / 2, VH / 2, VH * .9);
    hg.addColorStop(0, 'rgba(180,20,20,0)'); hg.addColorStop(1, 'rgba(180,20,20,' + a + ')');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, VW, VH);
  }
  if (G.fade > 0){
    ctx.fillStyle = 'rgba(8,4,2,' + (G.fade * .85) + ')'; ctx.fillRect(0, 0, VW, VH);
  }
}
