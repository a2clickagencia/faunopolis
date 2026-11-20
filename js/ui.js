/* =========================================================
   FAUNÓPOLIS — ui.js
   Interface: menu principal, barra superior, barras de
   construção e gestão, painéis, tooltip, notificações,
   modais e guia rápido.
   ========================================================= */
'use strict';
(function(){
const UI = FP.UI = {selected: null, panel: null, inMenu: true};
const U = FP.U;
const $ = s => document.querySelector(s);
const esc = U.esc;
let audioUnlocked = false;

UI.unlockAudio = () => { audioUnlocked = true; };

/* =============== MENU PRINCIPAL =============== */
UI.showMenu = function(){
  UI.inMenu = true;
  const c3 = document.getElementById('game3d'); if (c3) c3.style.display = 'none';
  if (FP.R3 && FP.R3.active) FP.R3.setMode('2d');
  $('#menu').classList.remove('hidden');
  $('#hud').classList.add('hidden');
  const has = FP.Save.has('auto');
  const meta = FP.Save.meta('auto');
  $('#menu-continue').disabled = !has;
  $('#menu-continue-sub').textContent = meta ? `${meta.name} · Dia ${meta.day} · ${U.money(meta.money)}` : 'Nenhum jogo salvo';
};
UI.startGame = function(){
  UI.inMenu = false;
  $('#menu').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  const G = FP.G, gx = G.gate % FP.W, gy = Math.floor(G.gate / FP.W);
  FP.Render.centerOn(gx + 1, gy - 6);
  FP.Cam.zoom = 1.1;
  UI.buildToolbar(); UI.renderTop(); UI.renderNotifBadge();
  // v2.0: começa na visão 3D (ou na última câmera usada)
  let cm = 'iso'; try { cm = localStorage.getItem('faunopolis_cam') || 'iso'; } catch (e){}
  if (cm === 'seguir' || cm === 'visitante' || cm === 'tour') cm = 'iso';
  UI.setCamera(FP.R3 && FP.R3.available() ? cm : '2d', true);
};
/* =============== MODOS DE CÂMERA (v2.0) =============== */
const CAMS = [
  ['2d', '🗺️', 'Vista aérea 2D (planejamento)'],
  ['iso', '🏙️', 'Isométrica 3D — Q/E giram 90°'],
  ['livre', '🎥', 'Órbita livre 3D — botão do meio (ou Alt+direito) gira, Shift+roda inclina'],
  ['seguir', '🎯', 'Seguir animal — selecione um animal para trocar'],
  ['visitante', '🚶', 'Olhar do visitante (1ª pessoa)'],
  ['tour', '🎬', 'Tour cinematográfico pelo zoológico']
];
UI.setCamera = function(m, quiet){
  const R3 = FP.R3;
  if (m !== '2d' && (!R3 || !R3.setMode(m))) m = '2d';
  if (m !== '2d') m = R3.mode;
  if (m === '2d' && R3) R3.setMode('2d');
  try { localStorage.setItem('faunopolis_cam', m); } catch (e){}
  UI.renderCamBar();
  if (!quiet){ const c = CAMS.find(x => x[0] === m); UI.toast(c[1] + ' ' + c[2]); }
};
UI.cycleCamera = function(){
  const cur = FP.R3 && FP.R3.active ? FP.R3.mode : '2d';
  const i = CAMS.findIndex(c => c[0] === cur);
  UI.setCamera(CAMS[(i + 1) % CAMS.length][0]);
};
UI.renderCamBar = function(){
  const bar = $('#cambar'); if (!bar) return;
  const cur = FP.R3 && FP.R3.active ? FP.R3.mode : '2d';
  if (!bar.dataset.built){
    bar.dataset.built = 1;
    bar.innerHTML = CAMS.map(c => `<button data-cam="${c[0]}" title="${c[2]} (V alterna)">${c[1]}</button>`).join('') +
      `<span class="cam-rot"><button data-rot="-1" title="Girar à esquerda (Q)">⟲</button><button data-rot="1" title="Girar à direita (E)">⟳</button></span>`;
    bar.querySelectorAll('[data-cam]').forEach(b => b.onclick = () => { FP.Audio.play('click'); UI.setCamera(b.dataset.cam); });
    bar.querySelectorAll('[data-rot]').forEach(b => b.onclick = () => { if (FP.R3 && FP.R3.active) FP.R3.rotateStep(+b.dataset.rot); else UI.setCamera('iso'); });
  }
  bar.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === cur));
  bar.classList.toggle('is3d', cur !== '2d');
};
function newGameDialog(mode){
  UI.modal(`<h2>${mode === 'livre' ? '🌿 Modo livre' : '🏆 Nova carreira'}</h2>
    <p>${mode === 'livre' ? 'Todo o conteúdo liberado e R$ 500.000 para construir o zoológico dos seus sonhos, sem risco de falência.' : 'Comece com R$ 60.000, um terreno pequeno e poucas espécies. Cresça em 5 etapas até o conteúdo fantástico.'}</p>
    <label class="field">Nome do seu zoológico<input id="ng-name" maxlength="32" value="Zoológico ${esc(U.pick(['Vale Verde','Sol Nascente','Horizonte','Raízes','Bicho Feliz','Mata Viva','Arco-Íris','Boa Vista']))}"></label>
    <div class="modal-actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="ng-go">Começar</button></div>`);
  $('#ng-go').onclick = () => {
    const name = $('#ng-name').value.trim() || 'Meu Zoológico';
    UI.closeModal();
    FP.World.newGame(mode, name);
    FP.Economy.computeAttraction();
    UI.startGame();
    UI.notify('info', 'Bem-vindo(a) a ' + name + '!', 'Abra o Guia rápido (botão 📘) para os primeiros passos. Dica: comece desenhando um recinto e ligando-o a um caminho.', {panel: 'guide'});
    if (mode !== 'livre') UI.openPanel('guide');
  };
}
UI.initMenu = function(){
  $('#menu-new').onclick = () => { FP.Audio.play('click'); newGameDialog('carreira'); };
  $('#menu-free').onclick = () => { FP.Audio.play('click'); newGameDialog('livre'); };
  $('#menu-continue').onclick = () => { if (FP.Save.load('auto')){ UI.startGame(); UI.toast('Jogo carregado.'); } };
  $('#menu-load').onclick = () => UI.loadDialog();
  $('#menu-help').onclick = () => UI.helpDialog();
  $('#menu-credits').onclick = () => UI.modal(`<h2>Créditos</h2><p><b>FAUNÓPOLIS</b> v${FP.VERSION}<br>Jogo de construção e gestão de zoológico em 2D e 3D.</p><p>Design, programação, arte procedural e som sintetizado: equipe Faunópolis.<br>Todos os gráficos são gerados por código (Canvas 2D e modelos 3D esculpidos proceduralmente em WebGL: animais por campos de distância, vegetação orgânica, céu e água animados) e os sons por síntese (Web Audio API).<br>Motor 3D: <a href="https://threejs.org" target="_blank">Three.js</a> r128 (licença MIT), incluído em <code>js/lib/</code>.</p><p>Consulte a pasta <code>docs/</code> para o Manual do Jogo, o Manual de Instalação e o Manual da Marca.</p><div class="modal-actions"><button class="btn primary" data-close>Fechar</button></div>`);
};
UI.loadDialog = function(){
  const slots = ['auto', 'slot1', 'slot2', 'slot3'];
  const rows = slots.map(s => { const m = FP.Save.meta(s); return `<div class="row"><div><b>${s === 'auto' ? 'Automático' : 'Espaço ' + s.slice(-1)}</b><br><small>${m ? esc(m.name) + ' · Dia ' + m.day + ' · ' + U.money(m.money) + ' · ' + new Date(m.at).toLocaleString('pt-BR') : 'vazio'}</small></div>${m ? `<button class="btn sm" data-load="${s}">Carregar</button>` : ''}</div>`; }).join('');
  UI.modal(`<h2>Carregar jogo</h2><div class="list">${rows}</div>
    <p><label class="btn ghost file">📂 Importar arquivo .faunopolis<input type="file" id="imp-file" ${document.body.classList.contains('touch') ? '' : 'accept=".faunopolis,.json"'} hidden></label></p>
    <div class="modal-actions"><button class="btn primary" data-close>Fechar</button></div>`);
  document.querySelectorAll('[data-load]').forEach(b => b.onclick = () => { if (FP.Save.load(b.dataset.load)){ UI.closeModal(); UI.startGame(); UI.toast('Jogo carregado.'); } });
  $('#imp-file').onchange = e => { const f = e.target.files[0]; if (!f) return; FP.Save.importFile(f, (ok, err) => { if (ok){ UI.closeModal(); UI.startGame(); UI.toast('Arquivo importado.'); } else UI.toast('Arquivo inválido: ' + err, 'error'); }); };
};
UI.saveDialog = function(){
  const slots = ['slot1', 'slot2', 'slot3'];
  const rows = slots.map(s => { const m = FP.Save.meta(s); return `<div class="row"><div><b>Espaço ${s.slice(-1)}</b><br><small>${m ? esc(m.name) + ' · Dia ' + m.day : 'vazio'}</small></div><button class="btn sm" data-save="${s}">Salvar aqui</button></div>`; }).join('');
  UI.modal(`<h2>Salvar jogo</h2><div class="list">${rows}</div><p><button class="btn ghost" id="exp-file">${document.body.classList.contains('touch') ? '📤 Exportar / enviar arquivo (Drive, WhatsApp, e-mail…)' : '💾 Exportar para arquivo'}</button></p><div class="modal-actions"><button class="btn primary" data-close>Fechar</button></div>`);
  document.querySelectorAll('[data-save]').forEach(b => b.onclick = () => { if (FP.Save.save(b.dataset.save)){ UI.toast('Jogo salvo.', 'good'); UI.closeModal(); } });
  $('#exp-file').onclick = () => { if (FP.Save.exportFile() !== 'shared') UI.toast('Arquivo exportado para a pasta de downloads do navegador.'); };
};
UI.helpDialog = function(){
  const touch = document.body.classList.contains('touch');
  UI.modal(`<h2>Como jogar</h2>
  ${touch ? `<div class="touch-help"><h4>📱 Controles de toque</h4>
   <p><b>1 dedo</b>: arrasta o mapa · <b>toque</b>: abre o painel do animal, recinto ou instalação.</p>
   <p><b>2 dedos</b>: mover · <b>pinça</b>: zoom · no 3D, <b>girar os dedos</b> gira a câmera e <b>arrastar os 2 dedos para cima/baixo</b> inclina.</p>
   <p><b>Construir</b>: escolha a ferramenta na barra 🛤️🧱🧨… e <b>arraste 1 dedo</b> para desenhar; solte para construir. Instalações e lotes: <b>toque</b> no lugar.</p>
   <p>Botões à direita: <b>✋</b> mover sem construir · <b>＋ －</b> zoom · <b>⤒ ⤓</b> inclinar (3D) · <b>🗺️</b> minimapa, lentes e câmeras 2D/3D.</p>
   <p>O jogo salva sozinho a cada 3 dias de jogo e sempre que você sai do app. Em ☰ Menu dá para baixar a qualidade gráfica e ligar a economia de bateria.</p></div>` : ''}
  <div class="help-grid">
   <div><h4>Câmera</h4><p>WASD / setas: mover · Roda do mouse: zoom · Botão direito + arrastar: mover · Clique direito: cancelar ferramenta.</p></div>
   <div><h4>Câmera 3D (v2.0)</h4><p>V: alterna os modos (2D, Isométrica, Órbita livre, Seguir animal, Olhar do visitante, Tour) · Q/E: girar 90° · Botão do meio (ou Alt + botão direito): orbitar · Shift + roda ou PgUp/PgDn: inclinar.</p></div>
   <div><h4>Tempo</h4><p>Espaço: pausar · 1, 2, 3, 4: velocidades 1×, 2×, 4×, 8× · F5: salvar rápido.</p></div>
   <div><h4>Atalhos</h4><p>C: caminho · R: recinto · X: liberar área de recinto · B: demolir · L: alternar lentes · Esc: cancelar/fechar · <b>Ctrl+Z: desfazer</b> (ou o botão ↶ na barra).</p></div>
   <div><h4>Novidades da versão 2.3</h4><p>🏞️ Terreno por área (arraste como um recinto) e ⛰️ Aterrar água · 🧨 Demolir remove só o item e mantém o recinto · 🪑 Banco, lixeira, poste e ponto de informação no próprio caminho · 🐾 Cada item mostra para quais animais é indicado · 🍽️ Comedouro e 🚰 bebedouro · 8 novos brinquedos · Ctrl+Z.</p></div>
   <div><h4>Caminhos em linha (v7.1)</h4><p>Ferramenta Caminho (C): clique no início, arraste até o fim e solte. A reta (ou o "L") inteira é construída de uma vez, com prévia de custo e tiles bloqueados.</p></div>
   <div><h4>Brinquedos e lagos (v7.1)</h4><p>🧸 Brinquedos: bola, caixa de petiscos, pneu, arranhador, escova, quebra-cabeça, rede de cordas, poleiro e boia. Cada espécie adora alguns deles (veja "Adora" no habitat do recinto): os animais vão até eles e brincam, ganhando bem-estar. No painel do recinto: 💧 Abrir lago e ⛰️ Aterrar.</p></div>
   <div><h4>Recintos errados? (v2.0)</h4><p>Desenhe um novo recinto ou amplie por cima de outro: os tiles são redesignados. No painel do recinto use 📐 Redefinir área para refazer a área inteira, ou 🔓 Liberar parte.</p></div>
   <div><h4>Ciclo</h4><p>Planejar → Construir → Adquirir → Cuidar → Atrair → Receber → Administrar → Expandir → Otimizar → Desbloquear.</p></div>
  </div>
  <p>Passe o mouse sobre um recinto para ver população/capacidade, bem-estar, limpeza, alimentação, saúde e habitat. Clique para abrir o painel completo.</p>
  <p>O manual completo está em <code>docs/MANUAL_DO_JOGO.html</code>.</p>
  <div class="modal-actions"><a class="btn ghost" href="docs/MANUAL_DO_JOGO.html" target="_blank">Abrir manual</a><button class="btn primary" data-close>Fechar</button></div>`);
};
UI.pauseMenu = function(){
  const G = FP.G;
  const was = G.paused; G.paused = true; UI.renderTop();
  UI.modal(`<h2>Menu</h2>
    <div class="menu-list">
      <button class="btn" id="pm-resume">▶ Continuar</button>
      <button class="btn" id="pm-save">💾 Salvar</button>
      <button class="btn" id="pm-load">📂 Carregar</button>
      <button class="btn" id="pm-help">❓ Como jogar</button>
      ${FP.Save.desktop ? '<button class="btn" id="pm-folder" title="' + esc(FP.Save.saveDir()) + '">🗂️ Abrir pasta dos jogos salvos</button>' : ''}
      ${FP.Mobile && FP.Mobile.canInstall() ? '<button class="btn" id="pm-install">📲 Instalar o jogo (funciona sem internet)</button>' : ''}
      ${FP.Mobile && FP.Mobile.canFullscreen() ? '<button class="btn" id="pm-full">⛶ Tela cheia</button>' : ''}
      <label class="row-inline">🎨 Gráficos 3D <select id="pm-qual">${['auto', 'alta', 'media', 'baixa', 'minima'].map(q => `<option value="${q}" ${FP.R3.qualitySetting() === q ? 'selected' : ''}>${q === 'auto' ? 'Automático (' + FP.R3.QUAL[FP.R3.qualityLevel()].nome.toLowerCase() + ')' : FP.R3.QUAL[q].nome}</option>`).join('')}</select></label>
      <label class="row-inline"><input type="checkbox" id="pm-bat" ${FP.Mobile && FP.Mobile.battery() ? 'checked' : ''}> 🔋 Economia de bateria (30 quadros/s)</label>
      <label class="row-inline">🔊 Volume <input type="range" id="pm-vol" min="0" max="1" step="0.05" value="${FP.Audio.volume}"></label>
      <label class="row-inline"><input type="checkbox" id="pm-mute" ${FP.Audio.muted ? 'checked' : ''}> Silenciar efeitos</label>
      <button class="btn danger" id="pm-quit">⏏ Salvar e sair para o menu</button>
    </div>`, () => { G.paused = was; UI.renderTop(); });
  const pf = document.getElementById('pm-folder'); if (pf) pf.onclick = () => FP.Save.openFolder();
  const pi = document.getElementById('pm-install'); if (pi) pi.onclick = () => { UI.closeModal(); FP.Mobile.install(); };
  const pfu = document.getElementById('pm-full'); if (pfu) pfu.onclick = () => { UI.closeModal(); FP.Mobile.toggleFullscreen(); };
  $('#pm-qual').onchange = e => FP.R3.setQuality(e.target.value);
  $('#pm-bat').onchange = e => FP.Mobile.setBattery(e.target.checked);
  $('#pm-resume').onclick = () => { UI.closeModal(); };
  $('#pm-save').onclick = () => { UI.closeModal(); UI.saveDialog(); };
  $('#pm-load').onclick = () => { UI.closeModal(); UI.loadDialog(); };
  $('#pm-help').onclick = () => { UI.closeModal(); UI.helpDialog(); };
  $('#pm-vol').oninput = e => FP.Audio.setVolume(+e.target.value);
  $('#pm-mute').onchange = e => FP.Audio.setMuted(e.target.checked);
  $('#pm-quit').onclick = () => { FP.Save.save('auto'); UI.closeModal(); UI.closePanels(); UI.showMenu(); };
};

