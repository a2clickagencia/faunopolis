/* =========================================================
   FAUNÓPOLIS — app para computador (Electron)
   - Abre o jogo numa janela própria (tela cheia com F11).
   - Salvamentos em ARQUIVO, em Documentos\Faunópolis\saves,
     além do armazenamento interno: o progresso fica no PC,
     sobrevive a atualizações e pode ser copiado/backup.
   ========================================================= */
'use strict';
const {app, BrowserWindow, ipcMain, shell, Menu, dialog} = require('electron');
const path = require('path');
const fs = require('fs');

const SAVE_DIR = path.join(app.getPath('documents'), 'Faunópolis', 'saves');
const safe = s => String(s).replace(/[^\w\-]+/g, '_').slice(0, 60) || 'slot';
function ensureDir(){ fs.mkdirSync(SAVE_DIR, {recursive: true}); }

/* ---------- Salvamentos (chamadas síncronas a partir do jogo) ---------- */
ipcMain.on('save:write', (e, slot, data, meta) => {
  try {
    ensureDir();
    const f = path.join(SAVE_DIR, safe(slot) + '.faunopolis');
    const tmp = f + '.tmp';
    fs.writeFileSync(tmp, data, 'utf8');
    if (fs.existsSync(f)) fs.copyFileSync(f, f + '.bak');   // backup da versão anterior
    fs.renameSync(tmp, f);
    if (meta) fs.writeFileSync(path.join(SAVE_DIR, safe(slot) + '.meta.json'), meta, 'utf8');
    e.returnValue = {ok: true, file: f};
  } catch (err){ e.returnValue = {ok: false, msg: err.message}; }
});
ipcMain.on('save:list', e => {
  try {
    ensureDir();
    e.returnValue = fs.readdirSync(SAVE_DIR).filter(n => n.endsWith('.faunopolis')).map(n => {
      const slot = n.replace(/\.faunopolis$/, ''), f = path.join(SAVE_DIR, n);
      let meta = null; try { meta = fs.readFileSync(path.join(SAVE_DIR, slot + '.meta.json'), 'utf8'); } catch (_){}
      return {slot, mtime: fs.statSync(f).mtimeMs, meta};
    });
  } catch (err){ e.returnValue = []; }
});
ipcMain.on('save:read', (e, slot) => {
  try { e.returnValue = fs.readFileSync(path.join(SAVE_DIR, safe(slot) + '.faunopolis'), 'utf8'); }
  catch (err){ e.returnValue = null; }
});
ipcMain.on('save:remove', (e, slot) => {
  for (const ext of ['.faunopolis', '.meta.json', '.faunopolis.bak']) { try { fs.unlinkSync(path.join(SAVE_DIR, safe(slot) + ext)); } catch (_){} }
  e.returnValue = true;
});
ipcMain.on('save:dir', e => { e.returnValue = SAVE_DIR; });
ipcMain.handle('save:open', () => { ensureDir(); return shell.openPath(SAVE_DIR); });

/* ---------- Janela ---------- */
function createWindow(){
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 640,
    backgroundColor: '#1E2A2F', title: 'Faunópolis',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    show: false,
    webPreferences: {preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false}
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  // links externos (créditos, manuais online) abrem no navegador padrão
  win.webContents.setWindowOpenHandler(({url}) => { if (/^(https?|file):/.test(url)) shell.openExternal(url); return {action: 'deny'}; });
  // "Exportar jogo": pergunta onde salvar o arquivo
  win.webContents.session.on('will-download', (ev, item) => {
    const p = dialog.showSaveDialogSync(win, {title: 'Exportar jogo', defaultPath: path.join(app.getPath('documents'), item.getFilename()), filters: [{name: 'Jogo do Faunópolis', extensions: ['faunopolis']}]});
    if (p) item.setSavePath(p); else item.cancel();
  });
  const menu = Menu.buildFromTemplate([
    {label: 'Jogo', submenu: [
      {label: 'Abrir pasta de jogos salvos', click: () => { ensureDir(); shell.openPath(SAVE_DIR); }},
      {type: 'separator'},
      {label: 'Tela cheia', accelerator: 'F11', role: 'togglefullscreen'},
      {label: 'Recarregar', accelerator: 'Ctrl+R', role: 'reload'},
      {type: 'separator'},
      {label: 'Sair', role: 'quit'}
    ]},
    {label: 'Ajuda', submenu: [
      {label: 'Manual do jogo', click: () => shell.openPath(path.join(__dirname, '..', 'docs', 'MANUAL_DO_JOGO.html'))},
      {label: 'Ferramentas de desenvolvedor', accelerator: 'Ctrl+Shift+I', role: 'toggleDevTools'},
      {label: 'Sobre', click: () => dialog.showMessageBox(win, {title: 'Faunópolis', message: 'Faunópolis ' + app.getVersion(), detail: 'Jogos salvos em:\n' + SAVE_DIR})}
    ]}
  ]);
  Menu.setApplicationMenu(menu);
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
