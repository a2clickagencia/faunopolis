/* =========================================================
   FAUNÓPOLIS — sprites.js
   Todos os gráficos do jogo são vetoriais/procedurais,
   desenhados em Canvas 2D e guardados em cache (2x) para
   performance. Nenhum arquivo de imagem externo é necessário.
   ========================================================= */
'use strict';
(function(){
const S = FP.Sprites = {};
const U = FP.U;
const RES = 2;                 // resolução do cache (2 px por px de mundo)
const T = FP.TILE;
const cache = new Map();

function mk(w, h){
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * RES); c.height = Math.ceil(h * RES);
  const g = c.getContext('2d'); g.scale(RES, RES);
  return [c, g];
}
function ell(g, x, y, rx, ry, rot, fill, stroke, lw){
  g.beginPath(); g.ellipse(x, y, Math.max(.1,rx), Math.max(.1,ry), rot || 0, 0, Math.PI * 2);
  if (fill){ g.fillStyle = fill; g.fill(); }
  if (stroke){ g.strokeStyle = stroke; g.lineWidth = lw || 1; g.stroke(); }
}
function circ(g, x, y, r, fill, stroke, lw){ ell(g, x, y, r, r, 0, fill, stroke, lw); }
function poly(g, pts, fill, stroke, lw){
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i+1]);
  g.closePath();
  if (fill){ g.fillStyle = fill; g.fill(); }
  if (stroke){ g.strokeStyle = stroke; g.lineWidth = lw || 1; g.stroke(); }
}
S.ell = ell; S.circ = circ; S.poly = poly;

/* ================= TERRENOS ================= */
S.terrain = function(tid, v){
  const key = 't' + tid + '_' + v;
  if (cache.has(key)) return cache.get(key);
  const t = FP.TERRAINS[tid];
  const [c, g] = mk(T, T);
  const r = U.rng(tid * 97 + v * 13 + 7);
  g.fillStyle = t.cor; g.fillRect(0, 0, T, T);
  const k = t.key;
  if (k === 'grama' || k === 'savana' || k === 'floresta'){
    for (let i = 0; i < 26; i++){
      const x = r() * T, y = r() * T;
      g.strokeStyle = r() < .5 ? t.cor2 : U.shade(t.cor, 18);
      g.lineWidth = .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 2, y - 2 - r() * 3); g.stroke();
    }
    if (k === 'floresta') for (let i = 0; i < 4; i++){ circ(g, r()*T, r()*T, 1 + r()*1.5, '#5b4a2c'); }
  } else if (k === 'agua'){
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
    for (let i = 0; i < 3; i++){
      const y = 6 + i * 10 + r() * 4, x = r() * 16;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y - 2, x + 8, y); g.quadraticCurveTo(x + 12, y + 2, x + 16, y); g.stroke();
    }
  } else if (k === 'neve' || k === 'gelo'){
    for (let i = 0; i < 6; i++) ell(g, r()*T, r()*T, 3 + r()*5, 2 + r()*3, 0, t.cor2);
    if (k === 'gelo'){ g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = .7; for (let i = 0; i < 3; i++){ g.beginPath(); g.moveTo(r()*T, r()*T); g.lineTo(r()*T, r()*T); g.stroke(); } }
  } else if (k === 'pedra'){
    for (let i = 0; i < 5; i++) ell(g, r()*T, r()*T, 2 + r()*4, 1.5 + r()*3, r()*3, t.cor2);
    g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = .6;
    for (let i = 0; i < 2; i++){ g.beginPath(); const x = r()*T, y = r()*T; g.moveTo(x, y); g.lineTo(x + 6, y + 3); g.lineTo(x + 9, y + 1); g.stroke(); }
  } else if (k === 'mistico'){
    for (let i = 0; i < 10; i++) circ(g, r()*T, r()*T, .5 + r(), r() < .5 ? '#c9b6ff' : '#ffe9a8');
    for (let i = 0; i < 4; i++) ell(g, r()*T, r()*T, 3 + r()*3, 2 + r()*2, 0, t.cor2);
  } else {
    for (let i = 0; i < 18; i++) circ(g, r()*T, r()*T, .4 + r()*1.1, r() < .6 ? t.cor2 : U.shade(t.cor, 14));
  }
  cache.set(key, c);
  return c;
};

/* ================= ANIMAIS =================
   Desenho com origem no centro do corpo, olhando para +x.
   frame 0/1 alterna a posição das patas (ciclo de caminhada). */
