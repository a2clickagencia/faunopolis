/* =========================================================
   FAUNÓPOLIS — animals.js
   Animais individuais: criação, física de movimento,
   necessidades, saúde, reprodução, envelhecimento e morte.
   ========================================================= */
'use strict';
(function(){
const A = FP.Animals = {};
const U = FP.U;

A.isBaby = a => a.age < FP.SPECIES[a.sp].mat;
A.isElder = a => a.age > FP.SPECIES[a.sp].vida * .8;
A.stage = a => A.isBaby(a) ? 'Filhote' : A.isElder(a) ? 'Idoso' : 'Adulto';

function randomName(sex, used){
  const pool = sex === 'M' ? FP.NAMES_M : FP.NAMES_F;
  for (let k = 0; k < 8; k++){ const n = U.pick(pool); if (!used.has(n)) return n; }
  return U.pick(pool) + ' ' + U.randi(2, 9);
}

A.create = function(spId, sex, age, enc, opts){
  const G = FP.G;
  const used = new Set(G.animals.map(a => a.name));
  const a = {
    id: G.nextId++, sp: spId, sex: sex || (Math.random() < .5 ? 'M' : 'F'), age: age || 0,
    name: randomName(sex, used), enc: enc ? enc.id : -1, quar: false, homeEnc: enc ? enc.id : -1,
    health: 95, sat: 80, happy: 65, sick: null, preg: null, lowSatH: 0, lowHappyD: 0,
    x: 0, y: 0, h: Math.random() * Math.PI * 2, state: 'wander', timer: U.rand(1, 4), frame: 0, ft: 0,
    origin: (opts && opts.origin) || 'compra', born: G.day, notified: {}
  };
  if (enc) A.placeRandom(a, enc);
  G.animals.push(a);
  return a;
};

A.validTile = function(a, tx, ty){
  const G = FP.G;
  if (!U.inMap(tx, ty)) return false;
  const i = U.idx(tx, ty);
  if (G.enc[i] !== a.enc) return false;
  const sp = FP.SPECIES[a.sp];
  if (G.ground[i] === FP.T.agua && !sp.nada) return false;
  const o = G.obj[i];
  if (o >= 0){ const ob = G.objects[o]; if (ob && ob.kind === 'deco'){ const d = FP.DECOS[ob.type]; if (d.bloqueia && !d.copa) return false; } }
  return true;
};
A.placeRandom = function(a, enc){
  const opts = enc.tiles.filter(i => A.validTile(a, U.ix(i), U.iy(i)));
  const list = opts.length ? opts : enc.tiles;
  const i = U.pick(list);
  a.x = U.ix(i) + U.rand(.25, .75); a.y = U.iy(i) + U.rand(.25, .75);
};
A.ensureInside = function(a){
  const G = FP.G;
  if (a.quar) return;
  const enc = G.enclosures[a.enc]; if (!enc) return;
  if (!A.validTile(a, Math.floor(a.x), Math.floor(a.y))) A.placeRandom(a, enc);
};

/* ---------- Física de movimento (por quadro) ----------
   Caminhada aleatória com direção suavizada, olhar à frente para
   colisão com cercas/obstáculos/água, separação entre indivíduos
   e estados (andar, parado, dormir). */
A.updateMotion = function(dtGame){
  const G = FP.G;
  const night = G.hour < 6 || G.hour >= 21;
  const byEnc = {};
  for (const a of G.animals){ if (a.quar) continue; (byEnc[a.enc] = byEnc[a.enc] || []).push(a); }
  for (const encId in byEnc){
    const list = byEnc[encId];
    for (const a of list){
      const sp = FP.SPECIES[a.sp];
      a.timer -= dtGame;
      if (a.timer <= 0){
        if (night && Math.random() < .8){ a.state = 'sleep'; a.timer = U.rand(4, 10); }
        else if (a.health < 30 || a.sick){ a.state = Math.random() < .7 ? 'idle' : 'wander'; a.timer = U.rand(2, 6); }
        else { a.state = Math.random() < .62 ? 'wander' : 'idle'; a.timer = a.state === 'wander' ? U.rand(1.5, 5) : U.rand(1, 4); }
        // v7.1: vai brincar com um brinquedo do recinto
        if (!night && a.state !== 'sleep' && a.health > 30 && Math.random() < .28){ const t = FP.World.pickToy(G, a); if (t){ a.state = 'toy'; a.tgt = {x: t.x + U.rand(-.2, .2), y: t.y + U.rand(-.2, .2)}; a.timer = 14; } }
      }
      if (a.state === 'play'){ a.playT = (a.playT || 0) + dtGame; a.ft += dtGame * 2.2; a.frame = Math.floor(a.ft) % 2; continue; }
      if (a.state === 'toy' && a.tgt){
        const dx = a.tgt.x - a.x, dy = a.tgt.y - a.y, dd = Math.hypot(dx, dy);
        if (dd < .4){ a.state = 'play'; a.timer = U.rand(3, 6.5); a.playT = 0; a.h = Math.atan2(dy, dx); continue; }
        let dh = Math.atan2(dy, dx) - a.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        a.h += dh * Math.min(1, dtGame * 4);
        const v = sp.vel * (A.isBaby(a) ? .8 : 1) * .6, st = Math.min(dd, v * dtGame);
        const nx = a.x + Math.cos(a.h) * st, ny = a.y + Math.sin(a.h) * st;
        if (A.validTile(a, Math.floor(nx), Math.floor(ny))){ a.x = nx; a.y = ny; } else { a.state = 'wander'; a.tgt = null; }
        a.ft += dtGame * v * 4; a.frame = Math.floor(a.ft) % 2;
        continue;
      }
      if (a.state !== 'wander') continue;
      let v = sp.vel * (A.isBaby(a) ? .8 : 1) * (a.health < 40 ? .5 : 1) * .55;
      let steps = Math.max(1, Math.ceil(v * dtGame / .25));
      const sdt = dtGame / steps;
      for (let s = 0; s < steps; s++){
        a.h += (Math.random() - .5) * 2.4 * sdt;
        const cx = Math.cos(a.h), cy = Math.sin(a.h);
        const look = .35 + (sp.vis.L / 64);
        const ahead = A.validTile(a, Math.floor(a.x + cx * look), Math.floor(a.y + cy * look));
        if (!ahead){ a.h += Math.PI * (.5 + Math.random() * .8) * (Math.random() < .5 ? 1 : -1); continue; }
        const nx = a.x + cx * v * sdt, ny = a.y + cy * v * sdt;
        if (A.validTile(a, Math.floor(nx), Math.floor(ny))){ a.x = nx; a.y = ny; }
        else a.h += Math.PI * .7;
      }
      a.ft += dtGame * v * 4;
      a.frame = Math.floor(a.ft) % 2;
    }
    // separação suave (colisão macia entre corpos)
    for (let i = 0; i < list.length; i++){
      const a = list[i], ra = FP.SPECIES[a.sp].vis.L / 64;
      for (let j = i + 1; j < list.length; j++){
        const b = list[j], rb = FP.SPECIES[b.sp].vis.L / 64;
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, min = (ra + rb) * .7;
        if (d2 > 0.0001 && d2 < min * min){
          const d = Math.sqrt(d2), push = (min - d) * .25;
          const ux = dx / d, uy = dy / d;
          if (A.validTile(a, Math.floor(a.x - ux * push), Math.floor(a.y - uy * push))){ a.x -= ux * push; a.y -= uy * push; }
          if (A.validTile(b, Math.floor(b.x + ux * push), Math.floor(b.y + uy * push))){ b.x += ux * push; b.y += uy * push; }
        }
      }
    }
  }
};

/* ---------- Simulação horária ---------- */
A.hourly = function(){
  const G = FP.G;
  const bio = FP.Staff.biologistCoverage();
  const cons = FP.Economy.conservationBonus();
  Object.values(G.enclosures).forEach(enc => {
    const occ = FP.World.encOccupancy(G, enc);
    if (!occ.animals.length) return;
    const counts = {}; occ.animals.forEach(a => counts[a.sp] = (counts[a.sp] || 0) + 1);
    const feeder = FP.World.encStats(G, enc).feeder;
    occ.animals.forEach(a => {
      const sp = FP.SPECIES[a.sp];
      a.sat = U.clamp(a.sat - 4.6 * (A.isBaby(a) ? .8 : 1) * (feeder ? .75 : 1), 0, 100);
      if (a.sat < 20) a.lowSatH++; else a.lowSatH = Math.max(0, a.lowSatH - 2);
      const hab = FP.World.habitat(G, enc, a.sp);
      let crowd = 0;
      if (occ.occ > 1) crowd = (occ.occ - 1) * 90; else if (occ.occ > .9) crowd = 4;
      const social = Math.max(0, sp.social - counts[a.sp]) * (sp.social > 2 ? 6 : 10);
      let target = .30 * a.sat + .25 * hab + .20 * enc.clean + .15 * a.health + 10 - crowd - social + bio * 5 + cons * 2 + FP.World.toyFun(G, enc, a.sp) * 8;
      if (a.sick) target -= 10;
      target = U.clamp(target, 0, 100);
      a.happy += (target - a.happy) * .12;
      // saúde
      if (a.sick){ a.health -= FP.DISEASES[a.sick.d].sev * (a.sick.treating ? .5 : 1); }
      else if (a.sat > 40 && enc.clean > 30 && a.happy > 40) a.health = Math.min(100, a.health + .5);
      if (a.sat < 20) a.health -= a.sat < 5 ? 1.0 : 0.5;
      if (enc.clean < 20) a.health -= .35;
      if (A.isElder(a)) a.health -= .05;
      a.health = U.clamp(a.health, 0, 100);
      // alertas progressivos
      if (a.lowSatH === 30 && !a.notified.fome){
        a.notified.fome = G.day;
        FP.UI.notify('staff', `Tratador — ${enc.name}`, `"${a.name} (${sp.nome.toLowerCase()}) está sem comer há mais de um dia e apresenta um comportamento diferente."`, {enc: enc.id, animal: a.id});
      }
      if (a.health < 30 && (!a.notified.crit || G.day - a.notified.crit > 2)){
        a.notified.crit = G.day;
        FP.UI.notify('danger', 'Animal em estado crítico', `${a.name} (${sp.nome}) em ${enc.name} está com saúde em ${Math.round(a.health)}%. Verifique alimentação, limpeza e tratamento.`, {enc: enc.id, animal: a.id});
      }
      if (a.health <= 0) A.die(a, a.sick ? FP.DISEASES[a.sick.d].nome.toLowerCase() : (a.sat < 10 ? 'desnutrição' : 'problemas de saúde'));
    });
  });
  // animais em quarentena
  G.animals.filter(a => a.quar).forEach(a => {
    a.sat = 90; a.happy = U.clamp(a.happy + (50 - a.happy) * .1, 0, 100);
    if (a.sick) a.health -= FP.DISEASES[a.sick.d].sev * .4; else a.health = Math.min(100, a.health + 1);
    if (a.health <= 0) A.die(a, a.sick ? FP.DISEASES[a.sick.d].nome.toLowerCase() : 'complicações');
  });
};

/* ---------- Simulação diária ---------- */
A.daily = function(){
  const G = FP.G;
  const bio = FP.Staff.biologistCoverage();
  const cons = FP.Economy.conservationBonus();
  const newborn = [];
  [...G.animals].forEach(a => {
    if (!G.animals.includes(a)) return;
    const sp = FP.SPECIES[a.sp];
    const wasBaby = A.isBaby(a);
    a.age++;
    if (wasBaby && !A.isBaby(a)){
      const enc = G.enclosures[a.enc];
      FP.UI.notify('info', 'Filhote cresceu', `${a.name} (${sp.nome}) chegou à fase adulta${enc ? ' em ' + enc.name : ''}.`, {enc: a.enc, animal: a.id, quiet: true});
    }
    // velhice
    if (a.age > sp.vida * .9){
      const p = Math.pow((a.age - sp.vida * .9) / (sp.vida * .3), 2) * .12;
      if (a.age > sp.vida * .95 && !a.notified.velho){ a.notified.velho = 1; FP.UI.notify('info', 'Animal idoso', `${a.name} (${sp.nome}) está bem idoso. Cuidados extras prolongam sua vida.`, {enc: a.enc, animal: a.id}); }
      if (Math.random() < p * (a.health > 80 ? .6 : 1.3)) { A.die(a, 'idade avançada', true); return; }
    }
    if (a.happy < 25) a.lowHappyD++; else a.lowHappyD = 0;
    // gestação
    if (a.preg){
      a.preg.d--;
      if (a.preg.d <= 0){
        const enc = G.enclosures[a.enc];
        const n = U.randi(1, sp.ninhada);
        for (let k = 0; k < n; k++){
          const baby = A.create(a.sp, Math.random() < .5 ? 'M' : 'F', 0, enc && !a.quar ? enc : null, {origin:'nascimento'});
          if (a.quar || !enc){ baby.enc = a.homeEnc; baby.homeEnc = a.homeEnc; const he = G.enclosures[a.homeEnc]; if (he) A.placeRandom(baby, he); }
          else { baby.x = a.x + U.rand(-.3, .3); baby.y = a.y + U.rand(-.3, .3); A.ensureInside(baby); }
          baby.health = 90; baby.sat = 80; baby.happy = 70;
          newborn.push(baby);
        }
        G.stats.births += n;
        a.preg = null;
        FP.UI.notify('birth', n > 1 ? 'Nasceram filhotes!' : 'Nasceu um filhote!', `${n > 1 ? n + ' filhotes de ' + sp.plural : 'Um filhote de ' + sp.nome.toLowerCase()} ${n > 1 ? 'nasceram' : 'nasceu'} em ${enc ? enc.name : 'seu zoológico'}. Mãe: ${a.name}.`, {enc: a.enc});
        FP.Audio.play('birth');
        if (enc) FP.Render.particles.push({x: a.x, y: a.y - .5, t: 0, life: 2.5, txt: '💗', kind: 'emoji'});
        G.rep = Math.min(100, G.rep + .3);
      }
    }
  });
  // reprodução por recinto
  Object.values(G.enclosures).forEach(enc => {
    if (!enc.breeding) return;
    const occ = FP.World.encOccupancy(G, enc);
    if (occ.occ >= 1) return;
    const bySp = {};
    occ.animals.forEach(a => (bySp[a.sp] = bySp[a.sp] || []).push(a));
    Object.keys(bySp).forEach(spId => {
      const sp = FP.SPECIES[spId], list = bySp[spId];
      const males = list.filter(a => a.sex === 'M' && !A.isBaby(a) && !A.isElder(a) && a.health > 50);
      if (!males.length) return;
      list.filter(a => a.sex === 'F' && !A.isBaby(a) && !A.isElder(a) && !a.preg && !a.sick && a.health > 60 && a.happy > 55 && newborn.indexOf(a) < 0).forEach(f => {
        const p = sp.fert * (f.happy / 100) * (1 + bio * .5 + cons * .5) * (occ.occ > .85 ? .4 : 1);
        if (Math.random() < p){
          f.preg = {d: sp.gest};
          if (bio > .3) FP.UI.notify('info', 'Biólogo — gestação confirmada', `"${f.name} (${sp.nome.toLowerCase()}) está esperando filhote(s). Previsão: ${sp.gest} dias."`, {enc: enc.id, animal: f.id, quiet: true});
        }
      });
    });
    // alerta de população
    const cap = FP.World.encCapacity(G, enc);
    if (cap.cap && cap.count >= cap.cap && (!enc.capAlert || G.day - enc.capAlert > 4)){
      enc.capAlert = G.day;
      FP.UI.notify('warn', 'Capacidade atingida', `${enc.name} está com ${cap.count}/${cap.cap} animais. Amplie o recinto, transfira ou venda animais, ou desative a reprodução.`, {enc: enc.id});
    } else if (cap.cap && cap.count >= cap.cap * .85 && cap.count < cap.cap && (!enc.capWarn || G.day - enc.capWarn > 6)){
      enc.capWarn = G.day;
      FP.UI.notify('warn', 'Próximo da capacidade', `${enc.name} está próximo da capacidade máxima (${cap.count}/${cap.cap}).`, {enc: enc.id});
    }
  });
};

A.die = function(a, cause, natural){
  const G = FP.G;
  const sp = FP.SPECIES[a.sp];
  const i = G.animals.indexOf(a); if (i < 0) return;
  G.animals.splice(i, 1);
  G.stats.deaths++;
  if (!natural) G.rep = Math.max(0, G.rep - 3);
  const enc = G.enclosures[a.enc];
  FP.UI.notify('death', natural ? 'Um animal faleceu' : 'Perda de um animal', `${a.name} (${sp.nome}) faleceu por ${cause}${enc ? ' em ' + enc.name : ''}.${natural ? '' : ' A reputação do zoológico foi afetada.'}`, {enc: a.enc});
  FP.Audio.play('death');
};

/* ---------- Valor de venda ---------- */
A.sellValue = function(a){
  const sp = FP.SPECIES[a.sp];
  let f = A.isBaby(a) ? .55 : A.isElder(a) ? .3 : .75;
  f *= .4 + .6 * (a.health / 100);
  if (a.sick) f *= .4;
  return Math.round(sp.preco * f / 10) * 10;
};

/* Sintomas visíveis: animal não comendo/doente */
A.statusIcons = function(a){
  const s = [];
  if (a.sick && a.sick.known) s.push('🤒');
  if (a.sat < 20) s.push('🍖');
  if (a.preg) s.push('🤰');
  if (a.state === 'play') s.push('🎾');
  return s;
};
})();
