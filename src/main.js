const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { transcribeAudio, refineText } = require('./api');
const { createConfigStore, DEFAULT_SETTINGS } = require('./config-store');
const { RecordingState } = require('./recording-state');
const { getPlatformAdapter } = require('./platform');

let mainWindow = null;
let settingsWindow = null;
let tray = null;
let configStore = null;

const recordingState = new RecordingState();
const platformAdapter = getPlatformAdapter();
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function isPortableMode() {
  return process.platform === 'win32' && Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
}

function initializeConfigStore() {
  configStore = createConfigStore({
    configPath: path.join(app.getPath('userData'), 'config.json'),
    legacyConfigPath: path.join(app.getAppPath(), 'config.json'),
    defaults: {
      ...DEFAULT_SETTINGS,
      autoLaunch: !isPortableMode()
    }
  });
  return configStore.initialize();
}

function loadConfig() {
  return configStore ? configStore.load() : { ...DEFAULT_SETTINGS };
}

function saveConfig(config) {
  return configStore ? configStore.save(config) : false;
}

function applyAutoLaunch(config) {
  if (isPortableMode()) {
    return;
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: config.autoLaunch !== false,
      path: app.getPath('exe')
    });
  } catch (error) {
    console.error('無法套用開機啟動項目:', error);
  }
}

function isMainWindowSender(event) {
  return Boolean(mainWindow && event.sender === mainWindow.webContents);
}

function isSettingsWindowSender(event) {
  return Boolean(settingsWindow && event.sender === settingsWindow.webContents);
}

// Create Main Floating Widget
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 210,
    height: 84,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Position window at bottom right of the screen
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const x = width - 230;
  const y = height - 104;
  mainWindow.setPosition(x, y);

  mainWindow.on('show', () => {
    updateTrayMenu();
  });

  mainWindow.on('hide', () => {
    updateTrayMenu();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    recordingState.reset();
  });
}

// Create Settings Window
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 720,
    frame: false,
    transparent: false,
    backgroundColor: '#0d0d12',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// Register Global Hotkey
function registerGlobalShortcut() {
  const config = loadConfig();
  globalShortcut.unregisterAll();

  try {
    const registered = globalShortcut.register(config.hotkey, () => {
      requestRecordingToggle();
    });

    if (!registered) {
      console.error(`全域快捷鍵 ${config.hotkey} 註冊失敗`);
    } else {
      console.log(`已成功註冊全域快捷鍵: ${config.hotkey}`);
    }
  } catch (err) {
    console.error('快捷鍵註冊發生錯誤:', err);
  }
}

// Update Tray Context Menu to match visibility state
function updateTrayMenu() {
  if (!tray) return;
  const isVisible = mainWindow && mainWindow.isVisible();
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '顯示懸浮視窗', 
      type: 'checkbox', 
      checked: !!isVisible, 
      click: (menuItem) => {
        if (menuItem.checked) {
          if (mainWindow) mainWindow.show();
          else createMainWindow();
        } else {
          if (mainWindow) mainWindow.hide();
        }
      } 
    },
    { label: '設定金鑰', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: '退出 notype', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
}

// Setup System Tray
function setupTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon;
  try {
    if (fs.existsSync(iconPath)) {
      const rawImage = nativeImage.createFromPath(iconPath);
      trayIcon = rawImage.resize({ width: 16, height: 16 });
    } else {
      trayIcon = Buffer.alloc(0);
    }
    tray = new Tray(trayIcon);
  } catch (err) {
    tray = new Tray(Buffer.alloc(0));
  }
  
  tray.setToolTip(`notype v${app.getVersion()} - AI 語音輸入工具`);
  updateTrayMenu();

  // Single click on tray to toggle main window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    } else {
      createMainWindow();
    }
  });
}

function requestRecordingToggle() {
  if (!mainWindow) {
    return;
  }

  const action = recordingState.requestToggle();
  if (action === 'start') {
    mainWindow.webContents.send('start-recording');
  } else if (action === 'stop') {
    mainWindow.webContents.send('stop-recording');
  }
}

// IPC Responders
ipcMain.handle('get-config', (event) => {
  if (!isMainWindowSender(event) && !isSettingsWindowSender(event)) {
    throw new Error('不允許的設定讀取來源。');
  }
  const config = loadConfig();
  config.appVersion = app.getVersion();
  config.portableMode = isPortableMode();
  return config;
});

