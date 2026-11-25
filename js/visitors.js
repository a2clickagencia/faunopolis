/* =========================================================
   FAUNÓPOLIS — visitors.js
   Visitantes como agentes individuais no mapa: chegada,
   necessidades, escolha de destinos (BFS na rede de caminhos),
   observação de recintos, consumo, lixo, comentários e saída.
   Também move os funcionários pelo parque (efeito visual).
   ========================================================= */
'use strict';
(function(){
const V = FP.Visitors = {};
const U = FP.U, Wd = () => FP.World;

const SKIN = ['#f1c7a5','#e0ac85','#c68a62','#8d5a3b','#5e3b26','#f6d9c0'];
const SHIRT = ['#E8574B','#2E8FB8','#F2B33D','#7BC86C','#ffffff','#8A5CD1','#f49ac1','#1F6B4A','#ff8c42','#3d5a80'];
const HAIR = ['#2b1d14','#4a3020','#8a5a2b','#d9b26a','#1a1a1a','#a0522d','#c0c0c0'];
const SPEED = 1.5; // tiles/s em 1x

V.COMMENTS = {
  fome:['Não encontrei nenhum lugar para comer.', 'bad'],
  sede:['Estava com sede e não achei onde comprar bebida.', 'bad'],
  banheiro:['Não achei banheiro em lugar nenhum!', 'bad'],
  energia:['Faltam bancos para descansar.', 'bad'],
  caro:['O ingresso está caro para o que o parque oferece.', 'bad'],
  barato:['Que preço justo! Vale muito a pena.', 'good'],
  sujo:['Os caminhos estão cheios de lixo.', 'bad'],
  recintoSujo:['O recinto de {p} está sujo.', 'bad'],
  pequeno:['O recinto de {p} parece pequeno.', 'bad'],
  triste:['Os animais do recinto de {p} pareciam tristes ou doentes.', 'bad'],
  habitat:['O recinto de {p} não parece o habitat natural deles.', 'bad'],
  adorei:['Adorei ver {p} tão de perto!', 'good'],
  bonito:['O zoológico está muito bonito!', 'good'],
  poucos:['Esperava ver mais animais.', 'bad'],
  lotado:['O parque estava lotado demais.', 'bad'],
  bemCuidado:['Dá pra ver que os animais são bem cuidados.', 'good'],
  semAcesso:['Tinha um recinto que não dava para ver de perto.', 'bad']
};
V.comment = function(key, sp){
  const G = FP.G;
  const c = V.COMMENTS[key]; if (!c) return;
  const txt = c[0].replace('{p}', sp ? FP.SPECIES[sp].plural : '');
  const k = key + (sp || '');
  const ex = G.comments.find(x => x.k === k);
  if (ex){ ex.n++; ex.day = G.day; }
  else { G.comments.unshift({k, key, txt, type: c[1], n: 1, day: G.day}); if (G.comments.length > 60) G.comments.pop(); }
};

/* ---------- Índices da rede (recalculados quando os caminhos mudam) ---------- */
let netV = -1, viewMap = null, doorMap = null, binNear = null;
function rebuildIndex(){
  const G = FP.G;
  if (netV === G.netVersion) return;
  netV = G.netVersion;
  viewMap = new Map();
  Object.values(G.enclosures).forEach(e => e.viewTiles.forEach(t => { if (!viewMap.has(t)) viewMap.set(t, []); viewMap.get(t).push(e.id); }));
  doorMap = {fome: new Map(), sede: new Map(), banheiro: new Map(), energia: new Map(), compras: new Map()};
  Object.values(G.objects).forEach(o => {
    if (o.kind !== 'building' || !o.doors || !o.doors.length) return;
    const def = FP.BUILDINGS[o.type];
    if (!def.atende) return;
    o.doors.forEach(d => doorMap[def.atende].set(d, o.id));
    if (o.type === 'lanchonete' || o.type === 'restaurante') o.doors.forEach(d => doorMap.sede.set(d, o.id)); // também vendem bebida
  });
  binNear = new Uint8Array(G.path.length);
  Object.values(G.objects).forEach(o => {
    if (o.type !== 'lixeira') return;
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++){ const x = o.x + dx, y = o.y + dy; if (U.inMap(x, y)) binNear[U.idx(x, y)] = 1; }
  });
}
V.invalidate = () => { netV = -1; };

/* ---------- Criação ---------- */
V.spawn = function(){
  const G = FP.G;
  const v = {
    id: G.nextId++, x: G.spawnX + U.rand(-.3, .3), y: G.spawnY, path: [], state: 'in', act: null,
    needs: {fome: U.rand(55, 100), sede: U.rand(55, 100), banheiro: U.rand(60, 100), energia: U.rand(70, 100)},
    happy: 62, money: U.rand(30, 140), seen: [], stay: U.rand(3, 6.5), entered: G.day * 24 + G.hour,
    ox: U.rand(-.22, .22), oy: U.rand(-.22, .22), skin: U.pick(SKIN), shirt: U.pick(SHIRT), hair: U.pick(HAIR),
    kid: Math.random() < .25, h: -Math.PI / 2, ft: 0, bubble: null, noFac: {}, litter: 0, complained: {}, tile: -1
  };
  // preço do ingresso
  FP.Economy.earn(G.ticket, 'ingressos');
  const r = G.ticket / Math.max(1, G.stats.fairPrice);
  if (r > 1.3){ v.happy -= Math.min(25, (r - 1.3) * 30); if (Math.random() < .4) V.comment('caro'); }
  else if (r < .8){ v.happy += 6; if (Math.random() < .15) V.comment('barato'); }
  // estacionamento
  const lots = Object.values(G.objects).filter(o => o.type === 'estacionamento').length;
  if (lots && Math.random() < .35 && G.stats.carsToday < lots * 80){ G.stats.carsToday++; FP.Economy.earn(FP.BUILDINGS.estacionamento.venda, 'estacionamento'); }
  // passeio guiado
  const guides = FP.Staff.count('guia');
  if (guides && G.stats.guidedToday < guides * FP.STAFF.guia.cap && Math.random() < .5){ G.stats.guidedToday++; FP.Economy.earn(4, 'passeios guiados'); v.happy += 4; }
  G.visitors.push(v);
  G.stats.visitorsToday++; G.stats.visitorsTotal++;
  return v;
};

function bubble(v, txt){ v.bubble = {txt, t: 2.2}; }
function now(){ const G = FP.G; return G.day * 24 + G.hour; }

/* ---------- Decisão ---------- */
function decide(v){
  const G = FP.G;
  rebuildIndex();
  const t = now();
  const cur = v.tile;
  if (cur < 0 || !G.path[cur]){ const np = Wd().nearestPath(G, v.x, v.y); if (np < 0){ v.state = 'gone'; return; } v.tile = np; v.x = U.ix(np) + .5; v.y = U.iy(np) + .5; }
  const closing = G.hour >= FP.CLOSE_H - .3 || G.hour < FP.OPEN_H;
  if (closing || t - v.entered >= v.stay || v.happy < 12){ return goLeave(v); }
  const n = v.needs;
  const order = [['banheiro', 25], ['fome', 30], ['sede', 30], ['energia', 22]];
  for (const [need, th] of order){
    if (n[need] < th && !(v.noFac[need] > t)){
      const m = doorMap[need];
      const p = m.size ? Wd().bfs(G, v.tile, i => m.has(i)) : null;
      if (p){ v.path = p; v.goal = {type: 'fac', need, obj: m.get(p.length ? p[p.length - 1] : v.tile)}; return; }
      v.noFac[need] = t + 1.5;
      if (!v.complained[need]){ v.complained[need] = 1; V.comment(need); bubble(v, need === 'fome' ? '🍔❓' : need === 'sede' ? '🥤❓' : need === 'banheiro' ? '🚻❗' : '🪑❓'); v.happy -= 8; }
    }
  }
  // recinto ainda não visto
  const p = Wd().bfs(G, v.tile, i => { const l = viewMap.get(i); return l && l.some(e => !v.seen.includes(e)); });
  if (p){
    const last = p.length ? p[p.length - 1] : v.tile;
    const encId = viewMap.get(last).find(e => !v.seen.includes(e));
    v.path = p; v.goal = {type: 'view', enc: encId}; return;
  }
  // compras
  if (v.money > 25 && Math.random() < .35 && doorMap.compras.size && !v.shopped){
    const ps = Wd().bfs(G, v.tile, i => doorMap.compras.has(i));
    if (ps){ v.path = ps; v.goal = {type: 'fac', need: 'compras', obj: doorMap.compras.get(ps.length ? ps[ps.length - 1] : v.tile)}; return; }
  }
  if (v.seen.length === 0 && t - v.entered > 1 && !v.complained.poucos){ v.complained.poucos = 1; V.comment('poucos'); v.happy -= 10; }
  if (t - v.entered > v.stay * .6 && Math.random() < .5) return goLeave(v);
  // passeio aleatório
  let c = v.tile; const walk = [];
  for (let k = 0; k < U.randi(4, 10); k++){
    const x = U.ix(c), y = U.iy(c);
    const opts = Wd().N4.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => U.inMap(a, b) && G.path[U.idx(a, b)]).map(([a, b]) => U.idx(a, b)).filter(j => walk.length < 2 || j !== walk[walk.length - 2]);
    if (!opts.length) break;
    c = U.pick(opts); walk.push(c);
  }
  v.path = walk; v.goal = {type: 'wander'};
  if (!walk.length){ v.act = {until: t + .3, type: 'idle'}; }
}
function goLeave(v){
  const G = FP.G;
  const p = Wd().bfs(G, v.tile, i => i === G.gate);
  v.state = 'leaving';
  if (p){ v.path = p; v.goal = {type: 'exit'}; }
  else { v.path = []; v.goal = {type: 'exit'}; }
}