function drawQuadLegs(g, L, Wd, cor, f, len){
  const o = f ? 1.6 : -1.6, lx = L * .3, ly = Wd * .45, lr = Math.max(1.4, Wd * .16);
  const d = len || 0;
  ell(g,  lx + o, -ly - d, lr * 1.2, lr, 0, cor);
  ell(g,  lx - o,  ly + d, lr * 1.2, lr, 0, cor);
  ell(g, -lx - o, -ly - d, lr * 1.2, lr, 0, cor);
  ell(g, -lx + o,  ly + d, lr * 1.2, lr, 0, cor);
}
function tail(g, v, L, f){
  if (!v.cauda) return;
  const x0 = -L / 2, sw = f ? 2 : -2;
  if (v.caudaPeluda){
    ell(g, x0 - v.cauda * .5, sw * .6, v.cauda * .55, Math.max(2, v.Wd * .22), sw * .05, v.cor);
    if (v.caudaAneis){ g.save(); g.strokeStyle = v.caudaAneis; g.lineWidth = 1.4;
      for (let i = 1; i < 4; i++){ const x = x0 - v.cauda * i / 4.2; g.beginPath(); g.moveTo(x, sw*.6 - 2.5); g.lineTo(x, sw*.6 + 2.5); g.stroke(); } g.restore(); }
    if (v.crina) ell(g, x0 - v.cauda * .7, sw * .6, v.cauda * .35, Math.max(1.5, v.Wd * .16), 0, v.crina);
    return;
  }
  g.strokeStyle = U.shade(v.cor, -30); g.lineWidth = 1.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0 + 1, 0); g.quadraticCurveTo(x0 - v.cauda * .5, sw, x0 - v.cauda, sw * .4); g.stroke();
  circ(g, x0 - v.cauda, sw * .4, 1.5, v.juba || v.crina || U.shade(v.cor, -50));
}
function bodyPattern(g, v, L, Wd, seed){
  const r = U.rng(seed);
  g.save(); g.beginPath(); g.ellipse(0, 0, L/2, Wd/2, 0, 0, Math.PI*2); g.clip();
  const c2 = v.cor2;
  switch (v.padrao){
    case 'listras':
      g.strokeStyle = c2; g.lineWidth = 1.5;
      for (let x = -L/2 + 2; x < L/2 - 1; x += 3.6){
        g.beginPath(); g.moveTo(x, -Wd/2); g.quadraticCurveTo(x + 2, 0, x, Wd/2); g.stroke();
      }
      break;
    case 'manchas':
      for (let x = -L/2; x < L/2; x += 4.5) for (let y = -Wd/2; y < Wd/2; y += 4.5)
        poly(g, [x + r(), y + r(), x + 3.6, y + r()*.6, x + 3.4 + r()*.5, y + 3.6, x + r()*.6, y + 3.3], c2);
      break;
    case 'rosetas':
      for (let i = 0; i < 26; i++){ const x = (r() - .5) * L, y = (r() - .5) * Wd; circ(g, x, y, 1.3, null, c2, .9); circ(g, x, y, .4, c2); }
      break;
    case 'faixas':
      g.strokeStyle = c2; g.lineWidth = .7;
      for (let x = -L/2 + 2; x < L/2 - 2; x += 1.8){ g.beginPath(); g.moveTo(x, -1.2); g.lineTo(x, 1.2); g.stroke(); }
      break;
    case 'faixa':
      poly(g, [L*.05, -Wd/2, L*.3, -Wd/2, -L*.05, Wd/2, -L*.3, Wd/2], c2);
      g.strokeStyle = '#f0ece2'; g.lineWidth = 1; g.beginPath(); g.moveTo(L*.32, -Wd/2); g.lineTo(-L*.03, Wd/2); g.stroke();
      break;
    case 'peito':
      ell(g, L * .3, 0, L * .18, Wd * .3, 0, c2);
      break;
    case 'panda': // faixa escura dos ombros e patas
      g.fillStyle = c2; g.fillRect(L * .05, -Wd / 2, L * .22, Wd);
      ell(g, -L * .35, -Wd * .45, L * .12, Wd * .2, 0, c2); ell(g, -L * .35, Wd * .45, L * .12, Wd * .2, 0, c2);
      break;
  }
  // linha da coluna para dar volume
  g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = Wd * .18;
  g.beginPath(); g.moveTo(-L/2 + 2, 0); g.lineTo(L/2 - 2, 0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.10)'; g.beginPath(); g.ellipse(0, -Wd*.18, L*.38, Wd*.18, 0, 0, Math.PI*2); g.fill();
  g.restore();
}
function head(g, v, hx, cab, sex){
  const focinho = v.focinho || cab * .5;
  if (v.juba && sex === 'M') circ(g, hx - cab * .3, 0, cab * 1.55, v.juba);
  if (v.orelhas){
    ell(g, hx - cab * .45, -cab * .85, v.orelhas * .6, v.orelhas, -.4, v.orelhasCor || U.shade(v.cor, -20));
    ell(g, hx - cab * .45,  cab * .85, v.orelhas * .6, v.orelhas,  .4, v.orelhasCor || U.shade(v.cor, -20));
  } else {
    circ(g, hx - cab * .5, -cab * .75, cab * .32, U.shade(v.cor, -25));
    circ(g, hx - cab * .5,  cab * .75, cab * .32, U.shade(v.cor, -25));
  }
  ell(g, hx, 0, cab * 1.05, cab * .85, 0, v.cor);
  ell(g, hx + cab * .6 + focinho * .3, 0, cab * .3 + focinho * .5, cab * .5, 0, U.shade(v.cor, -12));
  if (v.mascara){ ell(g, hx + cab * .35, -cab * .42, cab * .32, cab * .24, .3, v.mascara); ell(g, hx + cab * .35, cab * .42, cab * .32, cab * .24, -.3, v.mascara); }
  if (v.padrao === 'listras' || v.padrao === 'rosetas'){ g.strokeStyle = v.cor2; g.lineWidth = .8; g.beginPath(); g.moveTo(hx - cab*.4, -cab*.5); g.lineTo(hx + cab*.2, 0); g.lineTo(hx - cab*.4, cab*.5); g.stroke(); }
  circ(g, hx + cab * .4, -cab * .42, Math.max(.6, cab * .14), v.olhos || '#1a1410');
  circ(g, hx + cab * .4,  cab * .42, Math.max(.6, cab * .14), v.olhos || '#1a1410');
  circ(g, hx + cab * .6 + focinho * .75, 0, Math.max(.6, cab * .16), '#2a1f1a');
  if (v.chifres){ circ(g, hx - cab * .2, -cab * .35, 1, '#5a3a1a'); circ(g, hx - cab * .2, cab * .35, 1, '#5a3a1a'); }
  if (v.chifre){ poly(g, [hx + cab * .9 + focinho * .3, -2, hx + cab * 2.2 + focinho * .3, 0, hx + cab * .9 + focinho * .3, 2], v.chifre); }
  if (v.galhada){ // galhada ramificada (renas e cervos) — só nos machos, exceto renas
    if (sex !== 'F' || v.galhadaAmbos){
      g.strokeStyle = v.galhada; g.lineWidth = 1.1; g.lineCap = 'round';
      [-1, 1].forEach(s => { g.beginPath(); g.moveTo(hx - cab * .2, s * cab * .4); g.lineTo(hx - cab * 1.4, s * cab * 1.9); g.moveTo(hx - cab * .7, s * cab * 1.0); g.lineTo(hx - cab * .2, s * cab * 1.8); g.moveTo(hx - cab * 1.1, s * cab * 1.5); g.lineTo(hx - cab * 1.9, s * cab * 1.4); g.stroke(); });
    }
  }
  if (v.chifresLongos){ // chifres longos voltados para trás (órix, impala, gnu)
    g.strokeStyle = v.chifresLongos; g.lineWidth = 1.2; g.lineCap = 'round';
    [-1, 1].forEach(s => { g.beginPath(); g.moveTo(hx - cab * .1, s * cab * .35); g.quadraticCurveTo(hx - cab * 1.2, s * cab * (v.chifresAbertos ? 1.6 : .7), hx - cab * 2.6, s * cab * (v.chifresAbertos ? 1.2 : .55)); g.stroke(); });
  }
  if (v.chifreEspiral){
    const x0 = hx + cab * .6;
    poly(g, [x0, -1.6, x0 + cab * 2.4, 0, x0, 1.6], v.chifreEspiral);
    g.strokeStyle = 'rgba(160,110,20,.6)'; g.lineWidth = .5;
    for (let i = 1; i < 5; i++){ const x = x0 + i * cab * .45; g.beginPath(); g.moveTo(x, -1.4 + i*.25); g.lineTo(x + 1, 1.4 - i*.25); g.stroke(); }
  }
}
function drawQuad(g, v, sex, f, seed){
  const L = v.L, Wd = v.Wd, cab = v.cab;
  tail(g, v, L, f);
  drawQuadLegs(g, L, Wd, U.shade(v.cor, -35), f);
  ell(g, 0, 0, L/2, Wd/2, 0, v.cor);
  bodyPattern(g, v, L, Wd, seed);
  if (v.corcova){ ell(g, -L*.12, 0, L*.13, Wd*.33, 0, U.shade(v.cor, -10)); if (v.corcova > 1) ell(g, L*.14, 0, L*.12, Wd*.3, 0, U.shade(v.cor, -10)); }
  let hx = L/2 + cab * .55;
  if (v.pescoco){
    const nw = cab * .85;
    g.fillStyle = v.cor; g.beginPath(); g.moveTo(L/2 - 4, -nw); g.lineTo(L/2 + v.pescoco, -nw * .7); g.lineTo(L/2 + v.pescoco, nw * .7); g.lineTo(L/2 - 4, nw); g.closePath(); g.fill();
    if (v.padrao === 'manchas'){ for (let i = 0; i < v.pescoco - 2; i += 4.5) poly(g, [L/2 + i, -nw*.6, L/2 + i + 3, -nw*.5, L/2 + i + 3, nw*.5, L/2 + i, nw*.6], v.cor2); }
    hx = L/2 + v.pescoco + cab * .4;
  }
  if (v.asas){ // quadrúpedes alados (pégaso)
    const ws = f ? 1.12 : 1;
    ell(g, -L*.05, -Wd*.62 * ws, L*.4, Wd*.34, -.28, v.asas, U.shade(v.asas, -25), .8);
    ell(g, -L*.05,  Wd*.62 * ws, L*.4, Wd*.34,  .28, v.asas, U.shade(v.asas, -25), .8);
  }
  if (v.crina){ g.strokeStyle = v.crina; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(L*.1, 0); g.lineTo(hx - cab * .6, 0); g.stroke(); }
  head(g, v, hx, cab, sex);
}
function drawElephant(g, v, sex, f){
  const L = v.L, Wd = v.Wd, cab = v.cab;
  tail(g, v, L, f);
  drawQuadLegs(g, L, Wd, U.shade(v.cor, -25), f);
  ell(g, 0, 0, L/2, Wd/2, 0, v.cor);
  g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1;
  for (let i = -2; i <= 2; i++){ g.beginPath(); g.moveTo(-L*.3, i*Wd*.12); g.quadraticCurveTo(0, i*Wd*.16, L*.3, i*Wd*.12); g.stroke(); }
  const hx = L/2 + cab * .2;
  ell(g, hx - cab * .4, -cab * 1.0, cab * .7, cab * 1.15, .3, U.shade(v.cor, -12), U.shade(v.cor, -35), .8);
  ell(g, hx - cab * .4,  cab * 1.0, cab * .7, cab * 1.15, -.3, U.shade(v.cor, -12), U.shade(v.cor, -35), .8);
  circ(g, hx, 0, cab, v.cor);
  g.strokeStyle = v.cor; g.lineWidth = 3.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(hx + cab * .7, 0); g.quadraticCurveTo(hx + cab * 1.8, f ? 2.5 : -2.5, hx + cab * 2.2, f ? 4 : -4); g.stroke();
  g.strokeStyle = '#f4efe0'; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(hx + cab * .5, -2.5); g.lineTo(hx + cab * 1.3, -3.6); g.stroke();
  g.beginPath(); g.moveTo(hx + cab * .5, 2.5); g.lineTo(hx + cab * 1.3, 3.6); g.stroke();
  circ(g, hx + cab * .35, -cab * .45, .9, '#1a1410'); circ(g, hx + cab * .35, cab * .45, .9, '#1a1410');
}
function drawReptile(g, v, sex, f){
  const L = v.L, Wd = v.Wd, bl = L * .42, sw = f ? 2.5 : -2.5;
  g.fillStyle = v.cor; g.beginPath();
  g.moveTo(-bl/2, -Wd*.35); g.quadraticCurveTo(-bl/2 - v.cauda * .5, sw * .5, -bl/2 - v.cauda, sw);
  g.quadraticCurveTo(-bl/2 - v.cauda * .5, sw * .5 + 1, -bl/2, Wd*.35); g.closePath(); g.fill();
  const lr = 2;
  [[bl*.3,-1],[bl*.3,1],[-bl*.3,-1],[-bl*.3,1]].forEach(([x,s], i) => {
    const o = ((i === 0 || i === 3) ^ f) ? 2 : -2;
    ell(g, x + o, s * (Wd*.55 + 1.5), lr * 1.4, lr * .8, s * (.6 + o*.1), U.shade(v.cor, -20));
  });
  ell(g, 0, 0, bl/2 + 2, Wd/2, 0, v.cor);
  g.fillStyle = v.cor2;
  for (let x = -bl/2 - v.cauda * .6; x < bl/2; x += 3) { g.fillRect(x, -1.6, 1.6, 1.2); g.fillRect(x, .4, 1.6, 1.2); }
  const hx = bl/2 + 2;
  poly(g, [hx - 1, -v.cab, hx + v.focinho, -v.cab * .45, hx + v.focinho + 1.5, 0, hx + v.focinho, v.cab * .45, hx - 1, v.cab], v.cor);
  circ(g, hx + 1.5, -v.cab * .65, 1.1, '#e6d76a'); circ(g, hx + 1.5, v.cab * .65, 1.1, '#e6d76a');
  circ(g, hx + 1.5, -v.cab * .65, .45, '#111'); circ(g, hx + 1.5, v.cab * .65, .45, '#111');
}
function drawBird(g, v, sex, f){
  const L = v.L, Wd = v.Wd;
  if (v.fogo){
    const gr = g.createRadialGradient(-L*.3, 0, 1, -L*.3, 0, L * .9);
    gr.addColorStop(0, 'rgba(255,210,63,.75)'); gr.addColorStop(.5, 'rgba(255,106,26,.35)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(-L*.3, 0, L * .9, 0, Math.PI * 2); g.fill();
  }
  // cauda em leque
  if (v.leque){ // cauda em leque grande (pavão)
    g.save(); g.translate(-L*.3, 0);
    for (let i = 0; i < 13; i++){ const a = Math.PI + (i - 6) * .19; g.save(); g.rotate(a); ell(g, L*.55, 0, L*.55, 2.4, 0, v.cauda); circ(g, L*.98, 0, 2.1, v.leque); circ(g, L*.98, 0, 1, '#1a2a6a'); g.restore(); }
    g.restore();
  } else poly(g, [-L*.3, -Wd*.2, -L*.3 - L*.45, -Wd*.45, -L*.3 - L*.5, 0, -L*.3 - L*.45, Wd*.45, -L*.3, Wd*.2], v.cauda);
  if (f && v.voaAberta){ /* reservado */ }
  ell(g, 0, 0, L * .42, Wd / 2, 0, v.cor);
  const ws = f ? 1.15 : 1;
  ell(g, -L*.05, -Wd*.32 * ws, L*.36, Wd*.26, -.12, v.asas);
  ell(g, -L*.05,  Wd*.32 * ws, L*.36, Wd*.26,  .12, v.asas);
  let hx = L * .38;
  if (v.pescoco){ g.fillStyle = v.colar || v.cor; g.fillRect(L*.3, -v.cab*.55, v.pescoco + 1, v.cab*1.1); hx = L*.38 + v.pescoco; }
  circ(g, hx, 0, v.cab, v.cor2 && v.tipo === 'ave' && v.bicoL >= 7 ? v.cor : v.cor);
  if (v.cor2 && v.bicoL >= 7 && v.colar === undefined) ell(g, hx + v.cab*.3, 0, v.cab*.55, v.cab*.75, 0, v.cor2);
  if (v.colar) circ(g, hx, 0, v.cab, '#1a1a1a');
  const bl = v.bicoL || 3;
  poly(g, [hx + v.cab * .7, -v.cab * .5, hx + v.cab + bl, 0, hx + v.cab * .7, v.cab * .5], v.bico);
  circ(g, hx + v.cab * .2, -v.cab * .5, .6, '#000'); circ(g, hx + v.cab * .2, v.cab * .5, .6, '#000');
  if (v.cor2 && v.tipo === 'ave' && !v.colar && v.bicoL < 7) ell(g, L*.18, 0, L*.12, Wd*.18, 0, v.cor2);
}
function drawPenguin(g, v, sex, f){
  const L = v.L, Wd = v.Wd, o = f ? 1 : -1;
  ell(g, -L*.42, -2 + o*.5, 1.8, 1.2, 0, '#f39c12'); ell(g, -L*.42, 2 - o*.5, 1.8, 1.2, 0, '#f39c12');
  ell(g, 0, 0, L*.45, Wd/2, 0, v.cor);
  ell(g, L*.08, 0, L*.3, Wd*.32, 0, U.shade(v.cor, 12));
  ell(g, -L*.02, -Wd*.48, L*.22, 1.4, -.3 * o, v.cor); ell(g, -L*.02, Wd*.48, L*.22, 1.4, .3 * o, v.cor);
  const hx = L*.36;
  circ(g, hx, 0, v.cab, v.cor);
  ell(g, hx + .5, -v.cab*.55, 1.6, 1, 0, v.cor2); ell(g, hx + .5, v.cab*.55, 1.6, 1, 0, v.cor2);
  poly(g, [hx + v.cab*.7, -1, hx + v.cab + 3, 0, hx + v.cab*.7, 1], v.bico);
}
function drawShell(g, v, sex, f){
  const L = v.L, Wd = v.Wd, o = f ? 1.2 : -1.2;
  [[L*.32,-1],[L*.32,1],[-L*.3,-1],[-L*.3,1]].forEach(([x,s], i) => ell(g, x + ((i===0||i===3)?o:-o), s * Wd*.48, 2.2, 1.6, 0, '#7d6b3c'));
  ell(g, L*.55, 0, v.cab, v.cab*.75, 0, '#8c7a45');
  circ(g, L*.6, -1, .5, '#111'); circ(g, L*.6, 1, .5, '#111');
  ell(g, 0, 0, L/2, Wd/2, 0, v.cor, U.shade(v.cor, -30), 1);
  g.strokeStyle = v.cor2; g.lineWidth = .9;
  const hx = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 6; i++){ const a = i * Math.PI/3; g.lineTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r); } g.closePath(); g.stroke(); };
  hx(0, 0, 2.6); hx(4.5, -2.5, 2.2); hx(4.5, 2.5, 2.2); hx(-4.5, -2.5, 2.2); hx(-4.5, 2.5, 2.2);
}
function drawPrimate(g, v, sex, f){
  const L = v.L, Wd = v.Wd, b = v.bracos, o = f ? 2 : -2;
  g.strokeStyle = U.shade(v.cor, -15); g.lineWidth = Math.max(2, Wd * .22); g.lineCap = 'round';
  g.beginPath(); g.moveTo(L*.1, -Wd*.35); g.lineTo(L*.1 + b*.6 + o, -Wd*.35 - b*.55); g.stroke();
  g.beginPath(); g.moveTo(L*.1, Wd*.35); g.lineTo(L*.1 + b*.6 - o, Wd*.35 + b*.55); g.stroke();
  g.beginPath(); g.moveTo(-L*.3, -Wd*.3); g.lineTo(-L*.45 - o, -Wd*.55); g.stroke();
  g.beginPath(); g.moveTo(-L*.3, Wd*.3); g.lineTo(-L*.45 + o, Wd*.55); g.stroke();
  ell(g, 0, 0, L/2, Wd/2, 0, v.cor);
  g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.ellipse(0, -Wd*.15, L*.3, Wd*.2, 0, 0, 7); g.fill();
  const hx = L*.5;
  circ(g, hx, 0, v.cab, v.cor);
  ell(g, hx + v.cab*.35, 0, v.cab*.6, v.cab*.75, 0, v.cor2);
  circ(g, hx + v.cab*.35, -v.cab*.3, .7, '#111'); circ(g, hx + v.cab*.35, v.cab*.3, .7, '#111');
}
function drawGriffin(g, v, sex, f){
  const L = v.L, Wd = v.Wd;
  tail(g, {...v, crina:'#5a3a1a'}, L, f);
  drawQuadLegs(g, L, Wd, U.shade(v.cor, -30), f);
  ell(g, 0, 0, L/2, Wd/2, 0, v.cor);
  const sp = f ? 1.1 : 1;
  ell(g, -L*.02, -Wd*.55 * sp, L*.42, Wd*.32, -.25, v.asas, U.shade(v.asas, -25), .8);
  ell(g, -L*.02,  Wd*.55 * sp, L*.42, Wd*.32,  .25, v.asas, U.shade(v.asas, -25), .8);
  g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = .6;
  for (let i = 0; i < 4; i++){ g.beginPath(); g.moveTo(-L*.3 + i*5, -Wd*.4); g.lineTo(-L*.3 + i*5 + 3, -Wd*.75); g.stroke(); g.beginPath(); g.moveTo(-L*.3 + i*5, Wd*.4); g.lineTo(-L*.3 + i*5 + 3, Wd*.75); g.stroke(); }
  const hx = L/2 + v.cab * .5;
  circ(g, hx, 0, v.cab * 1.1, v.cor2);
  poly(g, [hx + v.cab*.7, -2, hx + v.cab + 4.5, 0, hx + v.cab*.7, 2], v.bico);
  circ(g, hx + v.cab*.25, -v.cab*.5, .8, '#111'); circ(g, hx + v.cab*.25, v.cab*.5, .8, '#111');
}
function drawDragon(g, v, sex, f){
  const L = v.L, Wd = v.Wd, bl = L * .45, sw = f ? 3 : -3;
  const sp = f ? 1.08 : 1;
  const wing = s => { poly(g, [-bl*.1, 0, bl*.15, s*Wd*1.9*sp, -bl*.15, s*Wd*1.6*sp, -bl*.4, s*Wd*1.9*sp, -bl*.55, s*Wd*1.2*sp, -bl*.45, s*Wd*.3], v.asas, U.shade(v.asas, -30), .8);
    g.strokeStyle = U.shade(v.asas, -35); g.lineWidth = .8; [bl*.15, -bl*.15, -bl*.4].forEach((x, i) => { g.beginPath(); g.moveTo(-bl*.1, s*Wd*.3); g.lineTo(x, s*Wd*(i===1?1.6:1.9)*sp); g.stroke(); }); };
  wing(-1); wing(1);
  g.fillStyle = v.cor; g.beginPath();
  g.moveTo(-bl/2, -Wd*.38); g.quadraticCurveTo(-bl/2 - v.cauda*.5, sw*.5, -bl/2 - v.cauda, sw);
  g.quadraticCurveTo(-bl/2 - v.cauda*.5, sw*.5 + 1.5, -bl/2, Wd*.38); g.closePath(); g.fill();
  poly(g, [-bl/2 - v.cauda, sw - 3, -bl/2 - v.cauda - 5, sw, -bl/2 - v.cauda, sw + 3], v.cor2);
  [[bl*.3,-1],[bl*.3,1],[-bl*.3,-1],[-bl*.3,1]].forEach(([x,s], i) => { const o = ((i===0||i===3)^f) ? 2 : -2; ell(g, x + o, s*(Wd*.55 + 1), 3, 2, s*.5, U.shade(v.cor, -25)); });
  ell(g, 0, 0, bl/2 + 2, Wd/2, 0, v.cor);
  ell(g, 0, 0, bl/2 - 2, Wd*.2, 0, v.cor2);
  for (let x = -bl/2 - v.cauda*.7; x < bl/2; x += 4) poly(g, [x, 0, x + 2, -1.6, x + 4, 0, x + 2, 1.6], U.shade(v.cor2, -30));
  const hx = bl/2 + 4;
  g.fillStyle = v.cor; g.fillRect(bl/2 - 2, -2.5, 6, 5);
  poly(g, [hx - 2, -v.cab, hx + v.focinho, -v.cab*.6, hx + v.focinho + 3, 0, hx + v.focinho, v.cab*.6, hx - 2, v.cab], v.cor);
  poly(g, [hx - 1, -v.cab*.7, hx - 7, -v.cab*1.4, hx - 2, -v.cab*.3], '#e8e2d0');
  poly(g, [hx - 1,  v.cab*.7, hx - 7,  v.cab*1.4, hx - 2,  v.cab*.3], '#e8e2d0');
  circ(g, hx + 2, -v.cab*.5, 1.2, '#ffd23f'); circ(g, hx + 2, v.cab*.5, 1.2, '#ffd23f');
  circ(g, hx + 2, -v.cab*.5, .5, '#111'); circ(g, hx + 2, v.cab*.5, .5, '#111');
}

