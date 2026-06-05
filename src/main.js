const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, Tray, Menu, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { transcribeAudio, refineText } = require('./api');

let mainWindow = null;
let settingsWindow = null;
let tray = null;
let isRecording = false;

const configPath = path.join(app.getAppPath(), 'config.json');
const defaultSettings = {
  provider: 'groq',
  groqApiKey: '',
  openaiApiKey: '',
  language: '',
  llmProvider: 'groq',
  groqModel: 'llama-3.1-8b-instant',
  openaiModel: 'gpt-4o-mini',
  autoLaunch: true,
  hotkey: 'Alt+Q'
};

// Helper to load config
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return { ...defaultSettings, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('無法讀取設定檔，使用預設值。', err);
  }
  return { ...defaultSettings };
}

// Helper to save config
function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('儲存設定檔失敗:', err);
    return false;
  }
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
      if (!mainWindow) return;
      
      if (!isRecording) {
        mainWindow.webContents.send('start-recording');
        isRecording = true;
      } else {
        mainWindow.webContents.send('stop-recording');
        isRecording = false;
      }
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

// Paste text using Windows PowerShell SendKeys
function pasteText(text) {
  if (!text) return;
  
  // Copy to clipboard
  clipboard.writeText(text);
  
  // Wait a moment for clipboard to update, then simulate Ctrl+V
  setTimeout(() => {
    const powershellCmd = `powershell.exe -Command "$wshell = New-Object -ComObject Wscript.Shell; $wshell.SendKeys('^v')"`;
    exec(powershellCmd, (err) => {
      if (err) {
        console.error('模擬貼上失敗:', err);
      } else {
        console.log('模擬貼上成功！');
      }
    });
  }, 200);
}

// IPC Responders
ipcMain.handle('get-config', () => {
  const config = loadConfig();
  config.appVersion = app.getVersion();
  return config;
});

ipcMain.handle('save-config', (event, config) => {
  const success = saveConfig(config);
  if (success) {
    // Re-register hotkey in case it changed
    registerGlobalShortcut();
    // Update auto launch setting
    try {
      app.setLoginItemSettings({
        openAtLogin: config.autoLaunch !== false,
        path: app.getPath('exe')
      });
    } catch (err) {
      console.error('無法設定開機啟動項目:', err);
    }
    // Reload main window to update hotkey label dynamically
    if (mainWindow) {
      mainWindow.reload();
    }
  }
  return success;
});

ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

ipcMain.on('close-settings', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

ipcMain.on('hide-widget', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Receive recorded audio buffer from renderer and process it
ipcMain.on('audio-data', async (event, arrayBuffer) => {
  const audioBuffer = Buffer.from(arrayBuffer);
  const config = loadConfig();

  if (!mainWindow) return;

  try {
    mainWindow.webContents.send('status-change', 'processing', '語音識別中...');
    console.log('開始處理語音轉文字 (STT)...');
    
    // Step 1: STT
    const rawText = await transcribeAudio(audioBuffer, config);
    console.log('STT 原始結果:', rawText);
    
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
        console.log('AI 優化結果:', textToPaste);
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

    // Step 3: Paste text
    mainWindow.webContents.send('status-change', 'success', '已完成輸入');
    pasteText(textToPaste);

  } catch (error) {
    console.error('處理語音失敗:', error);
    mainWindow.webContents.send('status-change', 'error', error.message || '語音處理失敗');
  }
});

// App lifecycle hooks
app.whenReady().then(() => {
  // Write default config.json if not exists
  if (!fs.existsSync(configPath)) {
    saveConfig(defaultSettings);
  }

  const config = loadConfig();
  try {
    app.setLoginItemSettings({
      openAtLogin: config.autoLaunch !== false,
      path: app.getPath('exe')
    });
  } catch (err) {
    console.error('無法套用開機啟動項目:', err);
  }

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
