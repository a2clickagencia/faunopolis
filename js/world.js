/* =========================================================
   FAUNÓPOLIS — world.js
   Estado do jogo, mapa em grade, terrenos (lotes), caminhos,
   recintos, objetos, regras de construção e rede de circulação.
   ========================================================= */
'use strict';
(function(){
const W = FP.World = {};
const U = FP.U;

const OX = FP.OX, OY = FP.OY;
const N4 = [[1,0],[-1,0],[0,1],[0,-1]];
const N8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
W.N4 = N4; W.N8 = N8;

/* ---------- Criação de um novo jogo ---------- */
W.newGame = function(mode, parkName){
  const n = FP.W * FP.H;
  const G = FP.G = {
    version: FP.VERSION, mode, parkName: parkName || 'Meu Zoológico',
    day: 1, hour: 7, speed: 1, paused: false,
    money: mode === 'livre' ? 500000 : 60000,
    ticket: 15, rep: 15, stage: mode === 'livre' ? 5 : 1,
    ground: new Uint8Array(n), owned: new Uint8Array(n), path: new Uint8Array(n),
    road: new Uint8Array(n), enc: new Int16Array(n).fill(-1), obj: new Int32Array(n).fill(-1),
    litter: new Uint8Array(n),
    enclosures: {}, objects: {}, animals: [], visitors: [], staff: [],
    food: {feno:150, frutas:60, sementes:60, insetos:40, carne:0, peixe:0, essencia:0},
    autoFood: {feno:true, frutas:true, sementes:true, insetos:true, carne:true, peixe:true, essencia:false},
    finance: {today:{inc:{}, exp:{}}, history:[], loans:[], totalInc:0, totalExp:0},
    stats: {visitorsTotal:0, visitorsToday:0, satSum:0, satN:0, satToday:60, births:0, deaths:0, welfare:70, clean:90, beauty:50, attraction:0, fairPrice:15, demand:0, carsToday:0, guidedToday:0},
    notifications: [], comments: [], market: [], marketDay: 0,
    event: null, quarantineOnBuy: false,
    seed: Math.floor(Math.random() * 1e9),
    gate: U.idx(OX + 35, OY + 37), spawnX: OX + 35.5, spawnY: FP.H - .5,
    mapW: FP.W, mapH: FP.H,
    nextId: 1, tutorialStep: 0, lastAutosave: 0, gameOver: false
  };
  generateTerrain(G);
  // lotes iniciais: chunks 3..5 × 2..4 da área inicial (deslocada para o centro-sul do mapa v2.0)
  const cx0 = OX / FP.CHUNK, cy0 = OY / FP.CHUNK;
  for (let cy = 2; cy <= 4; cy++) for (let cx = 3; cx <= 5; cx++) setChunkOwned(G, cx0 + cx, cy0 + cy);
  // estrada pública
  W.buildRoads(G);
  // entrada
  W.placeObject(G, 'building', 'entrada', OX + 34, OY + 38, true);
  // caminho inicial
  for (let y = 30; y <= 37; y++) G.path[U.idx(OX + 35, OY + y)] = 1;
  G.path[U.idx(OX + 36, OY + 37)] = 1;
  for (let x = 29; x <= 42; x++) G.path[U.idx(OX + x, OY + 30)] = 1;
  // limpa vegetação selvagem sobre os caminhos e entrada
  for (let i = 0; i < n; i++) if (G.path[i] && G.obj[i] >= 0 && G.objects[G.obj[i]].kind === 'deco') W.removeObject(G, G.obj[i]);
  // equipe inicial
  FP.Staff.hire('tratador', true); FP.Staff.hire('limpeza', true);
  if (mode === 'livre'){ FP.Staff.hire('tratador', true); }
  W.refreshNetwork(G);
  FP.Market.refresh(true);
  return G;
};

function setRoad(G, x, y){ const i = U.idx(x, y); G.road[i] = 1; G.ground[i] = FP.T.pedra; const o = G.obj[i]; if (o >= 0) W.removeObject(G, o); }
/* Estrada de acesso (vertical até a entrada) e avenida na borda sul do mapa */
W.ROAD_X = OX + 35;            // faixa vertical: x = ROAD_X e ROAD_X+1
W.ROAD_Y0 = OY + 40;           // começo da faixa vertical
W.AVENUE_Y = FP.H - 2;         // avenida: y = AVENUE_Y e AVENUE_Y+1
W.buildRoads = function(G){
  for (let y = W.ROAD_Y0; y < FP.H; y++) for (let x = W.ROAD_X; x <= W.ROAD_X + 1; x++) setRoad(G, x, y);
  for (let y = W.AVENUE_Y; y < FP.H; y++) for (let x = 0; x < FP.W; x++) setRoad(G, x, y);
};
function setChunkOwned(G, cx, cy){
  for (let y = cy * FP.CHUNK; y < (cy + 1) * FP.CHUNK; y++)
    for (let x = cx * FP.CHUNK; x < (cx + 1) * FP.CHUNK; x++)
      if (U.inMap(x, y)) G.owned[U.idx(x, y)] = 1;
}

function generateTerrain(G){
  const s = G.seed % 100000;
  const r = U.rng(G.seed);
  const isStart = (x, y) => x >= OX + 24 && x < OX + 48 && y >= OY + 16 && y < OY + 40;
  // v2.0: mapa grande com regiões naturais — norte frio e rochoso, leste árido, oeste de savana,
  // lagos, um rio sinuoso e florestas espalhadas.
  const riverX = y => FP.W * .2 + Math.sin(y / 13 + s % 7) * 7 + U.valueNoise(y / 9, 0, s + 9) * 8;
  for (let y = 0; y < FP.H; y++) for (let x = 0; x < FP.W; x++){
    const i = U.idx(x, y);
    const nf = U.valueNoise(x / 7, y / 7, s + 1), ns = U.valueNoise(x / 9, y / 9, s + 2), nw = U.valueNoise(x / 8, y / 8, s + 3), nr = U.valueNoise(x / 5, y / 5, s + 4);
    const big = U.valueNoise(x / 22, y / 22, s + 5);
    const north = 1 - y / (FP.H * .45), east = (x - FP.W * .72) / (FP.W * .28), west = (FP.W * .3 - x) / (FP.W * .3);
    let t = FP.T.grama;
    if (!isStart(x, y)){
      if (nw > .79 || (Math.abs(x - riverX(y)) < 1.3 && y < FP.H - 6)) t = FP.T.agua;
      else if (north > .55 && big + north * .5 > .95) t = (nr > .7 ? FP.T.pedra : (nw > .66 ? FP.T.gelo : FP.T.neve));
      else if (north > .3 && nr > .7) t = FP.T.pedra;
      else if (east > .2 && big + east * .4 > .75) t = ns > .55 ? FP.T.areia : (nr > .65 ? FP.T.pedra : FP.T.savana);
      else if (west > .25 && big + west * .4 > .7) t = nf > .7 ? FP.T.floresta : FP.T.savana;
      else if (nf > .72) t = FP.T.floresta;
      else if (ns > .76) t = FP.T.areia;
      else if (nw > .7) t = FP.T.lama;
      else if (nr > .82) t = FP.T.pedra;
      else if (ns < .2) t = FP.T.cerrado;
    } else if (nf > .85) t = FP.T.floresta;
    G.ground[i] = t;
  }
  // vegetação selvagem
  for (let y = 1; y < FP.H - 3; y++) for (let x = 0; x < FP.W; x++){
    const i = U.idx(x, y), t = G.ground[i];
    if (t === FP.T.agua || t === FP.T.gelo) continue;
    let p = t === FP.T.floresta ? .28 : t === FP.T.neve ? .06 : t === FP.T.savana ? .04 : .035;
    if (isStart(x, y)) p *= .4;
    if (r() < p){
      const T_ = FP.T;
      const type = t === T_.floresta ? (r() < .7 ? 'tropical' : (r() < .5 ? 'arbusto' : 'palmeira')) : t === T_.areia ? (r() < .7 ? 'arbusto_seco' : 'cacto') : t === T_.pedra ? 'pedra'
        : t === T_.neve ? (r() < .7 ? 'pinheiro' : 'pedra') : t === T_.savana ? (r() < .5 ? 'acacia' : (r() < .7 ? 'capim' : 'baoba')) : t === T_.lama ? 'arbusto'
        : (r() < .5 ? 'arbusto' : (r() < .5 ? 'tropical' : 'flores'));
      if (!(x >= OX + 33 && x <= OX + 38 && y >= OY + 28)) W.placeObject(G, 'deco', type, x, y, true);
    }
  }
}

/* ---------- Migração de jogos salvos da v1 (mapa 72×56) ----------
   O mapa antigo é colado no centro-sul do mapa novo (mesmo deslocamento da área
   inicial da v2.0) e o restante é gerado como terreno selvagem a ser comprado. */
W.migrateV1 = function(o){
  const ow = o.mapW || FP.V1.W, oh = o.mapH || FP.V1.H;
  if (ow === FP.W && oh === FP.H) return false;
  const ox = FP.OX, oy = FP.H - oh, n = FP.W * FP.H;
  const t = {ground: new Uint8Array(n), owned: new Uint8Array(n), path: new Uint8Array(n), road: new Uint8Array(n),
             enc: new Int16Array(n).fill(-1), obj: new Int32Array(n).fill(-1), litter: new Uint8Array(n), objects: {}, nextId: o.nextId, seed: o.seed || 1};
  generateTerrain(t);
  // remove a vegetação gerada onde o mapa antigo será colado
  Object.values(t.objects).forEach(ob => { if (ob.x >= ox && ob.x < ox + ow && ob.y >= oy && ob.y < oy + oh) W.removeObject(t, ob.id); });
  const map = i => (Math.floor(i / ow) + oy) * FP.W + (i % ow) + ox;
  for (let i = 0; i < ow * oh; i++){
    const j = map(i);
    ['ground', 'owned', 'path', 'road', 'enc', 'litter'].forEach(k => t[k][j] = o[k][i]);
    t.obj[j] = -1;
  }
  Object.values(o.objects).forEach(ob => { ob.x += ox; ob.y += oy; t.objects[ob.id] = ob; for (let y = ob.y; y < ob.y + ob.h; y++) for (let x = ob.x; x < ob.x + ob.w; x++) t.obj[U.idx(x, y)] = ob.id; });
  ['ground', 'owned', 'path', 'road', 'enc', 'obj', 'litter'].forEach(k => o[k] = t[k]);
  o.objects = t.objects; o.nextId = t.nextId;
  Object.values(o.enclosures).forEach(e => { e.tiles = e.tiles.map(map); e.viewTiles = []; });
  o.animals.forEach(a => { a.x += ox; a.y += oy; });
  o.staff.forEach(s => { s.x += ox; s.y += oy; });
  o.gate = map(o.gate); o.spawnX = (o.gate % FP.W) + .5; o.spawnY = FP.H - .5;
  o.mapW = FP.W; o.mapH = FP.H;
  W.buildRoads(o);
  if (o.cam){ o.cam.x += ox * FP.TILE; o.cam.y += oy * FP.TILE; }
  return true;
};

/* ---------- Consultas de tiles ---------- */
W.isOwned = (G, i) => G.owned[i] === 1;
W.chunkOf = (x, y) => [Math.floor(x / FP.CHUNK), Math.floor(y / FP.CHUNK)];
W.chunkOwned = (G, cx, cy) => {
  const x = cx * FP.CHUNK, y = cy * FP.CHUNK;
  return U.inMap(x, y) && G.owned[U.idx(x, y)] === 1;
};
W.chunkBuyable = (G, cx, cy) => {
  if (cx < 0 || cy < 0 || cx * FP.CHUNK >= FP.W || cy * FP.CHUNK >= FP.H) return false;
  if (W.chunkOwned(G, cx, cy)) return false;
  if ((cy + 1) * FP.CHUNK > W.AVENUE_Y) return false; // última faixa: avenida
  return N4.some(([dx, dy]) => W.chunkOwned(G, cx + dx, cy + dy));
};
W.ownedChunks = G => { let n = 0; for (let cy = 0; cy * FP.CHUNK < FP.H; cy++) for (let cx = 0; cx * FP.CHUNK < FP.W; cx++) if (W.chunkOwned(G, cx, cy)) n++; return n; };
// v2.0: curva de preço mais suave (o mapa tem 4,8x mais lotes) com teto
W.chunkPrice = G => Math.round(Math.min(400000, 6000 * Math.pow(1.11, Math.max(0, W.ownedChunks(G) - 9))) / 100) * 100;
W.buyChunk = function(G, cx, cy){
  if (!W.chunkBuyable(G, cx, cy)) return {ok:false, msg:'Este lote não pode ser comprado (precisa ser vizinho do seu terreno).'};
  const price = W.chunkPrice(G);
  if (G.money < price) return {ok:false, msg:'Dinheiro insuficiente para comprar este lote (' + U.money(price) + ').'};
  FP.Economy.spend(price, 'terreno');
  setChunkOwned(G, cx, cy);
  return {ok:true, price};
};

/* livre para construir (sem caminho, objeto, recinto, estrada) */
W.tileFree = (G, i) => G.owned[i] && !G.road[i] && !G.path[i] && G.enc[i] < 0 && G.obj[i] < 0;

/* ---------- Objetos (decoração e instalações) ---------- */
W.objDef = o => o.kind === 'deco' ? FP.DECOS[o.type] : FP.BUILDINGS[o.type];
W.canPlaceObject = function(G, kind, type, x, y){
  const def = kind === 'deco' ? FP.DECOS[type] : FP.BUILDINGS[type];
  const w = kind === 'deco' ? 1 : def.w, h = kind === 'deco' ? 1 : def.h;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++){
    if (!U.inMap(xx, yy)) return {ok:false, msg:'Fora do mapa.'};
    const i = U.idx(xx, yy);
    if (!G.owned[i]) return {ok:false, msg:'Terreno não adquirido.'};
    if (G.road[i]) return {ok:false, msg:'Não é possível construir na estrada.'};
    // v2.0: postes de luz e placas podem ficar na borda do caminho, sem bloquear a passagem
    if (G.path[i] && !(kind === 'deco' && def.naBorda)) return {ok:false, msg:'Há um caminho aqui.'};
    if (G.obj[i] >= 0) return {ok:false, msg:'Espaço ocupado.'};
    const water = G.ground[i] === FP.T.agua;
    if (kind === 'building'){
      if (G.enc[i] >= 0) return {ok:false, msg:'Instalações não podem ficar dentro de recintos.'};
      if (water) return {ok:false, msg:'Não é possível construir sobre a água.'};
    } else {
      if (def.naAgua && !water) return {ok:false, msg:'Precisa ser colocado sobre a água.'};
      if (!def.naAgua && water) return {ok:false, msg:'Não pode ser colocado sobre a água.'};
      if (def.foraRecinto && G.enc[i] >= 0) return {ok:false, msg:'Este item é para áreas de visitantes (fora dos recintos).'};
      if (def.soRecinto && G.enc[i] < 0) return {ok:false, msg: def.brinquedo ? 'Brinquedos devem ficar dentro de um recinto.' : 'O holofote deve ficar dentro de um recinto.'};
    }
  }
  return {ok:true};
};
W.placeObject = function(G, kind, type, x, y, free){
  const def = kind === 'deco' ? FP.DECOS[type] : FP.BUILDINGS[type];
  const w = kind === 'deco' ? 1 : def.w, h = kind === 'deco' ? 1 : def.h;
  const id = G.nextId++;
  const o = {id, kind, type, x, y, w, h, variant: U.randi(0, 3), uses: 0, revenue: 0};
  G.objects[id] = o;
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) G.obj[U.idx(xx, yy)] = id;
  if (!free) FP.Economy.spend(def.custo, kind === 'deco' ? 'decoração' : 'construção');
  return o;
};
W.removeObject = function(G, id){
  const o = G.objects[id]; if (!o) return;
  for (let yy = o.y; yy < o.y + o.h; yy++) for (let xx = o.x; xx < o.x + o.w; xx++) G.obj[U.idx(xx, yy)] = -1;
  delete G.objects[id];
};