function drawSeal(g, v, sex, f){ // focas, morsas e leões-marinhos
  const L = v.L, Wd = v.Wd, o = f ? 1.5 : -1.5;
  poly(g, [-L*.45, 0, -L*.62, -Wd*.42 + o*.3, -L*.56, 0, -L*.62, Wd*.42 - o*.3], U.shade(v.cor, -25));
  ell(g, L*.12, -Wd*.5, L*.14, Wd*.18, -.6 - o*.06, U.shade(v.cor, -20)); ell(g, L*.12, Wd*.5, L*.14, Wd*.18, .6 + o*.06, U.shade(v.cor, -20));
  ell(g, 0, 0, L*.48, Wd/2, 0, v.cor);
  if (v.cor2){ const r = U.rng(L * 7); for (let i = 0; i < 10; i++) circ(g, (r() - .5) * L * .7, (r() - .5) * Wd * .7, 1, v.cor2); }
  g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.ellipse(0, -Wd*.15, L*.32, Wd*.18, 0, 0, 7); g.fill();
  const hx = L*.46;
  circ(g, hx, 0, v.cab, v.cor);
  circ(g, hx + v.cab*.3, -v.cab*.45, .8, '#111'); circ(g, hx + v.cab*.3, v.cab*.45, .8, '#111');
  ell(g, hx + v.cab*.8, 0, v.cab*.45, v.cab*.55, 0, U.shade(v.cor, 15));
  if (v.presas){ g.strokeStyle = v.presas; g.lineWidth = 1.3; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx + v.cab, -1.2); g.lineTo(hx + v.cab + 5, -1.6); g.moveTo(hx + v.cab, 1.2); g.lineTo(hx + v.cab + 5, 1.6); g.stroke(); }
}
function drawSnake(g, v, sex, f){ // serpentes (corpo ondulado)
  const L = v.L, Wd = v.Wd, ph = f ? 0 : Math.PI;
  const pts = []; for (let i = 0; i <= 24; i++){ const t = i / 24; pts.push([L*.5 - t * L, Math.sin(t * Math.PI * 2.2 + ph) * Wd * .9 * (1 - t * .3)]); }
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++){
    g.strokeStyle = pass ? v.cor : U.shade(v.cor, -30); g.lineWidth = pass ? Wd * .62 : Wd * .78;
    g.beginPath(); pts.forEach(([x, y], i) => { const w = 1 - (i / 24) * .55; if (!i) g.moveTo(x, y); else g.lineTo(x, y); }); g.stroke();
  }
  if (v.cor2){ pts.forEach(([x, y], i) => { if (i % 3 === 1 && i < 22) circ(g, x, y, Wd * .18, v.cor2); }); }
  const [hx, hy] = pts[0];
  ell(g, hx + 1.5, hy, v.cab * 1.2, v.cab * .8, 0, v.cor);
  circ(g, hx + 2, hy - v.cab * .45, .6, '#e6d76a'); circ(g, hx + 2, hy + v.cab * .45, .6, '#e6d76a');
  g.strokeStyle = '#c0392b'; g.lineWidth = .5; g.beginPath(); g.moveTo(hx + v.cab * 1.2 + 1.5, hy); g.lineTo(hx + v.cab * 1.2 + 4, hy + (f ? .8 : -.8)); g.stroke();
}

