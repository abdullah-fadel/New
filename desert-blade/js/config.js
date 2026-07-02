"use strict";
/* =========================================================
   سيف الصحراء — Desert Blade
   Original 2D Arabian-fantasy platformer.
   Hero, enemies, princess and boss are 100% original,
   drawn procedurally on canvas (no external sprites).

   config.js — canvas setup, logical resolution, high-DPI
   scaling. The game simulates and draws in a fixed logical
   space of VW×VH (16:9); the canvas backing store is scaled
   to the device so it stays crisp on any screen.
   ========================================================= */

const TILE = 48, VW = 960, VH = 540;
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');

/* device-pixels per logical unit — applied via setTransform each frame */
let viewScale = 1;

function resize(){
  const w = innerWidth, h = innerHeight, r = VW / VH;
  let cw = w, chh = w / r;
  if (chh > h){ chh = h; cw = h * r; }
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap for perf
  viewScale = (cw * dpr) / VW;
  cv.width  = Math.round(VW * viewScale);
  cv.height = Math.round(VH * viewScale);
  cv.style.width = cw + 'px';
  cv.style.height = chh + 'px';
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
resize();

const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('mobile');

/* movement / feel tuning — all speeds px/s, accelerations px/s² */
const PHYS = {
  acc: 2800,        // ground acceleration
  accAir: 1800,     // air acceleration
  top: 268,         // top run speed
  fric: 2400,       // ground friction
  fricAir: 520,     // air drag
  gravUp: 1850,     // gravity while rising and holding jump (floaty apex)
  gravDown: 2650,   // gravity while falling (snappy landings)
  grav: 2300,       // gravity rising w/o jump held
  maxFall: 980,
  jumpV: -700,
  doubleJumpV: -620,
  coyote: 0.12,     // grace period after leaving a ledge
  jumpBuffer: 0.14, // press jump slightly before landing and it still fires
  jumpCut: 0.45     // velocity multiplier when jump is released early
};
