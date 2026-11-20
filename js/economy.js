/* =========================================================
   FAUNÓPOLIS — economy.js
   Finanças, ingressos, demanda, reputação, estoque de
   alimentos, mercado de animais, empréstimos, eventos e
   progressão por etapas.
   ========================================================= */
'use strict';
(function(){
const E = FP.Economy = {};
const M = FP.Market = {};
const U = FP.U;

/* ---------- Livro-caixa ---------- */
E.adminFactor = () => 1 - Math.min(3, FP.Staff.count('administrador')) * .04;
E.spend = function(v, cat){
  const G = FP.G; if (v <= 0) return;
  G.money -= v;
  G.finance.today.exp[cat] = (G.finance.today.exp[cat] || 0) + v;
  G.finance.totalExp += v;
};
E.earn = function(v, cat){
  const G = FP.G; if (v <= 0) return;
  G.money += v;
  G.finance.today.inc[cat] = (G.finance.today.inc[cat] || 0) + v;
  G.finance.totalInc += v;
};
E.todayTotals = function(){
  const t = FP.G.finance.today;
  const inc = Object.values(t.inc).reduce((a, b) => a + b, 0), exp = Object.values(t.exp).reduce((a, b) => a + b, 0);
  return {inc, exp, net: inc - exp};
};

/* ---------- Custos recorrentes (pagos 1x ao dia, à meia-noite) ---------- */
E.dailyCosts = function(){
  const G = FP.G;
  const af = E.adminFactor();
  let maint = 0;
  Object.values(G.enclosures).forEach(e => maint += e.tiles.length * .5 + 5);
  let fac = 0;
  Object.values(G.objects).forEach(o => { if (o.kind === 'building') fac += FP.BUILDINGS[o.type].manut; });
  let paths = 0; for (let i = 0; i < G.path.length; i++) if (G.path[i]) paths += .05;
  return {salarios: FP.Staff.dailySalaries() * af, manutencao: (maint + paths) * af, instalacoes: fac * af};
};
E.payDaily = function(){
  const c = E.dailyCosts();
  E.spend(c.salarios, 'salários');
  E.spend(c.manutencao, 'manutenção');
  E.spend(c.instalacoes, 'instalações');
  // empréstimos
  const G = FP.G;
  G.finance.loans = G.finance.loans.filter(l => {
    E.spend(l.parcela, 'empréstimos'); l.restante--; return l.restante > 0;
  });
};

/* ---------- Atratividade, preço justo e demanda ---------- */
E.computeAttraction = function(){
  const G = FP.G;
  const bySp = {};
  let welfSum = 0, welfN = 0, cleanSum = 0, cleanN = 0;
  Object.values(G.enclosures).forEach(e => {
    const as = FP.World.encAnimals(G, e);
    if (as.length){ cleanSum += e.clean; cleanN++; }
    const visible = e.viewTiles.length > 0;
    as.forEach(a => { welfSum += a.happy; welfN++; if (visible) bySp[a.sp] = (bySp[a.sp] || 0) + 1; });
  });
  let attr = 0;
  Object.keys(bySp).forEach(s => attr += FP.SPECIES[s].atr * Math.min(1.6, .6 + .2 * bySp[s]));
  const biomes = new Set(Object.keys(bySp).map(s => FP.SPECIES[s].bioma)).size;
  attr += biomes * 3;
  const facTypes = new Set(Object.values(G.objects).filter(o => o.kind === 'building' && o.door >= 0).map(o => o.type));
  attr += facTypes.size * 1.5;
  const st = G.stats;
  st.attraction = attr; st.speciesVisible = Object.keys(bySp).length; st.biomes = biomes;
  st.welfare = welfN ? welfSum / welfN : 70;
  st.clean = cleanN ? cleanSum / cleanN : 100;
  const quality = (.55 + .45 * st.welfare / 100) * (.7 + .3 * st.clean / 100) * (.85 + .15 * st.beauty / 100);
  st.quality = quality;
  st.fairPrice = Math.max(5, Math.round((8 + attr * .22 + G.rep * .25) * quality));
  return attr;
};
E.priceFactor = function(){
  const G = FP.G;
  const r = G.ticket / Math.max(1, G.stats.fairPrice);
  if (r <= 1) return 1 + (1 - r) * .3;
  return Math.max(.03, 1 - (r - 1) * 1.15);
};
E.dailyDemand = function(){
  const G = FP.G;
  const attr = G.stats.attraction;
  if (attr <= 0) return 0;
  let base = (12 + attr * 5.5 * (.45 + G.rep / 100)) * G.stats.quality;
  const dow = (G.day - 1) % 7;
  if (dow >= 5) base *= 1.3;
  if (G.event) base *= 1 + FP.EVENTS[G.event.id].demanda;
  if (FP.Staff.count('guia')) base *= 1.04;
  const d = base * E.priceFactor();
  G.stats.demand = Math.round(d);
  return d;
};

/* ---------- Reputação ---------- */
E.updateReputation = function(){
  const G = FP.G, st = G.stats;
  const variety = Math.min(1, (st.speciesVisible || 0) / 20) * 100;
  const target = .30 * st.welfare + .28 * st.satToday + .14 * st.clean + .14 * variety + .14 * st.beauty;
  G.rep += (target - G.rep) * .06;
  G.rep += E.conservationBonus() * .25;
  if (G.event) G.rep += FP.EVENTS[G.event.id].rep / FP.EVENTS[G.event.id].dias * .3;
  G.rep += Object.values(G.objects).filter(o => o.type === 'placa').length > 0 ? .05 : 0;
  G.rep = U.clamp(G.rep, 0, 100);
};
E.conservationBonus = () => Math.min(2, Object.values(FP.G.objects).filter(o => o.type === 'centro_pesq' && o.door >= 0).length) * .5;
E.stars = rep => Math.round(rep / 20 * 2) / 2;

/* ---------- Alimentos ---------- */
E.foodCapacity = () => 600 + Object.values(FP.G.objects).filter(o => o.type === 'deposito').length * 800;
E.foodStored = () => Object.values(FP.G.food).reduce((a, b) => a + b, 0);
E.dailyFoodNeed = function(){
  const need = {};
  FP.G.animals.forEach(a => { const sp = FP.SPECIES[a.sp]; need[sp.comida] = (need[sp.comida] || 0) + sp.qtd * (FP.Animals.isBaby(a) ? .5 : 1); });
  return need;
};
E.buyFood = function(type, qty, auto){
  const G = FP.G;
  const free = E.foodCapacity() - E.foodStored();
  qty = Math.min(qty, Math.floor(free));
  if (qty <= 0) return {ok:false, msg:'Depósito cheio. Construa um Depósito de alimentos para ampliar a capacidade.'};
  const unit = FP.FOODS[type].preco * (auto ? 1.1 : 1);
  let cost = qty * unit;
  if (cost > G.money){ qty = Math.floor(Math.max(0, G.money) / unit); cost = qty * unit; }
  if (qty <= 0) return {ok:false, msg:'Dinheiro insuficiente.'};
  E.spend(cost, 'alimentação');
  G.food[type] += qty;
  return {ok:true, qty, cost};
};
E.autoBuyFood = function(){
  const G = FP.G;
  const need = E.dailyFoodNeed();
  Object.keys(need).forEach(f => {
    if (!G.autoFood[f]) return;
    const want = need[f] * 3;
    if (G.food[f] < need[f] * 1.5 && G.money > 0){
      const r = E.buyFood(f, Math.ceil(want - G.food[f]), true);
      if (!r.ok) FP.UI.notify('warn', 'Compra automática falhou', `Não foi possível repor ${FP.FOODS[f].nome.toLowerCase()}: ${r.msg}`, {panel:'food'}, 'autofail_' + f);
    }
  });
  Object.keys(need).forEach(f => {
    const days = G.food[f] / Math.max(.01, need[f]);
    if (days < 1 && !G.autoFood[f]) FP.UI.notify('warn', 'Estoque baixo', `O estoque de ${FP.FOODS[f].nome.toLowerCase()} está baixo (${Math.round(G.food[f])} un., menos de 1 dia).`, {panel:'food'}, 'low_' + f);
  });
};

/* ---------- Empréstimos ---------- */
E.takeLoan = function(){
  const G = FP.G;
  if (G.finance.loans.length >= 3) return {ok:false, msg:'Limite de 3 empréstimos ativos.'};
  const valor = 25000, total = 28750, dias = 30;
  G.finance.loans.push({valor, parcela: total / dias, restante: dias});
  E.earn(valor, 'empréstimos');
  return {ok:true};
};

/* ---------- Eventos ---------- */
E.canEvent = function(id){
  const G = FP.G, ev = FP.EVENTS[id];
  if (G.stage < 4) return {ok:false, msg:'Eventos são liberados na Etapa 4.'};
  if (G.event) return {ok:false, msg:'Já existe um evento em andamento.'};
  if (ev.exige && !G.animals.some(a => ev.exige.includes(a.sp) && !a.quar)) return {ok:false, msg:'Requer ao menos uma destas espécies: ' + ev.exige.map(s => FP.SPECIES[s].plural).join(', ') + '.'};
  if (G.money < ev.custo) return {ok:false, msg:'Dinheiro insuficiente.'};
  return {ok:true};
};
E.startEvent = function(id){
  const c = E.canEvent(id); if (!c.ok) return c;
  const ev = FP.EVENTS[id];
  E.spend(ev.custo, 'eventos');
  FP.G.event = {id, left: ev.dias};
  return {ok:true};
};

/* ---------- Progressão ---------- */
E.stageProgress = function(n){
  const G = FP.G, st = FP.STAGES[n];
  if (!st || !st.req) return [];
  const r = st.req, out = [];
  const species = new Set(G.animals.filter(a => !a.quar).map(a => a.sp)).size;
  if (r.rep !== undefined) out.push({label:'Reputação', cur: G.rep, req: r.rep, fmt: v => Math.round(v)});
  if (r.especies !== undefined) out.push({label:'Espécies diferentes', cur: species, req: r.especies});
  if (r.visitantesTotal !== undefined) out.push({label:'Visitantes recebidos (total)', cur: G.stats.visitorsTotal, req: r.visitantesTotal});
  if (r.animais !== undefined) out.push({label:'Animais no zoológico', cur: G.animals.length, req: r.animais});
  if (r.satisfacao !== undefined) out.push({label:'Satisfação dos visitantes', cur: G.stats.satToday, req: r.satisfacao, fmt: v => Math.round(v) + '%'});
  if (r.lotes !== undefined) out.push({label:'Lotes de terreno', cur: FP.World.ownedChunks(G), req: r.lotes});
  if (r.bemEstar !== undefined) out.push({label:'Bem-estar animal médio', cur: G.stats.welfare, req: r.bemEstar, fmt: v => Math.round(v) + '%'});
  if (r.dinheiro !== undefined) out.push({label:'Saldo em caixa', cur: G.money, req: r.dinheiro, fmt: v => U.money(v)});
  return out;
};
E.checkStage = function(){
  const G = FP.G;
  if (G.stage >= 5) return;
  const next = G.stage + 1;
  const prog = E.stageProgress(next);
  if (prog.length && prog.every(p => p.cur >= p.req)){
    G.stage = next;
    const st = FP.STAGES[next];
    E.earn(st.premio, 'prêmios');
    FP.Audio.play('stage');
    FP.UI.stageUp(next);
    FP.UI.notify('good', `Etapa ${next}: ${st.nome}!`, `${st.desc} Prêmio: ${U.money(st.premio)}.`, {panel:'progress'});
    M.refresh(true);
  }
};
E.unlocked = function(item){ return !item.stage || FP.G.stage >= item.stage || FP.G.mode === 'livre'; };
E.speciesUnlocked = spId => E.unlocked(FP.SPECIES[spId]) && E.unlocked(FP.BIOMES[FP.SPECIES[spId].bioma]);

/* ---------- Mercado de animais ---------- */
M.refresh = function(force){
  const G = FP.G;
  if (!force && G.day - G.marketDay < 7) return;
  G.marketDay = G.day;
  const offers = [];
  Object.keys(FP.SPECIES).forEach(spId => {
    if (!E.speciesUnlocked(spId)) return;
    const sp = FP.SPECIES[spId];
    const n = sp.preco > 50000 ? U.randi(1, 2) : U.randi(2, 5);
    for (let k = 0; k < n; k++){
      const young = Math.random() < .35;
      const age = young ? U.randi(Math.floor(sp.mat * .4), sp.mat - 1) : U.randi(sp.mat, Math.floor(sp.vida * .55));
      const var_ = U.rand(.85, 1.2) * (young ? .8 : 1);
      offers.push({id: G.nextId++, sp: spId, sex: Math.random() < .5 ? 'M' : 'F', age, price: Math.round(sp.preco * var_ / 10) * 10,
        origem: U.pick(['Criadouro certificado', 'Zoológico parceiro', 'Programa de conservação', 'Centro de reabilitação'])});
    }
  });
  G.market = offers;
};
M.buy = function(offerId, enc){
  const G = FP.G;
  const o = G.market.find(x => x.id === offerId);
  if (!o) return {ok:false, msg:'Oferta indisponível.'};
  if (!enc) return {ok:false, msg:'Selecione um recinto de destino.'};
  const sp = FP.SPECIES[o.sp];
  if (G.money < o.price) return {ok:false, msg:'Dinheiro insuficiente.'};
  const comp = FP.World.compatible(G, enc, o.sp); if (!comp.ok) return comp;
  const occ = FP.World.encOccupancy(G, enc);
  const isBaby = o.age < sp.mat;
  if (occ.used + sp.esp * (isBaby ? .5 : 1) > enc.tiles.length) return {ok:false, msg:`Sem espaço: ${enc.name} não comporta mais um(a) ${sp.nome.toLowerCase()}. Amplie o recinto.`};
  if (!sp.nada && enc.tiles.every(i => G.ground[i] === FP.T.agua)) return {ok:false, msg:'O recinto não tem área seca para esta espécie.'};
  E.spend(o.price, 'compra de animais');
  const a = FP.Animals.create(o.sp, o.sex, o.age, enc, {origin:'compra'});
  a.health = U.randi(80, 100);
  if (FP.Health.enabled() && Math.random() < .04){
    FP.Health.infect(a, U.pick(['parasitose', 'respiratoria']));
  }
  if (G.quarantineOnBuy && FP.Health.clinics().length){
    const r = FP.Health.sendQuarantine(a);
    if (r.ok){ a.quarAuto = true; }
  }
  G.market = G.market.filter(x => x.id !== offerId);
  if (G.autoFood[sp.comida] && G.food[sp.comida] < sp.qtd * 2) E.autoBuyFood();
  const hab = FP.World.habitat(G, enc, o.sp);
  return {ok:true, a, warn: hab < 45 ? `Atenção: o habitat de ${enc.name} é pouco adequado para ${sp.plural} (${hab}%).` : null};
};
M.sell = function(a, conservation){
  const G = FP.G;
  const i = G.animals.indexOf(a); if (i < 0) return {ok:false};
  const v = FP.Animals.sellValue(a);
  G.animals.splice(i, 1);
  if (conservation){ G.rep = Math.min(100, G.rep + 1.2); return {ok:true, v:0}; }
  E.earn(v, 'venda de animais');
  return {ok:true, v};
};
M.sellWarning = function(a){
  const G = FP.G;
  const enc = G.enclosures[a.enc]; if (!enc) return null;
  const same = FP.World.encAnimals(G, enc).filter(x => x.sp === a.sp && x !== a);
  if (!same.length) return 'Este é o último animal da espécie neste recinto: o recinto ficará vazio para esta espécie.';
  const adultsSameSex = same.filter(x => x.sex === a.sex && !FP.Animals.isBaby(x));
  if (!FP.Animals.isBaby(a) && !adultsSameSex.length) return `Este é o último ${a.sex === 'M' ? 'macho' : 'fêmea'} adulto(a): a reprodução ficará inviável.`;
  return null;
};
M.move = function(a, enc){
  const G = FP.G;
  const comp = FP.World.compatible(G, enc, a.sp); if (!comp.ok) return comp;
  const sp = FP.SPECIES[a.sp];
  const occ = FP.World.encOccupancy(G, enc);
  if (occ.used + sp.esp * (FP.Animals.isBaby(a) ? .5 : 1) > enc.tiles.length) return {ok:false, msg:'Sem espaço no recinto de destino.'};
  a.enc = enc.id; a.homeEnc = enc.id; a.quar = false;
  FP.Animals.placeRandom(a, enc);
  return {ok:true};
};
})();
