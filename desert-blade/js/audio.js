"use strict";
/* =========================================================
   audio.js — tiny WebAudio synth.
   All SFX are generated (no audio files): oscillator beeps
   with pitch slides, routed through a master gain so the
   whole mix can be muted/ducked at once. A light generative
   music loop (hijaz scale) plays during gameplay.
   ========================================================= */

let AC = null, masterGain = null, musicGain = null;
let soundOn = localStorage.getItem('db_sound') !== '0';

function ac(){
  if (!AC){
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = AC.createGain();
    masterGain.gain.value = soundOn ? 1 : 0;
    masterGain.connect(AC.destination);
    musicGain = AC.createGain();
    musicGain.gain.value = 0.55;
    musicGain.connect(masterGain);
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function setSound(on){
  soundOn = on;
  localStorage.setItem('db_sound', on ? '1' : '0');
  if (masterGain) masterGain.gain.value = on ? 1 : 0;
}

function beep(freq, dur, type = 'square', vol = .12, slide = 0, dest){
  try{
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + dur);
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + dur);
    o.connect(g); g.connect(dest || masterGain);
    o.start(); o.stop(a.currentTime + dur);
  }catch(e){}
}

const SFX = {
  jump : () => beep(340, .18, 'square',  .10, +220),
  djump: () => beep(430, .16, 'square',  .10, +260),
  land : () => beep(160, .08, 'triangle',.10, -60),
  coin : () => { beep(1000, .07, 'square', .09); setTimeout(() => beep(1420, .12, 'square', .09), 60); },
  fire : () => beep(210, .22, 'sawtooth',.12, -140),
  hit  : () => beep(150, .28, 'sawtooth',.15, -90),
  stomp: () => beep(240, .14, 'triangle',.14, -120),
  hurt : () => beep(120, .35, 'sawtooth',.16, -60),
  chest: () => { beep(600, .1, 'triangle', .12); setTimeout(() => beep(900, .16, 'triangle', .12), 90); },
  check: () => { beep(520, .12, 'triangle', .11); setTimeout(() => beep(780, .18, 'triangle', .11), 110); },
  boss : () => beep(90, .5, 'sawtooth', .18, -30),
  win  : () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, .25, 'triangle', .13), i * 140)); }
};

/* ---- generative ambient music: slow hijaz-scale plucks over a drone ---- */
const HIJAZ = [146.83, 155.56, 185.00, 196.00, 220.00, 233.08, 277.18, 293.66]; // D hijaz
let musicTimer = null, droneOsc = null;

function startMusic(){
  if (musicTimer) return;
  ac();
  try{
    droneOsc = AC.createOscillator();
    const dg = AC.createGain();
    droneOsc.type = 'sine'; droneOsc.frequency.value = 73.42; // D2
    dg.gain.value = .05;
    droneOsc.connect(dg); dg.connect(musicGain);
    droneOsc.start();
  }catch(e){}
  let step = 0;
  musicTimer = setInterval(() => {
    if (G.state !== 'play') return;
    step++;
    if (step % 2 && Math.random() < .4) return; // sparse, breathing phrasing
    const n = HIJAZ[Math.floor(Math.random() * HIJAZ.length)];
    beep(n, 1.4, 'triangle', .045, 0, musicGain);
    if (Math.random() < .25) setTimeout(() => beep(n * 2, .9, 'sine', .03, 0, musicGain), 180);
  }, 430);
}
function stopMusic(){
  if (musicTimer){ clearInterval(musicTimer); musicTimer = null; }
  if (droneOsc){ try{ droneOsc.stop(); }catch(e){} droneOsc = null; }
}
