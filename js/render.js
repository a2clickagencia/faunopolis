/* =========================================================
   FAUNÓPOLIS — render.js
   Câmera 2D top-down, desenho em camadas (terreno, caminhos,
   cercas, objetos, animais, pessoas, copas, noite, interface
   do mundo), lentes de leitura e minimapa.
   ========================================================= */
'use strict';
(function(){
const R = FP.Render = {};
const U = FP.U, S = FP.Sprites, T = FP.TILE;
R.particles = [];
R.lens = 'normal'; // normal | bemestar | limpeza | habitat | beleza
const cam = FP.Cam = {x: (FP.OX + 36) * T, y: (FP.OY + 30) * T, zoom: 1.1, minZ: .22, maxZ: 2.6};
let cv, g, dpr = 1, W = 0, H = 0, time = 0;
let mini, mg, miniTimer = 0;

R.init = function(canvas, minimap){
  cv = canvas; g = cv.getContext('2d');
  mini = minimap; mg = mini.getContext('2d');
  R.resize();
  window.addEventListener('resize', R.resize);
};
R.resize = function(){
  // celular: até 1,5× (telas de 3× gastariam 4× mais pixels por quadro sem diferença visível)
  dpr = Math.min(FP.Mobile && FP.Mobile.touch ? 1.5 : 2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
};
R.size = () => ({W, H});

/* ---------- v7.2: cache do chão em pedaços (chunks) ---------- */
const CH = 16, chunkCache = new Map();
let chunkPix = 0;
const chunkBudget = () => (FP.Mobile && FP.Mobile.touch ? 10e6 : 24e6);   // pixels guardados no total
const TIERS = [.25, .5, 1, 2];
function pickTier(sc){ for (const t of TIERS) if (t >= sc * .95) return t; return 2; }
function chunkSig(G, cx, cy, full){
  let h = 7;
  // v2.4.1: no modo "completo" (zoom bem afastado) o pedaço também guarda cercas e itens;
  // a assinatura inclui recintos e objetos, com 2 tiles de margem (copas passam da borda)
  const m = full ? 2 : 0;
  const xs = Math.max(0, cx * CH - m), xe = Math.min(FP.W, cx * CH + CH + m), ys = Math.max(0, cy * CH - m), ye = Math.min(FP.H, (cy + 1) * CH + m);
  for (let y = ys; y < ye; y++){ let i = y * FP.W + xs; const e = y * FP.W + xe; for (; i < e; i++){ h = (h * 31 + G.ground[i] * 4 + G.path[i] * 2 + G.road[i]) | 0; if (full) h = (h * 17 + G.obj[i] * 3 + G.enc[i]) | 0; } }
  return h;
}
let chunkBuilds = 0;   // pedaços montados neste quadro (o resto espera o próximo, para não travar)
function getChunk(G, cx, cy, tier, full){
  const key = cx + ',' + cy + ',' + tier + (full ? 'f' : ''), sig = chunkSig(G, cx, cy, full);
  let c = chunkCache.get(key);
  if (c){ chunkCache.delete(key); chunkCache.set(key, c); if (c.sig === sig) return c.cv; }
  // v2.4.1: no máximo 4 pedaços novos por quadro (2 no celular); enquanto isso usa uma versão já pronta (outra escala)
  if (chunkBuilds >= (FP.Mobile && FP.Mobile.touch ? 2 : 4)){
    for (const t of TIERS) for (const f of [full ? 'f' : '', full ? '' : 'f']){ const o = chunkCache.get(cx + ',' + cy + ',' + t + f); if (o && o.sig === chunkSig(G, cx, cy, f === 'f')) return o.cv; }
  }
  chunkBuilds++;
  if (!c){
    const px = Math.ceil(CH * T * tier), cv = document.createElement('canvas');
    cv.width = cv.height = px; c = {cv, px: px * px}; chunkPix += c.px; chunkCache.set(key, c);
  }
  c.sig = sig;
  const gc = c.cv.getContext('2d');
  gc.setTransform(1, 0, 0, 1, 0, 0); gc.clearRect(0, 0, c.cv.width, c.cv.height);
  gc.setTransform(tier, 0, 0, tier, -cx * CH * T * tier, -cy * CH * T * tier);
  gc.imageSmoothingEnabled = true;
  const x0 = cx * CH, y0 = cy * CH, x1 = Math.min(FP.W, x0 + CH) - 1, y1 = Math.min(FP.H, y0 + CH) - 1;
  drawGround(gc, G, x0, y0, x1, y1, 1 / tier);
  if (full){
    // cercas e itens (decoração, árvores, instalações) desenhados uma vez só no pedaço
    const g0 = g; g = gc;
    try {
      drawFences(G, x0 - 1, y0 - 1, x1 + 1, y1 + 1);
      const low = [], top = [];
      for (const k in G.objects){
        const o = G.objects[k];
        if (o.x + o.w < x0 - 2 || o.x > x1 + 2 || o.y + o.h < y0 - 2 || o.y > y1 + 2) continue;
        (o.kind === 'deco' && FP.DECOS[o.type].copa ? top : low).push(o);
      }
      low.sort((a, b) => a.y - b.y).forEach(o => drawObject(G, o));
      top.sort((a, b) => a.y - b.y).forEach(o => drawObject(G, o));
    } finally { g = g0; }
  }
  // libera os pedaços usados há mais tempo quando passa do limite de memória
  while (chunkPix > chunkBudget() && chunkCache.size > 1){
    const [k, v] = chunkCache.entries().next().value;
    if (v === c) break;
    chunkCache.delete(k); chunkPix -= v.px; v.cv.width = v.cv.height = 0;
  }
  return c.cv;
}
R.clearGroundCache = () => { chunkCache.forEach(v => { v.cv.width = v.cv.height = 0; }); chunkCache.clear(); chunkPix = 0; };
function drawGround(g, G, x0, y0, x1, y1, ov){
    // 1. terreno
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
      const i = y * FP.W + x;
      const tid = G.ground[i];
      g.drawImage(S.terrain(tid, Math.floor(U.hash(x, y) * 4)), x * T, y * T, T + ov, T + ov);
    }
    // brilho da água e margens
    g.lineWidth = 1.2;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
      const i = y * FP.W + x;
      if (G.ground[i] !== FP.T.agua) continue;
      g.strokeStyle = 'rgba(230,214,160,.85)';
      if (y > 0 && G.ground[i - FP.W] !== FP.T.agua){ g.beginPath(); g.moveTo(x * T, y * T + .6); g.lineTo(x * T + T, y * T + .6); g.stroke(); }
      if (y < FP.H - 1 && G.ground[i + FP.W] !== FP.T.agua){ g.beginPath(); g.moveTo(x * T, y * T + T - .6); g.lineTo(x * T + T, y * T + T - .6); g.stroke(); }
      if (x > 0 && G.ground[i - 1] !== FP.T.agua){ g.beginPath(); g.moveTo(x * T + .6, y * T); g.lineTo(x * T + .6, y * T + T); g.stroke(); }
      if (x < FP.W - 1 && G.ground[i + 1] !== FP.T.agua){ g.beginPath(); g.moveTo(x * T + T - .6, y * T); g.lineTo(x * T + T - .6, y * T + T); g.stroke(); }
    }

    // 2. estrada
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
      const i = y * FP.W + x;
      if (!G.road[i]) continue;
      g.fillStyle = '#4b5158'; g.fillRect(x * T, y * T, T + ov, T + ov);
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x * T + 2, y * T + 2, 4, 3);
    }
    g.fillStyle = '#f2d14b';
    const RW = FP.World;
    for (let y = Math.max(y0, RW.ROAD_Y0); y <= Math.min(y1, RW.AVENUE_Y - 1); y++) g.fillRect((RW.ROAD_X + 1) * T - 1.5, y * T + 6, 3, 14);
    for (let x = x0; x <= x1; x++) g.fillRect(x * T + 6, (RW.AVENUE_Y + 1) * T - 1.5, 14, 3);

    // 3. caminhos
    const pt = getPathTex();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
      const i = y * FP.W + x;
      if (!G.path[i]) continue;
      g.drawImage(pt, x * T, y * T, T + ov, T + ov);
    }
    g.strokeStyle = '#a7966f'; g.lineWidth = 2;
    g.beginPath();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
      const i = y * FP.W + x;
      if (!G.path[i]) continue;
      const px = x * T, py = y * T;
      if (y === 0 || !G.path[i - FP.W]){ g.moveTo(px, py + 1); g.lineTo(px + T, py + 1); }
      if (y === FP.H - 1 || !G.path[i + FP.W]){ g.moveTo(px, py + T - 1); g.lineTo(px + T, py + T - 1); }
      if (x === 0 || !G.path[i - 1]){ g.moveTo(px + 1, py); g.lineTo(px + 1, py + T); }
      if (x === FP.W - 1 || !G.path[i + 1]){ g.moveTo(px + T - 1, py); g.lineTo(px + T - 1, py + T); }
    }
    g.stroke();
}

