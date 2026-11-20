/* =========================================================
   FAUNÓPOLIS — input.js
   Mouse, teclado, câmera e ferramentas de construção
   (caminho, recinto, ampliação, terreno, vegetação,
   instalações, demolição e compra de lotes).
   ========================================================= */
'use strict';
(function(){
const I = FP.Input = {tool: 'select', toolArg: null, brush: 1, hoverTile: null, hoverChunk: null, drag: null, mouse: {x: 0, y: 0}};
const U = FP.U, T = FP.TILE;
const keys = {};
let pan = null, cv;

I.init = function(canvas){
  cv = canvas;
  cv.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  cv.addEventListener('wheel', onWheel, {passive: false});
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('mouseleave', () => { I.hoverTile = null; FP.UI.hideTooltip(); });
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
  // toque básico (arrastar para mover a câmera, pinça para zoom)
  let touch = null;
  cv.addEventListener('touchstart', e => { if (e.touches.length === 1){ touch = {x: e.touches[0].clientX, y: e.touches[0].clientY, cx: FP.Cam.x, cy: FP.Cam.y, moved: false}; } else if (e.touches.length === 2){ const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); touch = {pinch: d, z: FP.Cam.zoom}; } }, {passive: true});
  cv.addEventListener('touchmove', e => { if (!touch) return; if (touch.pinch && e.touches.length === 2){ const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (is3D()){ FP.R3.zoomBy(d / touch.pinch); touch.pinch = d; } else FP.Cam.zoom = U.clamp(touch.z * d / touch.pinch, FP.Cam.minZ, FP.Cam.maxZ); } else if (e.touches.length === 1 && !touch.pinch){ const dx = e.touches[0].clientX - touch.x, dy = e.touches[0].clientY - touch.y; if (Math.abs(dx) + Math.abs(dy) > 6) touch.moved = true; if (is3D()){ FP.R3.panBy(e.touches[0].clientX - (touch.lx || touch.x), e.touches[0].clientY - (touch.ly || touch.y)); touch.lx = e.touches[0].clientX; touch.ly = e.touches[0].clientY; } else { FP.Cam.x = touch.cx - dx / FP.Cam.zoom; FP.Cam.y = touch.cy - dy / FP.Cam.zoom; FP.Render.clampCam(); } } e.preventDefault(); }, {passive: false});
  cv.addEventListener('touchend', e => { if (touch && !touch.pinch && !touch.moved){ const t = e.changedTouches[0]; I.mouse = {x: t.clientX, y: t.clientY}; updateHover(); toolDown(); toolUp(); } touch = null; });
};

I.setTool = function(tool, arg){
  I.tool = tool; I.toolArg = arg || null; I.drag = null;
  document.body.dataset.tool = tool;
  FP.UI.onToolChange();
};
I.cancel = function(){ if (I.drag){ I.drag = null; return; } if (I.tool !== 'select'){ I.setTool('select'); return; } FP.UI.closePanels(); };

const is3D = () => FP.R3 && FP.R3.active;
function tileAt(sx, sy){
  const w = FP.Render.screenToWorld(sx, sy);
  return {x: Math.floor(w.x / T), y: Math.floor(w.y / T), wx: w.x / T, wy: w.y / T};
}
function updateHover(){
  const t = tileAt(I.mouse.x, I.mouse.y);
  I.hoverTile = U.inMap(t.x, t.y) ? t : null;
  I.hoverChunk = I.hoverTile ? FP.World.chunkOf(t.x, t.y) : null;
}

function onDown(e){
  FP.Audio && FP.UI.unlockAudio();
  I.mouse = {x: e.clientX, y: e.clientY};
  updateHover();
  // 3D: botão do meio (ou Alt + direito) gira a câmera; direito arrasta
  if (e.button === 1 || e.button === 2){ pan = {x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, cx: FP.Cam.x, cy: FP.Cam.y, moved: false, rot: is3D() && (e.button === 1 || e.altKey)}; return; }
  if (e.button === 0) toolDown();
}
function onMove(e){
  I.mouse = {x: e.clientX, y: e.clientY};
  if (pan){
    const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true;
    if (is3D()){
      const ddx = e.clientX - pan.lx, ddy = e.clientY - pan.ly; pan.lx = e.clientX; pan.ly = e.clientY;
      if (pan.rot) FP.R3.orbitBy(ddx, ddy); else FP.R3.panBy(ddx, ddy);
    } else { FP.Cam.x = pan.cx - dx / FP.Cam.zoom; FP.Cam.y = pan.cy - dy / FP.Cam.zoom; FP.Render.clampCam(); }
    return;
  }
  if (e.target !== cv && !I.drag){ I.hoverTile = null; FP.UI.hideTooltip(); return; }
  updateHover();
  if (I.drag) toolMove();
  if (!I.drag && I.tool === 'select') FP.UI.hover(I.hoverTile, I.mouse); else FP.UI.hideTooltip();
}
function onUp(e){
  if (pan){
    if (!pan.moved && e.button === 2) I.cancel();
    pan = null; return;
  }
  if (e.button === 0 && I.drag) toolUp();
}
function onWheel(e){
  e.preventDefault();
  if (is3D()){ if (e.shiftKey) FP.R3.orbitBy(0, e.deltaY < 0 ? -18 : 18); else FP.R3.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY); return; }
  const before = FP.Render.screenToWorld(e.clientX, e.clientY);
  const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  FP.Cam.zoom = U.clamp(FP.Cam.zoom * f, FP.Cam.minZ, FP.Cam.maxZ);
  const after = FP.Render.screenToWorld(e.clientX, e.clientY);
  FP.Cam.x += before.x - after.x; FP.Cam.y += before.y - after.y; FP.Render.clampCam();
}
function onKey(e){
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (!FP.G || FP.UI.inMenu) return;
  if (k === 'escape') I.cancel();
  else if (k === ' '){ e.preventDefault(); FP.UI.togglePause(); }
  else if (k === '1') FP.UI.setSpeed(1);
  else if (k === '2') FP.UI.setSpeed(2);
  else if (k === '3') FP.UI.setSpeed(4);
  else if (k === '4') FP.UI.setSpeed(8);
  else if (k === 'c') I.setTool('path');
  else if (k === 'r') I.setTool('enclosure');
  else if (k === 'b') I.setTool('demolish');
  else if (k === 'l') FP.UI.cycleLens();
  else if (k === 'v') FP.UI.cycleCamera();
  else if (k === 'q' && is3D()) FP.R3.rotateStep(-1);
  else if (k === 'e' && is3D()) FP.R3.rotateStep(1);
  else if ((k === 'pageup' || k === 'pagedown') && is3D()){ e.preventDefault(); FP.R3.orbitBy(0, k === 'pageup' ? -30 : 30); }
  else if (k === 'x') I.setTool('release');
  else if (k === '+' || k === '='){ if (is3D()) FP.R3.zoomBy(1.15); else FP.Cam.zoom = U.clamp(FP.Cam.zoom * 1.15, FP.Cam.minZ, FP.Cam.maxZ); }
  else if (k === '-'){ if (is3D()) FP.R3.zoomBy(1 / 1.15); else FP.Cam.zoom = U.clamp(FP.Cam.zoom / 1.15, FP.Cam.minZ, FP.Cam.maxZ); }
  else if (k === 'f5'){ e.preventDefault(); FP.Save.save('auto'); FP.UI.toast('Jogo salvo.'); }
}
I.updateKeys = function(dt){
  let mx = 0, my = 0;
  if (keys['w'] || keys['arrowup']) my -= 1;
  if (keys['s'] || keys['arrowdown']) my += 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  if (!mx && !my) return;
  if (is3D()){ FP.R3.moveBy(mx, my, dt); return; }
  const s = 520 * dt / FP.Cam.zoom;
  FP.Cam.x += mx * s; FP.Cam.y += my * s;
  FP.Render.clampCam();
};

