/* =========================================================
   FAUNÓPOLIS — undo.js (v2.3)
   Desfazer (Ctrl+Z): antes de cada construção, demolição, pintura
   de terreno ou compra de lote, guarda uma "foto" do que pode mudar
   no mapa (terreno, caminhos, recintos, objetos, animais e dinheiro).
   Ctrl+Z volta à foto anterior. Guarda as últimas 30 ações.
   ========================================================= */
'use strict';
(function(){
const UN = FP.Undo = {};
const TYPED = ['ground', 'owned', 'path', 'road', 'enc', 'obj', 'litter'];
// celular/tablet: menos fotos guardadas para poupar memória (cada uma pode ter centenas de KB)
const MAX = (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 12 : 30;
let stack = [], stackG = null;

/* tira a foto do estado atual (não guarda ainda) */
UN.snap = function(label){
  const G = FP.G; if (!G) return null;
  const s = {label: label || 'ação', G, money: G.money, nextId: G.nextId,
    json: JSON.stringify({objects: G.objects, enclosures: G.enclosures, animals: G.animals, finance: G.finance})};
  TYPED.forEach(k => s[k] = G[k].slice());
  return s;
};
/* guarda a foto na pilha (chame só quando a ação realmente mudou algo) */
UN.commit = function(s){
  if (!s || s.G !== FP.G) return;
  if (stackG !== FP.G){ stack = []; stackG = FP.G; }
  stack.push(s);
  if (stack.length > MAX) stack.shift();
  if (FP.UI && FP.UI.renderUndo) FP.UI.renderUndo();
};
UN.can = () => stackG === FP.G && stack.length > 0;
UN.clear = () => { stack = []; stackG = FP.G; if (FP.UI && FP.UI.renderUndo) FP.UI.renderUndo(); };
UN.undo = function(){
  const G = FP.G;
  if (!UN.can()){ FP.UI.toast('Nada para desfazer.', 'info'); return false; }
  const s = stack.pop();
  TYPED.forEach(k => G[k].set(s[k]));
  const o = JSON.parse(s.json);
  G.objects = o.objects; G.enclosures = o.enclosures; G.finance = o.finance; G.money = s.money; G.nextId = s.nextId;
  // os animais voltam com os mesmos dados (posição, recinto, estado) da foto
  G.animals = o.animals;
  Object.values(G.enclosures).forEach(e => { e.dirty = true; e.stats = null; });
  FP.World.refreshNetwork(G);
  if (FP.Visitors.invalidate) FP.Visitors.invalidate();
  FP.Economy.computeAttraction();
  // visitantes que estavam usando algo que deixou de existir voltam a passear
  G.visitors.forEach(v => { if (v.act && v.act.obj !== undefined && !G.objects[v.act.obj]) v.act = null; });
  if (FP.Input.drag) FP.Input.drag = null;
  if (FP.UI.selected) FP.UI.closePanels();
  FP.UI.renderTop();
  FP.Audio.play('click');
  FP.UI.toast('↶ Desfeito: ' + s.label + '.', 'info');
  if (FP.UI.renderUndo) FP.UI.renderUndo();
  return true;
};
})();