/* Retorna {c, half} : canvas do sprite e meia-dimensão (px de mundo) */
S.animal = function(spId, sex, frame){
  const sp = FP.SPECIES[spId];
  const v = sp.vis;
  const usesSex = v.juba ? sex : 'X';
  const key = 'a_' + spId + '_' + usesSex + '_' + frame;
  if (cache.has(key)) return cache.get(key);
  const caudaN = typeof v.cauda === 'number' ? v.cauda : v.L * .5;
  const ext = (v.L + (v.pescoco || 0) + caudaN + (v.focinho || 0) + (v.cab || 0) * 3 + (v.chifreEspiral ? 16 : 0) + (v.bicoL || 0)) ;
  const half = Math.ceil(Math.max(ext, (v.tipo === 'dragao' ? v.Wd * 4.5 : v.Wd * 2.2)) * .62 + 4);
  const [c, g] = mk(half * 2, half * 2);
  g.translate(half, half);
  // centraliza visualmente: desloca o corpo para trás quando há pescoço/cabeça longos
  const shift = ((v.pescoco || 0) + (v.focinho || 0) - caudaN * .5) * -.25;
  g.translate(shift, 0);
  const fns = {quad:drawQuad, elefante:drawElephant, reptil:drawReptile, ave:drawBird, pinguim:drawPenguin, casco:drawShell, primata:drawPrimate, grifo:drawGriffin, dragao:drawDragon, foca:drawSeal, cobra:drawSnake};
  g.lineJoin = 'round';
  (fns[v.tipo] || drawQuad)(g, v, sex, frame, spId.length * 31 + 7);
  const out = {c, half};
  cache.set(key, out);
  return out;
};

