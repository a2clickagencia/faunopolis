/* FAUNÓPOLIS — save.js : salvar/carregar (localStorage) e exportar/importar arquivo .faunopolis */
'use strict';
(function(){
const SV = FP.Save = {};
const KEY = 'faunopolis_save_';
const TYPED = ['ground', 'owned', 'path', 'road', 'enc', 'obj', 'litter'];

/* v2.5: mapas gravados em base64 (bytes crus) em vez de listas de números —
   o salvamento fica ~4x menor e muito mais rápido (sem travada no celular). */
function b64enc(ta){
  const u8 = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function b64dec(str, C){
  const bin = atob(str), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new C(u8.buffer);
}
SV.serialize = function(){
  const G = FP.G;
  const o = {};
  Object.keys(G).forEach(k => {
    if (TYPED.includes(k)) o[k] = {t: G[k].constructor.name, b: b64enc(G[k])};
    else if (k === 'reach' || k === 'pathBeauty') return;
    else o[k] = G[k];
  });
  o.visitors = []; // visitantes não são salvos (o dia recomeça com novos visitantes)
  o.cam = {x: FP.Cam.x, y: FP.Cam.y, zoom: FP.Cam.zoom};
  o.savedAt = new Date().toISOString();
  return JSON.stringify(o);
};
SV.deserialize = function(str){
  const o = JSON.parse(str);
  if (!o || !o.ground) throw new Error('Arquivo inválido');
  const ctors = {Uint8Array, Int16Array, Int32Array};
  TYPED.forEach(k => { const C = ctors[o[k].t] || Uint8Array; o[k] = o[k].b !== undefined ? b64dec(o[k].b, C) : new C(o[k].d); });
  // v2.0: jogos da v1 (mapa 72×56) são convertidos para o mapa ampliado
  const migrated = FP.World.migrateV1(o);
  const cam = o.cam; delete o.cam;
  o.visitors = [];
  o.staff.forEach(s => { s.path = []; s.tile = -1; s.until = 0; });
  o.animals.forEach(a => { a.notified = a.notified || {}; });
  FP.G = o;
  Object.values(o.enclosures).forEach(e => { e.dirty = true; e.stats = null; });
  // v2.5: recupera recintos "perdidos" (estouro de id) e devolve lotes comprados fora do zoo
  const fix = FP.World.repairSave(o);
  if (fix.encFixed) setTimeout(() => FP.UI.toast(`🔧 Recintos recuperados: ${fix.encFixed} tiles voltaram aos seus recintos (agora aparecem para visitantes e no controle biológico).`, 'good'), 900);
  if (fix.lots) setTimeout(() => FP.UI.toast(`🔧 ${fix.lots} lote(s) depois da entrada ficavam fora do zoológico e foram devolvidos (+${FP.U.money(fix.landRefund)}).`, 'info'), 1400);
  if (migrated) setTimeout(() => FP.UI.toast('Jogo da v1 convertido para o mapa ampliado: seu zoológico está no centro-sul do mapa.', 'info'), 800);
  FP.World.refreshNetwork(o);
  FP.Visitors.invalidate();
  FP.Economy.computeAttraction();
  if (cam){ FP.Cam.x = cam.x; FP.Cam.y = cam.y; FP.Cam.zoom = cam.zoom; }
  return o;
};
/* App para computador: os jogos também ficam em arquivos (Documentos\Faunópolis\saves) */
const D = window.faunoDesktop || null;
SV.desktop = !!D;
SV.saveDir = () => D ? D.dir() : null;
SV.openFolder = () => D && D.openFolder();
SV.syncFromFiles = function(){
  if (!D) return;
  // ao abrir o app, traz para o jogo os salvamentos em arquivo (os mais recentes vencem)
  try {
    D.list().forEach(f => {
      const fm = f.meta ? JSON.parse(f.meta) : null, lm = SV.meta(f.slot);
      if (!localStorage.getItem(KEY + f.slot) || !lm || (fm && fm.at > (lm.at || 0))){
        const data = D.read(f.slot);
        if (data){ try { localStorage.setItem(KEY + f.slot, data); if (f.meta) localStorage.setItem(KEY + f.slot + '_meta', f.meta); } catch(e){} }
      }
    });
  } catch(e){ console.warn('Falha ao ler saves em arquivo', e); }
};
SV.save = function(slot, silent){
  const data = SV.serialize();
  const meta = JSON.stringify({name: FP.G.parkName, day: FP.G.day, money: FP.G.money, mode: FP.G.mode, at: Date.now()});
  let okLocal = false, okFile = false, err = '';
  try { localStorage.setItem(KEY + slot, data); localStorage.setItem(KEY + slot + '_meta', meta); okLocal = true; } catch(e){ err = e.message; }
  if (D){ const r = D.write(slot, data, meta); okFile = r && r.ok; if (!okFile) err = (r && r.msg) || err; }
  if (!okLocal && !okFile){ if (!silent) FP.UI.toast('Não foi possível salvar: ' + err, 'error'); return false; }
  return true;
};
SV.load = function(slot){
  let s = null; try { s = localStorage.getItem(KEY + slot); } catch(e){}
  if (!s && D) s = D.read(slot);
  if (!s) return false;
  SV.deserialize(s);
  return true;
};
SV.meta = function(slot){ try { return JSON.parse(localStorage.getItem(KEY + slot + '_meta')); } catch(e){ return null; } };
SV.has = slot => { try { if (localStorage.getItem(KEY + slot)) return true; } catch(e){} return !!(D && D.list().some(f => f.slot === slot)); };
SV.remove = slot => { try { localStorage.removeItem(KEY + slot); localStorage.removeItem(KEY + slot + '_meta'); } catch(e){} if (D) D.remove(slot); };
SV.exportFile = function(){
  const data = SV.serialize();
  const name = (FP.G.parkName || 'zoologico').replace(/[^\w\-]+/g, '_') + '_dia' + FP.G.day + '.faunopolis';
  // celular/tablet: abre o "Compartilhar" (salvar no Drive, mandar no WhatsApp, e-mail…)
  if (FP.Mobile && FP.Mobile.shareFile(name, data)) return 'shared';
  const blob = new Blob([data], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
SV.importFile = function(file, cb){
  const r = new FileReader();
  r.onload = () => { try { SV.deserialize(r.result); cb(true); } catch(e){ cb(false, e.message); } };
  r.readAsText(file);
};
SV.syncFromFiles();
})();
