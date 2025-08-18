const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onNewFile: (callback) => ipcRenderer.on('action:new-file', callback),
  onOpenFileContent: (callback) => ipcRenderer.on('action:open-file-content', (_event, payload) => callback(payload)),
  onSaveAndClose: (callback) => ipcRenderer.on('action:save-pdf-and-close', callback),
  requestSavePdf: (options) => ipcRenderer.invoke('save-current-pdf', options),
  openFileDialog: () => ipcRenderer.invoke('open-dialog'),
  requestClose: () => ipcRenderer.invoke('request-close')
});