/* ---------- Chegada ao destino ---------- */
function arrive(v){
  const G = FP.G;
  const g = v.goal || {}; const t = now();
  if (g.type === 'view'){
    const enc = G.enclosures[g.enc];
    v.seen.push(g.enc);
    if (!enc){ return; }
    const as = Wd().encAnimals(G, enc);
    v.act = {type: 'view', until: t + U.rand(.25, .55), enc: enc.id};
    // olhar para o recinto
    v.h = Math.atan2(enc.cy - v.y, enc.cx - v.x);
    if (!as.length){ v.happy -= 2; return; }
    const welfare = as.reduce((s, a) => s + a.happy, 0) / as.length;
    const spCount = {}; as.forEach(a => spCount[a.sp] = (spCount[a.sp] || 0) + 1);
    const mainSp = Object.keys(spCount).sort((a, b) => spCount[b] - spCount[a])[0];
    const hab = Wd().habitat(G, enc, mainSp);
    const occ = Wd().encOccupancy(G, enc).occ;
    const appeal = .4 * welfare + .3 * hab + .3 * enc.clean;
    let atr = 0; Object.keys(spCount).forEach(s => atr += FP.SPECIES[s].atr);
    const babies = as.some(a => FP.Animals.isBaby(a));
    const delta = (appeal - 52) / 5 + Math.min(10, atr * .55) + (babies ? 3 : 0) - (occ > 1 ? 6 : 0);
    v.happy = U.clamp(v.happy + delta, 0, 100);
    if (delta > 9){ bubble(v, '😍'); if (Math.random() < .12) V.comment(appeal > 75 && Math.random() < .4 ? 'bemCuidado' : 'adorei', mainSp); }
    else if (delta < 0){ bubble(v, '😕');
      if (Math.random() < .3){
        if (enc.clean < 40) V.comment('recintoSujo', mainSp);
        else if (occ > 1) V.comment('pequeno', mainSp);
        else if (welfare < 40) V.comment('triste', mainSp);
        else if (hab < 45) V.comment('habitat', mainSp);
      }
    }
  } else if (g.type === 'fac'){
    const o = G.objects[g.obj];
    if (!o){ return; }
    const def = FP.BUILDINGS[o.type];
    const dur = def.atende === 'energia' ? U.rand(.3, .6) : def.atende === 'compras' ? .3 : .25;
    v.act = {type: 'use', until: t + dur, obj: o.id};
    if (def.atende === 'compras'){
      v.shopped = true;
      if (v.money >= def.venda * .6){ const s = def.venda * U.rand(.6, 1.4); v.money -= s; FP.Economy.earn(s, 'lojas'); FP.Economy.spend(s * def.custoVenda / def.venda, 'mercadorias'); o.revenue += s; o.uses++; v.happy += 5; bubble(v, '🎁'); }
      return;
    }
    if (def.venda > 0){
      if (v.money < def.venda * .5){ bubble(v, '💸'); v.needs[g.need] = Math.max(v.needs[g.need], 45); return; }
      v.money -= def.venda;
      FP.Economy.earn(def.venda, def.atende === 'fome' ? 'alimentação (visitantes)' : 'bebidas');
      FP.Economy.spend(def.custoVenda, 'mercadorias');
      o.revenue += def.venda;
      v.litter = 1;
    }
    o.uses++;
    v.needs[g.need] = 100;
    if (g.need === 'fome') v.needs.sede = Math.min(100, v.needs.sede + 30);
    v.happy = Math.min(100, v.happy + 3 + (def.bonus || 0));
    bubble(v, def.icone);
  }
}