/* ---------- Caminhos ---------- */
W.canPath = (G, i) => G.owned[i] && !G.road[i] && !G.path[i] && G.enc[i] < 0 && G.obj[i] < 0 && G.ground[i] !== FP.T.agua;
W.PATH_COST = 12;

/* ---------- Terreno (pintura de bioma) ---------- */
W.canPaint = (G, i, tid) => {
  if (!G.owned[i] || G.road[i] || G.path[i]) return false;
  if (G.ground[i] === tid) return false;
  const o = G.obj[i];
  if (o >= 0){
    const ob = G.objects[o];
    if (ob.kind === 'building') return false;
    if (tid === FP.T.agua && !FP.DECOS[ob.type].naAgua) return false;
    if (tid !== FP.T.agua && FP.DECOS[ob.type].naAgua) return false;
  }
  return true;
};

/* ---------- Recintos ---------- */
W.ENC_TILE_COST = 15; W.FENCE_COST = 14;
W.rectTiles = (x0, y0, x1, y1) => {
  const a = [], xa = Math.min(x0, x1), xb = Math.max(x0, x1), ya = Math.min(y0, y1), yb = Math.max(y0, y1);
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) if (U.inMap(x, y)) a.push(U.idx(x, y));
  return a;
};
/* v2.0 (correção inspirada no Urbis): um tile que já pertence a OUTRO recinto pode ser
   redesignado — assim como no Urbis uma zona residencial pode virar comercial sem demolir.
   Os tiles mudam de dono; o recinto doador encolhe (ou some, se ficar vazio e sem animais). */