/* =============== MODAIS, TOASTS =============== */
let modalOnClose = null;
UI.modal = function(html, onClose){
  const m = $('#modal');
  m.querySelector('.modal-box').innerHTML = html;
  m.classList.remove('hidden');
  modalOnClose = onClose || null;
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = UI.closeModal);
};
UI.closeModal = function(){ $('#modal').classList.add('hidden'); const f = modalOnClose; modalOnClose = null; if (f) f(); };
UI.confirm = function(title, html, ok, okLabel){
  UI.modal(`<h2>${title}</h2><p>${html}</p><div class="modal-actions"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="cf-ok">${okLabel || 'Confirmar'}</button></div>`);
  $('#cf-ok').onclick = () => { UI.closeModal(); ok(); };
};
UI.toast = function(msg, type){
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.innerHTML = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3700);
  if (type === 'error') FP.Audio.play('error');
};
UI.floatMoney = function(v){
  const t = FP.Input.hoverTile; if (!t || !v) return;
  FP.Render.particles.push({x: t.x + .5, y: t.y, t: 0, life: 1.6, txt: (v > 0 ? '+' : '') + U.money(v), kind: 'money', color: v > 0 ? '#1F6B4A' : '#E8574B'});
};
UI.stageUp = function(n){
  const st = FP.STAGES[n];
  UI.modal(`<div class="stage-up"><div class="stage-num">Etapa ${n}</div><h2>${st.nome}</h2><p>${st.desc}</p><p class="prize">Prêmio: ${U.money(st.premio)}</p><div class="modal-actions"><button class="btn primary" data-close>Continuar</button></div></div>`);
};
UI.gameOver = function(){
  FP.Audio.play('death');
  UI.modal(`<h2>💸 Falência</h2><p>O zoológico ficou 20 dias com o caixa negativo e precisou fechar as portas.</p><p>Dica: cresça com responsabilidade — mais animais significam mais alimentação, limpeza, salários e manutenção.</p><div class="modal-actions"><button class="btn primary" id="go-menu">Voltar ao menu</button></div>`);
  $('#go-menu').onclick = () => { UI.closeModal(); FP.Save.remove('auto'); UI.closePanels(); UI.showMenu(); };
};

/* =============== NOTIFICAÇÕES =============== */
const NICON = {info:'ℹ️', warn:'⚠️', danger:'🚨', good:'✅', birth:'🐣', death:'🕊️', staff:'💬'};
UI.notify = function(type, title, text, link, key){
  const G = FP.G; if (!G) return;
  if (key){
    G._nkeys = G._nkeys || {};
    if (G._nkeys[key] && G.day - G._nkeys[key] < 1) return;
    G._nkeys[key] = G.day;
  }
  const n = {id: G.nextId++, type, title, text, link: link || null, day: G.day, hour: Math.floor(G.hour), read: false};
  G.notifications.unshift(n);
  if (G.notifications.length > 150) G.notifications.pop();
  if (UI.inMenu || (link && link.quiet)) return;
  const el = document.createElement('div');
  el.className = 'feed-item ' + type;
  el.innerHTML = `<span class="ficon">${NICON[type] || 'ℹ️'}</span><div><b>${esc(title)}</b><p>${esc(text)}</p></div><button class="fx" title="Dispensar">×</button>`;
  el.onclick = e => { if (e.target.classList.contains('fx')){ el.remove(); return; } UI.followLink(n); el.remove(); };
  const feed = $('#feed');
  feed.prepend(el);
  while (feed.children.length > 4) feed.lastChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, type === 'danger' ? 14000 : 9000);
  if (type === 'danger' || type === 'warn') FP.Audio.play('alert');
  UI.renderNotifBadge();
};
UI.followLink = function(n){
  n.read = true; UI.renderNotifBadge();
  const l = n.link; if (!l) return;
  const G = FP.G;
  if (l.animal){ const a = G.animals.find(x => x.id === l.animal); if (a){ if (!a.quar){ FP.Render.centerOn(a.x, a.y); } UI.openAnimal(a.id); return; } }
  if (l.enc !== undefined && G.enclosures[l.enc]){ const e = G.enclosures[l.enc]; FP.Render.centerOn(e.cx, e.cy); UI.openEnclosure(e.id); return; }
  if (l.panel) UI.openPanel(l.panel);
};
UI.renderNotifBadge = function(){
  const G = FP.G; if (!G) return;
  const n = G.notifications.filter(x => !x.read && (x.type === 'danger' || x.type === 'warn' || x.type === 'staff')).length;
  const b = $('#notif-badge'); b.textContent = n; b.style.display = n ? 'flex' : 'none';
};

/* =============== BARRA SUPERIOR =============== */
UI.renderTop = function(){
  const G = FP.G; if (!G) return;
  const tot = FP.Economy.todayTotals();
  $('#t-money').textContent = U.money(G.money);
  $('#t-money').classList.toggle('neg', G.money < 0);
  const net = $('#t-net'); net.textContent = (tot.net >= 0 ? '+' : '') + U.money(tot.net) + ' hoje'; net.className = tot.net >= 0 ? 'pos' : 'neg';
  $('#t-vis').textContent = G.visitors.length;
  $('#t-vis-sub').textContent = G.stats.visitorsToday + ' hoje';
  const stars = FP.Economy.stars(G.rep);
  $('#t-rep').innerHTML = '★'.repeat(Math.floor(stars)) + (stars % 1 ? '<span class="half">★</span>' : '') + '<span class="off">' + '★'.repeat(5 - Math.ceil(stars)) + '</span>';
  $('#t-rep-sub').textContent = 'Reputação ' + Math.round(G.rep);
  const sat = G.stats.satLive !== undefined ? G.stats.satLive : G.stats.satToday;
  $('#t-sat').textContent = Math.round(sat) + '%'; $('#t-sat').style.color = U.stateColor(sat);
  $('#t-wel').textContent = Math.round(G.stats.welfare) + '%'; $('#t-wel').style.color = U.stateColor(G.stats.welfare);
  const hh = Math.floor(G.hour), mm = Math.floor((G.hour - hh) * 60 / 10) * 10;
  const open = G.hour >= FP.OPEN_H && G.hour < FP.CLOSE_H;
  $('#t-time').textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + (open ? ' · aberto' : ' · fechado');
  $('#t-date').textContent = 'Dia ' + G.day + ' · ' + U.dateStr(G.day);
  $('#t-stage').textContent = G.mode === 'livre' ? 'Modo livre' : 'Etapa ' + G.stage + ' · ' + FP.STAGES[G.stage].nome;
  document.querySelectorAll('#speed button').forEach(b => b.classList.toggle('on', (b.dataset.speed === 'pause' && G.paused) || (!G.paused && +b.dataset.speed === G.speed)));
  if (G.event) $('#t-event').innerHTML = FP.EVENTS[G.event.id].icone + ' ' + FP.EVENTS[G.event.id].nome + ' (' + G.event.left + 'd)'; else $('#t-event').innerHTML = '';
};
UI.togglePause = () => { FP.G.paused = !FP.G.paused; UI.renderTop(); };
UI.setSpeed = s => { FP.G.speed = s; FP.G.paused = false; UI.renderTop(); };

