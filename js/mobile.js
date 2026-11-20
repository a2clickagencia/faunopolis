/* =========================================================
   FAUNÓPOLIS — mobile.js (v7.2)
   Celular e tablet: detecção do aparelho, layout adaptado,
   botões flutuantes (zoom, mover, mapa, inclinar), economia
   de bateria, salvamento ao sair do app e instalação (PWA).
   ========================================================= */
'use strict';
(function(){
const M = FP.Mobile = {};
const $ = s => document.querySelector(s);
const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e){ return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e){} }
};

/* ---------- Aparelho ---------- */
M.touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints > 1 && !matchMedia('(pointer: fine)').matches);
M.ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
M.android = /Android/i.test(navigator.userAgent);
M.desktopApp = !!window.faunoDesktop;
M.standalone = () => (window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches)) || navigator.standalone === true;
M.classify = function(){
  const b = document.body, w = window.innerWidth, h = window.innerHeight;
  const phone = M.touch && Math.min(w, h) < 600;
  b.classList.toggle('touch', M.touch);
  b.classList.toggle('phone', phone);
  b.classList.toggle('tablet', M.touch && !phone);
  b.classList.toggle('portrait', h >= w);
  b.classList.toggle('landscape', w > h);
  b.classList.toggle('standalone', M.standalone());
  M.phone = phone;
};

/* ---------- Economia de bateria: limita a 30 quadros/s ---------- */
M.battery = () => ls.get('faunopolis_bateria', M.touch ? '1' : '0') === '1';
M.setBattery = on => ls.set('faunopolis_bateria', on ? '1' : '0');
let lastDraw = 0;
M.shouldDraw = function(now){
  if (!M.battery()) return true;
  if (now - lastDraw < 1000 / 31) return false;
  lastDraw = now; return true;
};

/* ---------- Botões flutuantes ---------- */
M.buildFabs = function(){
  if ($('#fabs')) return;
  const f = document.createElement('div');
  f.id = 'fabs';
  f.innerHTML = `
    <button data-fab="pan" title="Mover o mapa com 1 dedo (sem construir)">✋</button>
    <button data-fab="in" title="Aproximar">＋</button>
    <button data-fab="out" title="Afastar">－</button>
    <button data-fab="up" class="only3d" title="Inclinar para cima (ver mais de cima)">⤒</button>
    <button data-fab="down" class="only3d" title="Inclinar para baixo (ver mais de lado)">⤓</button>
    <button data-fab="map" title="Mapa, lentes e câmeras (2D/3D)">🗺️</button>`;
  $('#hud').appendChild(f);
  const I = FP.Input;
  const act = {
    pan: () => { I.panLock = !I.panLock; FP.UI.onToolChange(); M.renderFabs(); FP.UI.toast(I.panLock ? '✋ Mover ligado: 1 dedo só move o mapa. Toque de novo para voltar a construir.' : '✏️ 1 dedo volta a desenhar com a ferramenta escolhida.'); },
    in: () => I.zoomStep(1.25), out: () => I.zoomStep(1 / 1.25),
    up: () => FP.R3 && FP.R3.orbitBy(0, 40), down: () => FP.R3 && FP.R3.orbitBy(0, -40),
    map: () => { document.body.classList.toggle('showmap'); M.renderFabs(); }
  };
  f.querySelectorAll('button').forEach(b => {
    b.onclick = () => { FP.Audio.play('click'); act[b.dataset.fab](); };
  });
  M.renderFabs();
};
M.renderFabs = function(){
  const f = $('#fabs'); if (!f) return;
  const I = FP.Input;
  f.querySelector('[data-fab="pan"]').classList.toggle('on', !!I.panLock);
  f.querySelector('[data-fab="pan"]').style.display = I.tool === 'select' ? 'none' : '';
  f.querySelector('[data-fab="map"]').classList.toggle('on', document.body.classList.contains('showmap'));
};

/* ---------- Salvar quando o app vai para segundo plano ---------- */
function bgSave(){
  if (FP.G && FP.UI && !FP.UI.inMenu && !FP.G.gameOver){ try { FP.Save.save('auto', true); } catch (e){} }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) bgSave(); });
window.addEventListener('pagehide', bgSave);
// pede ao navegador que não apague os jogos salvos para liberar espaço
if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(p => { if (!p) navigator.storage.persist().catch(() => {}); }).catch(() => {});

/* ---------- Tela cheia ---------- */
M.canFullscreen = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) && !M.standalone() && !M.desktopApp;
M.toggleFullscreen = function(){
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  else { const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); if (p && p.catch) p.catch(() => FP.UI.toast('O navegador não permitiu a tela cheia.', 'error')); }
};