function encTileOk(G, i, encId){
  if (!G.owned[i] || G.road[i] || G.path[i]) return false;
  const o = G.obj[i];
  if (o >= 0){ const ob = G.objects[o]; if (ob.kind === 'building') return false; if (FP.DECOS[ob.type].foraRecinto) return false; }
  return true;
}
/* Verifica se os recintos que perdem tiles continuam válidos. Retorna mensagem de erro ou null. */
function donorsCheck(G, tiles, keepEncId, keepSet){
  const lose = {};
  tiles.forEach(i => { const e = G.enc[i]; if (e >= 0 && e !== keepEncId) lose[e] = (lose[e] || 0) + 1; });
  for (const id of Object.keys(lose)){
    const d = G.enclosures[id]; if (!d) continue;
    const left = d.tiles.length - lose[id];
    const as = W.encAnimals(G, d);
    if (as.length && left < 9) return `${d.name} tem animais e ficaria com menos de 9 tiles. Mova os animais ou escolha outra área.`;
  }
  return null;
}
W.donorsCheck = donorsCheck;
/* Retira tiles dos recintos doadores, apagando os que ficarem vazios */
function takeFromDonors(G, tiles, keepEncId){
  const donors = new Set();
  tiles.forEach(i => { const e = G.enc[i]; if (e >= 0 && e !== keepEncId){ donors.add(e); G.enc[i] = -1; } });
  donors.forEach(id => {
    const d = G.enclosures[id]; if (!d) return;
    W.recomputeEnclosure(G, d);
    if (!d.tiles.length){ delete G.enclosures[id]; return; }
    W.encAnimals(G, d).forEach(a => FP.Animals.ensureInside(a));
  });
  return donors.size;
}
function perimeterOf(G, set){
  let p = 0;
  set.forEach(i => { const x = U.ix(i), y = U.iy(i); N4.forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (!U.inMap(nx, ny) || !set.has(U.idx(nx, ny))) p++; }); });
  return p;
}
W.enclosureCost = function(G, tiles, enc){
  const set = new Set(tiles);
  let newT = 0;
  // tiles novos (redesignar tile de outro recinto custa só a cerca/ajuste: 1/3 do valor)
  tiles.forEach(i => { if (!enc || G.enc[i] !== enc.id) newT += G.enc[i] >= 0 ? 1 / 3 : 1; });
  if (enc){ enc.tiles.forEach(i => set.add(i)); }
  const per = perimeterOf(G, set), oldPer = enc ? perimeterOf(G, new Set(enc.tiles)) : 0;
  return Math.max(0, Math.round(newT * W.ENC_TILE_COST + Math.max(0, per - oldPer) * W.FENCE_COST + (enc ? 0 : 200)));
};
W.validateEnclosureRect = function(G, tiles, enc){
  if (!enc){
    if (tiles.length < 9) return {ok:false, msg:'O recinto deve ter pelo menos 3×3 tiles.'};
    for (const i of tiles) if (!encTileOk(G, i, -2)) return {ok:false, msg:'A área precisa estar no seu terreno, sem caminhos ou instalações.'};
    const dm = donorsCheck(G, tiles, -2); if (dm) return {ok:false, msg: dm};
    const steal = tiles.filter(i => G.enc[i] >= 0).length;
    return {ok:true, steal};
  }
  let touches = false, added = 0;
  for (const i of tiles){
    if (G.enc[i] === enc.id){ touches = true; continue; }
    if (!encTileOk(G, i, enc.id)) return {ok:false, msg:'A ampliação deve ocupar área livre do seu terreno.'};
    added++;
    const x = U.ix(i), y = U.iy(i);
    if (N4.some(([dx, dy]) => U.inMap(x + dx, y + dy) && G.enc[U.idx(x + dx, y + dy)] === enc.id)) touches = true;
  }
  if (!touches) return {ok:false, msg:'A ampliação precisa encostar no recinto selecionado.'};
  if (!added) return {ok:false, msg:'Nenhum tile novo selecionado.'};
  const dm = donorsCheck(G, tiles, enc.id); if (dm) return {ok:false, msg: dm};
  return {ok:true, steal: tiles.filter(i => G.enc[i] >= 0 && G.enc[i] !== enc.id).length};
};
W.createEnclosure = function(G, tiles){
  takeFromDonors(G, tiles, -2);
  const id = G.nextId++;
  let count = Object.keys(G.enclosures).length + 1;
  const names = new Set(Object.values(G.enclosures).map(e => e.name));
  while (names.has('Recinto ' + count)) count++;
  const enc = {id, name:'Recinto ' + count, tiles: [], clean: 100, priority: 1, breeding: true, viewTiles: [], stats: null, created: G.day, unfedHours: 0, cleanAlert: 0};
  G.enclosures[id] = enc;
  tiles.forEach(i => { G.enc[i] = id; G.litter[i] = 0; });
  W.recomputeEnclosure(G, enc);
  return enc;
};
W.expandEnclosure = function(G, enc, tiles){
  takeFromDonors(G, tiles, enc.id);
  tiles.forEach(i => { G.enc[i] = enc.id; });
  W.recomputeEnclosure(G, enc);
};
/* v2.0 — Redefinir a área de um recinto: a nova área (retângulo) substitui a antiga por inteiro.
   Os animais são realocados dentro da nova área; tiles que saem viram terreno livre
   (vegetação e decoração ficam onde estão). Retorna {ok, msg, cost, refund}. */