/* =============== BARRA DE CONSTRUÇÃO =============== */
const BUILD_CATS = [
  {id:'select', icone:'🖱️', nome:'Selecionar / inspecionar', tool:'select'},
  {id:'path', icone:'🛤️', nome:'Caminhos (C)', tool:'path'},
  {id:'enclosure', icone:'🧱', nome:'Novo recinto (R) — pode ser desenhado sobre outro recinto para redesignar a área', tool:'enclosure'},
  {id:'release', icone:'🔓', nome:'Liberar área de recinto (X) — remove a designação sem demolir', tool:'release'},
  {id:'terrain', icone:'🏞️', nome:'Terreno e biomas', fly:'terrain'},
  {id:'veg', icone:'🌳', nome:'Vegetação', fly:'veg'},
  {id:'deco', icone:'🪨', nome:'Decoração e enriquecimento', fly:'deco'},
  {id:'toys', icone:'🧸', nome:'Brinquedos para os animais', fly:'toys'},
  {id:'visit', icone:'🍔', nome:'Instalações para visitantes', fly:'visit'},
  {id:'oper', icone:'🏥', nome:'Instalações operacionais', fly:'oper'},
  {id:'land', icone:'🗺️', nome:'Comprar terreno', tool:'land'},
  {id:'demolish', icone:'🧨', nome:'Demolir (B) — se a área tiver itens (brinquedo, árvore, banco…), remove só os itens', tool:'demolish'},
  {id:'undo', icone:'↶', nome:'Desfazer a última ação (Ctrl+Z)', act:'undo'}
];
UI.buildToolbar = function(){
  const bar = $('#buildbar');
  bar.innerHTML = BUILD_CATS.map(c => `<button data-cat="${c.id}" title="${c.nome}"><span>${c.icone}</span></button>`).join('');
  bar.querySelectorAll('button').forEach(b => b.onclick = () => {
    FP.Audio.play('click');
    const c = BUILD_CATS.find(x => x.id === b.dataset.cat);
    if (c.act === 'undo'){ FP.Undo.undo(); return; }
    if (c.tool){ $('#flyout').classList.add('hidden'); FP.Input.setTool(c.tool); }
    else UI.openFlyout(c);
  });
  UI.renderUndo();
  const mg = $('#mgmtbar');
  const M = [['animals','🦓','Animais'],['market','🛒','Mercado'],['staff','👷','Equipe'],['food','🥕','Alimentação'],['health','🩺','Saúde'],['visitors','🎟️','Visitantes'],['finance','💰','Finanças'],['progress','🏆','Progresso'],['notifs','🔔','Notificações'],['guide','📘','Guia']];
  mg.innerHTML = M.map(([id, ic, n]) => `<button data-panel="${id}" title="${n}"><span>${ic}</span><small>${n}</small>${id === 'notifs' ? '<i id="notif-badge"></i>' : ''}</button>`).join('');
  mg.querySelectorAll('button').forEach(b => b.onclick = () => { FP.Audio.play('open'); UI.openPanel(b.dataset.panel); });
  document.querySelectorAll('#speed button').forEach(b => b.onclick = () => { if (b.dataset.speed === 'pause') UI.togglePause(); else UI.setSpeed(+b.dataset.speed); });
  $('#btn-menu').onclick = UI.pauseMenu;
  document.querySelectorAll('#lenses button').forEach(b => b.onclick = () => { FP.Render.lens = b.dataset.lens; UI.renderLenses(); });
  UI.renderLenses();
  UI.onToolChange();
};
UI.renderUndo = () => { const b = document.querySelector('#buildbar [data-cat="undo"]'); if (b) b.disabled = !FP.Undo.can(); };
UI.renderLenses = () => document.querySelectorAll('#lenses button').forEach(b => b.classList.toggle('on', b.dataset.lens === FP.Render.lens));
UI.cycleLens = () => { const L = ['normal','bemestar','limpeza','saude','habitat','lotacao']; FP.Render.lens = L[(L.indexOf(FP.Render.lens) + 1) % L.length]; UI.renderLenses(); UI.toast('Lente: ' + document.querySelector(`#lenses [data-lens="${FP.Render.lens}"]`).title); };
UI.onToolChange = function(){
  const I = FP.Input;
  document.querySelectorAll('#buildbar button').forEach(b => {
    const c = BUILD_CATS.find(x => x.id === b.dataset.cat);
    let on = c.tool === I.tool;
    if (c.fly === 'terrain' && I.tool === 'terrain') on = true;
    if ((c.fly === 'veg' || c.fly === 'deco' || c.fly === 'toys') && I.tool === 'deco'){ const d = FP.DECOS[I.toolArg] || {}; on = c.fly === (d.planta ? 'veg' : d.brinquedo ? 'toys' : 'deco'); }
    if ((c.fly === 'visit' || c.fly === 'oper') && I.tool === 'building') on = (FP.BUILDINGS[I.toolArg].tipo === 'visitante') === (c.fly === 'visit');
    if (c.id === 'enclosure' && (I.tool === 'expand' || I.tool === 'reshape' || I.tool === 'pond' || I.tool === 'fill')) on = true;
    if (c.fly === 'terrain' && I.tool === 'landfill') on = true;
    b.classList.toggle('on', on);
  });
  const hint = $('#toolhint');
  const H = {path:'🛤️ Clique no início, arraste até o fim e SOLTE para construir a reta (ou o "L") inteira de uma vez. Visitantes só andam em caminhos ligados à entrada.', pond:'💧 Arraste sobre o recinto para abrir um lago (áreas sem plantas/objetos).', fill:'⛰️ Arraste sobre a água do recinto para aterrar.', enclosure:'🧱 Arraste um retângulo para criar um recinto (mín. 3×3). Pode ser desenhado por cima de outro recinto: os tiles são redesignados.', expand:'↔️ Arraste uma área encostada no recinto para ampliá-lo (pode tomar tiles de outro recinto).', reshape:'📐 Arraste a nova área completa do recinto. A área antiga é liberada (reembolso) e os animais são realocados.', release:'🔓 Arraste sobre áreas de recinto para liberá-las. Vegetação e decoração ficam; se um recinto inteiro for liberado, os animais vão para outro recinto compatível.', terrain:'🏞️ Arraste uma ÁREA para trocar o terreno (como um recinto), ou use o pincel.', landfill:'⛰️ Arraste uma área sobre a água: só a água vira terra firme.', deco:'🌳 Clique (ou arraste) para posicionar.', building:'🏗️ Clique para posicionar. A instalação precisa encostar em um caminho.', land:'🗺️ Clique em um lote destacado para comprá-lo.', demolish:'🧨 Se a área tiver itens (brinquedo, árvore, banco…), só os itens saem: o recinto e o caminho ficam. Sem itens, demole caminhos ou partes de recintos. Errou? Ctrl+Z.'};
  const HT = {path:'🛤️ Arraste o dedo do início ao fim e SOLTE: a reta (ou o "L") é construída de uma vez.', pond:'💧 Arraste o dedo sobre o recinto para abrir um lago.', fill:'⛰️ Arraste o dedo sobre a água do recinto para aterrar.', enclosure:'🧱 Arraste o dedo para desenhar o retângulo do recinto (mín. 3×3).', expand:'↔️ Arraste o dedo numa área encostada no recinto para ampliá-lo.', reshape:'📐 Arraste o dedo marcando a nova área completa do recinto.', release:'🔓 Arraste o dedo sobre a área de recinto que quer liberar.', terrain:'🏞️ Arraste o dedo marcando a área do novo terreno.', landfill:'⛰️ Arraste o dedo sobre a água para aterrar.', deco:'🌳 Toque (ou arraste o dedo) para posicionar.', building:'🏗️ Toque no mapa para posicionar (encostado num caminho).', land:'🗺️ Toque num lote destacado para comprá-lo.', demolish:'🧨 Arraste o dedo sobre o que quer demolir.'};
  const touch = document.body.classList.contains('touch');
  if (FP.Mobile) FP.Mobile.renderFabs();
  if (I.tool === 'select'){ hint.classList.add('hidden'); return; }
  hint.classList.remove('hidden');
  const rec = I.tool === 'deco' && FP.DECOS[I.toolArg] ? FP.World.recommendText('deco', I.toolArg, 5) : I.tool === 'terrain' && I.toolArg !== null ? FP.World.recommendText('terrain', I.toolArg, 5) : '';
  const modeBtns = I.tool === 'terrain' ? ` <button class="btn xs ${I.terrainMode === 'area' ? 'on' : ''}" data-tmode="area">▭ Área</button><button class="btn xs ${I.terrainMode !== 'area' ? 'on' : ''}" data-tmode="brush">🖌️ Pincel</button>` + (I.terrainMode !== 'area' ? [1,2,3].map(n => `<button class="btn xs ${I.brush === n ? 'on' : ''}" data-brush="${n}">${n * 2 - 1}×${n * 2 - 1}</button>`).join('') : '') : '';
  hint.innerHTML = (touch ? (I.panLock ? '✋ Mover ligado: 1 dedo move o mapa. Toque em ✋ para voltar a construir.' : (HT[I.tool] || '') + (['building', 'land'].includes(I.tool) ? '' : ' <small>2 dedos movem o mapa.</small>')) : (H[I.tool] || '')) + modeBtns + ' <button class="btn xs ghost" id="tool-cancel">' + (touch ? '✖ Sair' : 'Cancelar (Esc)') + '</button>' + (rec ? `<div class="hint-rec">🐾 ${esc(rec)}</div>` : '');
  hint.querySelectorAll('[data-brush]').forEach(b => b.onclick = () => { I.brush = +b.dataset.brush; UI.onToolChange(); });
  hint.querySelectorAll('[data-tmode]').forEach(b => b.onclick = () => { I.terrainMode = b.dataset.tmode; I.drag = null; UI.onToolChange(); });
  $('#tool-cancel').onclick = () => FP.Input.setTool('select');
};
const TOY_TAG = {todos:'todos', quad:'mamíferos', elefante:'elefantes', primata:'primatas', foca:'focas', predador:'felinos e predadores', herbivoro:'herbívoros', grande:'animais grandes', escalador:'escaladores', ave:'aves', nadador:'nadadores'};
UI.toyWho = function(k, full){ const g = FP.DECOS[k].gosto; return full ? g.map(t => TOY_TAG[t] || t).join(', ') : (TOY_TAG[g[0]] || g[0]); };
UI.openFlyout = function(c){
  const f = $('#flyout');
  if (document.body.classList.contains('phone') && !$('#panel').classList.contains('hidden')) UI.closePanels();
  if (!f.classList.contains('hidden') && f.dataset.cat === c.id){ f.classList.add('hidden'); return; }
  f.dataset.cat = c.id;
  const G = FP.G, E = FP.Economy;
  let items = [];
  if (c.fly === 'terrain'){
    items = FP.TERRAINS.map(t => ({kind:'terrain', id:t.id, nome:t.nome, custo:t.custo + '/tile', img:FP.Sprites.iconURL('terrain', t.id, 44), lock: !E.unlocked(t), stage: t.stage, rec: FP.World.recommendText('terrain', t.id, 6)}));
    items.push({kind:'landfill', id:FP.T.grama, nome:'Aterrar água', custo:'4+/tile', img:FP.Sprites.iconURL('terrain', FP.T.grama, 44), sub:'água → terra', rec:'Transforma lago em terra firme numa área inteira (vira grama, ou o terreno escolhido com o pincel por último).'});
  }
  else if (c.fly === 'toys') items = Object.keys(FP.DECOS).filter(k => FP.DECOS[k].brinquedo).map(k => { const d = FP.DECOS[k]; return {kind:'deco', id:k, nome:d.nome, custo:d.custo, img:FP.Sprites.iconURL('deco', k, 44), lock: !E.unlocked(d), stage: d.stage, sub: UI.toyWho(k), desc: 'Favorito de: ' + UI.toyWho(k, true), rec: FP.World.recommendText('deco', k, 8)}; });
  else if (c.fly === 'veg' || c.fly === 'deco') items = Object.keys(FP.DECOS).filter(k => !FP.DECOS[k].brinquedo && !!FP.DECOS[k].planta === (c.fly === 'veg')).map(k => { const d = FP.DECOS[k]; return {kind:'deco', id:k, nome:d.nome, custo:d.custo, img:FP.Sprites.iconURL('deco', k, 44), lock: !E.unlocked(d), stage: d.stage, sub: d.biomas.length ? d.biomas.map(b => FP.BIOMES[b].icone).join('') : (d.abrigo ? 'abrigo' : d.agua ? 'água' : d.comedouro ? 'comida' : d.enriq ? 'enriquecimento' : d.foraRecinto || d.naBorda ? 'visitantes' : ''), desc: d.desc, rec: FP.World.recommendText('deco', k, 8) || (d.naBorda ? 'Para visitantes: pode ficar na borda do próprio caminho.' : d.foraRecinto ? 'Para as áreas dos visitantes.' : '')}; });
  else items = Object.keys(FP.BUILDINGS).filter(k => FP.BUILDINGS[k].tipo === (c.fly === 'visit' ? 'visitante' : 'operacional')).map(k => { const b = FP.BUILDINGS[k]; return {kind:'building', id:k, nome:b.nome, custo:b.custo, img:FP.Sprites.iconURL('building', k, 44), lock: !E.unlocked(b), stage: b.stage, sub: b.w + '×' + b.h + (b.noCaminho ? ' · no caminho' : ''), desc: b.desc}; });
  f.innerHTML = `<h4>${c.nome}</h4><div class="fly-grid">` + items.map((it, n) => `<button class="fly-item ${it.lock ? 'lock' : ''}" data-n="${n}" data-kind="${it.kind}" data-id="${it.id}" title="${esc(it.nome)}${it.desc ? ' — ' + esc(it.desc) : ''}${it.rec ? ' — ' + esc(it.rec) : ''}${it.lock ? ' (Etapa ' + it.stage + ')' : ''}"><img src="${it.img}" alt=""><span>${esc(it.nome)}</span><small>${it.lock ? '🔒 Etapa ' + it.stage : (typeof it.custo === 'number' ? U.money(it.custo) : 'R$ ' + it.custo)}${it.sub ? ' · ' + it.sub : ''}</small></button>`).join('') + '</div><div class="fly-info" id="fly-info"></div>';
  f.classList.remove('hidden');
  // v2.3: ficha do item com as espécies indicadas (ao passar o mouse, focar ou tocar)
  const info = $('#fly-info');
  const showInfo = it => { info.innerHTML = it ? `<b>${esc(it.nome)}</b>${it.desc ? ' — ' + esc(it.desc) : ''}${it.rec ? `<br><span class="rec">🐾 ${esc(it.rec)}</span>` : ''}` : (c.fly === 'visit' || c.fly === 'oper' ? 'Passe o mouse ou toque num item para ver os detalhes.' : 'Passe o mouse ou toque num item para ver para quais animais ele é mais indicado.'); };
  showInfo(null);
  f.querySelectorAll('.fly-item').forEach(b => { b.addEventListener('mouseenter', () => showInfo(items[+b.dataset.n])); b.addEventListener('focus', () => showInfo(items[+b.dataset.n])); });
  f.querySelectorAll('.fly-item').forEach(b => b.onclick = () => {
    if (b.classList.contains('lock')){ UI.toast('Bloqueado: avance de etapa para liberar.', 'error'); return; }
    FP.Audio.play('click');
    const k = b.dataset.kind, id = b.dataset.id;
    showInfo(items[+b.dataset.n]);
    if (k === 'landfill') FP.Input.setTool('landfill', FP.Input.lastLand !== undefined ? FP.Input.lastLand : +id);
    else if (k === 'terrain'){ FP.Input.setTool('terrain', +id); if (+id !== FP.T.agua) FP.Input.lastLand = +id; }
    else if (k === 'deco') FP.Input.setTool('deco', id);
    else FP.Input.setTool('building', id);
    f.querySelectorAll('.fly-item').forEach(x => x.classList.toggle('on', x === b));
    if (document.body.classList.contains('phone')) f.classList.add('hidden');
  });
};

