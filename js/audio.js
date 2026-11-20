/* FAUNÓPOLIS — audio.js : efeitos sonoros sintetizados (Web Audio API), sem arquivos externos */
'use strict';
(function(){
const A = FP.Audio = { muted: false, volume: 0.5 };
let ctx = null, master = null, ambNode = null;

function ensure(){
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = A.volume; master.connect(ctx.destination);
    return true;
  } catch(e){ return false; }
}
function tone(freq, dur, type, vol, delay, slide){
  if (A.muted || !ensure()) return;
  const t0 = ctx.currentTime + (delay || 0);
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol || .2, t0 + .01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + .05);
}
function noise(dur, vol, filt){
  if (A.muted || !ensure()) return;
  const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt || 1200;
  const g = ctx.createGain(); g.gain.value = vol || .15;
  s.connect(f); f.connect(g); g.connect(master); s.start();
}
A.play = function(name){
  switch(name){
    case 'click':  tone(660, .06, 'triangle', .12); break;
    case 'open':   tone(520, .07, 'sine', .12); tone(780, .08, 'sine', .1, .05); break;
    case 'build':  noise(.12, .18, 900); tone(220, .12, 'square', .06); break;
    case 'path':   noise(.05, .08, 1800); break;
    case 'error':  tone(200, .15, 'sawtooth', .08, 0, 140); break;
    case 'cash':   tone(1046, .08, 'triangle', .1); tone(1568, .12, 'triangle', .1, .07); break;
    case 'buy':    tone(523, .1, 'sine', .14); tone(659, .1, 'sine', .14, .08); tone(784, .16, 'sine', .14, .16); break;
    case 'birth':  [784, 988, 1175, 1568].forEach((f, i) => tone(f, .18, 'sine', .1, i * .09)); break;
    case 'alert':  tone(880, .12, 'square', .06); tone(660, .16, 'square', .06, .13); break;
    case 'death':  tone(392, .4, 'sine', .1, 0, 196); break;
    case 'stage':  [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .25, 'triangle', .12, i * .11)); break;
    case 'demolish': noise(.25, .22, 600); break;
  }
};
A.setMuted = m => { A.muted = m; };
A.setVolume = v => { A.volume = v; if (master) master.gain.value = v; };
})();