W.reshapePreview = function(G, enc, tiles){
  if (tiles.length < 9) return {ok:false, msg:'A nova área deve ter pelo menos 3×3 tiles.'};
  for (const i of tiles) if (!encTileOk(G, i, enc.id)) return {ok:false, msg:'A nova área precisa estar no seu terreno, sem caminhos ou instalações.'};
  const dm = donorsCheck(G, tiles, enc.id); if (dm) return {ok:false, msg: dm};
  const set = new Set(tiles);
  const released = enc.tiles.filter(i => !set.has(i)).length;
  const fresh = tiles.filter(i => G.enc[i] !== enc.id);
  const per = perimeterOf(G, set), oldPer = perimeterOf(G, new Set(enc.tiles));
  const cost = Math.round(fresh.reduce((s, i) => s + (G.enc[i] >= 0 ? W.ENC_TILE_COST / 3 : W.ENC_TILE_COST), 0) + Math.max(0, per - oldPer) * W.FENCE_COST);
  const refund = released * 5;
  // capacidade: avisa se os animais atuais não caberiam
  const occ = W.encOccupancy(G, enc);
  const warn = occ.used > tiles.length ? `Atenção: os animais atuais precisam de ~${Math.ceil(occ.used)} tiles (superlotação).` : '';
  return {ok:true, cost, refund, released, added: fresh.length, warn};
};
W.reshapeEnclosure = function(G, enc, tiles){
  const p = W.reshapePreview(G, enc, tiles); if (!p.ok) return p;
  takeFromDonors(G, tiles, enc.id);
  const set = new Set(tiles);
  enc.tiles.forEach(i => { if (!set.has(i)) G.enc[i] = -1; });
  tiles.forEach(i => { if (G.enc[i] !== enc.id){ G.enc[i] = enc.id; G.litter[i] = 0; } });
  W.recomputeEnclosure(G, enc);
  W.encAnimals(G, enc).forEach(a => FP.Animals.ensureInside(a));
  return p;
};
/* v2.0 — Liberar área (equivalente ao "dezonear" do Urbis): remove a designação de recinto
   dos tiles sem demolir vegetação/decoração. Se um recinto inteiro for liberado e tiver
   animais, eles são transferidos para outro recinto compatível com espaço. */