// Em modo 3D a conversão tela↔mundo é feita por raio contra o chão (FP.R3)
R.screenToWorld = (sx, sy) => FP.R3 && FP.R3.active ? FP.R3.screenToWorld(sx, sy) : ({x: (sx - W / 2) / cam.zoom + cam.x, y: (sy - H / 2) / cam.zoom + cam.y});
R.worldToScreen = (wx, wy, h) => FP.R3 && FP.R3.active ? FP.R3.worldToScreen(wx, wy, h || 0) : ({x: (wx - cam.x) * cam.zoom + W / 2, y: (wy - cam.y) * cam.zoom + H / 2});
R.clampCam = function(){
  cam.x = U.clamp(cam.x, 0, FP.W * T); cam.y = U.clamp(cam.y, 0, FP.H * T);
};
R.centerOn = function(tx, ty){ cam.x = tx * T; cam.y = ty * T; R.clampCam(); };

/* textura do caminho (pedras) */
let pathTex = null;
function getPathTex(){
  if (pathTex) return pathTex;
  const c = document.createElement('canvas'); c.width = c.height = T * 2;
  const p = c.getContext('2d'); p.scale(2, 2);
  p.fillStyle = '#d8cba9'; p.fillRect(0, 0, T, T);
  const r = U.rng(42);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++){
    p.fillStyle = r() < .5 ? '#cfc09c' : '#e2d6b8';
    p.beginPath(); p.roundRect(x * 8 + 1 + (y % 2) * 2, y * 8 + 1, 6, 6, 2); p.fill();
  }
  return pathTex = c;
}

