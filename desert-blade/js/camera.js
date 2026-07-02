"use strict";
/* =========================================================
   camera.js — smooth-follow camera with dead zone,
   look-ahead, dynamic zoom (boss fights), shake, and hard
   clamping so nothing outside the level is ever revealed.
   cam.x/cam.y are the world coords of the view's top-left.
   ========================================================= */

const cam = { x:0, y:0, z:1, lookX:0, tz:1 };

function camViewW(){ return VW / cam.z; }
function camViewH(){ return VH / cam.z; }

/* lowest zoom that still keeps the view inside the level */
function camMinZoom(){
  return Math.max(VH / (G.H * TILE), VW / (G.W * TILE), 0.82);
}

function camClamp(){
  const vw = camViewW(), vh = camViewH();
  cam.x = Math.max(0, Math.min(cam.x, G.W * TILE - vw));
  cam.y = Math.max(0, Math.min(cam.y, Math.max(0, G.H * TILE - vh)));
}

function camSnap(){
  cam.z = 1; cam.tz = 1; cam.lookX = 0;
  cam.x = P.x + P.w / 2 - camViewW() / 2;
  cam.y = P.y + P.h / 2 - camViewH() / 2;
  camClamp();
}

function updateCamera(dt){
  /* look-ahead: drift the view toward where the player is heading */
  const wantLook = Math.abs(P.vx) > 40 ? P.face * 84 : cam.lookX;
  cam.lookX += (wantLook - cam.lookX) * Math.min(1, dt * 3);

  /* boss fight: frame both fighters and zoom out a touch */
  let fx = P.x + P.w / 2 + cam.lookX;
  let fy = P.y + P.h / 2 - 24;
  if (G.boss && !G.boss.dead){
    if (G.cine > 0){                       // intro: pan onto the boss
      fx = G.boss.x + G.boss.w / 2;
      fy = G.boss.y + G.boss.h / 2 - 30;
      cam.tz = 1;
    } else {
      const bx = G.boss.x + G.boss.w / 2;
      fx = (P.x + P.w / 2 + bx) / 2;
      const dist = Math.abs(P.x + P.w / 2 - bx);
      cam.tz = Math.max(camMinZoom(), Math.min(1, (VW - 140) / Math.max(1, dist + 420)));
    }
  } else {
    cam.tz = 1;
  }
  cam.z += (cam.tz - cam.z) * Math.min(1, dt * 2.5);
  cam.z = Math.max(camMinZoom(), cam.z);

  /* dead zone: only move once the target leaves a center box */
  const vw = camViewW(), vh = camViewH();
  const cx = cam.x + vw / 2, cy = cam.y + vh / 2;
  const DZX = 36, DZY = 56;
  let tx = cam.x, ty = cam.y;
  if (fx > cx + DZX) tx += fx - (cx + DZX);
  if (fx < cx - DZX) tx += fx - (cx - DZX);
  if (fy > cy + DZY) ty += fy - (cy + DZY);
  if (fy < cy - DZY) ty += fy - (cy - DZY);

  const k = G.cine > 0 ? 2.2 : 6;
  cam.x += (tx - cam.x) * Math.min(1, dt * k);
  cam.y += (ty - cam.y) * Math.min(1, dt * (k * 0.8));
  camClamp();

  G.shake = Math.max(0, G.shake - dt);
}