/* =============== TOOLTIP =============== */
UI.hideTooltip = () => $('#tooltip').classList.add('hidden');
UI.hover = function(t, m){
  const G = FP.G;
  if (!t){ UI.hideTooltip(); return; }
  let html = null;
  const a = animalAt(t.wx, t.wy);
  if (a){
    const sp = FP.SPECIES[a.sp];
    html = `<b>${esc(a.name)}</b> · ${sp.nome} ${a.sex === 'M' ? '♂' : '♀'}<br><small>${FP.Animals.stage(a)} · ${a.age} dias${a.preg ? ' · gestante' : ''}${a.sick && a.sick.known ? ' · <span style="color:#E8574B">doente</span>' : ''}</small>` +
      tipBar('Saúde', a.health) + tipBar('Bem-estar', a.happy) + tipBar('Alimentação', a.sat);
  } else {
    const i = U.idx(t.x, t.y);
    const e = G.enc[i] >= 0 ? G.enclosures[G.enc[i]] : null;
    const o = G.obj[i] >= 0 ? G.objects[G.obj[i]] : null;
    if (e) html = encTooltip(e);
    else if (o && o.kind === 'building'){
      const b = FP.BUILDINGS[o.type];
      html = `<b>${b.icone} ${b.nome}</b><br><small>${o.type === 'entrada' ? 'Ingresso: ' + U.money(G.ticket) : (o.door >= 0 || b.foraCaminhoOk ? '✅ Conectada' : '⛔ Sem acesso a caminho')}${o.uses ? ' · ' + o.uses + ' usos' : ''}${o.revenue ? ' · ' + U.money(o.revenue) : ''}</small>`;
    } else if (o){
      const d = FP.DECOS[o.type]; html = `<b>${d.nome}</b>${d.biomas.length ? '<br><small>Biomas: ' + d.biomas.map(b => FP.BIOMES[b].nome).join(', ') + '</small>' : ''}`;
    } else if (!G.owned[i] && !G.road[i]) html = `<small>Terreno não adquirido · lote ${U.money(FP.World.chunkPrice(G))}</small>`;
    else if (G.litter[i]) html = `<small>Lixo no caminho (${G.litter[i]})</small>`;
  }
  const tip = $('#tooltip');
  if (!html){ UI.hideTooltip(); return; }
  tip.innerHTML = html; tip.classList.remove('hidden');
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.min(window.innerWidth - w - 8, m.x + 16) + 'px';
  tip.style.top = Math.min(window.innerHeight - h - 8, m.y + 16) + 'px';
};
function tipBar(lbl, v){ return `<div class="tbar"><span>${lbl}</span>${U.bar(v)}<em>${Math.round(v)}%</em></div>`; }
function animalAt(wx, wy){
  const G = FP.G; let best = null, bd = .5;
  G.animals.forEach(a => { if (a.quar) return; const r = Math.max(.35, FP.SPECIES[a.sp].vis.L / 64); const d = U.dist(a.x, a.y, wx, wy); if (d < r && d < bd + r){ if (!best || d < bd){ best = a; bd = d; } } });
  return best;
}
UI.encSummary = function(e){
  const G = FP.G;
  const as = FP.World.encAnimals(G, e);
  const avg = k => as.length ? as.reduce((s, a) => s + a[k], 0) / as.length : null;
  const sps = FP.World.encSpecies(G, e);
  const hab = sps.length ? sps.reduce((s, sp) => s + FP.World.habitat(G, e, sp), 0) / sps.length : null;
  const cap = FP.World.encCapacity(G, e);
  const occ = FP.World.encOccupancy(G, e);
  return {as, welfare: avg('happy'), health: avg('health'), sat: avg('sat'), hab, cap, occ, sps};
};
UI.occState = function(occ){
  if (occ > 1) return ['Superlotado', '#E8574B'];
  if (occ >= .85) return ['Próximo do limite', '#F2B33D'];
  if (occ >= .4) return ['Ocupação adequada', '#4caf50'];
  return ['Baixa ocupação', '#2E8FB8'];
};
function encTooltip(e){
  const s = UI.encSummary(e);
  const spNames = s.sps.map(sp => FP.SPECIES[sp].nome).join(', ') || 'Vazio';
  let html = `<b>${esc(e.name)}</b><br><small>${spNames}</small>`;
  if (s.cap.cap !== null && s.cap.cap !== undefined){
    const [st, col] = UI.occState(s.occ.occ);
    html += `<div class="tcap"><span class="big">${s.cap.count} / ${s.cap.cap}</span> animais <em style="color:${col}">${st}</em></div>`;
  } else html += `<div class="tcap"><small>${e.tiles.length} tiles · sem animais</small></div>`;
  if (s.as.length){
    html += tipBar('Bem-estar', s.welfare) + tipBar('Limpeza', e.clean) + tipBar('Alimentação', s.sat) + tipBar('Saúde', s.health) + tipBar('Habitat', s.hab);
    const geral = (s.welfare + e.clean + s.sat + s.health + s.hab) / 5;
    html += `<div class="tstate">Estado geral: <b style="color:${U.stateColor(geral)}">${U.stateLabel(geral)}</b></div>`;
  } else html += tipBar('Limpeza', e.clean);
  if (!e.viewTiles.length) html += '<div class="twarn">👁️ Sem caminho para visitantes ao lado</div>';
  return html;
}
UI.encAlertIcons = function(e){
  const G = FP.G;
  const as = FP.World.encAnimals(G, e);
  const ic = [];
  if (!as.length) return ic;
  const sat = as.reduce((s, a) => s + a.sat, 0) / as.length;
  if (sat < 30) ic.push('🍖');
  if (e.clean < 35) ic.push('🧹');
  if (as.some(a => a.sick && a.sick.known)) ic.push('🤒');
  if (FP.World.encOccupancy(G, e).occ > 1) ic.push('⚠️');
  return ic;
};

/* =============== CLIQUE NO MUNDO =============== */
UI.clickWorld = function(t){
  const G = FP.G;
  $('#flyout').classList.add('hidden');
  const a = animalAt(t.wx, t.wy);
  if (a){ FP.Audio.play('click'); UI.openAnimal(a.id); return; }
  const i = U.idx(t.x, t.y);
  const o = G.obj[i] >= 0 ? G.objects[G.obj[i]] : null;
  if (o && o.kind === 'building'){ FP.Audio.play('click'); UI.openBuilding(o.id); return; }
  if (G.enc[i] >= 0){ FP.Audio.play('click'); UI.openEnclosure(G.enc[i]); return; }
  if (o){ UI.openDeco(o.id); return; }
  UI.closePanels();
};

