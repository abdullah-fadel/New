"use strict";
/* =========================================================
   hud.js — in-game UI: hearts, coins, fire ammo, animated
   score counter, level banner, boss bar (with trailing
   damage), boss intro card. Drawn in screen space.
   ========================================================= */

let heartPulse = 0, lastHp = 3;

function drawHUD(){
  ctx.save();
  /* score counts up smoothly toward the real value */
  G.dispScore += (G.score - G.dispScore) * Math.min(1, G.dt * 8);
  if (Math.abs(G.score - G.dispScore) < 1) G.dispScore = G.score;

  /* hearts pulse when hp changes */
  if (P.hp !== lastHp){ heartPulse = .4; lastHp = P.hp; }
  heartPulse = Math.max(0, heartPulse - G.dt);

  /* panel */
  ctx.fillStyle = 'rgba(14,42,71,.45)'; rr(VW - 232, 10, 222, 64, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(212,175,55,.7)'; ctx.lineWidth = 1.6; rr(VW - 232, 10, 222, 64, 14); ctx.stroke();
  /* hearts */
  for (let i = 0; i < P.maxHp; i++){
    const hx = VW - 36 - i * 26, hy = 26;
    const pu = (i === P.hp - 1 || i === P.hp) && heartPulse > 0 ? 1 + heartPulse * .8 : 1;
    const lowBeat = P.hp === 1 && i === 0 ? 1 + Math.sin(G.time * 6) * .12 : 1;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(pu * lowBeat, pu * lowBeat);
    ctx.fillStyle = i < P.hp ? '#e04a5e' : 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.arc(-4, 0, 5, 0, 7); ctx.arc(4, 0, 5, 0, 7);
    ctx.moveTo(-9, 2); ctx.lineTo(0, 12); ctx.lineTo(9, 2); ctx.fill();
    ctx.restore();
  }
  /* coins + fire */
  ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.arc(VW - 30, 56, 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#8a6a12'; ctx.beginPath(); ctx.arc(VW - 30, 56, 4, 0, 7); ctx.fill();
  ctx.fillStyle = '#F6F1E7'; ctx.font = 'bold 17px Tahoma'; ctx.textAlign = 'right';
  ctx.fillText('× ' + G.coins, VW - 44, 62);
  ctx.globalAlpha = P.fire > 0 ? 1 : .35;
  ctx.fillStyle = '#ff8c2e'; ctx.beginPath(); ctx.moveTo(VW - 140, 48);
  ctx.quadraticCurveTo(VW - 132, 56, VW - 140, 66); ctx.quadraticCurveTo(VW - 148, 56, VW - 140, 48); ctx.fill();
  ctx.fillStyle = '#F6F1E7'; ctx.fillText('× ' + P.fire, VW - 152, 62);
  ctx.globalAlpha = 1;
  /* score / lives / time / level name */
  ctx.textAlign = 'left'; ctx.font = 'bold 18px Tahoma';
  ctx.fillStyle = 'rgba(14,42,71,.45)'; rr(64, 10, 190, 36, 10); ctx.fill();
  ctx.fillStyle = '#ffd75e'; ctx.fillText(String(Math.round(G.dispScore)).padStart(7, '0'), 76, 35);
  ctx.fillStyle = '#F6F1E7'; ctx.font = '14px Tahoma';
  ctx.fillText('❤ ' + G.lives + '   ⏱ ' + Math.floor(G.time) + '   ' + LEVELS[G.lvl].name, 76, 60);

  /* level intro banner */
  if (G.banner > 0 && G.cine <= 0){
    const a = Math.min(1, G.banner) * Math.min(1, (2.4 - G.banner) * 3);
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = 'rgba(14,42,71,.6)'; rr(VW / 2 - 160, 84, 320, 54, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(212,175,55,.8)'; ctx.lineWidth = 1.6; rr(VW / 2 - 160, 84, 320, 54, 14); ctx.stroke();
    ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 26px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText(LEVELS[G.lvl].name, VW / 2, 120);
    ctx.globalAlpha = 1;
  }

  /* boss bar (with pale trailing-damage segment) */
  const b = G.boss;
  if (b && !b.dead && G.cine <= 0){
    const bw = 380, bx = (VW - bw) / 2, by = VH - 46;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(bx - 10, by - 26, bw + 20, 52, 12); ctx.fill();
    ctx.fillStyle = '#F6F1E7'; ctx.font = 'bold 15px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('☠ زعيم اللصوص', VW / 2, by - 8);
    ctx.fillStyle = '#3a1216'; rr(bx, by, bw, 14, 7); ctx.fill();
    const trail = Math.max(0, b.barHp / b.maxHp);
    if (trail > b.hp / b.maxHp){
      ctx.fillStyle = 'rgba(255,235,220,.75)'; rr(bx, by, bw * trail, 14, 7); ctx.fill();
    }
    ctx.fillStyle = '#e0483c'; rr(bx, by, bw * Math.max(0, b.hp / b.maxHp), 14, 7); ctx.fill();
    ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 1.6; rr(bx, by, bw, 14, 7); ctx.stroke();
  }

  /* boss intro cinematic */
  if (G.cine > 0){
    ctx.fillStyle = 'rgba(0,0,0,' + Math.min(.55, G.cine * .4) + ')'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#e0483c'; ctx.font = 'bold 46px Tahoma'; ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 14;
    ctx.fillText('زعيم اللصوص', VW / 2, VH / 2 - 16);
    ctx.fillStyle = '#F6F1E7'; ctx.font = '20px Tahoma';
    ctx.fillText('المعركة الأخيرة… أنقذ الأميرة!', VW / 2, VH / 2 + 26);
    ctx.shadowBlur = 0;
  }
  if (P.winWalk && G.princess && G.princess.freed){
    ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 26px Tahoma'; ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
    ctx.fillText('✨ تحررت الأميرة! ✨', VW / 2, 90); ctx.shadowBlur = 0;
  }
  ctx.restore();
}
