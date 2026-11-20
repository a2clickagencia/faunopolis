/* FAUNÓPOLIS — main.js : inicialização e laço principal (requestAnimationFrame) */
'use strict';
(function(){
let last = performance.now(), uiTimer = 0;

function frame(now){
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  try {
    if (FP.G && !FP.UI.inMenu){
      FP.Sim.tick(dt);
      FP.Input.updateKeys(dt);
      FP.Render.draw(dt);
      uiTimer -= dt;
      if (uiTimer <= 0){ uiTimer = .5; FP.UI.tick(); }
    }
  } catch (e){
    console.error(e);
    if (!frame._err){ frame._err = true; FP.UI.toast('Erro inesperado: ' + e.message, 'error'); setTimeout(() => frame._err = false, 5000); }
  }
  requestAnimationFrame(frame);
}

window.addEventListener('DOMContentLoaded', () => {
  FP.UI._noLiveWhileHover = true;
  FP.Render.init(document.getElementById('game'), document.getElementById('minimap'));
  FP.Input.init(document.getElementById('game'));
  FP.UI.initMenu();
  document.querySelector('#panel .p-close').onclick = FP.UI.closePanels;
  document.getElementById('modal').addEventListener('mousedown', e => { if (e.target.id === 'modal' && !document.querySelector('#modal .stage-up')) FP.UI.closeModal(); });
  document.getElementById('minimap').addEventListener('mousedown', e => {
    const r = e.target.getBoundingClientRect();
    const move = ev => { FP.Cam.x = (ev.clientX - r.left) / r.width * FP.W * FP.TILE; FP.Cam.y = (ev.clientY - r.top) / r.height * FP.H * FP.TILE; FP.Render.clampCam(); };
    move(e);
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  });
  window.addEventListener('beforeunload', () => { if (FP.G && !FP.UI.inMenu && !FP.G.gameOver) FP.Save.save('auto', true); });
  FP.UI.showMenu();
  requestAnimationFrame(frame);
});
})();
