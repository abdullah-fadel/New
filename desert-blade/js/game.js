"use strict";
/* =========================================================
   game.js — main loop, game states and menu/overlay wiring.
   States: menu → play ⇄ pause, play → lvl/over/win.
   Death, respawn and victory all run on in-game timers so
   pausing freezes the whole world.
   ========================================================= */

let last = 0;

function loop(ts){
  requestAnimationFrame(loop);
  const dt = Math.min(.033, (ts - last) / 1000 || .016); last = ts; G.dt = dt;
  if (G.state !== 'play') return;
  ctx.setTransform(viewScale, 0, 0, viewScale, 0, 0);

  G.time += dt;
  if (G.banner > 0) G.banner -= dt;
  if (G.cine > 0) G.cine -= dt;

  /* hit-stop: brief world freeze on big impacts (still renders) */
  if (G.hitstop > 0){ G.hitstop -= dt; }
  else {
    updatePlayer(dt); updateDeath(dt);
    updateEnemies(dt); updateBoss(dt); updateFireballs(dt);
    updateParts(dt);
  }
  updateCamera(dt);
  updateMotes(dt);

  /* victory trigger: reached the princess */
  if (P.winWalk && G.princess && !G.won &&
      Math.abs((P.x + P.w / 2) - (G.princess.x + 20)) < 52){
    G.won = true; G.score += Math.max(0, 3000 - Math.floor(G.time) * 10);
    G.winT = 1.4;
  }
  if (G.winT > 0){ G.winT -= dt; if (G.winT <= 0) showWin(); }

  /* ---------------- draw ---------------- */
  drawBG();
  ctx.save();
  const shX = G.shake > 0 ? (Math.random() - .5) * G.shake * 22 : 0;
  const shY = G.shake > 0 ? (Math.random() - .5) * G.shake * 22 : 0;
  /* zoom about the screen center, then translate to camera */
  ctx.translate(VW / 2, VH / 2); ctx.scale(cam.z, cam.z); ctx.translate(-VW / 2, -VH / 2);
  ctx.translate(-Math.round(cam.x * cam.z) / cam.z + shX, -Math.round(cam.y * cam.z) / cam.z + shY);
  drawTiles(G.time);
  drawPlatforms();
  drawMotes();
  for (const e of G.ents){ if (e.t === 'scorp') drawScorp(e); if (e.t === 'bandit') drawBandit(e); }
  drawBoss(); drawPrincess(dt); drawFireballs(); drawParts(); drawHero();
  ctx.restore();
  drawVignette();
  drawHUD();
}
requestAnimationFrame(loop);

/* ---------------- state / UI wiring ---------------- */
const $ = id => document.getElementById(id);
function show(id){
  ['menuOv', 'pauseOv', 'overOv', 'lvlOv', 'winOv'].forEach(o => $(o).classList.add('hidden'));
  if (id) $(id).classList.remove('hidden');
  document.body.classList.toggle('playing', G.state === 'play');
}

const BEST_KEY = 'db_best';
function updateBest(){
  const best = +(localStorage.getItem(BEST_KEY) || 0);
  if (G.score > best) localStorage.setItem(BEST_KEY, G.score);
}
function showBest(){
  const best = +(localStorage.getItem(BEST_KEY) || 0);
  $('bestScore').textContent = best > 0 ? '🏅 أفضل نتيجة: ' + best : '';
}

/* fullscreen + landscape lock on mobile — best effort, failures are fine */
function goFullscreen(){
  if (!isTouch) return;
  const el = document.documentElement;
  try{
    const p = el.requestFullscreen ? el.requestFullscreen() :
              el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null;
    const lock = () => { try{ screen.orientation.lock('landscape').catch(() => {}); }catch(e){} };
    if (p && p.then) p.then(lock).catch(() => {}); else lock();
  }catch(e){}
  setTimeout(resize, 250);
}

function startGame(){
  G.coins = 0; G.score = 0; G.dispScore = 0; G.lives = 3;
  P.fire = 5; P.maxHp = 3;
  G.cpDone = new Set(); G.won = false;
  loadLevel(0);
  G.state = 'play'; show(null); ac(); startMusic(); goFullscreen();
}
function levelComplete(){
  if (G.state !== 'play') return;
  G.state = 'lvl'; G.score += Math.max(0, 1500 - Math.floor(G.time) * 10);
  G.dispScore = G.score;
  $('lvlStats').innerHTML =
    '💰 العملات: ' + G.coins + '<br>⭐ النقاط: ' + G.score + '<br>⏱ الوقت: ' + Math.floor(G.time) + ' ثانية';
  show('lvlOv'); SFX.win();
}
function showOver(){
  G.state = 'over'; updateBest(); stopMusic();
  $('overStats').innerHTML = '⭐ النقاط: ' + G.score + '<br>💰 العملات: ' + G.coins;
  show('overOv');
}
function showWin(){
  G.state = 'win'; updateBest(); stopMusic();
  $('winStats').innerHTML =
    '⭐ النقاط النهائية: ' + G.score + '<br>💰 العملات: ' + G.coins + '<br>❤ الأرواح المتبقية: ' + G.lives;
  show('winOv');
}
function togglePause(){
  if (G.state === 'play'){ G.state = 'pause'; show('pauseOv'); }
  else if (G.state === 'pause'){ G.state = 'play'; show(null); last = performance.now(); }
}

/* auto-pause when the tab is hidden */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state === 'play') togglePause();
});

/* sound toggle buttons (menu + pause share state) */
function refreshSoundBtns(){
  const label = soundOn ? '🔊 الصوت: يعمل' : '🔇 الصوت: مغلق';
  $('soundBtn').textContent = label;
  $('soundBtn2').textContent = label;
}
function toggleSound(){ setSound(!soundOn); refreshSoundBtns(); }

$('startBtn').onclick = startGame;
$('retryBtn').onclick = startGame;
$('againBtn').onclick = startGame;
$('resumeBtn').onclick = togglePause;
$('pauseBtn').onclick = togglePause;
$('soundBtn').onclick = toggleSound;
$('soundBtn2').onclick = toggleSound;
const quit = () => { G.state = 'menu'; stopMusic(); updateBest(); showBest(); show('menuOv'); };
$('quitBtn').onclick = quit;
$('quitBtn2').onclick = quit;
$('nextBtn').onclick = () => {
  if (G.lvl + 1 < LEVELS.length){ loadLevel(G.lvl + 1); G.state = 'play'; show(null); last = performance.now(); }
  else showWin();
};

refreshSoundBtns();
showBest();
