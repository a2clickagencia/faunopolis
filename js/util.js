/* FAUNÓPOLIS — util.js : utilitários gerais */
'use strict';
(function(){
const U = FP.U = {};

U.clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
U.lerp = (a, b, t) => a + (b - a) * t;
U.rand = (a, b) => a + Math.random() * (b - a);
U.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
U.chance = p => Math.random() < p;
U.pick = arr => arr[Math.floor(Math.random() * arr.length)];
U.idx = (x, y) => y * FP.W + x;
U.ix = i => i % FP.W;
U.iy = i => Math.floor(i / FP.W);
U.inMap = (x, y) => x >= 0 && y >= 0 && x < FP.W && y < FP.H;
U.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* Hash determinístico para variações visuais por tile */
U.hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/* Gerador pseudoaleatório com semente (mulberry32) */
U.rng = seed => () => {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

/* Ruído de valor 2D suavizado (para geração do terreno) */
U.valueNoise = (x, y, seed) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = t => t * t * (3 - 2 * t);
  const a = U.hash(xi, yi, seed), b = U.hash(xi + 1, yi, seed);
  const c = U.hash(xi, yi + 1, seed), d = U.hash(xi + 1, yi + 1, seed);
  return U.lerp(U.lerp(a, b, s(xf)), U.lerp(c, d, s(xf)), s(yf));
};

U.money = v => {
  const neg = v < 0; v = Math.abs(Math.round(v));
  return (neg ? '-' : '') + 'R$ ' + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
U.money2 = v => 'R$ ' + v.toFixed(2).replace('.', ',');
U.pct = v => Math.round(v) + '%';
U.esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* Cor de estado: 0..100 -> vermelho/amarelo/verde */
U.stateColor = v => v >= 70 ? '#4caf50' : v >= 45 ? '#f2b33d' : v >= 25 ? '#f07c3a' : '#e8574b';
U.stateLabel = v => v >= 80 ? 'Excelente' : v >= 65 ? 'Bom' : v >= 45 ? 'Regular' : v >= 25 ? 'Ruim' : 'Crítico';

U.bar = (v, cor) => `<div class="bar"><div style="width:${U.clamp(v,0,100)}%;background:${cor || U.stateColor(v)}"></div></div>`;

U.shade = (hex, amt) => {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = U.clamp(r, 0, 255); g = U.clamp(g, 0, 255); b = U.clamp(b, 0, 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
};

U.uid = (() => { let n = 1; return { next: () => n++, set: v => { n = Math.max(n, v); }, get: () => n }; })();

U.dateStr = d => {
  const day0 = d - 1;
  const year = Math.floor(day0 / 360) + 1;
  const month = Math.floor((day0 % 360) / 30);
  const dom = (day0 % 30) + 1;
  return `${dom} ${FP.MONTHS[month]} · Ano ${year}`;
};
})();