W.releaseTiles = function(G, tiles){
  const byEnc = {}; let n = 0; const msgs = [];
  tiles.forEach(i => { if (G.enc[i] >= 0) (byEnc[G.enc[i]] = byEnc[G.enc[i]] || []).push(i); });
  Object.keys(byEnc).forEach(id => {
    const e = G.enclosures[id]; if (!e) return;
    const rm = byEnc[id], left = e.tiles.length - rm.length, as = W.encAnimals(G, e);
    if (as.length && left > 0 && left < 9){ msgs.push(`${e.name}: um recinto com animais precisa manter pelo menos 9 tiles.`); return; }
    if (as.length && left <= 0){
      // procura destino para cada animal
      const moves = [];
      for (const a of as){
        const dest = Object.values(G.enclosures).find(d => d.id !== e.id && W.compatible(G, d, a.sp).ok && W.encOccupancy(G, d).used + FP.SPECIES[a.sp].esp <= d.tiles.length);
        if (!dest){ moves.length = 0; break; }
        moves.push([a, dest]);
      }
      if (moves.length !== as.length){ msgs.push(`${e.name}: não há outro recinto compatível com espaço para os animais. Mova-os antes de liberar a área inteira.`); return; }
      moves.forEach(([a, d]) => { a.enc = d.id; a.homeEnc = d.id; FP.Animals.placeRandom(a, d); });
      msgs.push(`Animais de ${e.name} transferidos automaticamente.`);
    }
    rm.forEach(i => G.enc[i] = -1); n += rm.length;
    W.recomputeEnclosure(G, e);
    if (!e.tiles.length) delete G.enclosures[id];
    else W.encAnimals(G, e).forEach(a => FP.Animals.ensureInside(a));
  });
  return {n, msgs};
};
W.removeEnclosureTiles = function(G, enc, tiles){
  const rm = tiles.filter(i => G.enc[i] === enc.id);
  if (!rm.length) return {ok:false};
  const remaining = enc.tiles.length - rm.length;
  const animals = W.encAnimals(G, enc);
  if (remaining <= 0){
    if (animals.length) return {ok:false, msg:'Transfira ou venda os animais antes de demolir o recinto inteiro.'};
    enc.tiles.forEach(i => G.enc[i] = -1);
    delete G.enclosures[enc.id];
    return {ok:true, removed:true, n: rm.length};
  }
  if (animals.length && remaining < 9) return {ok:false, msg:'Um recinto com animais precisa manter pelo menos 9 tiles.'};
  rm.forEach(i => G.enc[i] = -1);
  W.recomputeEnclosure(G, enc);
  animals.forEach(a => FP.Animals.ensureInside(a));
  return {ok:true, n: rm.length};
};
W.recomputeEnclosure = function(G, enc){
  enc.tiles = [];
  for (let i = 0; i < G.enc.length; i++) if (G.enc[i] === enc.id) enc.tiles.push(i);
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, sx = 0, sy = 0;
  enc.tiles.forEach(i => { const x = U.ix(i), y = U.iy(i); minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); sx += x; sy += y; });
  enc.minX = minX; enc.minY = minY; enc.maxX = maxX; enc.maxY = maxY;
  // centro: o tile do recinto mais próximo da média
  const mx = sx / enc.tiles.length, my = sy / enc.tiles.length;
  let best = enc.tiles[0], bd = 1e9;
  enc.tiles.forEach(i => { const d = (U.ix(i) - mx) ** 2 + (U.iy(i) - my) ** 2; if (d < bd){ bd = d; best = i; } });
  enc.cx = U.ix(best) + .5; enc.cy = U.iy(best) + .5;
  enc.dirty = true;
  W.computeViewTiles(G, enc);
};
W.computeViewTiles = function(G, enc){
  const set = new Set();
  enc.tiles.forEach(i => { const x = U.ix(i), y = U.iy(i); N8.forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (U.inMap(nx, ny)){ const j = U.idx(nx, ny); if (G.path[j]) set.add(j); } }); });
  enc.viewTiles = [...set];
  W.computeSign(G, enc);
};
/* v2.0 — Placa de identificação do recinto: fica na cerca, voltada para o caminho de
   observação mais próximo do centro (antes era um rótulo flutuando no meio do recinto).
   sign = {x, y (tile do recinto), dx, dy (direção do caminho)} */
