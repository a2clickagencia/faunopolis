/* =========================================================
   FAUNÓPOLIS — input.js
   Mouse, teclado, câmera e ferramentas de construção
   (caminho, recinto, ampliação, terreno, vegetação,
   instalações, demolição e compra de lotes).
   ========================================================= */
'use strict';
(function(){
const I = FP.Input = {tool: 'select', toolArg: null, brush: 1, terrainMode: 'area', hoverTile: null, hoverChunk: null, drag: null, mouse: {x: 0, y: 0}};
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
  initTouch();
};

/* ---------- v7.2: controles de toque (celular e tablet) ----------
   Ferramenta "Selecionar" (ou "✋ Mover" ligado): 1 dedo arrasta o mapa, toque abre o painel.
   Ferramentas de desenho (caminho, recinto, lago, terreno, demolir…): 1 dedo DESENHA, solte para construir.
   Instalações e lotes: toque para posicionar (arrastar com 1 dedo move o mapa).
   2 dedos, sempre: mover + pinça (zoom); no 3D, girar os dedos gira a câmera e
   arrastar os 2 dedos para cima/baixo inclina. */
const DRAW_TOOLS = ['path', 'enclosure', 'expand', 'demolish', 'release', 'reshape', 'pond', 'fill', 'terrain', 'deco', 'landfill'];
I.panLock = false;   // botão "✋ Mover": 1 dedo só move o mapa, mesmo com uma ferramenta ativa
I.isTouch = false;
I.drawsWithFinger = () => !I.panLock && DRAW_TOOLS.includes(I.tool);
function initTouch(){
  let T1 = null, T2 = null, holdTimer = 0;
  const pt = t => ({x: t.clientX, y: t.clientY});
  const setMouse = p => { I.mouse = {x: p.x, y: p.y}; updateHover(); };
  const endDraw = cancel => {
    if (!I.drag) return;
    // retângulos e caminhos são descartados; pintura (terreno/vegetação) já foi paga e é finalizada
    if (cancel && I.tool !== 'terrain' && I.tool !== 'deco'){ I.drag = null; return; }
    toolUp();
  };
  const startGesture = e => {
    clearTimeout(holdTimer);
    if (T1 && T1.drawing) endDraw(true);
    const a = pt(e.touches[0]), b = pt(e.touches[1]);
    T1 = null;
    T2 = {mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x), cx: FP.Cam.x, cy: FP.Cam.y, z: FP.Cam.zoom, wx: 0, wy: 0};
    if (!is3D()){ const w = FP.Render.screenToWorld(T2.mx, T2.my); T2.wx = w.x; T2.wy = w.y; }
  };
  cv.addEventListener('touchstart', e => {
    I.isTouch = true;
    FP.UI.unlockAudio && FP.UI.unlockAudio();
    FP.UI.hideTooltip();
    if (e.touches.length >= 2){ startGesture(e); e.preventDefault(); return; }
    const p = pt(e.touches[0]);
    T1 = {x: p.x, y: p.y, lx: p.x, ly: p.y, cx: FP.Cam.x, cy: FP.Cam.y, moved: false, drawing: false, t: performance.now()};
    if (I.drawsWithFinger()){
      // começa a desenhar após um pequeno atraso (ou ao mover), para que um 2º dedo vire gesto de câmera
      const me = T1;
      holdTimer = setTimeout(() => { if (T1 === me && !me.drawing){ setMouse(me); me.drawing = true; toolDown(); } }, 140);
    }
    e.preventDefault();
  }, {passive: false});
  cv.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length >= 2){
      if (!T2){ startGesture(e); return; }
      const a = pt(e.touches[0]), b = pt(e.touches[1]);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.hypot(a.x - b.x, a.y - b.y) || 1, ang = Math.atan2(b.y - a.y, b.x - a.x);
      if (is3D()){
        const ddx = mx - T2.mx, ddy = my - T2.my;
        let da = ang - T2.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
        FP.R3.zoomBy(d / T2.d, mx, my);
        if (Math.abs(da) > .004) FP.R3.orbitBy(-da / .006, 0);
        // dois dedos na vertical (sem afastar) = inclinar; senão, mover
        const pinchy = Math.abs(d - T2.d) > 2;
        if (!pinchy && Math.abs(ddy) > Math.abs(ddx) * 1.6 && Math.abs(a.y - b.y) < Math.abs(a.x - b.x) * 1.2 && T2.tilt !== false){ T2.tilt = true; FP.R3.orbitBy(0, ddy * 1.1); }
        else { if (Math.abs(ddx) + Math.abs(ddy) > 1.5) T2.tilt = false; FP.R3.panBy(ddx, ddy); }
        T2.mx = mx; T2.my = my; T2.d = d; T2.ang = ang;
      } else {
        FP.Cam.zoom = U.clamp(T2.z * d / T2.d, FP.Cam.minZ, FP.Cam.maxZ);
        // mantém sob os dedos o ponto do mundo onde a pinça começou
        const W2 = window.innerWidth / 2, H2 = window.innerHeight / 2;
        FP.Cam.x = T2.wx - (mx - W2) / FP.Cam.zoom; FP.Cam.y = T2.wy - (my - H2) / FP.Cam.zoom;
        FP.Render.clampCam();
      }
      return;
    }
    if (!T1) return;
    const p = pt(e.touches[0]);
    const dx = p.x - T1.x, dy = p.y - T1.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) T1.moved = true;
    if (I.drawsWithFinger()){
      if (!T1.drawing && T1.moved){ clearTimeout(holdTimer); setMouse(T1); T1.drawing = true; toolDown(); }
      if (T1.drawing){ setMouse(p); if (I.drag) toolMove(); }
      return;
    }
    if (!T1.moved) return;
    if (is3D()){ FP.R3.panBy(p.x - T1.lx, p.y - T1.ly); T1.lx = p.x; T1.ly = p.y; }
    else { FP.Cam.x = T1.cx - dx / FP.Cam.zoom; FP.Cam.y = T1.cy - dy / FP.Cam.zoom; FP.Render.clampCam(); }
  }, {passive: false});
  const onEnd = e => {
    if (e.touches.length >= 2) return;
    if (e.touches.length === 1 && T2){
      // sobrou um dedo depois do gesto: ele só move o mapa até ser solto
      const p = pt(e.touches[0]); T2 = null;
      T1 = {x: p.x, y: p.y, lx: p.x, ly: p.y, cx: FP.Cam.x, cy: FP.Cam.y, moved: true, drawing: false, afterGesture: true};
      return;
    }
    clearTimeout(holdTimer);
    const was = T1; T1 = null; T2 = null;
    if (!was || e.type === 'touchcancel'){ endDraw(true); return; }
    if (was.afterGesture) return;
    const p = pt(e.changedTouches[0]);
    if (was.drawing){ setMouse(p); toolMove(); toolUp(); }
    else if (!was.moved){
      // toque simples: seleciona, posiciona instalação, compra lote ou marca 1 tile
      setMouse(p);
      if (I.panLock && I.tool !== 'select'){ if (I.hoverTile) FP.UI.clickWorld(I.hoverTile); }
      else { toolDown(); if (I.drag){ toolMove(); toolUp(); } }
    }
    // sem mouse, a prévia some quando o dedo sai (exceto instalações, que mostram onde foram postas)
    if (I.tool !== 'building') I.hoverTile = null;
  };
  cv.addEventListener('touchend', onEnd);
  cv.addEventListener('touchcancel', onEnd);
}
I.zoomStep = function(f){
  if (is3D()) FP.R3.zoomBy(f);
  else FP.Cam.zoom = U.clamp(FP.Cam.zoom * f, FP.Cam.minZ, FP.Cam.maxZ);
};

