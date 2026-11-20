/* Ponte segura entre o jogo e o computador (salvamento em arquivo) */
'use strict';
const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('faunoDesktop', {
  isDesktop: true,
  write: (slot, data, meta) => ipcRenderer.sendSync('save:write', slot, data, meta),
  read: slot => ipcRenderer.sendSync('save:read', slot),
  list: () => ipcRenderer.sendSync('save:list'),
  remove: slot => ipcRenderer.sendSync('save:remove', slot),
  dir: () => ipcRenderer.sendSync('save:dir'),
  openFolder: () => ipcRenderer.invoke('save:open')
});