W.computeSign = function(G, enc){
  let best = null, bd = 1e9;
  enc.tiles.forEach(i => {
    const x = U.ix(i), y = U.iy(i);
    N4.forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy; if (!U.inMap(nx, ny)) return;
      const j = U.idx(nx, ny); if (!G.path[j]) return;
      const d = (x + .5 - enc.cx) ** 2 + (y + .5 - enc.cy) ** 2 + (dy === 1 ? -2 : 0); // prefere a cerca sul (de frente para a câmera)
      if (d < bd){ bd = d; best = {x, y, dx, dy}; }
    });
  });
  if (!best && enc.tiles.length){ // sem caminho: placa na cerca sul, no centro
    let by = -1, bx = 0; enc.tiles.forEach(i => { const x = U.ix(i), y = U.iy(i); if (y > by || (y === by && Math.abs(x + .5 - enc.cx) < Math.abs(bx + .5 - enc.cx))){ by = y; bx = x; } });
    best = {x: bx, y: by, dx: 0, dy: 1};
  }
  enc.sign = best;
};
/* Deslocamento de objetos "naBorda" (postes, placas) para a lateral do caminho */
W.borderOffset = function(G, x, y){
  const i = U.idx(x, y);
  if (!G.path[i]) return [0, 0];
  for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]){
    const nx = x + dx, ny = y + dy;
    if (!U.inMap(nx, ny) || !G.path[U.idx(nx, ny)]) return [dx * .4, dy * .4];
  }
  return [-.4, -.4]; // praça (cercado de caminho): canto
};
W.encAnimals = (G, enc) => G.animals.filter(a => a.enc === enc.id && !a.quar);
W.encAt = (G, x, y) => { if (!U.inMap(x, y)) return null; const e = G.enc[U.idx(x, y)]; return e >= 0 ? G.enclosures[e] : null; };