/* ---------- Atualização por quadro ---------- */
V.update = function(dtGame){
  const G = FP.G;
  const dtH = dtGame / FP.HOUR_SEC;
  const t = now();
  rebuildIndex();
  // v2.5: limite de decisões (buscas de caminho) por quadro — espalha o trabalho e evita picos
  let budget = FP.Mobile && FP.Mobile.touch ? 16 : 48;
  for (const v of G.visitors){
    if (v.bubble){ v.bubble.t -= dtGame / Math.max(1, G.speed); if (v.bubble.t <= 0) v.bubble = null; }
    // necessidades
    v.needs.fome -= 7 * dtH; v.needs.sede -= 9 * dtH; v.needs.banheiro -= 7 * dtH; v.needs.energia -= 6 * dtH;
    for (const k in v.needs) if (v.needs[k] < 0){ v.needs[k] = 0; v.happy -= 3 * dtH; }
    if (v.state === 'in'){
      const tx = U.ix(G.gate) + .5, ty = U.iy(G.gate) + .5;
      const d = U.dist(v.x, v.y, tx, ty), step = SPEED * dtGame;
      v.h = Math.atan2(ty - v.y, tx - v.x);
      if (d <= step){ v.x = tx; v.y = ty; v.tile = G.gate; v.state = 'park'; }
      else { v.x += (tx - v.x) / d * step; v.y += (ty - v.y) / d * step; }
      v.ft += dtGame * 3; continue;
    }
    if (v.state === 'out'){
      const ty = FP.H + 1, step = SPEED * dtGame;
      v.h = Math.PI / 2; v.y += step; v.ft += dtGame * 3;
      if (v.y >= ty) v.state = 'gone';
      continue;
    }
    if (v.act){
      if (t >= v.act.until) v.act = null; else continue;
    }
    if (v.path.length){
      const nxt = v.path[0];
      if (!G.path[nxt]){ v.path = []; continue; }
      const tx = U.ix(nxt) + .5 + v.ox, ty = U.iy(nxt) + .5 + v.oy;
      const d = U.dist(v.x, v.y, tx, ty), step = SPEED * (v.kid ? 1.1 : 1) * dtGame;
      v.h = Math.atan2(ty - v.y, tx - v.x);
      v.ft += dtGame * 3;
      if (d <= step){
        v.x = tx; v.y = ty; v.tile = nxt; v.path.shift();
        // efeitos do tile
        const lit = G.litter[nxt];
        if (lit) { v.happy -= lit * .08; if (lit > 3 && Math.random() < .02) V.comment('sujo'); }
        if (G.pathBeauty) v.happy = Math.min(100, v.happy + Math.min(.6, G.pathBeauty[nxt] * .012));
        if (v.litter && Math.random() < (binNear && binNear[nxt] ? .02 : .12)){ G.litter[nxt] = Math.min(6, G.litter[nxt] + 1); v.litter = 0; }
        if (v.litter && Math.random() < .15) v.litter = 0; // usou a lixeira
        if (!v.path.length){ if (v.state === 'leaving'){ v.state = 'out'; v.x = U.ix(G.gate) + .5; } else arrive(v); }
      } else { v.x += (tx - v.x) / d * step; v.y += (ty - v.y) / d * step; }
      continue;
    }
    if (v.state === 'leaving'){ v.state = 'out'; continue; }
    if (budget-- <= 0) continue;
    decide(v);
  }
  // remoção e registro da satisfação
  const gone = G.visitors.filter(v => v.state === 'gone');
  if (gone.length){
    gone.forEach(v => {
      G.stats.satSum += v.happy; G.stats.satN++;
      if (v.happy > 80 && Math.random() < .15) V.comment('bonito');
    });
    G.visitors = G.visitors.filter(v => v.state !== 'gone');
  }
  // funcionários
  V.updateStaff(dtGame);
};