/* ---------- Instalação ---------- */
const REL = 'https://github.com/a2clickagencia/faunopolis/releases/latest';
M.WIN_URL = REL + '/download/Faunopolis-Setup.exe';
let deferred = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; M.renderInstall(); });
window.addEventListener('appinstalled', () => { deferred = null; FP.UI.toast('Faunópolis instalado! Abra pelo ícone na tela inicial.', 'good'); M.renderInstall(); });
M.canInstall = () => !M.desktopApp && !M.standalone() && /^https?:$/.test(location.protocol);
M.renderInstall = function(){
  const box = $('#menu-install'); if (!box) return;
  box.classList.toggle('hidden', !M.canInstall());
  const main = $('#menu-pwa');
  if (main) main.innerHTML = M.touch ? `📲 Instalar no ${M.ios ? (/iPad/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && !/iPhone/.test(navigator.userAgent)) ? 'iPad' : 'iPhone') : 'celular ou tablet'}<small>grátis · funciona sem internet</small>` : '📥 Instalar o jogo<small>Windows, Android, iPhone e iPad</small>';
};
M.install = function(){
  if (deferred){
    deferred.prompt();
    deferred.userChoice.then(c => { if (c.outcome !== 'accepted') M.installDialog(); deferred = null; }).catch(() => {});
    return;
  }
  M.installDialog();
};
M.installDialog = function(){
  const plat = M.ios ? 'ios' : M.android ? 'android' : 'pc';
  const card = (id, ic, title, body) => `<div class="inst-card ${plat === id ? 'cur' : ''}"><h3>${ic} ${title}${plat === id ? ' <span class="inst-tag">seu aparelho</span>' : ''}</h3>${body}</div>`;
  const pwaBtn = deferred ? '<button class="btn primary" id="inst-now">📲 Instalar agora</button>' : '';
  FP.UI.modal(`<h2>📥 Instalar o Faunópolis</h2>
    <p>O jogo é grátis, abre em tela cheia pelo ícone e, depois de instalado, funciona <b>sem internet</b> — bom para jogar no intervalo da aula ou no ônibus. O progresso fica salvo no próprio aparelho.</p>
    <div class="inst-grid">
      ${card('android', '🤖', 'Android (celular ou tablet)', `<ol><li>Abra <b>faunopolis.a2clickagencia.workers.dev</b> no <b>Chrome</b>.</li><li>Toque em <b>Instalar</b> (ou no menu <b>⋮ → Instalar app / Adicionar à tela inicial</b>).</li><li>Abra pelo ícone 🐾 Faunópolis.</li></ol>${plat === 'android' ? pwaBtn : ''}`)}
      ${card('ios', '🍎', 'iPhone e iPad', `<ol><li>Abra o site no <b>Safari</b>.</li><li>Toque em <b>Compartilhar</b> <span class="inst-ico">⬆︎</span>.</li><li>Escolha <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.</li></ol>`)}
      ${card('pc', '💻', 'Computador (Windows)', `<p>Instalador com progresso salvo em arquivos na pasta Documentos.</p><a class="btn ${plat === 'pc' ? 'primary' : ''}" href="${M.WIN_URL}">💻 Baixar para Windows</a>${plat === 'pc' && pwaBtn ? ' ' + pwaBtn.replace('📲 Instalar agora', '🌐 Instalar pelo navegador') : ''}<p class="note">No Mac, Linux ou Chromebook, use o ícone ⊕ “Instalar” na barra de endereço do Chrome ou do Edge.</p>`)}
    </div>
    <p class="note">💡 Para levar o jogo de um aparelho para outro: Menu → Salvar → <b>Exportar / enviar arquivo</b>, e no outro aparelho Carregar → <b>Importar arquivo</b>.</p>
    <div class="modal-actions"><button class="btn primary" data-close>Fechar</button></div>`);
  const b = document.getElementById('inst-now');
  if (b) b.onclick = () => { FP.UI.closeModal(); M.install(); };
};

/* ---------- Compartilhar o arquivo do jogo (celular) ---------- */
M.shareFile = function(name, text){
  if (!M.touch || !navigator.canShare) return false;
  try {
    const file = new File([text], name, {type: 'application/octet-stream'});
    if (!navigator.canShare({files: [file]})) return false;
    navigator.share({files: [file], title: 'Faunópolis — ' + name}).then(() => FP.UI.toast('Arquivo do jogo enviado.', 'good')).catch(() => {});
    return true;
  } catch (e){ return false; }
};

/* ---------- Início ---------- */
window.addEventListener('DOMContentLoaded', () => {
  M.classify();
  window.addEventListener('resize', M.classify);
  window.addEventListener('orientationchange', () => setTimeout(M.classify, 250));
  M.buildFabs();
  M.renderInstall();
  const pwa = $('#menu-pwa'); if (pwa) pwa.onclick = M.install;
  // celular em pé: o mapa (minimapa e câmeras) começa recolhido
  if (M.phone) document.body.classList.remove('showmap');
});
})();