ipcMain.handle('save-config', (event, config) => {
  if (!isSettingsWindowSender(event)) {
    return false;
  }

  if (isPortableMode()) {
    config.autoLaunch = false;
  }

  const success = saveConfig(config);
  if (success) {
    registerGlobalShortcut();
    applyAutoLaunch(config);
    if (mainWindow) {
      mainWindow.webContents.send('config-updated', { hotkey: config.hotkey });
    }
  }
  return success;
});

ipcMain.on('toggle-recording', (event) => {
  if (isMainWindowSender(event)) {
    requestRecordingToggle();
  }
});

ipcMain.on('recording-started', (event) => {
  if (isMainWindowSender(event)) {
    recordingState.markStarted();
  }
});

ipcMain.on('recording-failed', (event) => {
  if (isMainWindowSender(event)) {
    recordingState.reset();
  }
});

ipcMain.on('open-settings', (event) => {
  if (!isMainWindowSender(event)) return;
  createSettingsWindow();
});

ipcMain.on('close-settings', (event) => {
  if (!isSettingsWindowSender(event)) return;
  if (settingsWindow) {
    settingsWindow.close();
  }
});

ipcMain.on('hide-widget', (event) => {
  if (!isMainWindowSender(event)) return;
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Receive recorded audio buffer from renderer and process it
ipcMain.on('audio-data', async (event, arrayBuffer) => {
  if (!isMainWindowSender(event)) return;

  if (!(arrayBuffer instanceof ArrayBuffer) || arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_AUDIO_BYTES) {
    recordingState.reset();
    mainWindow.webContents.send('status-change', 'error', '錄音資料無效或超過大小限制');
    return;
  }

  const audioBuffer = Buffer.from(arrayBuffer);
  const config = loadConfig();
  recordingState.markProcessing();

  try {
    mainWindow.webContents.send('status-change', 'processing', '語音識別中...');
    console.log('開始處理語音轉文字 (STT)...');
    
    // Step 1: STT
    const rawText = await transcribeAudio(audioBuffer, config);
    console.log(`語音辨識完成（${rawText ? rawText.length : 0} 字元）。`);
    
    if (!rawText || rawText.trim().length === 0) {
      mainWindow.webContents.send('status-change', 'error', '未偵測到任何語音');
      return;
    }

    let textToPaste = rawText;

    // Check if AI refinement is enabled and key is configured
    const llmProvider = config.llmProvider || 'groq';
    let hasLlmKey = false;
    let requiredKeyName = '';

    if (llmProvider === 'groq') {
      hasLlmKey = !!(config.groqApiKey && config.groqApiKey.trim() !== '');
      requiredKeyName = 'Groq';
    } else if (llmProvider === 'openai') {
      hasLlmKey = !!(config.openaiApiKey && config.openaiApiKey.trim() !== '');
      requiredKeyName = 'OpenAI';
    }

    if (llmProvider !== 'none' && hasLlmKey) {
      mainWindow.webContents.send('status-change', 'processing', 'AI 智慧修飾中...');
      console.log(`開始 AI 語意優化 (${llmProvider})...`);
      try {
        textToPaste = await refineText(rawText, config);
        console.log(`AI 語意優化完成（${textToPaste ? textToPaste.length : 0} 字元）。`);
      } catch (llmError) {
        console.warn(`${llmProvider} 優化失敗，將使用原始辨識文字貼上:`, llmError);
        mainWindow.webContents.send('status-change', 'processing', 'AI 優化失敗，改用原始文字...');
      }
    } else {
      if (llmProvider === 'none') {
        console.log('未啟用 AI 智慧修飾，直接輸出原始辨識文字。');
      } else {
        console.log(`未設定 ${requiredKeyName} API 金鑰，跳過優化直接輸出原始辨識文字。`);
      }
    }

    // Step 3: Paste text through the current platform adapter
    await platformAdapter.pasteText(textToPaste);
    mainWindow.webContents.send('status-change', 'success', '已完成輸入');

  } catch (error) {
    console.error('處理語音失敗:', error);
    if (mainWindow) {
      mainWindow.webContents.send('status-change', 'error', error.message || '語音處理失敗');
    }
  } finally {
    recordingState.reset();
  }
});

// App lifecycle hooks
app.whenReady().then(() => {
  const config = initializeConfigStore();
  applyAutoLaunch(config);

  createMainWindow();
  setupTray();
  registerGlobalShortcut();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Keep running in system tray
  if (process.platform !== 'darwin') {
    // We don't quit, user can quit via tray icon
  }
});