/* Satisfação atual (média dos que saíram hoje + presentes) */
V.satisfaction = function(){
  const G = FP.G;
  let s = G.stats.satSum, n = G.stats.satN;
  G.visitors.forEach(v => { s += v.happy; n++; });
  return n ? s / n : G.stats.satToday;
};

/* Superlotação (horária) */
V.hourly = function(){
  const G = FP.G;
  const crowd = G.visitors.length / Math.max(1, G.pathCount || 1) / 2;
  if (crowd > 1.1){ G.visitors.forEach(v => { v.happy -= 2.5; }); if (Math.random() < .3) V.comment('lotado'); }
  if (Object.values(G.objects).some(o => o.type === 'info' && o.door >= 0)) G.visitors.forEach(v => v.happy = Math.min(100, v.happy + .6));
  const blind = Object.values(G.enclosures).filter(e => e.viewTiles.length === 0 && Wd().encAnimals(G, e).length);
  if (blind.length && G.visitors.length && Math.random() < .2) V.comment('semAcesso');
};
V.maxConcurrent = () => Math.min(800, Math.max(25, Math.round((FP.G.pathCount || 0) * 2.5)));

/* ---------- Funcionários caminhando ---------- */
V.updateStaff = function(dtGame){
  const G = FP.G;
  const t = now();
  for (const s of G.staff){
    if (s.until && t < s.until) continue;
    if (s.path && s.path.length){
      const nxt = s.path[0];
      if (!G.path[nxt]){ s.path = []; continue; }
      const tx = U.ix(nxt) + .5, ty = U.iy(nxt) + .5;
      const d = U.dist(s.x, s.y, tx, ty), step = 1.3 * dtGame;
      s.h = Math.atan2(ty - s.y, tx - s.x); s.ft = (s.ft || 0) + dtGame * 3;
      if (d <= step){ s.x = tx; s.y = ty; s.tile = nxt; s.path.shift(); if (!s.path.length){ s.until = t + U.rand(.4, 1.5); const e = G.enclosures[s.target]; if (e) s.h = Math.atan2(e.cy - s.y, e.cx - s.x); } }
      else { s.x += (tx - s.x) / d * step; s.y += (ty - s.y) / d * step; }
      continue;
    }
    // novo destino
    let cur = s.tile;
    if (cur === undefined || cur < 0 || !G.path[cur]){ cur = Wd().nearestPath(G, s.x, s.y); if (cur < 0) continue; s.tile = cur; s.x = U.ix(cur) + .5; s.y = U.iy(cur) + .5; }
    let target = null;
    const encs = Object.values(G.enclosures).filter(e => e.viewTiles.length);
    if (s.role !== 'guia' && s.role !== 'administrador' && encs.length){
      const e = s.assign >= 0 && G.enclosures[s.assign] && G.enclosures[s.assign].viewTiles.length ? G.enclosures[s.assign] : U.pick(encs);
      target = U.pick(e.viewTiles); s.target = e.id;
    } else {
      const doors = Object.values(G.objects).filter(o => o.door >= 0);
      target = doors.length && Math.random() < .5 ? U.pick(doors).door : (encs.length ? U.pick(U.pick(encs).viewTiles) : G.gate);
      s.target = null;
    }
    const p = Wd().bfs(G, cur, i => i === target);
    s.path = p || []; if (!p) s.until = t + 1;
  }
};
})();