/* ---------- Estatísticas de habitat do recinto ---------- */
W.encStats = function(G, enc){
  if (enc.stats && !enc.dirty) return enc.stats;
  const st = {N: enc.tiles.length, water: 0, terr: {}, plants: {}, plantCount: 0, shelter: false, waterSource: false, enrich: {}, beauty: 0, land: 0, toys: {}, toyPos: []};
  enc.tiles.forEach(i => {
    const tk = FP.TERRAINS[G.ground[i]].key;
    if (tk === 'agua'){ st.water++; st.waterSource = true; } else { st.terr[tk] = (st.terr[tk] || 0) + 1; st.land++; }
    const o = G.obj[i];
    if (o >= 0){
      const ob = G.objects[o];
      if (ob && ob.kind === 'deco'){
        const d = FP.DECOS[ob.type];
        if (d.planta){ st.plants[ob.type] = (st.plants[ob.type] || 0) + 1; st.plantCount++; }
        if (d.abrigo) st.shelter = true;
        if (d.agua) st.waterSource = true;
        if (d.enriq) st.enrich[ob.type] = true;
        if (d.brinquedo){ st.toys[ob.type] = (st.toys[ob.type] || 0) + 1; st.toyPos.push({x: ob.x + .5, y: ob.y + .5, type: ob.type}); }
        st.beauty += d.beleza;
      }
    }
  });
  st.waterFrac = st.water / Math.max(1, st.N);
  enc.stats = st; enc.dirty = false; enc.habitatCache = {};
  return st;
};
/* Adequação do habitat de uma espécie (0..100) com detalhamento */
W.habitat = function(G, enc, spId, detail){
  const st = W.encStats(G, enc);
  if (!detail && enc.habitatCache && enc.habitatCache[spId] !== undefined) return enc.habitatCache[spId];
  const sp = FP.SPECIES[spId];
  let tsum = 0;
  Object.keys(st.terr).forEach(k => tsum += (sp.terr[k] || 0) * st.terr[k]);
  const terr = st.land ? tsum / st.land : (sp.nada ? .6 : 0);
  let water;
  if (sp.agua > 0) water = Math.min(1, st.waterFrac / sp.agua);
  else water = st.waterSource ? 1 : .35;
  if (!sp.nada && st.waterFrac > .45) water *= .5;
  let pc = 0; sp.plantas.forEach(p => pc += st.plants[p] || 0);
  const fol = sp.fol > 0 ? Math.min(1, (pc / Math.max(1, st.N)) / sp.fol) : 1;
  const shelter = sp.abrigo ? (st.shelter ? 1 : .25) : 1;
  const fun = W.toyFun(G, enc, spId);
  const enrich = sp.enriq ? (st.enrich[sp.enriq] ? 1 : .4 + .4 * fun) : 1;
  const v = Math.round(100 * (terr * .4 + water * .2 + fol * .2 + shelter * .1 + enrich * .1));
  if (!enc.habitatCache) enc.habitatCache = {};
  enc.habitatCache[spId] = v;
  if (detail) return {v, terr: terr * 100, water: water * 100, fol: fol * 100, shelter: shelter * 100, enrich: enrich * 100, fun: fun * 100};
  return v;
};
/* v7.1: diversão com brinquedos (0..1): tipos diferentes de brinquedos que a espécie adora */
W.toyFun = function(G, enc, spId){
  const st = W.encStats(G, enc);
  let n = 0; for (const k in st.toys) if (FP.toyLiked(k, spId)) n++;
  return n === 0 ? 0 : n === 1 ? .6 : n === 2 ? .85 : 1;
};
W.pickToy = function(G, a){
  const enc = G.enclosures[a.enc]; if (!enc) return null;
  const st = W.encStats(G, enc);
  const list = st.toyPos.filter(p => FP.toyLiked(p.type, a.sp));
  return list.length ? U.pick(list) : null;
};
/* v7.1: lago dentro do recinto (cavar / aterrar) */
W.pondPreview = function(G, enc, tiles, fill){
  const T = FP.T;
  const sel = tiles.filter(i => G.enc[i] === enc.id && (fill ? G.ground[i] === T.agua : G.ground[i] !== T.agua) && (G.obj[i] < 0 || (!fill && false)));
  const cost = sel.length * (fill ? 8 : FP.TERRAINS[T.agua].custo);
  if (!sel.length) return {ok:false, n:0, cost:0, msg: fill ? 'Não há água nesta área do recinto.' : 'Selecione uma área livre (sem plantas ou objetos) dentro do recinto.'};
  if (!fill){
    const as = W.encAnimals(G, enc).filter(a => !FP.SPECIES[a.sp].nada);
    const water = enc.tiles.filter(i => G.ground[i] === T.agua).length + sel.length;
    const land = enc.tiles.length - water;
    if (as.length && land < Math.max(9, enc.tiles.length * .4)) return {ok:false, n: sel.length, cost, msg:'Deixe pelo menos 40% de terra firme: há animais que não nadam neste recinto.'};
  }
  return {ok:true, n: sel.length, cost, tiles: sel};
};
W.applyPond = function(G, enc, tiles, fill){
  const p = W.pondPreview(G, enc, tiles, fill); if (!p.ok) return p;
  let land = FP.T.grama;
  const sps = W.encSpecies ? W.encSpecies(G, enc) : [];
  if (fill && sps.length){ const b = FP.BIOMES[FP.SPECIES[sps[0]].bioma]; if (b && FP.T[b.terreno] !== undefined) land = FP.T[b.terreno]; }
  p.tiles.forEach(i => { G.ground[i] = fill ? land : FP.T.agua; });
  enc.dirty = true;
  W.encAnimals(G, enc).forEach(a => FP.Animals.ensureInside(a));
  return p;
};
/* Ocupação: espaço usado / tiles */
W.encOccupancy = function(G, enc){
  const as = W.encAnimals(G, enc);
  let used = 0;
  as.forEach(a => used += FP.SPECIES[a.sp].esp * (FP.Animals.isBaby(a) ? .5 : 1));
  return {used, N: enc.tiles.length, occ: used / Math.max(1, enc.tiles.length), animals: as};
};
/* Capacidade em número de animais, baseada na espécie predominante */
W.encCapacity = function(G, enc, spId){
  const as = W.encAnimals(G, enc);
  let sp = spId;
  if (!sp){
    const cnt = {}; as.forEach(a => cnt[a.sp] = (cnt[a.sp] || 0) + 1);
    sp = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  }
  if (!sp) return {count: 0, cap: null};
  return {count: as.length, cap: Math.floor(enc.tiles.length / FP.SPECIES[sp].esp), sp};
};
W.encSpecies = function(G, enc){
  const s = new Set(); W.encAnimals(G, enc).forEach(a => s.add(a.sp)); return [...s];
};
/* Compatibilidade de espécies num mesmo recinto */
W.compatible = function(G, enc, spId){
  const sp = FP.SPECIES[spId];
  const present = W.encSpecies(G, enc).filter(s => s !== spId);
  for (const o of present){
    const so = FP.SPECIES[o];
    if (sp.pred || so.pred) return {ok:false, msg:`${sp.nome} não pode dividir recinto com ${so.nome} (predador).`};
    if (sp.bioma !== so.bioma) return {ok:false, msg:`${sp.nome} e ${so.nome} são de biomas diferentes.`};
  }
  return {ok:true};
};