/* ---------- Quadro ---------- */
R.draw = function(dt){
  const G = FP.G; if (!G) return;
  time += dt;
  if (FP.R3 && FP.R3.active){ draw3D(G, dt); return; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#24402f'; g.fillRect(0, 0, W, H);
  const z = cam.zoom;
  g.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - cam.x * z), dpr * (H / 2 - cam.y * z));
  g.imageSmoothingEnabled = true;
  const tl = R.screenToWorld(0, 0), br = R.screenToWorld(W, H);
  const x0 = Math.max(0, Math.floor(tl.x / T) - 1), y0 = Math.max(0, Math.floor(tl.y / T) - 1);
  const x1 = Math.min(FP.W - 1, Math.ceil(br.x / T) + 1), y1 = Math.min(FP.H - 1, Math.ceil(br.y / T) + 1);
  const ov = 1 / z; // sobreposição para evitar frestas

  // 1–3. chão (terreno, margens da água, estrada e caminhos): v7.2 — vem de pedaços
  // pré-desenhados de 16×16 tiles, refeitos só quando o chão daquele pedaço muda
  const tier = pickTier(z * dpr);
  const far = z < .42;
  chunkBuilds = 0;   // v2.4.1: zoom bem afastado: cercas e itens vêm prontos nos pedaços
  const cx0 = Math.floor(x0 / CH), cy0 = Math.floor(y0 / CH), cx1 = Math.floor(x1 / CH), cy1 = Math.floor(y1 / CH);
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++)
    g.drawImage(getChunk(G, cx, cy, tier, far), cx * CH * T, cy * CH * T, CH * T + ov, CH * T + ov);
  // brilho animado da água (só quando dá para ver)
  if (z > .45){
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
      const i = y * FP.W + x;
      if (G.ground[i] !== FP.T.agua) continue;
      const ph = Math.sin(time * 1.5 + x * .7 + y * 1.3);
      if (ph > .6){ g.fillStyle = 'rgba(255,255,255,' + ((ph - .6) * .6).toFixed(2) + ')'; g.fillRect(x * T + 8 + U.hash(x, y, 2) * 12, y * T + 10 + U.hash(x, y, 3) * 12, 6, 1.4); }
    }
  }
  // lixo
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++){
    const i = y * FP.W + x, l = G.litter[i];
    if (!l) continue;
    for (let k = 0; k < l; k++){
      g.fillStyle = k % 3 === 0 ? '#ffffff' : k % 3 === 1 ? '#e8574b' : '#5dade2';
      g.fillRect(x * T + 4 + U.hash(x, y, k) * 22, y * T + 4 + U.hash(y, x, k + 9) * 22, 3, 2.2);
    }
  }

  // 4. interior dos recintos: sujeira e lentes
  Object.values(G.enclosures).forEach(e => {
    if (e.maxX < x0 || e.minX > x1 || e.maxY < y0 || e.minY > y1) return;
    const dirt = (100 - e.clean) / 100;
    let lensCol = null;
    if (R.lens !== 'normal'){
      const v = R.lensValue(e);
      lensCol = v === null ? 'rgba(120,120,120,.35)' : U.stateColor(v);
    }
    // v2.4.1: todas as manchas de sujeira do recinto num único preenchimento
    if (dirt > .15 && z > .3){
      g.beginPath();
      e.tiles.forEach(i => {
        const x = i % FP.W, y = (i / FP.W) | 0;
        if (x < x0 || x > x1 || y < y0 || y > y1) return;
        for (let k = 0; k < 3; k++) if (U.hash(x, y, k + 50) < dirt * .7){ const ex = x * T + 5 + U.hash(x, y, k) * 22, ey = y * T + 5 + U.hash(y, x, k) * 22; g.moveTo(ex + 2.4, ey); g.ellipse(ex, ey, 2.4, 1.6, 0, 0, 6.2832); }
      });
      g.fillStyle = 'rgba(92,64,30,.55)'; g.fill();
    } else if (dirt > .15){
      // bem afastado: um véu marrom no recinto em vez de centenas de manchas
      g.fillStyle = `rgba(92,64,30,${(dirt * .3).toFixed(3)})`; g.beginPath();
      e.tiles.forEach(i => { const x = i % FP.W, y = (i / FP.W) | 0; if (x >= x0 && x <= x1 && y >= y0 && y <= y1) g.rect(x * T, y * T, T + ov, T + ov); });
      g.fill();
    }
    if (lensCol){
      g.globalAlpha = .42; g.fillStyle = lensCol; g.beginPath();
      e.tiles.forEach(i => { const x = i % FP.W, y = (i / FP.W) | 0; if (x >= x0 && x <= x1 && y >= y0 && y <= y1) g.rect(x * T, y * T, T + ov, T + ov); });
      g.fill(); g.globalAlpha = 1;
    }
  });

  // 5. cercas (no zoom afastado já estão nos pedaços)
  if (!far) drawFences(G, x0, y0, x1, y1);

  // 6. objetos baixos (decoração sem copa e instalações), ordenados por y
  const vis = [], canopies = [];
  if (!far) Object.values(G.objects).forEach(o => {
    if (o.x + o.w < x0 || o.x > x1 + 1 || o.y + o.h < y0 || o.y > y1 + 1) return;
    if (o.kind === 'deco' && FP.DECOS[o.type].copa) canopies.push(o); else vis.push(o);
  });
  vis.sort((a, b) => a.y - b.y);
  vis.forEach(o => drawObject(G, o));

  // 7. animais
  const animals = G.animals.filter(a => !a.quar && a.x >= x0 - 1 && a.x <= x1 + 2 && a.y >= y0 - 1 && a.y <= y1 + 2);
  animals.sort((a, b) => a.y - b.y);
  animals.forEach(a => drawAnimal(G, a));

  // 8. pessoas
  if (far){
    // v2.4.1: de longe, cada pessoa é um pontinho na cor da roupa (um preenchimento por cor)
    const byCol = {};
    const add = (x, y, c) => { if (x >= x0 - 1 && x <= x1 + 2 && y >= y0 - 1 && y <= y1 + 2) (byCol[c] = byCol[c] || []).push(x, y); };
    G.visitors.forEach(v => add(v.x, v.y, v.shirt)); G.staff.forEach(s => add(s.x, s.y, FP.STAFF[s.role].cor));
    const r = Math.max(3, 2.2 / z);
    for (const c in byCol){ const a = byCol[c]; g.fillStyle = c; g.beginPath(); for (let k = 0; k < a.length; k += 2) g.rect(a[k] * T - r / 2, a[k + 1] * T - r / 2, r, r); g.fill(); }
  } else {
    G.visitors.forEach(v => { if (v.x >= x0 - 1 && v.x <= x1 + 2 && v.y >= y0 - 1 && v.y <= y1 + 2) drawPerson(v.x, v.y, v.h, v.shirt, v.skin, v.hair, v.kid, v.ft, false); });
    G.staff.forEach(s => { if (s.x >= x0 - 1 && s.x <= x1 + 2 && s.y >= y0 - 1 && s.y <= y1 + 2) drawPerson(s.x, s.y, s.h, FP.STAFF[s.role].cor, '#e0ac85', '#2b1d14', false, s.ft || 0, true); });
  }

  // 9. copas das árvores
  canopies.sort((a, b) => a.y - b.y);
  canopies.forEach(o => drawObject(G, o));

  // 10. lotes não adquiridos
  const ch = FP.CHUNK;
  // v2.5: só os lotes visíveis e num único preenchimento (antes: ~300 retângulos por quadro)
  g.fillStyle = 'rgba(20,30,25,.38)'; g.beginPath();
  for (let cy = Math.floor(y0 / ch); cy <= Math.floor(y1 / ch); cy++) for (let cx = Math.floor(x0 / ch); cx <= Math.floor(x1 / ch); cx++){
    if (FP.World.chunkOwned(G, cx, cy)) continue;
    g.rect(cx * ch * T, cy * ch * T, ch * T, ch * T);
  }
  g.fill();
  if (FP.Input.tool === 'land'){
    const price = FP.World.chunkPrice(G);
    for (let cy = 0; cy * ch < FP.H; cy++) for (let cx = 0; cx * ch < FP.W; cx++){
      if (!FP.World.chunkBuyable(G, cx, cy)) continue;
      const hov = FP.Input.hoverChunk && FP.Input.hoverChunk[0] === cx && FP.Input.hoverChunk[1] === cy;
      g.strokeStyle = hov ? '#F2B33D' : 'rgba(242,179,61,.6)'; g.lineWidth = hov ? 4 : 2; g.setLineDash([10, 6]);
      g.strokeRect(cx * ch * T + 3, cy * ch * T + 3, ch * T - 6, ch * T - 6); g.setLineDash([]);
      if (hov){ g.fillStyle = 'rgba(242,179,61,.18)'; g.fillRect(cx * ch * T, cy * ch * T, ch * T, ch * T); }
      label(cx * ch * T + ch * T / 2, cy * ch * T + ch * T / 2, '🏷️ ' + U.money(price), '#1E2A2F', '#F2B33D', 13);
    }
  }
  // limite do terreno próprio
  g.strokeStyle = 'rgba(255,244,222,.55)'; g.lineWidth = 2; g.setLineDash([6, 5]);
  g.beginPath();
  for (let cy = 0; cy * ch < FP.H; cy++) for (let cx = 0; cx * ch < FP.W; cx++){
    if (!FP.World.chunkOwned(G, cx, cy)) continue;
    const X = cx * ch * T, Y = cy * ch * T, S2 = ch * T;
    if (!FP.World.chunkOwned(G, cx, cy - 1)){ g.moveTo(X, Y); g.lineTo(X + S2, Y); }
    if (!FP.World.chunkOwned(G, cx, cy + 1)){ g.moveTo(X, Y + S2); g.lineTo(X + S2, Y + S2); }
    if (!FP.World.chunkOwned(G, cx - 1, cy)){ g.moveTo(X, Y); g.lineTo(X, Y + S2); }
    if (!FP.World.chunkOwned(G, cx + 1, cy)){ g.moveTo(X + S2, Y); g.lineTo(X + S2, Y + S2); }
  }
  g.stroke(); g.setLineDash([]);

  // 11. noite
  drawNight(G, x0, y0, x1, y1);

  // 12. selos de alerta e nomes dos recintos
  Object.values(G.enclosures).forEach(e => {
    if (e.cx < x0 - 2 || e.cx > x1 + 2 || e.cy < y0 - 2 || e.cy > y1 + 2) return;
    const icons = FP.UI.encAlertIcons(e);
    const sel = FP.UI.selected && FP.UI.selected.type === 'enc' && FP.UI.selected.id === e.id;
    // v2.0: placa de identificação física na cerca, voltada para o caminho
    if (e.sign) drawEncSign(G, e, z >= .55 || sel);
    if (icons.length) label(e.cx * T, e.cy * T, icons.join(' '), '#1E2A2F', 'rgba(255,244,222,.92)', 15);
  });
  // instalações desconectadas
  Object.values(G.objects).forEach(o => {
    if (o.kind !== 'building' || o.type === 'entrada' || o.type === 'estacionamento') return;
    if (o.door < 0) label((o.x + o.w / 2) * T, (o.y) * T - 4, '⛔ sem acesso', '#fff', 'rgba(232,87,75,.9)', 10);
  });

  // 13. bolhas de pensamento e partículas
  if (z > .7) G.visitors.forEach(v => { if (v.bubble) label(v.x * T, v.y * T - 16, v.bubble.txt, '#1E2A2F', 'rgba(255,255,255,.9)', 11); });
  R.particles = R.particles.filter(p => (p.t += dt) < p.life);
  R.particles.forEach(p => {
    const a = 1 - p.t / p.life;
    g.globalAlpha = a;
    if (p.kind === 'money') label(p.x * T, p.y * T - p.t * 18, p.txt, p.color || '#1F6B4A', 'rgba(255,244,222,.9)', 12);
    else { g.font = '18px "Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.fillText(p.txt, p.x * T, p.y * T - p.t * 14); }
    g.globalAlpha = 1;
  });

  // 14. seleção e prévia de ferramentas
  drawSelection(G);
  FP.Input.drawPreview(g, T);

  // minimapa
  miniTimer -= dt;
  if (miniTimer <= 0){ miniTimer = .5; R.drawMinimap(); }
  drawMiniCam();
};

