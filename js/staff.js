/* =========================================================
   FAUNÓPOLIS — staff.js
   Funcionários (contratação, atribuição, capacidade),
   rotinas de alimentação e limpeza, saúde/doenças/veterinária
   e quarentena.
   ========================================================= */
'use strict';
(function(){
const S = FP.Staff = {};
const H = FP.Health = {};
const U = FP.U;

/* ---------- Contratação ---------- */
S.hire = function(role, free){
  const G = FP.G;
  const def = FP.STAFF[role];
  const used = new Set(G.staff.map(s => s.name));
  let name = U.pick(FP.STAFF_NAMES); for (let k = 0; k < 6 && used.has(name); k++) name = U.pick(FP.STAFF_NAMES);
  if (!free){
    const fee = def.salario * 5;
    if (G.money < fee) return {ok:false, msg:'Dinheiro insuficiente para a contratação (' + U.money(fee) + ').'};
    FP.Economy.spend(fee, 'contratações');
  }
  const gx = U.ix(G.gate) + .5, gy = U.iy(G.gate) + .5;
  const s = {id: G.nextId++, role, name, salary: def.salario, assign: -1, hired: G.day, x: gx, y: gy, path: [], wait: U.rand(0, 3), h: 0, ft: 0};
  G.staff.push(s);
  return {ok:true, s};
};
S.fire = function(id){
  const G = FP.G;
  const i = G.staff.findIndex(s => s.id === id);
  if (i >= 0){ const s = G.staff[i]; G.staff.splice(i, 1); FP.Economy.spend(s.salary * 3, 'rescisões'); return true; }
  return false;
};
S.count = role => FP.G.staff.filter(s => s.role === role).length;
S.efficiency = function(){
  const G = FP.G;
  const rooms = Object.values(G.objects).filter(o => o.type === 'sala_func').length;
  return 1 + Math.min(2, rooms) * .1;
};
S.dailySalaries = () => FP.G.staff.reduce((t, s) => t + s.salary, 0);

/* Cobertura dos biólogos (0..1) */
S.biologistCoverage = function(){
  const G = FP.G;
  const n = S.count('biologo'); if (!n) return 0;
  const animals = G.animals.length || 1;
  return Math.min(1, n * FP.STAFF.biologo.cap * S.efficiency() / animals);
};

/* ---------- Rodada de alimentação (7h, 13h, 19h) ---------- */
S.feedRound = function(){
  const G = FP.G;
  const eff = S.efficiency();
  const keepers = G.staff.filter(s => s.role === 'tratador');
  let pool = 0; const assigned = {};
  keepers.forEach(k => { if (k.assign >= 0 && G.enclosures[k.assign]) assigned[k.assign] = (assigned[k.assign] || 0) + FP.STAFF.tratador.cap * eff; else pool += FP.STAFF.tratador.cap * eff; });
  const encs = Object.values(G.enclosures).map(e => ({e, as: FP.World.encAnimals(G, e)})).filter(o => o.as.length);
  // prioridade: alta(2) > normal(1) > baixa(0); depois menor saciedade média
  encs.forEach(o => o.avgSat = o.as.reduce((t, a) => t + a.sat, 0) / o.as.length);
  encs.sort((a, b) => (b.e.priority - a.e.priority) || (a.avgSat - b.avgSat));
  const shortage = {}; let unfed = [];
  encs.forEach(o => {
    let cap = assigned[o.e.id] || 0;
    let need = o.as.length;
    let use = Math.min(need, cap); need -= use;
    const fromPool = Math.min(need, pool); pool -= fromPool; use += fromPool;
    if (use < o.as.length) unfed.push(o.e);
    // quem é alimentado: os de menor saciedade primeiro
    const list = [...o.as].sort((a, b) => a.sat - b.sat).slice(0, Math.floor(use + 1e-6));
    list.forEach(a => S.feedAnimal(a, shortage));
    if (list.length) o.e.lastFed = G.day + G.hour / 24;
  });
  Object.keys(shortage).forEach(f => {
    FP.UI.notify('warn', 'Estoque esgotado', `Faltou ${FP.FOODS[f].nome.toLowerCase()} para alimentar ${shortage[f]} animal(is). Compre mais no painel de Alimentação.`, {panel: 'food'}, 'food_' + f);
  });
  if (unfed.length){
    FP.UI.notify('warn', 'Tratadores sobrecarregados', `${unfed.length} recinto(s) não foram totalmente alimentados nesta rodada (${unfed.map(e => e.name).slice(0, 3).join(', ')}). Contrate mais tratadores.`, {panel: 'staff', enc: unfed[0].id}, 'keepers');
  }
};
S.feedAnimal = function(a, shortage){
  const G = FP.G;
  const sp = FP.SPECIES[a.sp];
  const qty = sp.qtd / 3 * (FP.Animals.isBaby(a) ? .5 : 1);
  if (G.food[sp.comida] >= qty){ G.food[sp.comida] -= qty; a.sat = Math.min(100, a.sat + 40); return true; }
  if (G.food[sp.comida] > 0){ const part = G.food[sp.comida] / qty; G.food[sp.comida] = 0; a.sat = Math.min(100, a.sat + 40 * part); }
  if (shortage) shortage[sp.comida] = (shortage[sp.comida] || 0) + 1;
  return false;
};
/* Alimentação manual de emergência (custo de mão de obra) */
S.manualFeed = function(enc){
  const G = FP.G;
  const as = FP.World.encAnimals(G, enc);
  if (!as.length) return {ok:false, msg:'Não há animais neste recinto.'};
  const cost = 30 + as.length * 6;
  if (G.money < cost) return {ok:false, msg:'Dinheiro insuficiente.'};
  FP.Economy.spend(cost, 'mão de obra avulsa');
  const shortage = {};
  as.forEach(a => S.feedAnimal(a, shortage));
  enc.lastFed = G.day + G.hour / 24;
  const miss = Object.keys(shortage);
  return {ok:true, cost, msg: miss.length ? 'Alimentado parcialmente: falta estoque de ' + miss.map(f => FP.FOODS[f].nome.toLowerCase()).join(', ') + '.' : 'Animais alimentados.'};
};

/* ---------- Limpeza (horária) ---------- */
S.cleanHour = function(){
  const G = FP.G;
  const eff = S.efficiency();
  // acúmulo de sujeira
  Object.values(G.enclosures).forEach(e => {
    const occ = FP.World.encOccupancy(G, e);
    if (!occ.animals.length){ e.clean = Math.min(100, e.clean + .2); return; }
    e.clean = Math.max(0, e.clean - (.25 + 2.0 * Math.min(2, occ.occ)));
  });
  const janitors = G.staff.filter(s => s.role === 'limpeza');
  let pool = 0; const assigned = {};
  janitors.forEach(j => { const c = FP.STAFF.limpeza.cap * eff; if (j.assign >= 0 && G.enclosures[j.assign]) assigned[j.assign] = (assigned[j.assign] || 0) + c; else pool += c; });
  // recintos atribuídos
  Object.keys(assigned).forEach(id => { const e = G.enclosures[id]; const need = 100 - e.clean; const use = Math.min(need * e.tiles.length / 40, assigned[id]); e.clean = Math.min(100, e.clean + use * 40 / e.tiles.length); });
  // lixo nos caminhos
  let litterTotal = 0; for (let i = 0; i < G.litter.length; i++) litterTotal += G.litter[i];
  let forLitter = Math.min(litterTotal, pool * (litterTotal > 0 ? .35 : 0));
  pool -= forLitter;
  if (forLitter > 0){
    for (let i = 0; i < G.litter.length && forLitter > 0; i++){
      if (G.litter[i]){ const t = Math.min(G.litter[i], forLitter); G.litter[i] -= t; forLitter -= t; }
    }
  }
  const list = Object.values(G.enclosures).filter(e => e.clean < 92).sort((a, b) => (b.priority - a.priority) || (a.clean - b.clean));
  for (const e of list){
    if (pool <= 0) break;
    const needPts = (100 - e.clean) * e.tiles.length / 40;
    const use = Math.min(needPts, pool); pool -= use;
    e.clean = Math.min(100, e.clean + use * 40 / e.tiles.length);
  }
  // alertas
  Object.values(G.enclosures).forEach(e => {
    if (e.clean < 35 && (!e.cleanAlert || G.day - e.cleanAlert > 2)){
      e.cleanAlert = G.day;
      FP.UI.notify('warn', 'Limpeza atrasada', `${e.name} está sujo (${Math.round(e.clean)}%). Contrate auxiliares de limpeza ou limpe manualmente.`, {enc: e.id});
    }
  });
};
S.manualClean = function(enc){
  const G = FP.G;
  const cost = Math.round(40 + enc.tiles.length * 2);
  if (G.money < cost) return {ok:false, msg:'Dinheiro insuficiente.'};
  FP.Economy.spend(cost, 'limpeza avulsa');
  enc.clean = 100;
  return {ok:true, cost};
};

/* ---------- Saúde e doenças ---------- */
H.enabled = () => FP.G.stage >= 3 || FP.G.mode === 'livre';
H.clinics = () => Object.values(FP.G.objects).filter(o => o.type === 'clinica' && o.door >= 0);
H.quarSlots = () => H.clinics().length * 6;
H.infect = function(a, d, known){
  if (a.sick) return;
  const dis = FP.DISEASES[d];
  if (dis.aves && !['ave','pinguim'].includes(FP.SPECIES[a.sp].vis.tipo)) return;
  a.sick = {d, days: 0, known: !!known, prog: 0, treating: false};
};
H.daily = function(){
  const G = FP.G;
  if (!H.enabled()) return;
  const keys = ['parasitose', 'respiratoria', 'gripe_aviaria'];
  G.animals.forEach(a => {
    if (a.sick){ a.sick.days++;
      // recuperação natural de casos leves
      if (!a.sick.treating && FP.DISEASES[a.sick.d].sev < .3 && Math.random() < .12){ a.sick = null; }
      return; }
    const enc = G.enclosures[a.enc];
    const clean = enc ? enc.clean : 100;
    if (a.lowSatH >= 24){ H.infect(a, 'desnutricao'); return; }
    if (a.lowHappyD >= 3){ H.infect(a, 'estresse'); return; }
    const p = .0015 * (1 + (100 - clean) / 35) * (a.health < 60 ? 2 : 1) * (FP.Animals.isElder(a) ? 1.5 : 1);
    if (Math.random() < p) H.infect(a, U.pick(keys));
  });
  // contágio dentro do recinto e para recintos vizinhos
  Object.values(G.enclosures).forEach(e => {
    const as = FP.World.encAnimals(G, e);
    const sick = as.filter(a => a.sick && FP.DISEASES[a.sick.d].contagio > 0);
    if (!sick.length) return;
    sick.forEach(s => {
      const dis = FP.DISEASES[s.sick.d];
      as.forEach(o => { if (!o.sick && Math.random() < dis.contagio * (1.1 - e.clean / 150)) H.infect(o, s.sick.d); });
    });
    if (sick.length >= 2 && (!e.contAlert || G.day - e.contAlert > 3)){
      e.contAlert = G.day;
      const known = sick.some(s => s.sick.known);
      if (known) FP.UI.notify('danger', 'Veterinário — possível surto', `"Foi identificada uma possível doença contagiosa em ${e.name}. Recomendo isolar os animais doentes na quarentena."`, {enc: e.id});
    }
  });
};
H.hourly = function(){
  const G = FP.G;
  if (!H.enabled()) return;
  const vets = S.count('veterinario');
  const clinics = H.clinics().length;
  const eff = S.efficiency();
  // detecção
  G.animals.forEach(a => {
    if (!a.sick || a.sick.known) return;
    const p = .012 + (clinics ? vets * .035 : vets * .01) + (a.sat < 25 ? .02 : 0) + S.count('tratador') * .002;
    if (Math.random() < p){
      a.sick.known = true;
      const sp = FP.SPECIES[a.sp], dis = FP.DISEASES[a.sick.d];
      const enc = G.enclosures[a.enc];
      const who = vets && clinics ? 'Veterinário' : 'Tratador';
      FP.UI.notify('staff', `${who} — ${enc ? enc.name : 'quarentena'}`, `"${a.name} (${sp.nome.toLowerCase()}) ${dis.sintoma}. ${vets && clinics ? 'Diagnóstico: ' + dis.nome + '.' : 'Precisamos de um veterinário e de uma clínica para investigar.'}"`, {enc: a.enc, animal: a.id});
      FP.Audio.play('alert');
    }
  });
  // tratamento
  const cap = clinics ? Math.floor(vets * FP.STAFF.veterinario.cap * eff) : 0;
  const patients = G.animals.filter(a => a.sick && a.sick.known).sort((a, b) => (b.quar - a.quar) || (a.health - b.health));
  patients.forEach((a, i) => {
    a.sick.treating = i < cap;
    if (!a.sick.treating) return;
    const dis = FP.DISEASES[a.sick.d];
    a.sick.prog += 1 / (dis.dias * 24) * (a.quar ? 1.5 : 1);
    FP.Economy.spend(dis.custo / 24, 'veterinária');
    if (a.sick.prog >= 1){
      const sp = FP.SPECIES[a.sp];
      FP.UI.notify('good', 'Tratamento concluído', `${a.name} (${sp.nome}) se recuperou de ${dis.nome.toLowerCase()}.${a.quar ? ' Já pode ser liberado(a) da quarentena.' : ''}`, {animal: a.id, enc: a.enc, quiet: true});
      a.sick = null; a.health = Math.max(a.health, 60); a.lowSatH = 0; a.lowHappyD = 0;
    }
  });
  if (patients.length > cap && clinics && (!G._vetAlert || G.day - G._vetAlert > 2)){
    G._vetAlert = G.day;
    FP.UI.notify('warn', 'Veterinários sobrecarregados', `${patients.length} animais doentes e capacidade para ${cap}. Contrate mais veterinários.`, {panel: 'health'});
  }
  if (patients.length && !clinics && (!G._clinicAlert || G.day - G._clinicAlert > 3)){
    G._clinicAlert = G.day;
    FP.UI.notify('danger', 'Sem estrutura veterinária', 'Há animais doentes e nenhuma clínica veterinária conectada aos caminhos. Construa uma clínica e contrate veterinários.', {panel: 'health'});
  }
};
H.sendQuarantine = function(a){
  const G = FP.G;
  if (!H.clinics().length) return {ok:false, msg:'É necessário ter uma clínica veterinária conectada aos caminhos.'};
  const used = G.animals.filter(x => x.quar).length;
  if (used >= H.quarSlots()) return {ok:false, msg:'Quarentena lotada (' + used + '/' + H.quarSlots() + ' vagas).'};
  a.homeEnc = a.enc; a.quar = true; a.quarDay = G.day;
  return {ok:true};
};
H.release = function(a){
  const G = FP.G;
  const enc = G.enclosures[a.homeEnc];
  if (!enc) return {ok:false, msg:'O recinto de origem não existe mais. Use "Mover" para escolher outro recinto.'};
  a.quar = false; a.enc = enc.id; FP.Animals.placeRandom(a, enc);
  return {ok:true};
};
})();