/* Sombra genérica */
S.shadow = function(g, x, y, rx, ry){
  g.fillStyle = 'rgba(0,0,0,.22)';
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
};

/* ================= DECORAÇÃO / VEGETAÇÃO =================
   Sprites de 2x2 tiles (64x64 px de mundo) centrados no tile. */
const DS = 64;
const drawers = {
  arbusto(g, r){ circ(g, 3, 4, 11, 'rgba(0,0,0,.2)'); [[ -4,-2,8],[4,-3,7],[0,4,8],[5,4,6]].forEach(([x,y,s]) => circ(g, x, y, s, '#3f8a3a')); [[ -4,-4,4],[3,-5,3],[0,2,4]].forEach(([x,y,s]) => circ(g, x, y, s, '#5fae4f')); },
  capim(g, r){ g.strokeStyle = '#c8b250'; g.lineWidth = 1.2; g.lineCap = 'round'; for (let i = 0; i < 22; i++){ const x = (r()-.5)*24, y = (r()-.5)*24; g.beginPath(); g.moveTo(x, y + 3); g.lineTo(x + (r()-.5)*4, y - 4); g.stroke(); } g.strokeStyle = '#a99236'; for (let i = 0; i < 10; i++){ const x = (r()-.5)*22, y = (r()-.5)*22; g.beginPath(); g.moveTo(x, y + 3); g.lineTo(x + (r()-.5)*4, y - 3); g.stroke(); } },
  acacia(g, r){ ell(g, 6, 7, 27, 16, 0, 'rgba(0,0,0,.22)'); ell(g, 0, 0, 27, 17, -.1, '#6c8a2f'); for (let i = 0; i < 12; i++) ell(g, (r()-.5)*40, (r()-.5)*22, 7, 5, 0, i%2 ? '#7f9d3a' : '#5d7a28'); ell(g, -4, -4, 14, 8, 0, 'rgba(255,255,200,.12)'); },
  baoba(g, r){ circ(g, 6, 7, 24, 'rgba(0,0,0,.22)'); circ(g, 0, 0, 23, '#7b8a3c'); for (let i = 0; i < 9; i++){ const a = i/9*Math.PI*2; circ(g, Math.cos(a)*14, Math.sin(a)*14, 8, '#8c9c46'); } circ(g, 0, 0, 7, '#9b7b52'); circ(g, -5, -6, 9, 'rgba(255,255,200,.12)'); },
  tropical(g, r){ circ(g, 6, 7, 24, 'rgba(0,0,0,.25)'); circ(g, 0, 0, 23, '#1f5f2c'); for (let i = 0; i < 14; i++){ const a = r()*Math.PI*2, d = r()*15; circ(g, Math.cos(a)*d, Math.sin(a)*d, 7 + r()*4, i%2 ? '#2e7a3a' : '#256b31'); } circ(g, -6, -7, 9, 'rgba(255,255,255,.08)'); },
  palmeira(g, r){ circ(g, 5, 6, 18, 'rgba(0,0,0,.2)'); for (let i = 0; i < 9; i++){ const a = i/9*Math.PI*2 + r()*.2; g.save(); g.rotate(a); ell(g, 11, 0, 12, 3.6, 0, i%2 ? '#3d9440' : '#2f7d34'); g.strokeStyle = '#205a24'; g.lineWidth = .6; g.beginPath(); g.moveTo(0,0); g.lineTo(22,0); g.stroke(); g.restore(); } circ(g, 0, 0, 3.5, '#7a5a30'); },
  ipe(g, r){ circ(g, 6, 7, 21, 'rgba(0,0,0,.22)'); circ(g, 0, 0, 20, '#e8b923'); for (let i = 0; i < 18; i++){ const a = r()*Math.PI*2, d = r()*15; circ(g, Math.cos(a)*d, Math.sin(a)*d, 4 + r()*4, i%3 === 0 ? '#5d8a2f' : (i%2 ? '#f7d13a' : '#ffdd55')); } },
  bromelia(g, r){ for (let i = 0; i < 8; i++){ g.save(); g.rotate(i/8*Math.PI*2); ell(g, 6, 0, 7, 2.5, 0, '#3d8a3f'); g.restore(); } circ(g, 0, 0, 3.5, '#e8374b'); circ(g, 9, 6, 3, '#f4a62a'); },
  mangue(g, r){ g.strokeStyle = '#5a3d22'; g.lineWidth = 1.4; for (let i = 0; i < 10; i++){ const a = i/10*Math.PI*2; g.beginPath(); g.moveTo(Math.cos(a)*8, Math.sin(a)*8); g.quadraticCurveTo(Math.cos(a)*18, Math.sin(a)*18 - 4, Math.cos(a)*24, Math.sin(a)*24); g.stroke(); } circ(g, 0, 0, 17, '#2e6b3a'); for (let i = 0; i < 8; i++) circ(g, (r()-.5)*22, (r()-.5)*22, 6, '#3d7d45'); },
  aguape(g, r){ for (let i = 0; i < 6; i++){ const x = (r()-.5)*22, y = (r()-.5)*22; ell(g, x, y, 5, 4.2, r()*3, '#3f9b45', '#2d7a34', .6); } circ(g, 2, -2, 2.4, '#b48bdc'); circ(g, -6, 5, 2, '#c9a3ef'); },
  cacto(g, r){ circ(g, 3, 4, 9, 'rgba(0,0,0,.2)'); circ(g, 0, 0, 7, '#3f8f4a', '#2c6b35', 1); ell(g, -8, 2, 5, 3, 0, '#46a052', '#2c6b35', 1); ell(g, 8, -2, 5, 3, 0, '#46a052', '#2c6b35', 1); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = .5; for (let i = 0; i < 8; i++){ g.beginPath(); g.moveTo(0,0); g.lineTo(Math.cos(i*.785)*7, Math.sin(i*.785)*7); g.stroke(); } circ(g, 0, 0, 1.6, '#f06aa0'); },
  arbusto_seco(g, r){ g.strokeStyle = '#8a6a3a'; g.lineWidth = 1; g.lineCap = 'round'; for (let i = 0; i < 14; i++){ const a = r()*Math.PI*2, d = 6 + r()*8; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a)*d, Math.sin(a)*d); g.lineTo(Math.cos(a+.3)*(d+3), Math.sin(a+.3)*(d+3)); g.stroke(); } circ(g, 0, 0, 3, '#a7894f'); },
  bambu(g, r){ circ(g, 4, 5, 18, 'rgba(0,0,0,.2)'); for (let i = 0; i < 16; i++){ const x = (r()-.5)*26, y = (r()-.5)*26; circ(g, x, y, 2.3, '#7fb24a', '#5a8a30', .6); } for (let i = 0; i < 14; i++){ const a = r()*6.28; g.save(); g.translate((r()-.5)*24, (r()-.5)*24); g.rotate(a); ell(g, 6, 0, 7, 1.8, 0, '#9ccd5a'); g.restore(); } },
  samambaia(g, r){ for (let i = 0; i < 7; i++){ g.save(); g.rotate(i/7*Math.PI*2 + r()*.3); ell(g, 8, 0, 9, 3, 0, '#2f7d3a'); g.strokeStyle = '#5fae5a'; g.lineWidth = .6; g.beginPath(); g.moveTo(0,0); g.lineTo(16,0); g.stroke(); g.restore(); } },
  pinheiro(g, r){ circ(g, 5, 6, 18, 'rgba(0,0,0,.22)'); for (let k = 3; k >= 1; k--){ const R = k * 6.5; g.beginPath(); for (let i = 0; i < 16; i++){ const a = i/16*Math.PI*2, rr = i%2 ? R*.65 : R; g.lineTo(Math.cos(a)*rr, Math.sin(a)*rr); } g.closePath(); g.fillStyle = k === 3 ? '#1e4d33' : k === 2 ? '#26603f' : '#2f734b'; g.fill(); } for (let i = 0; i < 10; i++){ const a = r()*6.28, d = 5 + r()*12; circ(g, Math.cos(a)*d, Math.sin(a)*d, 1.8, '#f4fbff'); } },
  arvore_mistica(g, r){ const gr = g.createRadialGradient(0,0,4,0,0,28); gr.addColorStop(0,'rgba(200,160,255,.5)'); gr.addColorStop(1,'rgba(200,160,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0,0,28,0,7); g.fill(); circ(g, 0, 0, 20, '#5b3d9e'); for (let i = 0; i < 12; i++){ const a = r()*6.28, d = r()*13; circ(g, Math.cos(a)*d, Math.sin(a)*d, 6, i%2 ? '#7a55c8' : '#6a47b5'); } for (let i = 0; i < 14; i++) circ(g, (r()-.5)*34, (r()-.5)*34, 1.2, i%2 ? '#ffe9a8' : '#a8f0ff'); },
  cristal(g, r){ const gr = g.createRadialGradient(0,0,2,0,0,18); gr.addColorStop(0,'rgba(120,230,255,.55)'); gr.addColorStop(1,'rgba(120,230,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0,0,18,0,7); g.fill(); [[0,0,8,'#7fd8ff'],[-6,4,5,'#b48bff'],[6,3,5,'#9be7ff'],[2,-6,4,'#d6b8ff']].forEach(([x,y,s,c]) => { poly(g, [x, y - s, x + s*.6, y, x, y + s, x - s*.6, y], c, 'rgba(255,255,255,.7)', .6); }); },
  flores(g, r){ circ(g, 0, 0, 12, '#4f8f3a'); const cs = ['#e8574b','#f2b33d','#f49ac1','#ffffff','#b48bdc']; for (let i = 0; i < 16; i++) circ(g, (r()-.5)*20, (r()-.5)*20, 1.8, cs[i % cs.length]); },
  pedra(g, r){ ell(g, 3, 4, 12, 8, 0, 'rgba(0,0,0,.22)'); poly(g, [-11, 2, -7, -8, 4, -10, 11, -3, 9, 6, -2, 9], '#9b988e', '#77746b', 1); poly(g, [-6, -5, 3, -8, 7, -3, -1, -2], '#b9b6ac'); },
  tronco(g, r){ ell(g, 2, 4, 15, 6, 0, 'rgba(0,0,0,.2)'); g.save(); g.rotate(.4); g.fillStyle = '#7a5230'; g.fillRect(-14, -4.5, 28, 9); g.strokeStyle = '#5a3a1f'; g.lineWidth = .8; for (let x = -11; x < 12; x += 5){ g.beginPath(); g.moveTo(x, -4); g.lineTo(x + 2, 4); g.stroke(); } ell(g, 14, 0, 2.5, 4.5, 0, '#c99a62', '#5a3a1f', .8); g.restore(); },
  abrigo(g, r){ g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-11, -9, 26, 24); poly(g, [-14, -12, 14, -12, 14, 12, -14, 12], '#8a5a2b', '#5a3a1a', 1.2); g.strokeStyle = '#6b4320'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = .7; for (let y = -10; y < 12; y += 3){ g.beginPath(); g.moveTo(-13, y); g.lineTo(13, y); g.stroke(); } g.fillStyle = '#2a1a0a'; g.fillRect(-4, 10, 8, 3); },
  bebedouro(g, r){ g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-9, -4, 22, 12); g.fillStyle = '#8f9399'; g.fillRect(-11, -6, 22, 12); g.fillStyle = '#4aa3d8'; g.fillRect(-9, -4, 18, 8); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-7, -3, 8, 1.4); },
  escalada(g, r){ g.strokeStyle = '#7a5230'; g.lineWidth = 2.5; g.lineCap = 'round'; [[-12,-12],[12,-12],[-12,12],[12,12]].forEach(([x,y]) => circ(g, x, y, 2.6, '#5a3a1f')); g.beginPath(); g.moveTo(-12,-12); g.lineTo(12,12); g.moveTo(12,-12); g.lineTo(-12,12); g.stroke(); g.fillStyle = '#a7774a'; g.fillRect(-7, -7, 14, 14); g.strokeStyle = '#c9a36a'; g.lineWidth = 1; g.beginPath(); g.moveTo(-12, 0); g.quadraticCurveTo(0, 6, 12, 0); g.stroke(); },
  cupinzeiro(g, r){ circ(g, 3, 4, 10, 'rgba(0,0,0,.22)'); circ(g, 0, 0, 10, '#9a6a3a'); circ(g, -2, -2, 6.5, '#b07d48'); circ(g, -3, -3, 3, '#c38d55'); for (let i = 0; i < 5; i++) circ(g, (r()-.5)*14, (r()-.5)*14, .8, '#4a2a10'); },
  gelo_bloco(g, r){ g.fillStyle = 'rgba(0,30,60,.18)'; g.fillRect(-8, -6, 20, 18); poly(g, [-10, -9, 10, -9, 12, 9, -10, 10], '#d8f1fb', '#9fd0e6', 1); poly(g, [-7, -7, 3, -7, -5, 2], 'rgba(255,255,255,.7)'); },
  estatua(g, r){ ell(g, 3, 4, 13, 9, 0, 'rgba(0,0,0,.22)'); g.fillStyle = '#b8b3a7'; g.fillRect(-12, -12, 24, 24); g.fillStyle = '#d8d3c7'; g.fillRect(-10, -10, 20, 20); ell(g, -1, 0, 7, 4, 0, '#8f8a80'); circ(g, 6, -1, 3.2, '#8f8a80'); circ(g, 8.5, -3.5, 1.4, '#8f8a80'); },
  fonte(g, r){ circ(g, 3, 4, 26, 'rgba(0,0,0,.18)'); circ(g, 0, 0, 26, '#c9c3b5', '#9a9486', 1.5); circ(g, 0, 0, 22, '#4aa3d8'); for (let i = 0; i < 6; i++){ const a = i/6*6.28; circ(g, Math.cos(a)*12, Math.sin(a)*12, 2, 'rgba(255,255,255,.55)'); } circ(g, 0, 0, 6, '#d8d3c7', '#9a9486', 1); circ(g, 0, 0, 2.5, '#bfe8ff'); },
  poste(g, r){ circ(g, 2, 3, 5, 'rgba(0,0,0,.25)'); circ(g, 0, 0, 3.5, '#2b3238'); circ(g, 0, 0, 2.2, '#ffe49a'); },
  poste_duplo(g, r){ circ(g, 2, 3, 6, 'rgba(0,0,0,.25)'); g.strokeStyle = '#2b3238'; g.lineWidth = 2; g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.stroke(); circ(g, 0, 0, 3, '#2b3238'); circ(g, -7, 0, 2.8, '#2b3238'); circ(g, 7, 0, 2.8, '#2b3238'); circ(g, -7, 0, 1.8, '#ffe49a'); circ(g, 7, 0, 1.8, '#ffe49a'); },
  luminaria(g, r){ circ(g, 1.5, 2, 3.5, 'rgba(0,0,0,.22)'); circ(g, 0, 0, 2.6, '#3b4a40'); circ(g, 0, 0, 1.6, '#fff1b8'); },
  holofote(g, r){ circ(g, 2, 3, 5, 'rgba(0,0,0,.25)'); g.fillStyle = '#3a3f45'; g.fillRect(-3.5, -3, 7, 6); circ(g, 2.5, 0, 2.6, '#dfe9f2'); circ(g, 2.5, 0, 1.4, '#ffffff'); },
  bola(g, r){ circ(g, 2, 3, 7, 'rgba(0,0,0,.22)'); circ(g, 0, 0, 7, '#e8574b', '#9a2a20', 1.2); g.fillStyle = '#F2B33D'; g.beginPath(); g.arc(0, 0, 7, -.6, .6); g.lineTo(0, 0); g.fill(); g.fillStyle = '#2E8FB8'; g.beginPath(); g.arc(0, 0, 7, 2.5, 3.7); g.lineTo(0, 0); g.fill(); circ(g, -2.5, -2.5, 1.8, 'rgba(255,255,255,.6)'); },
  caixa_petiscos(g, r){ g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(-6, -4, 14, 12); g.fillStyle = '#c99a5a'; g.fillRect(-8, -7, 14, 13); g.strokeStyle = '#7a5530'; g.lineWidth = 1.2; g.strokeRect(-8, -7, 14, 13); g.beginPath(); g.moveTo(-1, -7); g.lineTo(-1, 6); g.stroke(); circ(g, -4, -2, 1.6, '#3a2a1a'); circ(g, 3, 2, 1.6, '#3a2a1a'); },
  pneu(g, r){ circ(g, 2, 3, 8, 'rgba(0,0,0,.2)'); circ(g, 0, 0, 8, '#2a2a2e'); circ(g, 0, 0, 4, '#5a8a3a'); g.strokeStyle = '#8a6a3a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-9, -9); g.lineTo(-5, -5); g.moveTo(9, -9); g.lineTo(5, -5); g.stroke(); },
  arranhador(g, r){ circ(g, 2, 3, 6, 'rgba(0,0,0,.22)'); circ(g, 0, 0, 6, '#8a5a2b', '#5a3a1a', 1.2); g.strokeStyle = '#c9a36a'; g.lineWidth = 1; for (let k = 0; k < 3; k++){ g.beginPath(); g.arc(0, 0, 1.5 + k * 1.4, 0, 6.3); g.stroke(); } },
  escova(g, r){ g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-7, -1, 16, 8); g.fillStyle = '#6b4320'; g.fillRect(-9, -3, 18, 5); g.fillStyle = '#e0c060'; for (let x = -8; x < 9; x += 2) g.fillRect(x, 2, 1.2, 4); g.fillStyle = '#555'; g.fillRect(-1, -9, 2, 7); },
  quebra_cabeca(g, r){ circ(g, 2, 3, 8, 'rgba(0,0,0,.22)'); circ(g, 0, 0, 8, '#2E8FB8', '#1a5a7a', 1.2); for (let k = 0; k < 6; k++){ const a = k / 6 * 6.28; circ(g, Math.cos(a) * 4.5, Math.sin(a) * 4.5, 1.6, '#0f3a50'); } circ(g, 0, 0, 2, '#F2B33D'); },
  rede_cordas(g, r){ g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 2; g.strokeRect(-7, -6, 16, 14); g.strokeStyle = '#d8b878'; g.lineWidth = 1.2; for (let k = -8; k <= 8; k += 4){ g.beginPath(); g.moveTo(k, -9); g.lineTo(k, 9); g.stroke(); g.beginPath(); g.moveTo(-9, k); g.lineTo(9, k); g.stroke(); } circ(g, -9, -9, 1.6, '#6b4320'); circ(g, 9, -9, 1.6, '#6b4320'); circ(g, -9, 9, 1.6, '#6b4320'); circ(g, 9, 9, 1.6, '#6b4320'); },
  poleiro(g, r){ g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-8, 1, 18, 4); g.fillStyle = '#8a5a2b'; g.fillRect(-9, -2, 18, 3); g.fillStyle = '#5a3a1a'; g.fillRect(-10, -6, 2, 10); g.fillRect(8, -6, 2, 10); circ(g, 0, 4, 2, '#e8574b'); },
  comedouro(g, r){ g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-8, -3, 20, 11); g.fillStyle = '#7a5636'; g.fillRect(-10, -6, 20, 11); g.fillStyle = '#c9b458'; g.fillRect(-8, -4, 16, 7); g.fillStyle = '#e8774b'; circ(g, -3, -1, 1.6, '#e8774b'); circ(g, 3, 0, 1.4, '#7BC86C'); g.fillStyle = '#5a3a1a'; g.fillRect(-11, -8, 22, 2.4); },
  tunel(g, r){ g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-9, -2, 20, 9); g.fillStyle = '#8a5a2b'; g.beginPath(); g.roundRect(-10, -6, 20, 11, 5); g.fill(); g.fillStyle = '#3a2412'; g.beginPath(); g.ellipse(-8, -.5, 2.6, 4.2, 0, 0, 7); g.fill(); g.strokeStyle = '#c9a36a'; g.lineWidth = .8; g.beginPath(); g.moveTo(-4, -6); g.lineTo(-4, 5); g.moveTo(2, -6); g.lineTo(2, 5); g.stroke(); },
  bola_gigante(g, r){ circ(g, 3, 4, 10, 'rgba(0,0,0,.22)'); circ(g, 0, 0, 10, '#2E8FB8', '#14506a', 1.4); g.fillStyle = '#F2B33D'; g.beginPath(); g.arc(0, 0, 10, -.5, .5); g.lineTo(0, 0); g.fill(); g.fillStyle = '#e8574b'; g.beginPath(); g.arc(0, 0, 10, 2.6, 3.6); g.lineTo(0, 0); g.fill(); circ(g, -3, -3, 2.4, 'rgba(255,255,255,.45)'); },
  picole_frutas(g, r){ g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-6, -2, 14, 11); g.fillStyle = 'rgba(200,235,255,.9)'; g.beginPath(); g.roundRect(-7, -8, 14, 15, 3); g.fill(); g.strokeStyle = '#8fc8e8'; g.lineWidth = 1; g.stroke(); circ(g, -2, -3, 2, '#e8574b'); circ(g, 2.5, 1, 1.8, '#F2B33D'); circ(g, -2, 3, 1.5, '#7BC86C'); },
  saco_aroma(g, r){ g.strokeStyle = '#d8b878'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -10); g.lineTo(0, -5); g.stroke(); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-4, 0, 11, 9); g.fillStyle = '#b8955a'; g.beginPath(); g.roundRect(-6, -5, 12, 13, 4); g.fill(); g.strokeStyle = '#7a5530'; g.stroke(); g.fillStyle = '#7BC86C'; g.fillRect(-3, -1, 2, 2); g.fillRect(1, 2, 2, 2); },
  escorregador(g, r){ g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-8, -6, 18, 16); g.fillStyle = '#2E8FB8'; g.beginPath(); g.moveTo(-9, -8); g.lineTo(-3, -8); g.lineTo(9, 8); g.lineTo(3, 8); g.closePath(); g.fill(); g.fillStyle = '#7fc8e8'; g.fillRect(-2, -2, 3, 1.5); g.fillStyle = '#F2B33D'; g.fillRect(-10, -10, 8, 4); },
  espelho(g, r){ g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-5, -6, 12, 15); g.fillStyle = '#8a5a2b'; g.beginPath(); g.roundRect(-7, -9, 14, 16, 3); g.fill(); g.fillStyle = '#cfe8f4'; g.beginPath(); g.roundRect(-5, -7, 10, 12, 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(-3, -6, 2, 9); g.fillStyle = '#5a3a1a'; g.fillRect(-1, 7, 2, 3); },
  monte_folhas(g, r){ circ(g, 2, 3, 8, 'rgba(0,0,0,.18)'); for (let k = 0; k < 9; k++){ const a = k * 2.4, d = 2 + (k % 3) * 2.2; circ(g, Math.cos(a) * d, Math.sin(a) * d, 3.2, ['#8a6a2a', '#b0802a', '#c9a040', '#6a8a2a'][k % 4]); } circ(g, 1, -1, 1.2, '#5a3a1a'); circ(g, -2, 2, 1.1, '#5a3a1a'); },
  orbe_magico(g, r){ circ(g, 2, 4, 7, 'rgba(0,0,0,.2)'); g.fillStyle = '#5a4a7a'; g.fillRect(-4, 2, 8, 5); const gr = g.createRadialGradient(-2, -4, 1, 0, -2, 8); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.4, '#c8a8ff'); gr.addColorStop(1, '#6a3ab8'); circ(g, 0, -2, 6.5, gr); },
  boia(g, r){ circ(g, 0, 0, 7, '#f4f4f4'); g.strokeStyle = '#e8574b'; g.lineWidth = 3.4; for (let k = 0; k < 4; k++){ g.beginPath(); g.arc(0, 0, 5.3, k * 1.57, k * 1.57 + .7); g.stroke(); } circ(g, 0, 0, 3.2, '#3a8fc6'); },
  placa(g, r){ g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-8, -3, 18, 10); g.fillStyle = '#7a5230'; g.fillRect(-10, -5, 20, 10); g.fillStyle = '#FFF4DE'; g.fillRect(-8.5, -3.5, 17, 7); g.fillStyle = '#1F6B4A'; g.fillRect(-7, -2, 9, 1.2); g.fillRect(-7, .4, 13, 1.2); }
};
S.deco = function(type, variant){
  const key = 'd_' + type + '_' + (variant || 0);
  if (cache.has(key)) return cache.get(key);
  const [c, g] = mk(DS, DS);
  g.translate(DS / 2, DS / 2);
  const r = U.rng(type.length * 1000 + (variant || 0) * 77 + 3);
  g.lineJoin = 'round';
  if (FP.DECOS[type] && FP.DECOS[type].brinquedo) g.scale(1.45, 1.45);
  (drawers[type] || drawers.pedra)(g, r);
  const out = {c, half: DS / 2};
  cache.set(key, out);
  return out;
};

