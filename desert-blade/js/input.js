"use strict";
/* =========================================================
   input.js — keyboard + touch input.
   Keys are tracked in a map; touch buttons use pointer
   events so multi-touch works (move + jump + fire at once).
   All state is reset on blur so keys never stick.
   ========================================================= */

const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') togglePause();
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => {           // window lost focus: release everything
  for (const k in keys) keys[k] = false;
  for (const k in T) T[k] = false;
});

/* touch buttons */
const T = { L:false, R:false, J:false, F:false, D:false };
function bindT(id, k){
  const el = document.getElementById(id);
  const on  = e => { e.preventDefault(); T[k] = true;  el.classList.add('on');    ac(); };
  const off = e => { e.preventDefault(); T[k] = false; el.classList.remove('on'); };
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); on(e); });
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('contextmenu', e => e.preventDefault());
}
bindT('btnL','L'); bindT('btnR','R'); bindT('btnJ','J'); bindT('btnF','F'); bindT('btnD','D');

const inL  = () => keys['ArrowLeft']  || keys['KeyA'] || T.L;
const inR  = () => keys['ArrowRight'] || keys['KeyD'] || T.R;
const inJ  = () => keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || T.J;
const inF  = () => keys['KeyX'] || keys['KeyZ'] || T.F;
const inUp = () => keys['ArrowUp'] || keys['KeyW'] || T.J;
const inDn = () => keys['ArrowDown'] || keys['KeyS'] || T.D;
