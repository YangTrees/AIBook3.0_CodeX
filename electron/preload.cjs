const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aibookClient', Object.freeze({
  isDesktop: true,
  getLicenseStatus: () => ipcRenderer.invoke('license:get-status'),
  activate: (activationCode) => ipcRenderer.invoke('license:activate', activationCode),
  getAppInfo: () => ipcRenderer.invoke('client:get-info'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
}));