/* ================= INSTALAÇÕES ================= */
function roof(g, w, h, cor, stripes){
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(4, 5, w - 4, h - 4);
  const r = 4;
  g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, r); g.fillStyle = cor; g.fill();
  if (stripes){
    g.save(); g.clip();
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let x = 2; x < w; x += 8) g.fillRect(x, 0, 4, h);
    g.restore();
  }
  g.lineWidth = 1.5; g.strokeStyle = U.shade(cor, -45); g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, r); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(6, 5); g.lineTo(w - 6, 5); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.2; g.beginPath();
  if (w >= h){ g.moveTo(6, h / 2); g.lineTo(w - 6, h / 2); } else { g.moveTo(w / 2, 6); g.lineTo(w / 2, h - 6); }
  g.stroke();
}
function iconTxt(g, txt, x, y, size){
  g.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(txt, x, y + 1);
}
S.building = function(type){
  const key = 'b_' + type;
  if (cache.has(key)) return cache.get(key);
  const b = FP.BUILDINGS[type];
  const w = b.w * T, h = b.h * T;
  const [c, g] = mk(w, h);
  if (type === 'entrada'){
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(4, 6, w - 4, h - 6);
    g.fillStyle = '#1F6B4A'; g.beginPath(); g.roundRect(2, 2, 22, h - 6, 4); g.fill(); g.beginPath(); g.roundRect(w - 24, 2, 22, h - 6, 4); g.fill();
    g.fillStyle = '#7BC86C'; g.fillRect(6, 6, 14, 6); g.fillRect(w - 20, 6, 14, 6);
    // v2.3: placas "ENTRADA" (lado esquerdo) e "SAÍDA" (lado direito), sem o nome do jogo
    [[14, '#2f9a55', 'ENTRADA ▸'], [w / 2 + 1, '#E8574B', '◂ SAÍDA']].forEach(([x, cor, t]) => {
      g.fillStyle = cor; g.beginPath(); g.roundRect(x, 8, w / 2 - 15, 16, 5); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#ffffff'; g.font = 'bold 8.5px "Fredoka","Trebuchet MS",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(t, x + (w / 2 - 15) / 2, 16.5);
    });
    g.fillStyle = '#c9b89a'; g.fillRect(28, 28, w - 56, h - 30);
    g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = .6; for (let x = 32; x < w - 28; x += 6){ g.beginPath(); g.moveTo(x, 28); g.lineTo(x, h - 2); g.stroke(); }
  } else if (type === 'estacionamento'){
    g.fillStyle = '#4f565c'; g.beginPath(); g.roundRect(1, 1, w - 2, h - 2, 3); g.fill();
    g.strokeStyle = '#f4f4f4'; g.lineWidth = 1.2;
    for (let x = 8; x < w - 4; x += 12){ g.beginPath(); g.moveTo(x, 4); g.lineTo(x, 26); g.stroke(); g.beginPath(); g.moveTo(x, h - 4); g.lineTo(x, h - 26); g.stroke(); }
    const cores = ['#e8574b','#2E8FB8','#F2B33D','#eeeeee','#1F6B4A','#7a4ab8'];
    for (let i = 0, x = 10; x < w - 10; x += 12, i++){ if (U.hash(i, 3) < .6){ g.fillStyle = cores[i % cores.length]; g.beginPath(); g.roundRect(x + 1, 7, 9, 16, 2); g.fill(); } if (U.hash(i, 9) < .5){ g.fillStyle = cores[(i + 2) % cores.length]; g.beginPath(); g.roundRect(x + 1, h - 23, 9, 16, 2); g.fill(); } }
    g.fillStyle = '#2E8FB8'; g.beginPath(); g.roundRect(w / 2 - 9, h / 2 - 9, 18, 18, 4); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', w / 2, h / 2 + 1);
  } else {
    const stripes = type === 'lanchonete' || type === 'bebidas' || type === 'sorvete';
    roof(g, w, h, b.cor, stripes);
    if (type === 'clinica'){ g.fillStyle = '#E8574B'; g.fillRect(w/2 - 3, h/2 - 9, 6, 18); g.fillRect(w/2 - 9, h/2 - 3, 18, 6); }
    else if (type !== 'banco' && type !== 'lixeira'){
      g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.arc(w/2, h/2, Math.min(w, h) * .26 + 2, 0, 7); g.fill();
      iconTxt(g, b.icone, w/2, h/2, Math.min(w, h) * .36);
    }
    if (type === 'banco'){ g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(6, 13, 23, 10); g.fillStyle = '#8a5a2b'; g.fillRect(4, 10, 24, 10); g.strokeStyle = '#5a3a1a'; g.lineWidth = 1; for (let y = 12; y < 20; y += 3){ g.beginPath(); g.moveTo(5, y); g.lineTo(27, y); g.stroke(); } g.fillStyle = '#3a3a3a'; g.fillRect(4, 8, 3, 14); g.fillRect(25, 8, 3, 14); }
    if (type === 'lixeira'){ g.clearRect(0, 0, w, h); circ(g, 18, 19, 8, 'rgba(0,0,0,.25)'); circ(g, 16, 16, 8, '#3f5a46', '#25362a', 1.2); circ(g, 16, 16, 5, '#2a3a2e'); g.fillStyle = '#7BC86C'; g.fillRect(13, 15, 6, 2); }
  }
  cache.set(key, c);
  return c;
};

/* ================= ÍCONES PARA A INTERFACE =================
   Gera dataURL de um sprite (usado nos menus/listas). */
S.iconURL = function(kind, id, size){
  const key = 'icon_' + kind + '_' + id + '_' + size;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  if (kind === 'animal'){
    const s = S.animal(id, 'M', 0);
    const sc = size / (s.half * 2 * RES) * 1.25;
    g.translate(size/2, size/2); g.rotate(-Math.PI / 2); g.scale(sc, sc);
    g.drawImage(s.c, -s.c.width/2, -s.c.height/2);
  } else if (kind === 'deco'){
    const s = S.deco(id, 0);
    g.drawImage(s.c, 0, 0, size, size);
  } else if (kind === 'building'){
    const b = S.building(id);
    const m = Math.max(b.width, b.height);
    const w = b.width / m * size, h = b.height / m * size;
    g.drawImage(b, (size - w)/2, (size - h)/2, w, h);
  } else if (kind === 'terrain'){
    g.drawImage(S.terrain(id, 0), 0, 0, size, size);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.strokeRect(.5, .5, size - 1, size - 1);
  }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
};

S.RES = RES;
S.clear = () => cache.clear();
})();
