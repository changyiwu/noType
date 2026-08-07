const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Config / Keys
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  
  // Recording
  toggleRecording: () => ipcRenderer.send('toggle-recording'),
  onStartRecording: (callback) => ipcRenderer.on('start-recording', (_event) => callback()),
  onStopRecording: (callback) => ipcRenderer.on('stop-recording', (_event) => callback()),
  reportRecordingStarted: () => ipcRenderer.send('recording-started'),
  reportRecordingFailed: () => ipcRenderer.send('recording-failed'),
  sendAudioData: (arrayBuffer) => ipcRenderer.send('audio-data', arrayBuffer),
  
  // App Status
  onStatusChange: (callback) => ipcRenderer.on('status-change', (_event, status, message) => callback(status, message)),
  onConfigUpdated: (callback) => ipcRenderer.on('config-updated', (_event, config) => callback(config)),
  
  // Settings UI actions
  openSettings: () => ipcRenderer.send('open-settings'),
  closeSettings: () => ipcRenderer.send('close-settings'),
  
  // Widget actions
  hideWidget: () => ipcRenderer.send('hide-widget')
});