/* ---------- Ferramentas ---------- */
function toolDown(){
  const G = FP.G, t = I.hoverTile;
  if (!t) return;
  switch (I.tool){
    case 'select': FP.UI.clickWorld(t); break;
    case 'path':
      I.drag = {x0: t.x, y0: t.y, x1: t.x, y1: t.y}; break;
    case 'terrain': case 'deco':
      I.drag = {x0: t.x, y0: t.y, x1: t.x, y1: t.y, painted: new Set(), spent: 0};
      paintAt(t.x, t.y); break;
    case 'enclosure': case 'expand': case 'demolish': case 'release': case 'reshape': case 'pond': case 'fill':
      I.drag = {x0: t.x, y0: t.y, x1: t.x, y1: t.y}; break;
    case 'building': placeBuilding(t); break;
    case 'land': {
      const [cx, cy] = FP.World.chunkOf(t.x, t.y);
      const price = FP.World.chunkPrice(G);
      if (!FP.World.chunkBuyable(G, cx, cy)){ FP.UI.toast('Escolha um lote destacado, vizinho ao seu terreno.', 'error'); FP.Audio.play('error'); break; }
      FP.UI.confirm('Comprar lote de terreno', `Comprar este lote de 8×8 tiles por <b>${U.money(price)}</b>?`, () => {
        const r = FP.World.buyChunk(G, cx, cy);
        if (r.ok){ FP.Audio.play('buy'); FP.UI.toast('Lote adquirido por ' + U.money(r.price) + '!', 'good'); FP.World.refreshNetwork(G); }
        else { FP.UI.toast(r.msg, 'error'); FP.Audio.play('error'); }
      });
      break;
    }
  }
}
function toolMove(){
  const t = I.hoverTile; if (!t || !I.drag) return;
  if (I.tool === 'terrain' || I.tool === 'deco'){
    // pinta ao longo da linha entre o último e o atual (sem buracos)
    const d = I.drag;
    const steps = Math.max(Math.abs(t.x - d.x1), Math.abs(t.y - d.y1));
    for (let s = 1; s <= steps; s++){
      const x = Math.round(d.x1 + (t.x - d.x1) * s / steps), y = Math.round(d.y1 + (t.y - d.y1) * s / steps);
      if (I.tool === 'path' && s > 0){
        // caminhos sempre conectados ortogonalmente
        const px = Math.round(d.x1 + (t.x - d.x1) * (s - 1) / steps), py = Math.round(d.y1 + (t.y - d.y1) * (s - 1) / steps);
        if (px !== x && py !== y) paintAt(x, py);
      }
      paintAt(x, y);
    }
    d.x1 = t.x; d.y1 = t.y;
  } else { I.drag.x1 = t.x; I.drag.y1 = t.y; }
}
function toolUp(){
  const G = FP.G, d = I.drag; I.drag = null;
  if (!d) return;
  if (I.tool === 'path'){
    const p = I.pathPlan(d);
    if (!p.build.length){ if (p.tiles.length > 1 || !G.path[p.tiles[0]]) { FP.UI.toast('Nenhum tile pode receber caminho neste traçado.', 'error'); FP.Audio.play('error'); } return; }
    let n = 0;
    for (const i of p.build){
      if (G.money < FP.World.PATH_COST){ FP.UI.toast('Dinheiro insuficiente: o caminho foi construído só em parte.', 'error'); break; }
      FP.Economy.spend(FP.World.PATH_COST, 'construção'); G.path[i] = 1; G.litter[i] = 0; n++;
    }
    if (n){ FP.Audio.play('build'); FP.UI.floatMoney(-n * FP.World.PATH_COST); }
    FP.World.refreshNetwork(G);
    Object.values(G.enclosures).forEach(e => e.dirty = true);
    return;
  }
  if (I.tool === 'deco' || I.tool === 'terrain'){
    if (d.spent > 0) FP.UI.floatMoney(-d.spent);
    FP.World.refreshNetwork(G);
    Object.values(G.enclosures).forEach(e => e.dirty = true);
    return;
  }
  const tiles = FP.World.rectTiles(d.x0, d.y0, d.x1, d.y1);
  if (I.tool === 'enclosure'){
    const v = FP.World.validateEnclosureRect(G, tiles, null);
    if (!v.ok){ FP.UI.toast(v.msg, 'error'); FP.Audio.play('error'); return; }
    const cost = FP.World.enclosureCost(G, tiles, null);
    if (G.money < cost){ FP.UI.toast('Dinheiro insuficiente (' + U.money(cost) + ').', 'error'); FP.Audio.play('error'); return; }
    FP.Economy.spend(cost, 'construção');
    const e = FP.World.createEnclosure(G, tiles);
    FP.World.refreshNetwork(G);
    FP.Audio.play('build'); FP.UI.floatMoney(-cost);
    if (v.steal) FP.UI.toast(`${v.steal} tiles foram redesignados de outro recinto para ${e.name}.`, 'info');
    I.setTool('select');
    FP.UI.openEnclosure(e.id);
    if (!e.viewTiles.length) FP.UI.toast('Dica: construa um caminho encostado no recinto para que os visitantes possam ver os animais.', 'info');
  } else if (I.tool === 'expand'){
    const e = G.enclosures[I.toolArg]; if (!e){ I.setTool('select'); return; }
    const v = FP.World.validateEnclosureRect(G, tiles, e);
    if (!v.ok){ FP.UI.toast(v.msg, 'error'); FP.Audio.play('error'); return; }
    const cost = FP.World.enclosureCost(G, tiles, e);
    if (G.money < cost){ FP.UI.toast('Dinheiro insuficiente (' + U.money(cost) + ').', 'error'); FP.Audio.play('error'); return; }
    const before = FP.World.encCapacity(G, e);
    FP.Economy.spend(cost, 'construção');
    FP.World.expandEnclosure(G, e, tiles.filter(i => G.enc[i] !== e.id));
    FP.World.refreshNetwork(G);
    FP.Audio.play('build'); FP.UI.floatMoney(-cost);
    const after = FP.World.encCapacity(G, e);
    FP.UI.toast(`${e.name} ampliado: ${e.tiles.length} tiles${after.cap ? ` · capacidade ${before.cap} → ${after.cap}` : ''}.`, 'good');
    FP.UI.openEnclosure(e.id);
  } else if (I.tool === 'reshape'){
    const e = G.enclosures[I.toolArg]; if (!e){ I.setTool('select'); return; }
    const p = FP.World.reshapePreview(G, e, tiles);
    if (!p.ok){ FP.UI.toast(p.msg, 'error'); return; }
    if (G.money < p.cost - p.refund){ FP.UI.toast('Dinheiro insuficiente (' + U.money(p.cost - p.refund) + ').', 'error'); return; }
    FP.World.reshapeEnclosure(G, e, tiles);
    if (p.cost) FP.Economy.spend(p.cost, 'construção');
    if (p.refund) FP.Economy.earn(p.refund, 'reembolsos');
    FP.World.refreshNetwork(G);
    FP.Audio.play('build'); FP.UI.floatMoney(p.refund - p.cost);
    FP.UI.toast(`${e.name}: nova área com ${e.tiles.length} tiles.${p.warn ? ' ' + p.warn : ''}`, p.warn ? 'info' : 'good');
    I.setTool('select');
    FP.UI.openEnclosure(e.id);
  } else if (I.tool === 'release'){
    const r = FP.World.releaseTiles(G, tiles);
    r.msgs.forEach(m => FP.UI.toast(m, /transferidos/.test(m) ? 'info' : 'error'));
    if (r.n){
      FP.Economy.earn(r.n * 5, 'reembolsos');
      FP.World.refreshNetwork(G);
      FP.Audio.play('demolish'); FP.UI.floatMoney(r.n * 5);
      FP.UI.toast(`${r.n} tiles liberados (vegetação e decoração foram mantidas).`, 'good');
      if (FP.UI.selected && FP.UI.selected.type === 'enc' && !G.enclosures[FP.UI.selected.id]) FP.UI.closePanels();
    }
  } else if (I.tool === 'pond' || I.tool === 'fill'){
    const e = G.enclosures[I.toolArg]; if (!e){ I.setTool('select'); return; }
    const fill = I.tool === 'fill';
    const p = FP.World.pondPreview(G, e, tiles, fill);
    if (!p.ok){ FP.UI.toast(p.msg, 'error'); FP.Audio.play('error'); return; }
    if (G.money < p.cost){ FP.UI.toast('Dinheiro insuficiente (' + U.money(p.cost) + ').', 'error'); FP.Audio.play('error'); return; }
    FP.World.applyPond(G, e, tiles, fill);
    FP.Economy.spend(p.cost, 'paisagismo');
    FP.Audio.play('path'); FP.UI.floatMoney(-p.cost);
    FP.UI.toast(fill ? `${p.n} tiles de água aterrados em ${e.name}.` : `💧 Lago com ${p.n} tiles aberto em ${e.name}.`, 'good');
  } else if (I.tool === 'demolish'){
    demolish(tiles);
  }
}
/* v7.1: traçado do caminho em "L" (eixo mais longo primeiro), como no Urbis */
I.pathPlan = function(d){
  const G = FP.G, tiles = [], seen = new Set();
  const add = (x, y) => { if (!U.inMap(x, y)) return; const i = U.idx(x, y); if (!seen.has(i)){ seen.add(i); tiles.push(i); } };
  const sx = Math.sign(d.x1 - d.x0) || 1, sy = Math.sign(d.y1 - d.y0) || 1;
  const horizFirst = Math.abs(d.x1 - d.x0) >= Math.abs(d.y1 - d.y0);
  if (horizFirst){ for (let x = d.x0; x !== d.x1 + sx; x += sx) add(x, d.y0); for (let y = d.y0; y !== d.y1 + sy; y += sy) add(d.x1, y); }
  else { for (let y = d.y0; y !== d.y1 + sy; y += sy) add(d.x0, y); for (let x = d.x0; x !== d.x1 + sx; x += sx) add(x, d.y1); }
  const build = tiles.filter(i => FP.World.canPath(G, i));
  return {tiles, build, cost: build.length * FP.World.PATH_COST, blocked: tiles.filter(i => !G.path[i] && !FP.World.canPath(G, i))};
};