/* ================= MODO 3D =================
   O mundo é desenhado pelo FP.R3 (WebGL/Three.js). Este canvas 2D vira uma camada
   transparente por cima, usada para rótulos e ícones. As prévias das ferramentas,
   lentes e seleção continuam usando o mesmo código 2D, desenhado numa textura
   que o R3 aplica sobre o chão (overlayPass). */
let overlayPass = false, labelQueue = [];
function draw3D(G, dt){
  const R3 = FP.R3, I = FP.Input;
  R3.draw(dt);
  const need = I.tool !== 'select' || !!I.drag || !!FP.UI.selected || R.lens !== 'normal';
  const oc = R3.overlayBegin(need);
  labelQueue = [];
  if (oc){
    const g0 = g; g = oc; overlayPass = true;
    try {
      if (R.lens !== 'normal') Object.values(G.enclosures).forEach(e => {
        const v = R.lensValue(e); g.globalAlpha = .5; g.fillStyle = v === null ? 'rgba(120,120,120,.6)' : U.stateColor(v);
        e.tiles.forEach(i => g.fillRect((i % FP.W) * T, ((i / FP.W) | 0) * T, T, T)); g.globalAlpha = 1;
      });
      if (I.tool === 'land'){
        const ch = FP.CHUNK, price = FP.World.chunkPrice(G);
        for (let cy = 0; cy * ch < FP.H; cy++) for (let cx = 0; cx * ch < FP.W; cx++){
          if (!FP.World.chunkBuyable(G, cx, cy)) continue;
          const hov = I.hoverChunk && I.hoverChunk[0] === cx && I.hoverChunk[1] === cy;
          g.fillStyle = hov ? 'rgba(242,179,61,.45)' : 'rgba(242,179,61,.16)'; g.fillRect(cx * ch * T, cy * ch * T, ch * T, ch * T);
          g.strokeStyle = '#F2B33D'; g.lineWidth = hov ? 10 : 5; g.strokeRect(cx * ch * T + 4, cy * ch * T + 4, ch * T - 8, ch * T - 8);
          if (hov) label((cx + .5) * ch * T, (cy + .5) * ch * T, '🏷️ ' + U.money(price), '#1E2A2F', '#F2B33D', 13);
        }
      }
      drawSelection(G);
      I.drawPreview(g, T);
    } finally { overlayPass = false; g = g0; }
  }
  R3.overlayEnd(!!oc);
  // ---- camada de tela (rótulos) ----
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const near = R3.labelDetail();   // 0..1: quanto mais perto, mais detalhes
  const sl = (wx, wy, h, txt, fg, bg, size) => { const p = R3.worldToScreen(wx, wy, h); if (p.vis) label(p.x, p.y, txt, fg, bg, size); };
  Object.values(G.enclosures).forEach(e => {
    const icons = FP.UI.encAlertIcons(e);
    if (icons.length) sl(e.cx, e.cy, 2.2, icons.join(' '), '#1E2A2F', 'rgba(255,244,222,.92)', 15);
    const sel = FP.UI.selected && FP.UI.selected.type === 'enc' && FP.UI.selected.id === e.id;
    if (e.sign && (sel || near > .55)) sl(e.sign.x + .5 + e.sign.dx * .5, e.sign.y + .5 + e.sign.dy * .5, 1.75, e.name, '#FFF4DE', 'rgba(31,107,74,.9)', 11);
  });
  Object.values(G.objects).forEach(o => {
    if (o.kind !== 'building' || o.type === 'entrada' || o.type === 'estacionamento' || o.door >= 0) return;
    sl(o.x + o.w / 2, o.y + o.h / 2, 2.2, '⛔ sem acesso', '#fff', 'rgba(232,87,75,.9)', 10);
  });
  if (near > .6) G.visitors.forEach(v => { if (v.bubble) sl(v.x, v.y, 1.25, v.bubble.txt, '#1E2A2F', 'rgba(255,255,255,.9)', 11); });
  R.particles = R.particles.filter(p => (p.t += dt) < p.life);
  R.particles.forEach(p => {
    g.globalAlpha = 1 - p.t / p.life;
    const s = R3.worldToScreen(p.x, p.y, .6 + p.t * .8);
    if (s.vis){ if (p.kind === 'money') label(s.x, s.y, p.txt, p.color || '#1F6B4A', 'rgba(255,244,222,.9)', 12); else { g.font = '18px "Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.fillText(p.txt, s.x, s.y); } }
    g.globalAlpha = 1;
  });
  labelQueue.forEach(q => sl(q[0] / T, q[1] / T, .4, q[2], q[3], q[4], q[5]));
  miniTimer -= dt;
  if (miniTimer <= 0){ miniTimer = .5; R.drawMinimap(); }
  drawMiniCam();
}

/* Placa do recinto (2D): poste na cerca + tabuleta com nome e ícones das espécies */
function drawEncSign(G, e, showName){
  const s = e.sign;
  const px = (s.x + .5 + s.dx * .5) * T, py = (s.y + .5 + s.dy * .5) * T;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px - 9, py - 3, 20, 9);
  g.fillStyle = '#6b4320'; g.fillRect(px - 1.5, py - 4, 3, 8);
  g.fillStyle = '#7a5230'; g.beginPath(); g.roundRect(px - 11, py - 8, 22, 11, 2); g.fill();
  g.fillStyle = '#1F6B4A'; g.beginPath(); g.roundRect(px - 9.5, py - 6.5, 19, 8, 1.5); g.fill();
  const sps = FP.World.encSpecies(G, e);
  g.fillStyle = '#FFF4DE'; g.fillRect(px - 7, py - 4.2, 9, 1.2); g.fillRect(px - 7, py - 1.8, 13, 1.2);
  if (showName){
    const n = sps.length ? ' · ' + sps.slice(0, 3).map(sp => FP.SPECIES[sp].nome.split(/[- (]/)[0]).join(', ') : '';
    label(px, py - 17, '🪧 ' + e.name + n, '#FFF4DE', 'rgba(31,107,74,.92)', 11);
  }
}
function label(x, y, txt, fg, bg, size){
  if (overlayPass){ labelQueue.push([x, y, txt, fg, bg, size, 0]); return; }
  g.font = `600 ${size}px "Nunito","Segoe UI","Segoe UI Emoji",sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(txt).width + 10, h = size + 7;
  g.fillStyle = bg; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.fill();
  g.fillStyle = fg; g.fillText(txt, x, y + .5);
}
R.label = label;

function drawFences(G, x0, y0, x1, y1){
  const segs = [];
  Object.values(G.enclosures).forEach(e => {
    if (e.maxX < x0 - 1 || e.minX > x1 + 1 || e.maxY < y0 - 1 || e.minY > y1 + 1) return;
    e.tiles.forEach(i => {
      const x = i % FP.W, y = (i / FP.W) | 0;
      const id = e.id;
      if (y === 0 || G.enc[i - FP.W] !== id) segs.push([x, y, x + 1, y]);
      if (y === FP.H - 1 || G.enc[i + FP.W] !== id) segs.push([x, y + 1, x + 1, y + 1]);
      if (x === 0 || G.enc[i - 1] !== id) segs.push([x, y, x, y + 1]);
      if (x === FP.W - 1 || G.enc[i + 1] !== id) segs.push([x + 1, y, x + 1, y + 1]);
    });
  });
  if (!segs.length) return;
  const path = () => { g.beginPath(); segs.forEach(s => { g.moveTo(s[0] * T, s[1] * T); g.lineTo(s[2] * T, s[3] * T); }); };
  g.lineCap = 'round';
  path(); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 5; g.save(); g.translate(1.5, 2); g.stroke(); g.restore();
  path(); g.strokeStyle = '#5a3a1f'; g.lineWidth = 4.2; g.stroke();
  path(); g.strokeStyle = '#a7774a'; g.lineWidth = 2; g.stroke();
  const posts = new Set();
  segs.forEach(s => { posts.add(s[0] + ',' + s[1]); posts.add(s[2] + ',' + s[3]); });
  g.fillStyle = '#4a2f18'; g.beginPath();
  posts.forEach(p => { const [x, y] = p.split(','); g.moveTo(x * T + 2.8, y * T); g.arc(x * T, y * T, 2.8, 0, 6.2832); });
  g.fill();
}

function drawObject(G, o){
  if (o.kind === 'deco'){
    const d = FP.DECOS[o.type];
    const s = S.deco(o.type, o.variant % 3);
    const [ox, oy] = d.naBorda ? FP.World.borderOffset(G, o.x, o.y) : [0, 0];
    const cx = (o.x + .5 + ox) * T, cy = (o.y + .5 + oy) * T;
    if (d.copa){
      // transparência quando há um animal embaixo, para não esconder
      g.globalAlpha = .93;
      g.drawImage(s.c, cx - s.half, cy - s.half, s.half * 2, s.half * 2);
      g.globalAlpha = 1;
    } else g.drawImage(s.c, cx - s.half, cy - s.half, s.half * 2, s.half * 2);
  } else {
    const c = S.building(o.type);
    // v2.3: banco/lixeira/ponto de informação sobre o caminho ficam menores, na borda
    if (FP.BUILDINGS[o.type].noCaminho && G.path[U.idx(o.x, o.y)]){
      const [ox, oy] = FP.World.borderOffset(G, o.x, o.y), k = .62;
      g.drawImage(c, (o.x + .5 + ox * 1.05) * T - T * k / 2, (o.y + .5 + oy * 1.05) * T - T * k / 2, T * k, T * k);
    } else g.drawImage(c, o.x * T, o.y * T, o.w * T, o.h * T);
  }
}

function drawAnimal(G, a){
  const sp = FP.SPECIES[a.sp];
  const baby = FP.Animals.isBaby(a);
  const sc = baby ? .58 : 1;
  const moving = a.state === 'wander' || a.state === 'toy' || a.state === 'play';
  const s = S.animal(a.sp, a.sex, moving ? a.frame : 0);
  const hop = a.state === 'play' ? Math.abs(Math.sin((a.playT || 0) * 7)) * 5 : 0;
  const px = a.x * T, py = a.y * T - hop;
  const inWater = G.ground[U.idx(Math.floor(a.x), Math.floor(a.y))] === FP.T.agua;
  const flying = sp.voa && a.state === 'wander' && !inWater;
  const lift = flying ? 5 : 0;
  // sombra
  g.fillStyle = 'rgba(0,0,0,' + (flying ? .14 : .22) + ')';
  g.beginPath(); g.ellipse(px + 2 + lift * .6, py + 3 + lift * .8, sp.vis.L * .42 * sc, sp.vis.Wd * .55 * sc, a.h, 0, 7); g.fill();
  g.save();
  g.translate(px, py - lift);
  g.rotate(a.h);
  const bob = a.state === 'wander' ? Math.sin(a.ft * Math.PI) * .03 : (a.state === 'sleep' ? -.04 : 0);
  g.scale(sc * (1 + bob), sc * (1 - bob * .5));
  if (inWater) g.globalAlpha = .78;
  g.drawImage(s.c, -s.half, -s.half, s.half * 2, s.half * 2);
  g.globalAlpha = 1;
  g.restore();
  if (inWater){ g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; g.beginPath(); g.ellipse(px, py, sp.vis.L * .5 * sc + Math.sin(time * 3) * 1.5, sp.vis.Wd * .7 * sc, a.h, 0, 7); g.stroke(); }
  if (a.state === 'sleep' && cam.zoom > .8){ g.font = '9px sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('z', px + 8, py - 8 - (time * 4 % 4)); }
  const sel = FP.UI.selected && FP.UI.selected.type === 'animal' && FP.UI.selected.id === a.id;
  if (sel){ g.strokeStyle = '#F2B33D'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, sp.vis.L * .6 * sc + 3, 0, 7); g.stroke(); }
  if (cam.zoom > .9){ const ic = FP.Animals.statusIcons(a); if (ic.length) { g.font = '10px "Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.fillText(ic.join(''), px, py - sp.vis.Wd * .6 - 6); } }
}

function drawPerson(x, y, h, shirt, skin, hair, kid, ft, staff){
  const px = x * T, py = y * T, s = kid ? .72 : 1;
  g.save(); g.translate(px, py); g.rotate(h + Math.PI / 2); g.scale(s, s);
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(1.5, 2, 5, 3.6, 0, 0, 7); g.fill();
  const sw = Math.sin(ft * Math.PI) * 1.6;
  g.fillStyle = '#3a3f4a'; g.beginPath(); g.ellipse(-2, sw, 1.4, 2, 0, 0, 7); g.ellipse(2, -sw, 1.4, 2, 0, 0, 7); g.fill();
  g.fillStyle = shirt; g.beginPath(); g.ellipse(0, 0, 5, 3, 0, 0, 7); g.fill();
  g.fillStyle = skin; g.beginPath(); g.arc(0, 0, 2.6, 0, 7); g.fill();
  g.fillStyle = staff ? shirt : hair; g.beginPath(); g.arc(0, .6, 2.4, 0, Math.PI); g.fill();
  if (staff){ g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(-1, 1.6, 2, 1); }
  g.restore();
}

function drawNight(G, x0, y0, x1, y1){
  const h = G.hour;
  let dark = 0;
  if (h >= 18.5 && h < 21) dark = (h - 18.5) / 2.5;
  else if (h >= 21 || h < 5) dark = 1;
  else if (h >= 5 && h < 7) dark = 1 - (h - 5) / 2;
  if (dark <= 0) return;
  const a = dark * .5;
  g.save();
  g.fillStyle = `rgba(14,22,48,${a.toFixed(3)})`;
  g.fillRect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T);
  g.globalCompositeOperation = 'lighter';
  Object.values(G.objects).forEach(o => {
    if (o.x < x0 - 3 || o.x > x1 + 3 || o.y < y0 - 3 || o.y > y1 + 3) return;
    let r = 0;
    if (o.kind === 'deco' && FP.DECOS[o.type].luz) r = (FP.DECOS[o.type].alcance || 3) * T * .7;
    else if (o.kind === 'building' && o.type !== 'banco' && o.type !== 'lixeira') r = 40 + o.w * 10;
    else if (o.type === 'cristal' || o.type === 'arvore_mistica') r = 50;
    if (!r) return;
    const [bx, by] = o.kind === 'deco' && FP.DECOS[o.type].naBorda ? FP.World.borderOffset(G, o.x, o.y) : [0, 0];
    const cx = (o.x + o.w / 2 + bx) * T, cy = (o.y + o.h / 2 + by) * T;
    const gr = g.createRadialGradient(cx, cy, 2, cx, cy, r);
    const col = o.type === 'cristal' || o.type === 'arvore_mistica' ? '150,120,255' : '255,200,110';
    gr.addColorStop(0, `rgba(${col},${(.35 * dark).toFixed(3)})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  });
  g.restore();
}

