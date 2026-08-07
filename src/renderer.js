const recordBtn = document.getElementById('record-btn');
const settingsBtn = document.getElementById('settings-btn');
const statusText = document.getElementById('status-text');
const subStatusText = document.getElementById('sub-status');
const micIcon = document.getElementById('mic-icon');
const loader = document.getElementById('loader');
const container = document.querySelector('.widget-container');

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let isProcessing = false;
let currentHotkey = 'Alt+Q';

// Fetch current hotkey to display in UI dynamically
async function initHotkeyDisplay() {
  try {
    const config = await window.electronAPI.getConfig();
    if (config && config.hotkey) {
      currentHotkey = config.hotkey;
      updateUI('ready');
    }
  } catch (err) {
    console.error('無法載入快速鍵設定:', err);
  }
}
initHotkeyDisplay();

// Register Settings UI trigger
settingsBtn.addEventListener('click', () => {
  window.electronAPI.openSettings();
});

// Register Click to record
recordBtn.addEventListener('click', () => {
  if (isProcessing) return;
  window.electronAPI.toggleRecording();
});

// Actual recording logic
async function startRecordingFlow() {
  if (isRecording || isProcessing) return;

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    
    let options = {};
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options = { mimeType: 'audio/webm;codecs=opus' };
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      options = { mimeType: 'audio/webm' };
    }
    
    mediaRecorder = new MediaRecorder(stream, options);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        if (audioBlob.size === 0) {
          throw new Error('沒有錄到可處理的音訊。');
        }
        const arrayBuffer = await audioBlob.arrayBuffer();
        window.electronAPI.sendAudioData(arrayBuffer);
      } catch (error) {
        console.error('準備錄音資料失敗:', error);
        isProcessing = false;
        window.electronAPI.reportRecordingFailed();
        updateUI('error', error.message || '無法處理錄音資料');
      } finally {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    
    mediaRecorder.start();
    isRecording = true;
    window.electronAPI.reportRecordingStarted();
    updateUI('recording');
  } catch (error) {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    console.error('無法啟動錄音:', error);
    window.electronAPI.reportRecordingFailed();
    updateUI('error', '請確認麥克風設備與權限');
  }
}

function stopRecordingFlow() {
  if (!isRecording || !mediaRecorder) return;
  
  try {
    mediaRecorder.stop();
  } catch (err) {
    console.error('停止錄音失敗:', err);
    window.electronAPI.reportRecordingFailed();
    updateUI('error', '停止錄音失敗');
    return;
  }
  isRecording = false;
  isProcessing = true;
  updateUI('processing');
}

// Listen to Global Hotkey from Main process
window.electronAPI.onStartRecording(() => {
  startRecordingFlow();
});

window.electronAPI.onStopRecording(() => {
  stopRecordingFlow();
});

// Listen to status changes from Main process
window.electronAPI.onStatusChange((status, message) => {
  if (status === 'processing') {
    isProcessing = true;
    isRecording = false;
    updateUI('processing', message);
  } else if (status === 'success') {
    isProcessing = false;
    isRecording = false;
    updateUI('success', message);
    
    // Reset to ready after a short delay
    setTimeout(() => {
      if (!isRecording && !isProcessing) {
        updateUI('ready');
      }
    }, 2000);
  } else if (status === 'error') {
    isProcessing = false;
    isRecording = false;
    updateUI('error', message);
  } else if (status === 'ready') {
    isProcessing = false;
    isRecording = false;
    updateUI('ready');
  }
});

window.electronAPI.onConfigUpdated((config) => {
  if (config && config.hotkey) {
    currentHotkey = config.hotkey;
    if (!isRecording && !isProcessing) {
      updateUI('ready');
    }
  }
});

// UI state update helper
function updateUI(state, message = '') {
  container.className = 'widget-container';
  micIcon.classList.remove('hidden');
  loader.classList.add('hidden');
  
  switch (state) {
    case 'ready':
      statusText.textContent = 'Ready';
      subStatusText.textContent = `${currentHotkey} / 點擊開始`;
      break;
      
    case 'recording':
      container.classList.add('recording');
      statusText.textContent = 'Recording...';
      subStatusText.textContent = `${currentHotkey} / 點擊完成`;
      break;
      
    case 'processing':
      container.classList.add('processing');
      micIcon.classList.add('hidden');
      loader.classList.remove('hidden');
      statusText.textContent = 'Processing...';
      subStatusText.textContent = message || '正在處理您的語音';
      break;
      
    case 'success':
      container.classList.add('success-state');
      statusText.textContent = 'Success!';
      subStatusText.textContent = message || '已成功輸入';
      break;
      
    case 'error':
      container.classList.add('recording'); // triggers red glow
      statusText.textContent = 'Error';
      subStatusText.textContent = message || '發生錯誤';
      break;
  }
}