/* ---------- Rede de circulação ---------- */
W.refreshNetwork = function(G){
  // alcance a partir do portão
  const reach = new Uint8Array(G.path.length);
  const q = [G.gate]; reach[G.gate] = 1;
  while (q.length){
    const i = q.pop(), x = U.ix(i), y = U.iy(i);
    for (const [dx, dy] of N4){ const nx = x + dx, ny = y + dy; if (!U.inMap(nx, ny)) continue; const j = U.idx(nx, ny); if (G.path[j] && !reach[j]){ reach[j] = 1; q.push(j); } }
  }
  G.reach = reach;
  Object.values(G.enclosures).forEach(e => { W.computeViewTiles(G, e); e.viewTiles = e.viewTiles.filter(i => reach[i]); });
  Object.values(G.objects).forEach(o => {
    if (o.kind !== 'building' || o.type === 'entrada') return;
    o.door = -1; o.doors = [];
    for (let yy = o.y - 1; yy <= o.y + o.h; yy++) for (let xx = o.x - 1; xx <= o.x + o.w; xx++){
      const inside = xx >= o.x && xx < o.x + o.w && yy >= o.y && yy < o.y + o.h;
      const corner = (xx === o.x - 1 || xx === o.x + o.w) && (yy === o.y - 1 || yy === o.y + o.h);
      if (inside || corner || !U.inMap(xx, yy)) continue;
      const j = U.idx(xx, yy);
      if (G.path[j] && reach[j]) o.doors.push(j);
    }
    if (o.doors.length) o.door = o.doors[0];
  });
  G.pathCount = 0; for (let i = 0; i < G.path.length; i++) if (G.path[i] && reach[i]) G.pathCount++;
  W.computeBeauty(G);
  G.netVersion = (G.netVersion || 0) + 1;
};

/* Beleza: decoração e vegetação vistas dos caminhos */
W.computeBeauty = function(G){
  let total = 0, n = 0;
  const pb = G.pathBeauty = new Float32Array(G.path.length);
  for (let i = 0; i < G.path.length; i++){
    if (!G.path[i] || !G.reach || !G.reach[i]) continue;
    const x = U.ix(i), y = U.iy(i);
    let b = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++){
      const nx = x + dx, ny = y + dy; if (!U.inMap(nx, ny)) continue;
      const o = G.obj[U.idx(nx, ny)];
      if (o >= 0){ const ob = G.objects[o]; if (ob.kind === 'deco') b += FP.DECOS[ob.type].beleza; else if (ob.type !== 'estacionamento') b += 1; }
      if (G.ground[U.idx(nx, ny)] === FP.T.agua) b += .6;
    }
    pb[i] = b;
    total += Math.min(30, b); n++;
  }
  G.stats.beauty = n ? U.clamp(Math.round(total / n / 18 * 100), 0, 100) : 0;
};

/* BFS na rede de caminhos. goal(i) -> true; retorna lista de tiles (sem o inicial) */
W.bfs = function(G, start, goal, maxN){
  if (goal(start)) return [];
  const prev = new Int32Array(G.path.length).fill(-1);
  prev[start] = start;
  const q = [start]; let h = 0, found = -1;
  const lim = maxN || 1e9;
  while (h < q.length && h < lim){
    const i = q[h++], x = U.ix(i), y = U.iy(i);
    for (let k = 0; k < 4; k++){
      const nx = x + N4[k][0], ny = y + N4[k][1];
      if (nx < 0 || ny < 0 || nx >= FP.W || ny >= FP.H) continue;
      const j = ny * FP.W + nx;
      if (!G.path[j] || prev[j] !== -1) continue;
      prev[j] = i;
      if (goal(j)){ found = j; h = q.length; break; }
      q.push(j);
    }
  }
  if (found < 0) return null;
  const out = []; let c = found;
  while (c !== start){ out.push(c); c = prev[c]; }
  return out.reverse();
};
/* Distâncias da rede a partir de um tile (para escolhas ponderadas) */
W.distField = function(G, start){
  const d = new Int32Array(G.path.length).fill(-1);
  d[start] = 0; const q = [start]; let h = 0;
  while (h < q.length){
    const i = q[h++], x = U.ix(i), y = U.iy(i);
    for (const [dx, dy] of N4){ const nx = x + dx, ny = y + dy; if (!U.inMap(nx, ny)) continue; const j = U.idx(nx, ny); if (G.path[j] && d[j] < 0){ d[j] = d[i] + 1; q.push(j); } }
  }
  return d;
};
W.nearestPath = function(G, x, y){
  let best = -1, bd = 1e9;
  for (let r = 0; r < 12 && best < 0; r++)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++){
      const nx = Math.floor(x) + dx, ny = Math.floor(y) + dy;
      if (!U.inMap(nx, ny)) continue; const j = U.idx(nx, ny);
      if (G.path[j] && G.reach[j]){ const d = dx * dx + dy * dy; if (d < bd){ bd = d; best = j; } }
    }
  return best;
};
})();