I.setTool = function(tool, arg){
  I.tool = tool; I.toolArg = (arg === undefined || arg === null || arg === '') ? null : arg; I.drag = null;
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
  if ((e.ctrlKey || e.metaKey) && k === 'z'){ e.preventDefault(); keys[k] = false; FP.Undo.undo(); return; }
  if (e.ctrlKey || e.metaKey) return;
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
      // v2.3: o terreno é escolhido por ÁREA (como um recinto); o pincel continua disponível
      if (I.tool === 'terrain' && I.terrainMode === 'area'){ I.drag = {x0: t.x, y0: t.y, x1: t.x, y1: t.y}; break; }
      I.drag = {x0: t.x, y0: t.y, x1: t.x, y1: t.y, painted: new Set(), spent: 0, snap: FP.Undo.snap(I.tool === 'deco' ? FP.DECOS[I.toolArg].nome : 'pintura de terreno')};
      paintAt(t.x, t.y); break;
    case 'enclosure': case 'expand': case 'demolish': case 'release': case 'reshape': case 'pond': case 'fill': case 'landfill':
      I.drag = {x0: t.x, y0: t.y, x1: t.x, y1: t.y}; break;
    case 'building': placeBuilding(t); break;
    case 'land': {
      const [cx, cy] = FP.World.chunkOf(t.x, t.y);
      const price = FP.World.chunkPrice(G);
      if (!FP.World.chunkBuyable(G, cx, cy)){ FP.UI.toast('Escolha um lote destacado, vizinho ao seu terreno.', 'error'); FP.Audio.play('error'); break; }
      FP.UI.confirm('Comprar lote de terreno', `Comprar este lote de 8×8 tiles por <b>${U.money(price)}</b>?`, () => {
        const snap = FP.Undo.snap('compra de lote');
        const r = FP.World.buyChunk(G, cx, cy);
        if (r.ok) FP.Undo.commit(snap);
        if (r.ok){ FP.Audio.play('buy'); FP.UI.toast('Lote adquirido por ' + U.money(r.price) + '!', 'good'); FP.World.refreshNetwork(G); }
        else { FP.UI.toast(r.msg, 'error'); FP.Audio.play('error'); }
      });
      break;
    }
  }
}
function toolMove(){
  const t = I.hoverTile; if (!t || !I.drag) return;
  if ((I.tool === 'terrain' && I.terrainMode !== 'area') || I.tool === 'deco'){
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
  const LBL = {path: 'caminho', enclosure: 'novo recinto', expand: 'ampliação do recinto', reshape: 'nova área do recinto', release: 'liberação de área', pond: 'lago', fill: 'aterro', demolish: 'demolição', terrain: 'terreno', landfill: 'aterro'};
  const snap = d.snap || FP.Undo.snap(LBL[I.tool] || I.tool);
  if (I.tool === 'path'){
    const p = I.pathPlan(d);
    if (!p.build.length){ if (p.tiles.length > 1 || !G.path[p.tiles[0]]) { FP.UI.toast('Nenhum tile pode receber caminho neste traçado.', 'error'); FP.Audio.play('error'); } return; }
    let n = 0;
    for (const i of p.build){
      if (G.money < FP.World.PATH_COST){ FP.UI.toast('Dinheiro insuficiente: o caminho foi construído só em parte.', 'error'); break; }
      FP.Economy.spend(FP.World.PATH_COST, 'construção'); G.path[i] = 1; G.litter[i] = 0; n++;
    }
    if (n){ FP.Audio.play('build'); FP.UI.floatMoney(-n * FP.World.PATH_COST); FP.Undo.commit(snap); }
    FP.World.refreshNetwork(G);
    Object.values(G.enclosures).forEach(e => e.dirty = true);
    return;
  }
  if (I.tool === 'terrain' && I.terrainMode === 'area' || I.tool === 'landfill'){
    const tiles = FP.World.rectTiles(d.x0, d.y0, d.x1, d.y1);
    const fill = I.tool === 'landfill';
    const tid = fill ? (I.toolArg === null ? FP.T.grama : I.toolArg) : I.toolArg;
    const r = I.paintArea(tiles, tid, fill, false);
    if (!r.n){ FP.UI.toast(fill ? 'Não há água para aterrar nesta área (água com aguapés ou boias precisa ser limpa antes).' : 'Nenhum tile desta área pode receber este terreno.', 'error'); FP.Audio.play('error'); return; }
    FP.Undo.commit(snap);
    FP.Audio.play('path'); FP.UI.floatMoney(-r.spent);
    if (r.poor) FP.UI.toast('Dinheiro insuficiente: a área foi preenchida só em parte.', 'error');
    else if (fill) FP.UI.toast(`⛰️ ${r.n} tiles de água aterrados (${FP.TERRAINS[tid].nome}).`, 'good');
    FP.World.refreshNetwork(G);
    return;
  }
  if (I.tool === 'deco' || I.tool === 'terrain'){
    if (d.spent > 0){ FP.UI.floatMoney(-d.spent); FP.Undo.commit(snap); }
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
    FP.Undo.commit(snap);
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
    FP.Undo.commit(snap);
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
    FP.Undo.commit(snap);
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
      FP.Undo.commit(snap);
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
    FP.Undo.commit(snap);
    FP.World.applyPond(G, e, tiles, fill);
    FP.Economy.spend(p.cost, 'paisagismo');
    FP.Audio.play('path'); FP.UI.floatMoney(-p.cost);
    FP.UI.toast(fill ? `${p.n} tiles de água aterrados em ${e.name}.` : `💧 Lago com ${p.n} tiles aberto em ${e.name}.`, 'good');
  } else if (I.tool === 'demolish'){
    if (demolish(tiles)) FP.Undo.commit(snap);
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
  FP.Undo.commit(FP.Undo.snap(def.nome));
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
  // v2.3: se a área tinha itens (brinquedo, árvore, banco…), remove SÓ os itens: o recinto
  // ou o caminho embaixo continuam. Para demolir o recinto/caminho, passe a ferramenta de novo.
  if (count){
    msgs.forEach(m => FP.UI.toast(m, 'error'));
    FP.Economy.earn(refund, 'reembolsos');
    FP.World.refreshNetwork(G);
    FP.Audio.play('demolish');
    FP.UI.floatMoney(refund);
    FP.UI.toast(`🧨 ${count} ${count === 1 ? 'item removido' : 'itens removidos'}. O recinto e o caminho embaixo foram mantidos.`, 'info');
    return count;
  }
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
  return count;
}
/* v2.3: pinta uma área inteira de terreno (ou aterra só a água dela) */
I.paintArea = function(tiles, tid, onlyWater, preview){
  const G = FP.G, c = FP.TERRAINS[tid].custo, T = FP.T;
  let n = 0, spent = 0, poor = false, blocked = 0;
  const touched = new Set();
  for (const i of tiles){
    if (onlyWater && G.ground[i] !== T.agua) continue;
    if (tid === T.agua && G.enc[i] < 0 && !G.owned[i]) continue;
    if (!FP.World.canPaint(G, i, tid)){ if (G.ground[i] !== tid) blocked++; continue; }
    if (G.money - spent < c){ poor = true; if (!preview) break; }
    spent += c; n++;
    if (preview) continue;
    FP.Economy.spend(c, 'paisagismo');
    G.ground[i] = tid;
    if (G.enc[i] >= 0) touched.add(G.enc[i]);
  }
  if (!preview) touched.forEach(id => { const e = G.enclosures[id]; if (!e) return; e.dirty = true; FP.World.encAnimals(G, e).forEach(a => FP.Animals.ensureInside(a)); });
  return {n, spent, poor, blocked};
};

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
  if (I.drag && (I.tool === 'landfill' || (I.tool === 'terrain' && I.terrainMode === 'area'))){
    const d = I.drag, fill = I.tool === 'landfill';
    const xa = Math.min(d.x0, d.x1), xb = Math.max(d.x0, d.x1), ya = Math.min(d.y0, d.y1), yb = Math.max(d.y0, d.y1);
    const tid = fill ? (I.toolArg === null ? FP.T.grama : I.toolArg) : I.toolArg;
    const r = I.paintArea(FP.World.rectTiles(d.x0, d.y0, d.x1, d.y1), tid, fill, true);
    const ok = r.n > 0;
    g.fillStyle = FP.TERRAINS[tid].cor; g.globalAlpha = ok ? .55 : .25; g.fillRect(xa * T, ya * T, (xb - xa + 1) * T, (yb - ya + 1) * T); g.globalAlpha = 1;
    g.strokeStyle = ok ? '#FFF4DE' : '#E8574B'; g.lineWidth = 2; g.strokeRect(xa * T, ya * T, (xb - xa + 1) * T, (yb - ya + 1) * T);
    const txt = ok ? `${fill ? '⛰️ Aterrar' : '🏞️ ' + FP.TERRAINS[tid].nome} · ${xb - xa + 1}×${yb - ya + 1} · ${r.n} tiles · ${U.money(r.spent)}${r.poor ? ' · saldo insuficiente' : ''}` : (fill ? '⛔ Não há água para aterrar aqui' : '⛔ Nada a mudar nesta área');
    FP.Render.label((xa + xb + 1) / 2 * T, ya * T - 12, txt, '#FFF4DE', ok && !r.poor ? 'rgba(30,42,47,.9)' : 'rgba(150,40,30,.92)', 12);
    return;
  }
  if (I.drag && ['enclosure', 'expand', 'demolish', 'release', 'reshape', 'pond', 'fill'].includes(I.tool)){
    const d = I.drag;
    const xa = Math.min(d.x0, d.x1), xb = Math.max(d.x0, d.x1), ya = Math.min(d.y0, d.y1), yb = Math.max(d.y0, d.y1);
    const tiles = FP.World.rectTiles(d.x0, d.y0, d.x1, d.y1);
    let ok = true, txt = '';
    if (I.tool === 'demolish'){ g.fillStyle = 'rgba(232,87,75,.3)'; const no = new Set(tiles.filter(i => G.obj[i] >= 0 && G.objects[G.obj[i]] && G.objects[G.obj[i]].type !== 'entrada').map(i => G.obj[i])).size; txt = no ? `🧨 Remover ${no} ${no === 1 ? 'item' : 'itens'} (recinto/caminho ficam)` : '🧨 Demolir ' + tiles.length + ' tiles'; }
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
  } else if (I.tool === 'landfill' || (I.tool === 'terrain' && I.terrainMode === 'area')){
    const tid = I.tool === 'landfill' ? (I.toolArg === null ? FP.T.grama : I.toolArg) : I.toolArg;
    g.strokeStyle = '#FFF4DE'; g.lineWidth = 1.5; g.strokeRect(t.x * T, t.y * T, T, T);
    FP.Render.label((t.x + .5) * T, t.y * T - 10, I.tool === 'landfill' ? `⛰️ Arraste sobre a água para aterrar (vira ${FP.TERRAINS[tid].nome.toLowerCase()})` : `${FP.TERRAINS[tid].nome} · ${U.money(FP.TERRAINS[tid].custo)}/tile · arraste uma área`, '#FFF4DE', 'rgba(30,42,47,.9)', 11);
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