function paintAt(x, y){
  const G = FP.G, d = I.drag;
  if (!U.inMap(x, y)) return;
  if (I.tool === 'terrain'){
    const r = I.brush - 1;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++){
      const nx = x + dx, ny = y + dy; if (!U.inMap(nx, ny)) continue;
      const i = U.idx(nx, ny); if (d.painted.has(i)) continue; d.painted.add(i);
      const tid = I.toolArg;
      if (!FP.World.canPaint(G, i, tid)) continue;
      const c = FP.TERRAINS[tid].custo;
      if (G.money < c){ FP.UI.toast('Dinheiro insuficiente.', 'error'); return; }
      FP.Economy.spend(c, 'paisagismo'); d.spent += c;
      G.ground[i] = tid;
      if (G.enc[i] >= 0) G.enclosures[G.enc[i]].dirty = true;
    }
    FP.Audio.play('path');
    return;
  }
  const i = U.idx(x, y);
  if (d.painted.has(i)) return; d.painted.add(i);
  if (I.tool === 'path'){
    if (!FP.World.canPath(G, i)) return;
    if (G.money < FP.World.PATH_COST){ FP.UI.toast('Dinheiro insuficiente.', 'error'); return; }
    FP.Economy.spend(FP.World.PATH_COST, 'construção'); d.spent += FP.World.PATH_COST;
    G.path[i] = 1; G.litter[i] = 0;
    FP.Audio.play('path');
  } else if (I.tool === 'deco'){
    const v = FP.World.canPlaceObject(G, 'deco', I.toolArg, x, y);
    if (!v.ok){ if (d.painted.size === 1){ FP.UI.toast(v.msg, 'error'); FP.Audio.play('error'); } return; }
    const def = FP.DECOS[I.toolArg];
    if (G.money < def.custo){ FP.UI.toast('Dinheiro insuficiente.', 'error'); return; }
    FP.World.placeObject(G, 'deco', I.toolArg, x, y);
    d.spent += def.custo;
    if (G.enc[i] >= 0) G.enclosures[G.enc[i]].dirty = true;
    FP.Audio.play('build');
  }
}
function placeBuilding(t){
  const G = FP.G, type = I.toolArg, def = FP.BUILDINGS[type];
  const x = t.x - Math.floor((def.w - 1) / 2), y = t.y - Math.floor((def.h - 1) / 2);
  const v = FP.World.canPlaceObject(G, 'building', type, x, y);
  if (!v.ok){ FP.UI.toast(v.msg, 'error'); FP.Audio.play('error'); return; }
  if (G.money < def.custo){ FP.UI.toast('Dinheiro insuficiente (' + U.money(def.custo) + ').', 'error'); FP.Audio.play('error'); return; }
  const o = FP.World.placeObject(G, 'building', type, x, y);
  FP.World.refreshNetwork(G);
  FP.Audio.play('build'); FP.UI.floatMoney(-def.custo);
  if (o.door < 0 && !def.foraCaminhoOk) FP.UI.toast(`${def.nome} precisa encostar em um caminho conectado à entrada para funcionar.`, 'info');
}
function demolish(tiles){
  const G = FP.G;
  let refund = 0, count = 0; const msgs = new Set();
  const objs = new Set();
  const hadObj = new Set();
  tiles.forEach(i => { if (G.obj[i] >= 0){ objs.add(G.obj[i]); hadObj.add(i); } });
  objs.forEach(id => { const o = G.objects[id]; if (!o || o.type === 'entrada'){ if (o) msgs.add('A entrada principal não pode ser demolida.'); return; } refund += Math.round(FP.World.objDef(o).custo * .4); if (o.kind === 'deco' && G.enc[U.idx(o.x, o.y)] >= 0) G.enclosures[G.enc[U.idx(o.x, o.y)]].dirty = true; FP.World.removeObject(G, id); count++; });
  // caminhos: se o tile tinha um poste/placa na borda, remove só o objeto (o caminho fica)
  tiles.forEach(i => { if (G.path[i] && !hadObj.has(i)){ if (i === G.gate || i === G.gate + 1){ msgs.add('O acesso da entrada não pode ser removido.'); return; } G.path[i] = 0; G.litter[i] = 0; refund += 6; count++; } });
  const byEnc = {};
  tiles.forEach(i => { if (G.enc[i] >= 0) (byEnc[G.enc[i]] = byEnc[G.enc[i]] || []).push(i); });
  Object.keys(byEnc).forEach(id => {
    const e = G.enclosures[id];
    const r = FP.World.removeEnclosureTiles(G, e, byEnc[id]);
    if (r.ok){ refund += r.n * 5; count += r.n; if (r.removed && FP.UI.selected && FP.UI.selected.id === e.id) FP.UI.closePanels(); }
    else if (r.msg) msgs.add(r.msg);
  });
  msgs.forEach(m => FP.UI.toast(m, 'error'));
  if (count){
    FP.Economy.earn(refund, 'reembolsos');
    FP.World.refreshNetwork(G);
    FP.Audio.play('demolish');
    FP.UI.floatMoney(refund);
  }
}