/* =============== PAINEL LATERAL =============== */
let panelRender = null;
UI.closePanels = function(){ $('#panel').classList.add('hidden'); UI.selected = null; UI.panel = null; panelRender = null; $('#flyout').classList.add('hidden'); document.querySelectorAll('#mgmtbar button').forEach(b => b.classList.remove('on')); };
function showPanel(title, renderFn, sel, key){
  UI.selected = sel || null; UI.panel = key || null;
  panelRender = () => {
    const p = $('#panel');
    const body = p.querySelector('.p-body');
    const st = body.scrollTop;
    p.querySelector('.p-title').innerHTML = typeof title === 'function' ? title() : title;
    body.innerHTML = renderFn();
    body.scrollTop = st;
    bindPanel(body);
  };
  $('#panel').classList.remove('hidden');
  if (document.body.classList.contains('phone')){ $('#flyout').classList.add('hidden'); document.body.classList.remove('showmap'); }
  $('#panel .p-body').scrollTop = 0;
  panelRender();
  document.querySelectorAll('#mgmtbar button').forEach(b => b.classList.toggle('on', b.dataset.panel === key));
}
UI.refreshPanel = function(){
  if (!panelRender) return;
  const p = $('#panel');
  if (p.contains(document.activeElement) && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (p.matches(':hover') && UI._noLiveWhileHover) return;
  panelRender();
};
$('#panel .p-close') && ($('#panel .p-close').onclick = UI.closePanels);

UI.openPanel = function(key){
  if (UI.panel === key && !$('#panel').classList.contains('hidden')){ UI.closePanels(); return; }
  const P = {animals: pAnimals, market: pMarket, staff: pStaff, food: pFood, health: pHealth, visitors: pVisitors, finance: pFinance, progress: pProgress, notifs: pNotifs, guide: pGuide};
  const T = {animals:'🦓 Animais e recintos', market:'🛒 Mercado de animais', staff:'👷 Equipe', food:'🥕 Alimentação e estoque', health:'🩺 Saúde e veterinária', visitors:'🎟️ Visitantes e ingressos', finance:'💰 Finanças', progress:'🏆 Progresso e desbloqueios', notifs:'🔔 Notificações', guide:'📘 Guia rápido'};
  if (key === 'food') FP.G.flags = Object.assign(FP.G.flags || {}, {food: true});
  if (key === 'notifs'){ FP.G.notifications.forEach(n => n.read = true); UI.renderNotifBadge(); }
  showPanel(T[key], P[key], null, key);
};

/* Liga ações do painel via data-act */
function bindPanel(body){
  body.querySelectorAll('[data-act]').forEach(el => {
    const ev = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'range' ? (el.type === 'range' ? 'input' : 'change') : 'click';
    el.addEventListener(ev, e => { e.stopPropagation(); ACT[el.dataset.act] && ACT[el.dataset.act](el.dataset.arg, el, e); });
  });
  body.querySelectorAll('[data-rename]').forEach(el => el.addEventListener('change', () => { const e = FP.G.enclosures[el.dataset.rename]; if (e){ e.name = el.value.trim().slice(0, 28) || e.name; } }));
}

/* ---------- Recinto ---------- */
UI.openEnclosure = function(id){
  const G = FP.G;
  showPanel(() => { const e = G.enclosures[id]; return e ? '🧱 Recinto' : ''; }, () => {
    const e = G.enclosures[id]; if (!e){ setTimeout(UI.closePanels); return ''; }
    const s = UI.encSummary(e);
    const st = FP.World.encStats(G, e);
    let h = `<input class="name-input" data-rename="${e.id}" value="${esc(e.name)}" title="Clique para renomear">`;
    h += `<div class="chips">${s.sps.map(sp => `<span class="chip" style="background:${FP.BIOMES[FP.SPECIES[sp].bioma].cor}">${FP.BIOMES[FP.SPECIES[sp].bioma].icone} ${FP.SPECIES[sp].nome}</span>`).join('') || '<span class="chip ghost">Vazio</span>'}<span class="chip ghost">${e.tiles.length} tiles</span></div>`;
    if (s.cap.cap !== undefined && s.cap.cap !== null){
      const [txt, col] = UI.occState(s.occ.occ);
      h += `<div class="capbox"><div class="cap-big">${s.cap.count} <span>/ ${s.cap.cap}</span></div><div>animais<br><b style="color:${col}">${txt}</b></div></div>`;
      h += `<div class="occbar"><div style="width:${Math.min(100, s.occ.occ * 100)}%;background:${col}"></div><i style="left:85%"></i></div>`;
    } else h += `<div class="capbox empty">Recinto vazio. Compre animais no mercado.</div>`;
    if (!e.viewTiles.length) h += `<div class="warnbox">👁️ Nenhum caminho de visitantes encosta neste recinto. Os animais não contam para a atratividade.</div>`;
    h += '<div class="stats">';
    if (s.as.length){ h += stat('Bem-estar', s.welfare) + stat('Limpeza', e.clean) + stat('Alimentação', s.sat) + stat('Saúde', s.health) + stat('Habitat', s.hab); }
    else h += stat('Limpeza', e.clean);
    h += '</div>';
    h += `<div class="btnrow">
      <button class="btn sm primary" data-act="buyFor" data-arg="${e.id}">🛒 Adquirir animais</button>
      <button class="btn sm" data-act="expand" data-arg="${e.id}">↔️ Ampliar</button>
      <button class="btn sm" data-act="reshape" data-arg="${e.id}" title="Desenhe a nova área completa do recinto. Os animais são realocados; a área antiga é liberada (com reembolso).">📐 Redefinir área</button>
      <button class="btn sm" data-act="releaseTool" data-arg="${e.id}" title="Remove a designação de recinto de uma parte da área, sem demolir a vegetação.">🔓 Liberar parte</button>
      <button class="btn sm" data-act="pondTool" data-arg="${e.id}" title="Abra um lago dentro do recinto (água para beber e nadar).">💧 Abrir lago</button>
      <button class="btn sm" data-act="fillTool" data-arg="${e.id}" title="Aterre a água do recinto, devolvendo terra firme.">⛰️ Aterrar</button>
      <button class="btn sm" data-act="toysFly" data-arg="${e.id}" title="Escolha brinquedos para os animais deste recinto.">🧸 Brinquedos</button>
      <button class="btn sm" data-act="feed" data-arg="${e.id}">🍖 Alimentar agora (${U.money(30 + s.as.length * 6)})</button>
      <button class="btn sm" data-act="clean" data-arg="${e.id}">🧹 Limpar agora (${U.money(Math.round(40 + e.tiles.length * 2))})</button>
    </div>`;
    h += `<div class="opts"><label><input type="checkbox" data-act="breeding" data-arg="${e.id}" ${e.breeding ? 'checked' : ''}> Permitir reprodução</label>
      <label>Prioridade da equipe <select data-act="priority" data-arg="${e.id}"><option value="2" ${e.priority === 2 ? 'selected' : ''}>Alta</option><option value="1" ${e.priority === 1 ? 'selected' : ''}>Normal</option><option value="0" ${e.priority === 0 ? 'selected' : ''}>Baixa</option></select></label></div>`;
    // população
    if (s.as.length){
      const m = s.as.filter(a => a.sex === 'M').length, f = s.as.length - m, b = s.as.filter(FP.Animals.isBaby).length, pg = s.as.filter(a => a.preg).length;
      const bio = FP.Staff.count('biologo') > 0;
      h += `<h4>População</h4><table class="kv"><tr><td>População atual</td><td>${s.as.length}</td></tr><tr><td>Capacidade</td><td>${s.cap.cap}</td></tr><tr><td>Machos</td><td>${m}</td></tr><tr><td>Fêmeas</td><td>${f}</td></tr><tr><td>Filhotes</td><td>${b}</td></tr><tr><td>Nascimentos previstos</td><td>${bio ? pg + (pg ? ' (gestantes)' : '') : '<span title="Contrate um biólogo para acompanhar gestações">? (requer biólogo)</span>'}</td></tr></table><p class="note">Os filhotes já fazem parte da população atual.</p>`;
    }
    // habitat
    const spList = s.sps.length ? s.sps : [];
    if (spList.length){
      h += '<h4>Adequação do habitat</h4>';
      spList.forEach(sp => {
        const d = FP.World.habitat(G, e, sp, true), S = FP.SPECIES[sp];
        h += `<div class="habbox"><b>${S.nome}: ${d.v}%</b>
          ${miniBar('Terreno', d.terr, 'Prefere: ' + Object.keys(S.terr).map(k => FP.TERRAINS[FP.T[k]].nome).join(', '))}
          ${miniBar('Água', d.water, FP.World.needsLake(S) ? `Precisa de LAGO/piscina: ~${Math.round(S.agua * 100)}% do recinto (tem ${Math.round(st.waterFrac * 100)}%). Bebedouro ajuda pouco.` : `Basta um bebedouro (ou um pouco de lago)${st.waterSource ? ' ✅' : ''}`)}
          ${miniBar('Vegetação', d.fol, S.fol > 0 ? 'Plantas: ' + S.plantas.map(p => FP.DECOS[p].nome).join(', ') : 'Não precisa')}
          ${S.abrigo ? miniBar('Abrigo', d.shelter, 'Precisa de Abrigo para animais') : ''}
          ${S.enriq ? miniBar('Enriquecimento', d.enrich, 'Precisa de: ' + FP.DECOS[S.enriq].nome) : ''}
          ${miniBar('Brinquedos', d.fun, 'Adora: ' + (Object.keys(FP.DECOS).filter(k => FP.toyLiked(k, sp)).map(k => FP.DECOS[k].nome).join(', ') || '—'))}</div>`;
      });
    }
    if (spList.length) h += `<div class="note">${st.drinker ? '🚰 Bebedouro: sim' : '🚰 Sem bebedouro'} · ${st.feeder ? '🍽️ Comedouro: sim (a comida dura mais e rende mais)' : '🍽️ Sem comedouro (coloque um: menos fome e menos ração)'}${spList.some(k => FP.World.needsLake(FP.SPECIES[k])) ? ' · 💧 Este recinto tem espécie que precisa de lago (piscinão)' : ''}</div>`;
    // animais
    if (s.as.length){
      h += '<h4>Animais</h4><div class="alist">' + s.as.sort((a, b) => a.sp.localeCompare(b.sp) || b.age - a.age).map(animalRow).join('') + '</div>';
    }
    const c = FP.World.encOccupancy(G, e);
    let food = 0; c.animals.forEach(a => food += FP.SPECIES[a.sp].qtd * FP.FOODS[FP.SPECIES[a.sp].comida].preco * (FP.Animals.isBaby(a) ? .5 : 1));
    h += `<h4>Custos</h4><table class="kv"><tr><td>Manutenção diária</td><td>${U.money(e.tiles.length * .5 + 5)}</td></tr><tr><td>Alimentação diária (est.)</td><td>${U.money(food)}</td></tr></table>`;
    h += `<p class="note">Para demolir, use a ferramenta 🧨 Demolir sobre o recinto (precisa estar vazio para remoção total).</p>`;
    return h;
  }, {type: 'enc', id}, null);
};
function stat(l, v){ return `<div class="stat"><span>${l}</span>${U.bar(v)}<b style="color:${U.stateColor(v)}">${Math.round(v)}%</b></div>`; }
function miniBar(l, v, tip){ return `<div class="mbar" title="${esc(tip)}"><span>${l}</span>${U.bar(v)}<em>${Math.round(v)}%</em></div>`; }
function animalRow(a){
  const sp = FP.SPECIES[a.sp];
  return `<div class="arow" data-act="openAnimal" data-arg="${a.id}"><img src="${FP.Sprites.iconURL('animal', a.sp, 34)}"><div class="ainfo"><b>${esc(a.name)}</b> <span class="sex ${a.sex}">${a.sex === 'M' ? '♂' : '♀'}</span> <small>${sp.nome} · ${FP.Animals.stage(a)}${a.preg ? ' · 🤰' : ''}${a.sick && a.sick.known ? ' · 🤒' : ''}${a.quar ? ' · 🏥' : ''}</small>${U.bar(a.health)}</div><em style="color:${U.stateColor(a.happy)}">${Math.round(a.happy)}%</em></div>`;
}

/* ---------- Animal ---------- */
UI.openAnimal = function(id){
  const G = FP.G;
  showPanel('🐾 Animal', () => {
    const a = G.animals.find(x => x.id === id); if (!a){ setTimeout(UI.closePanels); return ''; }
    const sp = FP.SPECIES[a.sp], enc = G.enclosures[a.enc];
    let h = `<div class="ahead"><img src="${FP.Sprites.iconURL('animal', a.sp, 72)}"><div><h3>${esc(a.name)} <span class="sex ${a.sex}">${a.sex === 'M' ? '♂' : '♀'}</span></h3><small>${sp.nome} · ${FP.BIOMES[sp.bioma].nome}</small><br><small>${FP.Animals.stage(a)} · ${a.age} dias (vida ~${sp.vida})</small></div></div>`;
    h += `<div class="stats">${stat('Saúde', a.health)}${stat('Bem-estar', a.happy)}${stat('Alimentação', a.sat)}</div>`;
    h += '<table class="kv">';
    h += `<tr><td>Local</td><td>${a.quar ? '🏥 Quarentena' : enc ? esc(enc.name) : '—'}</td></tr>`;
    if (a.quar) h += `<tr><td>Volta para</td><td>${G.enclosures[a.homeEnc] ? esc(G.enclosures[a.homeEnc].name) : '<span class="warn">recinto de origem não existe mais</span>'}</td></tr>`;
    h += `<tr><td>Origem</td><td>${a.origin === 'nascimento' ? 'Nascido no zoológico (dia ' + a.born + ')' : 'Aquisição (dia ' + a.born + ')'}</td></tr>`;
    h += `<tr><td>Condição reprodutiva</td><td>${FP.Animals.isBaby(a) ? 'Imaturo' : a.preg ? (FP.Staff.count('biologo') ? 'Gestante · ' + a.preg.d + ' dias' : 'Gestante') : FP.Animals.isElder(a) ? 'Idoso' : 'Apto'}</td></tr>`;
    h += `<tr><td>Saúde</td><td>${a.sick ? (a.sick.known ? `<b style="color:#E8574B">${FP.DISEASES[a.sick.d].nome}</b>${a.sick.treating ? ' · em tratamento ' + Math.round(a.sick.prog * 100) + '%' : ' · sem tratamento'}` : 'Comportamento estranho?') : 'Saudável'}</td></tr>`;
    h += `<tr><td>Alimento</td><td>${FP.FOODS[sp.comida].icone} ${FP.FOODS[sp.comida].nome} · ${sp.qtd}/dia</td></tr>`;
    h += `<tr><td>Valor de venda</td><td>${U.money(FP.Animals.sellValue(a))}</td></tr></table>`;
    h += '<div class="btnrow">';
    if (!a.quar) h += `<button class="btn sm" data-act="sell" data-arg="${a.id}">💲 Vender</button><button class="btn sm" data-act="conserve" data-arg="${a.id}">🌍 Programa de conservação</button><button class="btn sm" data-act="moveAnimal" data-arg="${a.id}">🔀 Mover</button>`;
    if (FP.Health.enabled() || a.quar) h += a.quar ? `<button class="btn sm primary" data-act="release" data-arg="${a.id}">✅ Liberar da quarentena</button><button class="btn sm" data-act="moveAnimal" data-arg="${a.id}">🔀 Liberar em outro recinto</button>` : `<button class="btn sm" data-act="quarantine" data-arg="${a.id}">🏥 Quarentena</button>`;
    if (!a.quar) h += `<button class="btn sm ghost" data-act="locate" data-arg="${a.id}">📍 Localizar</button>`;
    if (enc) h += `<button class="btn sm ghost" data-act="openEnc" data-arg="${enc.id}">🧱 Ver recinto</button>`;
    h += '</div>';
    return h;
  }, {type: 'animal', id}, null);
};

/* ---------- Instalação / decoração ---------- */
UI.openBuilding = function(id){
  const G = FP.G;
  showPanel('🏗️ Instalação', () => {
    const o = G.objects[id]; if (!o){ setTimeout(UI.closePanels); return ''; }
    const b = FP.BUILDINGS[o.type];
    let h = `<div class="ahead"><img src="${FP.Sprites.iconURL('building', o.type, 72)}"><div><h3>${b.nome}</h3><small>${b.desc || ''}</small></div></div><table class="kv">`;
    if (o.type === 'entrada') h += `<tr><td>Ingresso</td><td>${U.money(G.ticket)}</td></tr><tr><td>Visitantes hoje</td><td>${G.stats.visitorsToday}</td></tr>`;
    else {
      h += `<tr><td>Status</td><td>${o.door >= 0 || b.foraCaminhoOk ? '✅ Conectada aos caminhos' : '⛔ Sem acesso: encoste em um caminho ligado à entrada'}</td></tr>`;
      h += `<tr><td>Manutenção</td><td>${U.money(b.manut)}/dia</td></tr><tr><td>Usos</td><td>${o.uses}</td></tr>`;
      if (b.venda) h += `<tr><td>Receita acumulada</td><td>${U.money(o.revenue)}</td></tr>`;
    }
    h += '</table>';
    if (o.type === 'entrada') h += `<button class="btn sm" data-act="panel" data-arg="visitors">🎟️ Ajustar ingresso</button>`;
    else if (o.type === 'clinica') h += `<button class="btn sm" data-act="panel" data-arg="health">🩺 Painel de saúde</button>`;
    if (o.type !== 'entrada') h += ` <button class="btn sm danger" data-act="demolishObj" data-arg="${o.id}">🧨 Demolir (reembolso ${U.money(b.custo * .4)})</button>`;
    return h;
  }, {type: 'obj', id}, null);
};
UI.openDeco = function(id){
  const G = FP.G;
  showPanel('🌿 Decoração', () => {
    const o = G.objects[id]; if (!o){ setTimeout(UI.closePanels); return ''; }
    const d = FP.DECOS[o.type];
    const fn = [d.brinquedo ? 'Brinquedo — favorito de ' + UI.toyWho(o.type, true) : null, d.planta ? 'Vegetação' : null, d.abrigo ? 'Abrigo' : null, d.agua ? 'Fonte de água' : null, d.enriq ? 'Enriquecimento ambiental' : null, d.luz ? 'Iluminação noturna' : null, d.educa ? 'Educação ambiental (+reputação)' : null].filter(Boolean).join(', ');
    return `<div class="ahead"><img src="${FP.Sprites.iconURL('deco', o.type, 72)}"><div><h3>${d.nome}</h3><small>${fn || 'Decorativo'} · Beleza +${d.beleza}</small>${d.biomas.length ? '<br><small>Biomas: ' + d.biomas.map(b => FP.BIOMES[b].nome).join(', ') + '</small>' : ''}</div></div>
      <button class="btn sm danger" data-act="demolishObj" data-arg="${o.id}">🧨 Remover (reembolso ${U.money(d.custo * .4)})</button>`;
  }, {type: 'obj', id}, null);
};

/* ---------- Painéis de gestão ---------- */
function pAnimals(){
  const G = FP.G;
  const encs = Object.values(G.enclosures);
  let h = `<p class="note">Total: <b>${G.animals.length}</b> animais · <b>${new Set(G.animals.map(a => a.sp)).size}</b> espécies · ${G.stats.births} nascimentos · ${G.stats.deaths} óbitos.</p>`;
  if (!encs.length) return h + '<div class="capbox empty">Nenhum recinto ainda. Use 🧱 Novo recinto na barra à esquerda.</div>';
  h += '<div class="enclist">' + encs.map(e => {
    const s = UI.encSummary(e);
    const [txt, col] = s.cap.cap != null ? UI.occState(s.occ.occ) : ['Vazio', '#999'];
    return `<div class="encrow" data-act="openEnc" data-arg="${e.id}"><div><b>${esc(e.name)}</b> ${UI.encAlertIcons(e).join('')}<br><small>${s.sps.map(sp => FP.SPECIES[sp].nome).join(', ') || 'vazio'}</small></div><div class="encnums"><b>${s.cap.cap != null ? s.cap.count + '/' + s.cap.cap : '—'}</b><small style="color:${col}">${txt}</small></div>${s.as.length ? `<div class="encmini">${U.bar(s.welfare)}${U.bar(e.clean, '#2E8FB8')}</div>` : ''}</div>`;
  }).join('') + '</div><p class="note">Barras: bem-estar (cor de estado) e limpeza (azul).</p>';
  return h;
}
let marketFilter = 'todos', marketEnc = null;
function pMarket(){
  const G = FP.G;
  const encs = Object.values(G.enclosures);
  if (marketEnc && !G.enclosures[marketEnc]) marketEnc = null;
  if (!marketEnc && encs.length) marketEnc = encs[0].id;
  const target = G.enclosures[marketEnc];
  let h = `<div class="opts"><label>Recinto de destino <select data-act="marketEnc">${encs.map(e => `<option value="${e.id}" ${e.id === marketEnc ? 'selected' : ''}>${esc(e.name)} (${e.tiles.length} tiles)</option>`).join('') || '<option>— construa um recinto —</option>'}</select></label></div>`;
  h += `<div class="tabs"><button class="${marketFilter === 'todos' ? 'on' : ''}" data-act="mfilter" data-arg="todos">Todos</button>${Object.keys(FP.BIOMES).map(b => `<button class="${marketFilter === b ? 'on' : ''}" data-act="mfilter" data-arg="${b}" title="${FP.BIOMES[b].nome}">${FP.BIOMES[b].icone}</button>`).join('')}</div>`;
  h += `<p class="note">Novas ofertas a cada 7 dias (próxima no dia ${G.marketDay + 7}).${FP.Health.enabled() ? ` <label><input type="checkbox" data-act="quarBuy" ${G.quarantineOnBuy ? 'checked' : ''}> Quarentena automática na chegada</label>` : ''}</p>`;
  const sps = Object.keys(FP.SPECIES).filter(s => marketFilter === 'todos' || FP.SPECIES[s].bioma === marketFilter);
  sps.forEach(spId => {
    const sp = FP.SPECIES[spId];
    const unlocked = FP.Economy.speciesUnlocked(spId);
    const offers = G.market.filter(o => o.sp === spId);
    const hab = target ? FP.World.habitat(G, target, spId) : null;
    const comp = target ? FP.World.compatible(G, target, spId) : {ok: true};
    h += `<div class="spcard ${unlocked ? '' : 'lock'}"><div class="sphead"><img src="${FP.Sprites.iconURL('animal', spId, 46)}"><div><b>${sp.nome}</b> <small>${FP.BIOMES[sp.bioma].icone}</small><br><small>${FP.FOODS[sp.comida].icone} ${sp.qtd}/dia · ${sp.esp} tiles/animal · grupo ≥${sp.social} · atratividade ${sp.atr}${sp.pred ? ' · predador' : ''}${sp.nada ? ' · nada' : ''}</small></div>${target && unlocked ? `<span class="habtag" style="background:${U.stateColor(hab)}" title="Adequação do habitat em ${esc(target.name)}">${hab}%</span>` : ''}</div>`;
    if (!unlocked){ h += `<small>🔒 Liberado na Etapa ${Math.max(sp.stage, FP.BIOMES[sp.bioma].stage)}</small></div>`; return; }
    if (!comp.ok) h += `<small class="warn">⛔ ${comp.msg}</small>`;
    if (!offers.length) h += '<small>Sem ofertas nesta semana.</small>';
    h += offers.map(o => `<div class="offer"><span class="sex ${o.sex}">${o.sex === 'M' ? '♂' : '♀'}</span><small>${o.age < sp.mat ? 'Jovem' : 'Adulto'} · ${o.age}d · ${o.origem}</small><b>${U.money(o.price)}</b><button class="btn xs primary" data-act="buy" data-arg="${o.id}" ${!target || !comp.ok ? 'disabled' : ''}>Comprar</button></div>`).join('');
    h += '</div>';
  });
  return h;
}
function pStaff(){
  const G = FP.G;
  const eff = FP.Staff.efficiency();
  const animals = G.animals.filter(a => !a.quar).length;
  const encN = Object.keys(G.enclosures).length;
  const work = {
    tratador: [FP.Staff.count('tratador') * FP.STAFF.tratador.cap * eff, animals, 'animais'],
    limpeza: [FP.Staff.count('limpeza') * FP.STAFF.limpeza.cap * eff, Object.values(G.enclosures).reduce((s, e) => { const o = FP.World.encOccupancy(G, e); return s + (o.animals.length ? (.25 + 2 * Math.min(2, o.occ)) * e.tiles.length / 40 : 0); }, 0) + 2, 'pontos/h'],
    biologo: [FP.Staff.count('biologo') * FP.STAFF.biologo.cap * eff, animals, 'animais'],
    veterinario: [FP.Health.clinics().length ? FP.Staff.count('veterinario') * FP.STAFF.veterinario.cap * eff : 0, G.animals.filter(a => a.sick && a.sick.known).length, 'pacientes'],
    guia: [FP.Staff.count('guia') * FP.STAFF.guia.cap, G.stats.demand || 0, 'visitantes/dia'],
    administrador: [Math.min(3, FP.Staff.count('administrador')) * 4, 12, '% de desconto']
  };
  let h = `<p class="note">Eficiência da equipe: <b>${Math.round(eff * 100)}%</b> (Salas dos funcionários aumentam). Salários: <b>${U.money(FP.Staff.dailySalaries())}/dia</b>.</p>`;
  Object.keys(FP.STAFF).forEach(r => {
    const d = FP.STAFF[r];
    const lock = !FP.Economy.unlocked(d);
    const [cap, need, unid] = work[r];
    const ratio = need ? cap / need : 1;
    const col = ratio >= 1 ? '#4caf50' : ratio >= .7 ? '#F2B33D' : '#E8574B';
    h += `<div class="rolecard ${lock ? 'lock' : ''}"><div class="rolehead"><span class="ricon">${d.icone}</span><div><b>${d.nome}</b> × ${FP.Staff.count(r)}<br><small>${d.desc}</small></div>${lock ? `<small>🔒 Etapa ${d.stage}</small>` : `<button class="btn xs primary" data-act="hire" data-arg="${r}">Contratar (${U.money(d.salario * 5)})</button>`}</div>`;
    if (!lock) h += `<div class="load"><small>Capacidade ${Math.round(cap)} / demanda ${Math.round(need)} ${unid} · salário ${U.money(d.salario)}/dia</small><div class="bar"><div style="width:${Math.min(100, ratio * 100)}%;background:${col}"></div></div>${ratio < 1 && need > 0 ? '<small class="warn">⚠️ Equipe sobrecarregada</small>' : ''}</div>`;
    const list = G.staff.filter(s => s.role === r);
    if (list.length) h += '<div class="slist">' + list.map(s => `<div class="srow"><span>${esc(s.name)}</span>${['tratador', 'limpeza'].includes(r) ? `<select data-act="assign" data-arg="${s.id}"><option value="-1">Geral (automático)</option>${Object.values(G.enclosures).map(e => `<option value="${e.id}" ${s.assign === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select>` : '<small>todo o parque</small>'}<button class="btn xs ghost" data-act="fire" data-arg="${s.id}" title="Demitir (rescisão: 3 dias de salário)">Demitir</button></div>`).join('') + '</div>';
    h += '</div>';
  });
  return h;
}
function pFood(){
  const G = FP.G;
  const need = FP.Economy.dailyFoodNeed();
  const cap = FP.Economy.foodCapacity(), stored = FP.Economy.foodStored();
  let h = `<div class="stat"><span>Depósito</span>${U.bar(stored / cap * 100, '#2E8FB8')}<b>${Math.round(stored)}/${cap}</b></div><p class="note">Os tratadores alimentam os animais às 7h, 13h e 19h usando este estoque. A compra automática repõe com 10% de taxa de entrega quando o estoque cobre menos de 1,5 dia.</p>`;
  h += '<table class="food"><tr><th>Alimento</th><th>Estoque</th><th>Consumo/dia</th><th>Dura</th><th>Comprar</th><th>Auto</th></tr>';
  Object.keys(FP.FOODS).forEach(f => {
    const F = FP.FOODS[f];
    if (!FP.Economy.unlocked(F) && !need[f]) return;
    const n = need[f] || 0, days = n ? G.food[f] / n : Infinity;
    h += `<tr><td>${F.icone} ${F.nome}<br><small>${U.money2(F.preco)}/un.</small></td><td>${Math.round(G.food[f])}</td><td>${n ? n.toFixed(1) : '—'}</td><td style="color:${days < 1.5 ? '#E8574B' : days < 3 ? '#F2B33D' : 'inherit'}">${n ? (days > 99 ? '99+' : days.toFixed(1)) + ' d' : '—'}</td><td><button class="btn xs" data-act="buyFood" data-arg="${f}:50">+50</button><button class="btn xs" data-act="buyFood" data-arg="${f}:200">+200</button></td><td><input type="checkbox" data-act="autoFood" data-arg="${f}" ${G.autoFood[f] ? 'checked' : ''}></td></tr>`;
  });
  h += '</table>';
  const at = Object.values(G.enclosures).filter(e => { const as = FP.World.encAnimals(G, e); return as.length && as.some(a => G.food[FP.SPECIES[a.sp].comida] < FP.SPECIES[a.sp].qtd); });
  if (at.length) h += `<div class="warnbox">⚠️ Recintos em risco de ficar sem alimento: ${at.map(e => esc(e.name)).join(', ')}</div>`;
  const costDay = Object.keys(need).reduce((s, f) => s + need[f] * FP.FOODS[f].preco, 0);
  h += `<p class="note">Custo estimado de alimentação: <b>${U.money(costDay)}/dia</b> (${U.money(costDay * 30)}/mês).</p>`;
  return h;
}
function pHealth(){
  const G = FP.G;
  if (!FP.Health.enabled()) return `<div class="capbox empty">Doenças, veterinários, clínica e quarentena são introduzidos na <b>Etapa 3 — Gestão completa</b>.<br><br>Até lá, mantenha a alimentação e a limpeza em dia: saúde depende de comida, higiene e bem-estar.</div>` + healthList(G);
  const clinics = FP.Health.clinics().length, vets = FP.Staff.count('veterinario');
  const quar = G.animals.filter(a => a.quar);
  let h = `<table class="kv"><tr><td>Clínicas conectadas</td><td>${clinics}</td></tr><tr><td>Veterinários</td><td>${vets} (capacidade ${clinics ? Math.floor(vets * 3 * FP.Staff.efficiency()) : 0} pacientes)</td></tr><tr><td>Vagas de quarentena</td><td>${quar.length}/${FP.Health.quarSlots()}</td></tr></table>`;
  h += `<label class="opts"><input type="checkbox" data-act="quarBuy" ${G.quarantineOnBuy ? 'checked' : ''}> Enviar animais recém-adquiridos para quarentena</label>`;
  if (!clinics) h += '<div class="warnbox">🏥 Construa uma Clínica veterinária (Instalações operacionais) encostada em um caminho.</div>';
  h += healthList(G);
  if (quar.length) h += '<h4>Em quarentena</h4><div class="alist">' + quar.map(animalRow).join('') + '</div>';
  h += '<h4>Doenças conhecidas</h4><table class="kv">' + Object.values(FP.DISEASES).map(d => `<tr><td>${d.nome}</td><td><small>Gravidade ${d.sev} · contágio ${Math.round(d.contagio * 100)}% · ${d.dias} dias de tratamento · ${U.money(d.custo)}/dia</small></td></tr>`).join('') + '</table>';
  return h;
}
function healthList(G){
  const sick = G.animals.filter(a => a.sick && a.sick.known);
  const weak = G.animals.filter(a => !a.sick && a.health < 50);
  let h = '';
  if (sick.length) h += '<h4>Animais doentes</h4><div class="alist">' + sick.map(animalRow).join('') + '</div>';
  if (weak.length) h += '<h4>Saúde baixa</h4><div class="alist">' + weak.map(animalRow).join('') + '</div>';
  if (!sick.length && !weak.length) h += '<p class="note">✅ Nenhum problema de saúde identificado.</p>';
  return h;
}
function pVisitors(){
  const G = FP.G, st = G.stats;
  const pf = FP.Economy.priceFactor();
  let h = `<div class="stats">${stat('Satisfação', st.satLive !== undefined ? st.satLive : st.satToday)}${stat('Beleza do parque', st.beauty)}${stat('Bem-estar animal', st.welfare)}${stat('Limpeza média', st.clean)}</div>`;
  h += `<h4>Ingresso</h4><div class="ticket"><button class="btn sm" data-act="ticket" data-arg="-1">−</button><b>${U.money(G.ticket)}</b><button class="btn sm" data-act="ticket" data-arg="1">+</button><input type="range" min="0" max="150" step="1" value="${G.ticket}" data-act="ticketRange"></div>`;
  const r = G.ticket / Math.max(1, st.fairPrice);
  h += `<table class="kv"><tr><td>Preço percebido como justo</td><td><b>${U.money(st.fairPrice)}</b></td></tr><tr><td>Avaliação do preço</td><td style="color:${r > 1.3 ? '#E8574B' : r > 1 ? '#F2B33D' : '#4caf50'}">${r > 1.3 ? 'Caro demais' : r > 1.05 ? 'Um pouco caro' : r < .8 ? 'Barato' : 'Justo'}</td></tr><tr><td>Fator de procura pelo preço</td><td>${Math.round(pf * 100)}%</td></tr><tr><td>Procura prevista (próximo dia)</td><td>~${Math.round(FP.Economy.dailyDemand())} visitantes</td></tr><tr><td>Receita prevista de ingressos</td><td>${U.money(FP.Economy.dailyDemand() * G.ticket)}</td></tr><tr><td>Atratividade</td><td>${Math.round(st.attraction)} · ${st.speciesVisible || 0} espécies visíveis · ${st.biomes || 0} biomas</td></tr><tr><td>Capacidade simultânea</td><td>${V().maxConcurrent()} pessoas (pelos caminhos)</td></tr></table>`;
  h += `<p class="note">O preço justo depende da atratividade (espécies, biomas, instalações), reputação e qualidade (bem-estar, limpeza e beleza). Um parque grande e mal cuidado vale menos do que um pequeno e bem administrado.</p>`;
  // necessidades médias
  if (G.visitors.length){
    const avg = k => G.visitors.reduce((s, v) => s + v.needs[k], 0) / G.visitors.length;
    h += `<h4>Necessidades (média no parque)</h4><div class="stats">${stat('Fome', avg('fome'))}${stat('Sede', avg('sede'))}${stat('Banheiro', avg('banheiro'))}${stat('Energia', avg('energia'))}</div>`;
  }
  h += '<h4>Comentários dos visitantes</h4>';
  h += G.comments.length ? '<div class="comments">' + G.comments.slice(0, 25).map(c => `<div class="cmt ${c.type}">"${esc(c.txt)}"${c.n > 1 ? ` <b>×${c.n}</b>` : ''}<small>dia ${c.day}</small></div>`).join('') + '</div>' : '<p class="note">Nenhum comentário ainda.</p>';
  const fac = Object.values(G.objects).filter(o => o.kind === 'building' && o.type !== 'entrada');
  if (fac.length) h += '<h4>Instalações</h4><table class="kv">' + fac.map(o => `<tr><td>${FP.BUILDINGS[o.type].icone} ${FP.BUILDINGS[o.type].nome}${o.door < 0 && !FP.BUILDINGS[o.type].foraCaminhoOk ? ' ⛔' : ''}</td><td>${o.uses} usos${o.revenue ? ' · ' + U.money(o.revenue) : ''}</td></tr>`).join('') + '</table>';
  return h;
}
const V = () => FP.Visitors;
function pFinance(){
  const G = FP.G;
  const t = G.finance.today;
  const tot = FP.Economy.todayTotals();
  const rec = FP.Economy.dailyCosts();
  let h = `<div class="capbox"><div class="cap-big ${G.money < 0 ? 'neg' : ''}">${U.money(G.money)}</div><div>saldo<br><b class="${tot.net >= 0 ? 'pos' : 'neg'}">${tot.net >= 0 ? '+' : ''}${U.money(tot.net)} hoje</b></div></div>`;
  h += '<canvas id="fin-chart" width="560" height="170"></canvas><p class="note"><span class="lg g"></span>receitas <span class="lg r"></span>despesas <span class="lg y"></span>saldo (últimos 30 dias)</p>';
  const rows = (o) => Object.keys(o).sort((a, b) => o[b] - o[a]).map(k => `<tr><td>${k}</td><td>${U.money(o[k])}</td></tr>`).join('') || '<tr><td colspan=2><small>—</small></td></tr>';
  h += `<div class="cols"><div><h4>Receitas de hoje</h4><table class="kv">${rows(t.inc)}</table></div><div><h4>Despesas de hoje</h4><table class="kv">${rows(t.exp)}</table></div></div>`;
  h += `<h4>Custos recorrentes (por dia)</h4><table class="kv"><tr><td>Salários</td><td>${U.money(rec.salarios)}</td></tr><tr><td>Manutenção (recintos e caminhos)</td><td>${U.money(rec.manutencao)}</td></tr><tr><td>Instalações</td><td>${U.money(rec.instalacoes)}</td></tr><tr><td>Alimentação (estimada)</td><td>${U.money(Object.entries(FP.Economy.dailyFoodNeed()).reduce((s, [f, q]) => s + q * FP.FOODS[f].preco, 0))}</td></tr>${G.finance.loans.length ? `<tr><td>Empréstimos (${G.finance.loans.length})</td><td>${U.money(G.finance.loans.reduce((s, l) => s + l.parcela, 0))}</td></tr>` : ''}</table>`;
  const m = G.finance.history.slice(-30);
  if (m.length){
    const inc = m.reduce((s, d) => s + d.inc, 0), exp = m.reduce((s, d) => s + d.exp, 0);
    h += `<h4>Últimos ${m.length} dias</h4><table class="kv"><tr><td>Receitas</td><td>${U.money(inc)}</td></tr><tr><td>Despesas</td><td>${U.money(exp)}</td></tr><tr><td>Resultado</td><td class="${inc - exp >= 0 ? 'pos' : 'neg'}">${U.money(inc - exp)}</td></tr><tr><td>Visitantes</td><td>${m.reduce((s, d) => s + d.visitors, 0)}</td></tr></table>`;
  }
  h += `<h4>Empréstimo bancário</h4><p class="note">R$ 25.000 agora, pagos em 30 parcelas diárias de R$ 958 (total R$ 28.750). Máximo 3 ativos.</p><button class="btn sm" data-act="loan" ${G.finance.loans.length >= 3 ? 'disabled' : ''}>🏦 Pegar empréstimo</button>`;
  setTimeout(drawFinChart, 0);
  return h;
}
function drawFinChart(){
  const c = document.getElementById('fin-chart'); if (!c) return;
  const g = c.getContext('2d'), G = FP.G;
  const d = G.finance.history.slice(-30);
  const W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, 0, W, H);
  if (d.length < 2){ g.fillStyle = '#9fb0a8'; g.font = '13px sans-serif'; g.fillText('O gráfico aparece após 2 dias de operação.', 16, H / 2); return; }
  const mx = Math.max(1, ...d.map(x => Math.max(x.inc, x.exp)));
  const bw = W / d.length;
  d.forEach((x, i) => {
    g.fillStyle = '#7BC86C'; g.fillRect(i * bw + 2, H - 10 - x.inc / mx * (H - 30), bw * .4, x.inc / mx * (H - 30));
    g.fillStyle = '#E8574B'; g.fillRect(i * bw + 2 + bw * .42, H - 10 - x.exp / mx * (H - 30), bw * .4, x.exp / mx * (H - 30));
  });
  const mm = d.map(x => x.money), lo = Math.min(...mm), hi = Math.max(...mm), rg = Math.max(1, hi - lo);
  g.strokeStyle = '#F2B33D'; g.lineWidth = 2; g.beginPath();
  d.forEach((x, i) => { const y = H - 10 - (x.money - lo) / rg * (H - 30); i ? g.lineTo(i * bw + bw / 2, y) : g.moveTo(i * bw + bw / 2, y); });
  g.stroke();
}
function pProgress(){
  const G = FP.G;
  let h = '';
  if (G.mode === 'livre') h += '<p class="note">🌿 Modo livre: todo o conteúdo está liberado.</p>';
  for (let n = 1; n <= 5; n++){
    const st = FP.STAGES[n];
    const done = G.stage >= n;
    h += `<div class="stagecard ${done ? 'done' : n === G.stage + 1 ? 'next' : ''}"><div><b>Etapa ${n} — ${st.nome}</b> ${done ? '✅' : ''}<br><small>${st.desc}</small></div>`;
    if (n === G.stage + 1){
      h += '<div class="reqs">' + FP.Economy.stageProgress(n).map(p => { const f = p.fmt || (v => Math.round(v)); const ok = p.cur >= p.req; return `<div class="req"><span>${ok ? '✅' : '⬜'} ${p.label}</span><small>${f(p.cur)} / ${f(p.req)}</small><div class="bar"><div style="width:${Math.min(100, p.cur / p.req * 100)}%;background:${ok ? '#4caf50' : '#F2B33D'}"></div></div></div>`; }).join('') + `</div><small>Prêmio: ${U.money(st.premio)}</small>`;
    }
    const sps = Object.keys(FP.SPECIES).filter(s => Math.max(FP.SPECIES[s].stage, FP.BIOMES[FP.SPECIES[s].bioma].stage) === n);
    if (sps.length) h += `<div class="unl">${sps.map(s => `<img title="${FP.SPECIES[s].nome}" src="${FP.Sprites.iconURL('animal', s, 30)}" class="${FP.Economy.speciesUnlocked(s) ? '' : 'dim'}">`).join('')}</div>`;
    h += '</div>';
  }
  h += '<h4>Eventos temáticos</h4>';
  h += Object.keys(FP.EVENTS).map(id => { const ev = FP.EVENTS[id]; const c = FP.Economy.canEvent(id); return `<div class="row"><div>${ev.icone} <b>${ev.nome}</b><br><small>${ev.dias} dias · +${Math.round(ev.demanda * 100)}% visitantes · +reputação · ${U.money(ev.custo)}</small>${!c.ok ? `<br><small class="warn">${c.msg}</small>` : ''}</div><button class="btn xs primary" data-act="event" data-arg="${id}" ${c.ok ? '' : 'disabled'}>Realizar</button></div>`; }).join('');
  return h;
}
function pNotifs(){
  const G = FP.G;
  if (!G.notifications.length) return '<p class="note">Nenhuma notificação.</p>';
  return '<div class="nlist">' + G.notifications.slice(0, 100).map(n => `<div class="nrow ${n.type}" data-act="notif" data-arg="${n.id}"><span>${NICON[n.type] || 'ℹ️'}</span><div><b>${esc(n.title)}</b><p>${esc(n.text)}</p><small>Dia ${n.day}, ${n.hour}h</small></div></div>`).join('') + '</div>';
}
function pGuide(){
  const G = FP.G;
  const encs = Object.values(G.enclosures);
  const steps = [
    ['Construa um recinto', 'Clique em 🧱 (ou tecla R) e arraste um retângulo no seu terreno.', encs.length > 0],
    ['Ajuste o terreno ao bioma', 'Em 🏞️ Terreno, pinte o interior com o solo da espécie (ex.: Capim de savana para zebras).', encs.some(e => { const st = FP.World.encStats(G, e); return (st.terr.grama || 0) < st.N * .5; })],
    ['Adicione vegetação e água', 'Use 🌳 Vegetação e 🪨 Decoração (bebedouro, abrigo) ou pinte um lago.', encs.some(e => { const st = FP.World.encStats(G, e); return st.plantCount > 0 && st.waterSource; })],
    ['Ligue o recinto a um caminho', 'Construa 🛤️ caminhos encostados no recinto e conectados à entrada.', encs.some(e => e.viewTiles.length)],
    ['Compre animais', 'Abra 🛒 Mercado (ou "Adquirir animais" no painel do recinto). Respeite a capacidade e o grupo mínimo.', G.animals.length > 0],
    ['Atenda os visitantes', 'Construa 🍔 Lanchonete, 🥤 Bebidas, 🚻 Banheiros e 🪑 bancos encostados nos caminhos.', ['lanchonete', 'banheiro'].every(t => Object.values(G.objects).some(o => o.type === t && o.door >= 0))],
    ['Defina o preço do ingresso', 'No painel 🎟️ Visitantes, compare com o preço justo.', !!(G.flags && G.flags.ticket)],
    ['Confira o estoque de alimentos', 'No painel 🥕 Alimentação, acompanhe consumo e compra automática.', !!(G.flags && G.flags.food)],
    ['Avance de etapa', 'Veja os objetivos no painel 🏆 Progresso.', G.stage >= 2]
  ];
  let h = '<div class="guide">' + steps.map(([t, d, ok], i) => `<div class="gstep ${ok ? 'ok' : ''}"><span>${ok ? '✅' : i + 1}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('') + '</div>';
  h += `<h4>Controles</h4><p class="note">WASD/setas movem a câmera · roda do mouse: zoom · botão direito/meio arrasta · Espaço pausa · 1-4 velocidade · Esc cancela · L alterna lentes · F5 salva.</p>
  <h4>Leitura do parque</h4><p class="note">Passe o mouse sobre recintos para ver <b>população/capacidade</b> (ex.: 5/15), bem-estar, limpeza, alimentação, saúde e habitat. Ícones sobre recintos indicam problemas: 🍖 fome · 🧹 sujeira · 🤒 doença · ⚠️ superlotação. Use as lentes (canto inferior direito) para colorir os recintos por indicador.</p>
  <p><a class="btn sm ghost" href="docs/MANUAL_DO_JOGO.html" target="_blank">📖 Abrir o manual completo</a></p>`;
  return h;
}

/* ---------- Ações ---------- */
const ACT = {
  openEnc: id => { const e = FP.G.enclosures[id]; if (e){ FP.Render.centerOn(e.cx, e.cy); UI.openEnclosure(+id); } },
  openAnimal: id => UI.openAnimal(+id),
  panel: k => UI.openPanel(k),
  buyFor: id => { marketEnc = +id; UI.panel = null; UI.openPanel('market'); },
  marketEnc: (a, el) => { marketEnc = +el.value; panelRender(); },
  mfilter: f => { marketFilter = f; panelRender(); },
  expand: id => { FP.Input.setTool('expand', +id); UI.toast('Arraste uma área encostada no recinto para ampliá-lo. Pode avançar sobre outro recinto (os tiles são redesignados).'); },
  reshape: id => { FP.Input.setTool('reshape', +id); UI.toast('📐 Arraste a NOVA área completa do recinto. A área antiga será liberada e os animais realocados.'); },
  releaseTool: () => { FP.Input.setTool('release'); UI.toast('🔓 Arraste sobre a parte do recinto que deseja liberar.'); },
  pondTool: id => { FP.Input.setTool('pond', +id); UI.toast('💧 Arraste sobre o recinto para abrir um lago. Animais que nadam vão adorar!'); },
  fillTool: id => { FP.Input.setTool('fill', +id); UI.toast('⛰️ Arraste sobre a água do recinto para aterrar.'); },
  toysFly: () => { const c = BUILD_CATS.find(x => x.id === 'toys'); $('#flyout').classList.add('hidden'); UI.openFlyout(c); },
  feed: id => { const r = FP.Staff.manualFeed(FP.G.enclosures[id]); UI.toast(r.msg, r.ok ? 'good' : 'error'); panelRender(); },
  clean: id => { const r = FP.Staff.manualClean(FP.G.enclosures[id]); UI.toast(r.ok ? 'Recinto limpo (' + U.money(r.cost) + ').' : r.msg, r.ok ? 'good' : 'error'); panelRender(); },
  breeding: (id, el) => { FP.G.enclosures[id].breeding = el.checked; },
  priority: (id, el) => { FP.G.enclosures[id].priority = +el.value; },
  buy: id => {
    const r = FP.Market.buy(+id, FP.G.enclosures[marketEnc]);
    if (r.ok){ FP.Audio.play('buy'); UI.toast(`${FP.SPECIES[r.a.sp].nome} "${esc(r.a.name)}" chegou a ${esc(FP.G.enclosures[marketEnc].name)}!${r.a.quar ? ' (em quarentena)' : ''}`, 'good'); if (r.warn) UI.toast(r.warn, 'info'); }
    else UI.toast(r.msg, 'error');
    panelRender(); UI.renderTop();
  },
  sell: id => {
    const a = FP.G.animals.find(x => x.id === +id); if (!a) return;
    const w = FP.Market.sellWarning(a);
    UI.confirm('Vender animal', `Vender ${esc(a.name)} (${FP.SPECIES[a.sp].nome}) por <b>${U.money(FP.Animals.sellValue(a))}</b>?${w ? '<br><br><span class="warn">⚠️ ' + w + '</span>' : ''}`, () => { const r = FP.Market.sell(a); if (r.ok){ FP.Audio.play('cash'); UI.toast('Vendido por ' + U.money(r.v) + '.', 'good'); UI.closePanels(); } });
  },
  conserve: id => {
    const a = FP.G.animals.find(x => x.id === +id); if (!a) return;
    const w = FP.Market.sellWarning(a);
    UI.confirm('Programa de conservação', `Transferir ${esc(a.name)} para um programa de conservação? Não gera receita, mas melhora a reputação.${w ? '<br><br><span class="warn">⚠️ ' + w + '</span>' : ''}`, () => { FP.Market.sell(a, true); UI.toast('Transferido para conservação. +reputação', 'good'); UI.closePanels(); });
  },
  moveAnimal: id => {
    const G = FP.G, a = G.animals.find(x => x.id === +id); if (!a) return;
    const opts = a.quar ? FP.Health.releaseTargets(a).concat(Object.values(G.enclosures).filter(e => !FP.Health.releaseTargets(a).includes(e))) : Object.values(G.enclosures).filter(e => e.id !== a.enc);
    if (!opts.length){ UI.toast('Não há outro recinto.', 'error'); return; }
    UI.modal(`<h2>${a.quar ? 'Liberar ' + esc(a.name) + ' em' : 'Mover ' + esc(a.name)}</h2><div class="list">${opts.map(e => `<div class="row"><div><b>${esc(e.name)}</b><br><small>Habitat ${FP.World.habitat(G, e, a.sp)}% · ${FP.World.encAnimals(G, e).length} animais${FP.World.encAnimals(G, e).some(x => x.sp === a.sp) ? ' · grupo da mesma espécie' : ''}</small></div><button class="btn sm" data-mv="${e.id}">${a.quar ? 'Liberar aqui' : 'Mover'}</button></div>`).join('')}</div><div class="modal-actions"><button class="btn ghost" data-close>Cancelar</button></div>`);
    document.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const r = FP.Market.move(a, G.enclosures[b.dataset.mv]); UI.closeModal(); UI.toast(r.ok ? 'Animal transferido.' : r.msg, r.ok ? 'good' : 'error'); if (r.ok) UI.openAnimal(a.id); });
  },
  quarantine: id => { const a = FP.G.animals.find(x => x.id === +id); const r = FP.Health.sendQuarantine(a); UI.toast(r.ok ? 'Enviado à quarentena.' : r.msg, r.ok ? 'good' : 'error'); panelRender(); },
  release: id => {
    const a = FP.G.animals.find(x => x.id === +id); if (!a) return;
    const go = () => { const r = FP.Health.release(a); UI.toast(r.ok ? 'Liberado da quarentena.' + (r.msg ? ' ' + r.msg : '') : r.msg, r.ok ? 'good' : 'error'); if (panelRender) panelRender(); };
    if (a.sick){ UI.confirm('Liberar animal doente?', 'O animal ainda está doente e pode contaminar outros.', go); return; }
    go();
  },
  locate: id => { const a = FP.G.animals.find(x => x.id === +id); if (a) FP.Render.centerOn(a.x, a.y); },
  demolishObj: id => { const G = FP.G, o = G.objects[id]; if (!o) return; const d = FP.World.objDef(o); FP.Undo.commit(FP.Undo.snap('remoção de ' + d.nome)); FP.Economy.earn(Math.round(d.custo * .4), 'reembolsos'); const ei = G.enc[U.idx(o.x, o.y)]; if (ei >= 0) G.enclosures[ei].dirty = true; FP.World.removeObject(G, +id); FP.World.refreshNetwork(G); FP.Audio.play('demolish'); UI.closePanels(); },
  hire: r => { const res = FP.Staff.hire(r); UI.toast(res.ok ? `${FP.STAFF[r].nome} ${esc(res.s.name)} contratado(a)!` : res.msg, res.ok ? 'good' : 'error'); panelRender(); },
  fire: id => { const s = FP.G.staff.find(x => x.id === +id); UI.confirm('Demitir', `Demitir ${esc(s.name)}? Custo de rescisão: ${U.money(s.salary * 3)}.`, () => { FP.Staff.fire(+id); panelRender(); }); },
  assign: (id, el) => { const s = FP.G.staff.find(x => x.id === +id); s.assign = +el.value; s.path = []; },
  buyFood: arg => { const [f, q] = arg.split(':'); const r = FP.Economy.buyFood(f, +q); UI.toast(r.ok ? `Comprado: ${r.qty} un. de ${FP.FOODS[f].nome.toLowerCase()} (${U.money(r.cost)}).` : r.msg, r.ok ? 'good' : 'error'); panelRender(); },
  autoFood: (f, el) => { FP.G.autoFood[f] = el.checked; },
  quarBuy: (a, el) => { FP.G.quarantineOnBuy = el.checked; },
  ticket: d => { const G = FP.G; G.ticket = U.clamp(G.ticket + (+d), 0, 150); G.flags = Object.assign(G.flags || {}, {ticket: true}); panelRender(); },
  ticketRange: (a, el) => { const G = FP.G; G.ticket = +el.value; G.flags = Object.assign(G.flags || {}, {ticket: true}); const b = el.parentNode.querySelector('b'); if (b) b.textContent = U.money(G.ticket); },
  loan: () => UI.confirm('Empréstimo', 'Receber R$ 25.000 agora e pagar 30 parcelas diárias de R$ 958?', () => { const r = FP.Economy.takeLoan(); UI.toast(r.ok ? 'Empréstimo creditado.' : r.msg, r.ok ? 'good' : 'error'); panelRender(); }),
  event: id => { const r = FP.Economy.startEvent(id); UI.toast(r.ok ? FP.EVENTS[id].nome + ' começou!' : r.msg, r.ok ? 'good' : 'error'); panelRender(); },
  notif: id => { const n = FP.G.notifications.find(x => x.id === +id); if (n) UI.followLink(n); }
};

/* ---------- Atualizações periódicas ---------- */
UI.hourly = function(){ UI.renderTop(); };
UI.daily = function(){ UI.renderTop(); };
UI.tick = function(){ if (!UI.inMenu && FP.G){ UI.renderTop(); UI.refreshPanel(); } };
})();