function drawSelection(G){
  const sel = FP.UI.selected; if (!sel) return;
  if (sel.type === 'enc'){
    const e = G.enclosures[sel.id]; if (!e) return;
    g.strokeStyle = 'rgba(242,179,61,.95)'; g.lineWidth = 2.5; g.setLineDash([8, 5]); g.lineDashOffset = -time * 20;
    g.beginPath();
    e.tiles.forEach(i => {
      const x = i % FP.W, y = (i / FP.W) | 0;
      if (G.enc[i - FP.W] !== e.id){ g.moveTo(x * T, y * T); g.lineTo(x * T + T, y * T); }
      if (G.enc[i + FP.W] !== e.id){ g.moveTo(x * T, y * T + T); g.lineTo(x * T + T, y * T + T); }
      if (G.enc[i - 1] !== e.id){ g.moveTo(x * T, y * T); g.lineTo(x * T, y * T + T); }
      if (G.enc[i + 1] !== e.id){ g.moveTo(x * T + T, y * T); g.lineTo(x * T + T, y * T + T); }
    });
    g.stroke(); g.setLineDash([]);
    // tiles de observação
    g.fillStyle = 'rgba(46,143,184,.25)';
    e.viewTiles.forEach(i => g.fillRect((i % FP.W) * T, ((i / FP.W) | 0) * T, T, T));
  } else if (sel.type === 'obj'){
    const o = G.objects[sel.id]; if (!o) return;
    g.strokeStyle = '#F2B33D'; g.lineWidth = 2.5; g.setLineDash([6, 4]); g.lineDashOffset = -time * 20;
    g.strokeRect(o.x * T, o.y * T, o.w * T, o.h * T); g.setLineDash([]);
  }
}