/* ---------- Prévia das ferramentas (desenhada no mundo) ---------- */
I.drawPreview = function(g, T){
  const G = FP.G, t = I.hoverTile;
  if (I.drag && I.tool === 'path'){
    const p = I.pathPlan(I.drag), B = new Set(p.build), X = new Set(p.blocked);
    p.tiles.forEach(i => {
      const x = U.ix(i), y = U.iy(i);
      g.fillStyle = B.has(i) ? 'rgba(232,214,170,.85)' : X.has(i) ? 'rgba(232,87,75,.5)' : 'rgba(123,200,108,.35)';
      g.fillRect(x * T, y * T, T, T);
      g.strokeStyle = B.has(i) ? 'rgba(140,110,60,.9)' : 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.strokeRect(x * T + .5, y * T + .5, T - 1, T - 1);
    });
    const last = p.tiles[p.tiles.length - 1];
    const afford = G.money >= p.cost;
    FP.Render.label((U.ix(last) + .5) * T, U.iy(last) * T - 12, `🛤️ ${p.build.length} tiles · ${U.money(p.cost)}${p.blocked.length ? ' · ' + p.blocked.length + ' bloqueados' : ''}${afford ? '' : ' · saldo insuficiente'}`, '#FFF4DE', afford ? 'rgba(30,42,47,.9)' : 'rgba(150,40,30,.92)', 12);
    return;
  }
  if (I.drag && ['enclosure', 'expand', 'demolish', 'release', 'reshape', 'pond', 'fill'].includes(I.tool)){
    const d = I.drag;
    const xa = Math.min(d.x0, d.x1), xb = Math.max(d.x0, d.x1), ya = Math.min(d.y0, d.y1), yb = Math.max(d.y0, d.y1);
    const tiles = FP.World.rectTiles(d.x0, d.y0, d.x1, d.y1);
    let ok = true, txt = '';
    if (I.tool === 'demolish'){ g.fillStyle = 'rgba(232,87,75,.3)'; txt = '🧨 Demolir ' + tiles.length + ' tiles'; }
    else if (I.tool === 'pond' || I.tool === 'fill'){
      const e = G.enclosures[I.toolArg];
      const p = e ? FP.World.pondPreview(G, e, tiles, I.tool === 'fill') : {ok:false, msg:'Recinto inexistente.'}; ok = p.ok;
      g.fillStyle = ok ? (I.tool === 'pond' ? 'rgba(58,143,198,.5)' : 'rgba(160,120,70,.45)') : 'rgba(232,87,75,.35)';
      txt = ok ? `${I.tool === 'pond' ? '💧 Lago' : '⛰️ Aterrar'} ${p.n} tiles · ${U.money(p.cost)}` : '⛔ ' + p.msg.split('.')[0];
    }
    else if (I.tool === 'release'){ const n = tiles.filter(i => G.enc[i] >= 0).length; g.fillStyle = 'rgba(46,143,184,.32)'; txt = `🔓 Liberar ${n} tiles de recinto · +${U.money(n * 5)}`; }
    else if (I.tool === 'reshape'){
      const e = G.enclosures[I.toolArg];
      const p = e ? FP.World.reshapePreview(G, e, tiles) : {ok:false, msg:'Recinto inexistente.'}; ok = p.ok;
      g.fillStyle = ok ? 'rgba(242,179,61,.35)' : 'rgba(232,87,75,.35)';
      txt = ok ? `📐 Nova área ${xb - xa + 1}×${yb - ya + 1} · custo ${U.money(p.cost)}${p.refund ? ' · reembolso ' + U.money(p.refund) : ''}` : '⛔ ' + p.msg.split('.')[0];
    }
    else {
      const e = I.tool === 'expand' ? G.enclosures[I.toolArg] : null;
      const v = FP.World.validateEnclosureRect(G, tiles, e); ok = v.ok;
      const cost = FP.World.enclosureCost(G, tiles, e);
      g.fillStyle = ok ? 'rgba(123,200,108,.35)' : 'rgba(232,87,75,.35)';
      txt = `${xb - xa + 1}×${yb - ya + 1} · ${U.money(cost)}`;
      if (ok && e){ const sp = FP.World.encCapacity(G, e).sp; if (sp){ const n = e.tiles.length + tiles.filter(i => G.enc[i] !== e.id).length; txt += ` · cap. ${Math.floor(n / FP.SPECIES[sp].esp)}`; } }
      else if (ok) txt += ` · ${tiles.length} tiles`;
      else txt = '⛔ ' + v.msg.split('.')[0];
      if (ok && v.steal) txt += ` · redesigna ${v.steal}`;
    }
    g.fillRect(xa * T, ya * T, (xb - xa + 1) * T, (yb - ya + 1) * T);
    g.strokeStyle = I.tool === 'demolish' ? '#E8574B' : I.tool === 'release' || (I.tool === 'pond' && ok) ? '#2E8FB8' : ok ? '#7BC86C' : '#E8574B'; g.lineWidth = 2;
    g.strokeRect(xa * T, ya * T, (xb - xa + 1) * T, (yb - ya + 1) * T);
    FP.Render.label((xa + xb + 1) / 2 * T, ya * T - 12, txt, '#FFF4DE', 'rgba(30,42,47,.9)', 12);
    return;
  }
  if (!t) return;
  if (I.tool === 'building'){
    const def = FP.BUILDINGS[I.toolArg];
    const x = t.x - Math.floor((def.w - 1) / 2), y = t.y - Math.floor((def.h - 1) / 2);
    const v = FP.World.canPlaceObject(G, 'building', I.toolArg, x, y);
    g.globalAlpha = .7; g.drawImage(FP.Sprites.building(I.toolArg), x * T, y * T, def.w * T, def.h * T); g.globalAlpha = 1;
    g.fillStyle = v.ok ? 'rgba(123,200,108,.25)' : 'rgba(232,87,75,.4)'; g.fillRect(x * T, y * T, def.w * T, def.h * T);
    FP.Render.label((x + def.w / 2) * T, y * T - 12, v.ok ? `${def.nome} · ${U.money(def.custo)}` : '⛔ ' + v.msg, '#FFF4DE', 'rgba(30,42,47,.9)', 12);
  } else if (I.tool === 'deco'){
    const v = FP.World.canPlaceObject(G, 'deco', I.toolArg, t.x, t.y);
    const s = FP.Sprites.deco(I.toolArg, 0);
    const [ox, oy] = FP.DECOS[I.toolArg].naBorda ? FP.World.borderOffset(G, t.x, t.y) : [0, 0];
    g.globalAlpha = .75; g.drawImage(s.c, (t.x + .5 + ox) * T - s.half, (t.y + .5 + oy) * T - s.half, s.half * 2, s.half * 2); g.globalAlpha = 1;
    g.strokeStyle = v.ok ? '#7BC86C' : '#E8574B'; g.lineWidth = 2; g.strokeRect(t.x * T, t.y * T, T, T);
    FP.Render.label((t.x + .5) * T, t.y * T - 10, v.ok ? `${FP.DECOS[I.toolArg].nome} · ${U.money(FP.DECOS[I.toolArg].custo)}` : '⛔ ' + v.msg, '#FFF4DE', 'rgba(30,42,47,.9)', 11);
  } else if (I.tool === 'path'){
    const ok = FP.World.canPath(G, U.idx(t.x, t.y)) || G.path[U.idx(t.x, t.y)];
    g.fillStyle = ok ? 'rgba(216,203,169,.7)' : 'rgba(232,87,75,.35)'; g.fillRect(t.x * T, t.y * T, T, T);
    FP.Render.label((t.x + .5) * T, t.y * T - 10, `Caminho · ${U.money(FP.World.PATH_COST)}/tile · clique e arraste uma reta, solte para construir`, '#FFF4DE', 'rgba(30,42,47,.9)', 11);
  } else if (I.tool === 'terrain'){
    const r = I.brush - 1, tid = I.toolArg;
    g.fillStyle = FP.TERRAINS[tid].cor; g.globalAlpha = .55;
    g.fillRect((t.x - r) * T, (t.y - r) * T, (r * 2 + 1) * T, (r * 2 + 1) * T); g.globalAlpha = 1;
    g.strokeStyle = '#FFF4DE'; g.lineWidth = 1.5; g.strokeRect((t.x - r) * T, (t.y - r) * T, (r * 2 + 1) * T, (r * 2 + 1) * T);
    FP.Render.label((t.x + .5) * T, (t.y - r) * T - 10, `${FP.TERRAINS[tid].nome} · ${U.money(FP.TERRAINS[tid].custo)}/tile`, '#FFF4DE', 'rgba(30,42,47,.9)', 11);
  } else if (['demolish', 'enclosure', 'expand', 'release', 'reshape', 'pond', 'fill'].includes(I.tool)){
    g.strokeStyle = I.tool === 'demolish' ? '#E8574B' : I.tool === 'release' ? '#2E8FB8' : '#7BC86C'; g.lineWidth = 2; g.strokeRect(t.x * T, t.y * T, T, T);
    const L = {pond: 'Arraste sobre o recinto para abrir um lago', fill: 'Arraste sobre a água do recinto para aterrar', expand: 'Arraste para ampliar o recinto (pode avançar sobre outro recinto)', enclosure: 'Arraste para desenhar o recinto (mín. 3×3)', release: 'Arraste para liberar área de recinto', reshape: 'Arraste a NOVA área completa do recinto'};
    if (L[I.tool]) FP.Render.label((t.x + .5) * T, t.y * T - 10, L[I.tool], '#FFF4DE', 'rgba(30,42,47,.9)', 11);
  }
};
})();
