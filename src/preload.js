const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Config / Keys
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // Recording
  onStartRecording: (callback) => ipcRenderer.on('start-recording', (_event) => callback()),
  onStopRecording: (callback) => ipcRenderer.on('stop-recording', (_event) => callback()),
  sendAudioData: (arrayBuffer) => ipcRenderer.send('audio-data', arrayBuffer),
  
  // App Status
  onStatusChange: (callback) => ipcRenderer.on('status-change', (_event, status, message) => callback(status, message)),
  
  // Settings UI actions
  openSettings: () => ipcRenderer.send('open-settings'),
  closeSettings: () => ipcRenderer.send('close-settings'),
  
  // Widget actions
  hideWidget: () => ipcRenderer.send('hide-widget')
});