/* Valor da lente para um recinto (0..100) */
R.lensValue = function(e){
  const G = FP.G;
  const as = FP.World.encAnimals(G, e);
  switch (R.lens){
    case 'limpeza': return e.clean;
    case 'bemestar': return as.length ? as.reduce((s, a) => s + a.happy, 0) / as.length : null;
    case 'saude': return as.length ? as.reduce((s, a) => s + a.health, 0) / as.length : null;
    case 'habitat': { const sps = FP.World.encSpecies(G, e); return sps.length ? sps.reduce((s, sp) => s + FP.World.habitat(G, e, sp), 0) / sps.length : null; }
    case 'lotacao': { const o = FP.World.encOccupancy(G, e).occ; return as.length ? U.clamp(100 - Math.max(0, o - .6) * 200, 0, 100) : null; }
  }
  return null;
};

/* ---------- Minimapa ---------- */
/* v7.2: o minimapa é montado pixel a pixel numa imagem de 160×120 (um tile = um pixel)
   e só é redesenhado quando está visível — antes eram ~19 mil retângulos a cada meio segundo */
let miniOff = null, miniData = null;
const rgbCache = {};
function rgb(hex){
  let c = rgbCache[hex];
  if (!c){ const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h.slice(0, 6), 16); c = rgbCache[hex] = [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  return c;
}
R.miniVisible = () => !!(mini && mini.offsetParent);
R.drawMinimap = function(){
  const G = FP.G; if (!G || !R.miniVisible()) return;
  if (!miniOff){ miniOff = document.createElement('canvas'); miniOff.width = FP.W; miniOff.height = FP.H; miniData = miniOff.getContext('2d').createImageData(FP.W, FP.H); }
  const d = miniData.data, road = rgb('#4b5158'), path = rgb('#e6dcc4'), enc = [167 * .5 + 123 * .5, 119 * .5 + 200 * .5, 74 * .5 + 108 * .5];
  for (let i = 0, n = FP.W * FP.H; i < n; i++){
    let c = rgb(FP.TERRAINS[G.ground[i]].cor);
    if (G.road[i]) c = road;
    if (G.path[i]) c = path;
    if (G.enc[i] >= 0) c = enc;
    const o = G.obj[i];
    if (o >= 0 && G.objects[o] && G.objects[o].kind === 'building') c = rgb(FP.BUILDINGS[G.objects[o].type].cor);
    const k = i * 4, dim = !G.owned[i] && !G.road[i] ? .55 : 1;
    d[k] = c[0] * dim; d[k + 1] = c[1] * dim; d[k + 2] = c[2] * dim; d[k + 3] = 255;
  }
  for (const v of G.visitors){ const x = v.x | 0, y = v.y | 0; if (x >= 0 && y >= 0 && x < FP.W && y < FP.H){ const k = (y * FP.W + x) * 4; d[k] = 242; d[k + 1] = 179; d[k + 2] = 61; } }
  miniOff.getContext('2d').putImageData(miniData, 0, 0);
  R._miniImg = miniOff;
};
function drawMiniCam(){
  if (!R._miniImg || !R.miniVisible()) return;
  mg.imageSmoothingEnabled = false;
  mg.drawImage(R._miniImg, 0, 0, mini.width, mini.height);
  const s = mini.width / FP.W / T;
  if (FP.R3 && FP.R3.active){ // em 3D: marcador do alvo da câmera + direção
    const c = FP.R3.miniInfo();
    mg.strokeStyle = '#FFF4DE'; mg.fillStyle = '#F2B33D'; mg.lineWidth = 2;
    mg.beginPath(); mg.arc(c.x * T * s, c.y * T * s, 4, 0, 7); mg.fill();
    mg.beginPath(); mg.moveTo(c.x * T * s, c.y * T * s); mg.lineTo((c.x + Math.sin(c.yaw) * -10) * T * s, (c.y + Math.cos(c.yaw) * -10) * T * s); mg.stroke();
    return;
  }
  const tl = R.screenToWorld(0, 0), br = R.screenToWorld(W, H);
  mg.strokeStyle = '#FFF4DE'; mg.lineWidth = 1.5;
  mg.strokeRect(tl.x * s, tl.y * s, (br.x - tl.x) * s, (br.y - tl.y) * s);
}
})();
