const form = document.getElementById('settings-form');
const providerSelect = document.getElementById('provider');
const llmProviderSelect = document.getElementById('llmProvider');

const groqGroup = document.getElementById('groq-group');
const openaiGroup = document.getElementById('openai-group');

const groqModelGroup = document.getElementById('groq-model-group');
const openaiModelGroup = document.getElementById('openai-model-group');

const closeBtn = document.getElementById('close-btn');
const saveStatus = document.getElementById('save-status');

// Toggle API Key Input fields and models based on both STT and LLM Provider
function updateVisibility() {
  const stt = providerSelect.value;
  const llm = llmProviderSelect.value;

  // Groq API Key is visible if STT is Groq OR LLM is Groq
  if (stt === 'groq' || llm === 'groq') {
    groqGroup.classList.remove('hidden');
  } else {
    groqGroup.classList.add('hidden');
  }

  // OpenAI API Key is visible if STT is OpenAI OR LLM is OpenAI
  if (stt === 'openai' || llm === 'openai') {
    openaiGroup.classList.remove('hidden');
  } else {
    openaiGroup.classList.add('hidden');
  }

  // Handle LLM model dropdowns visibility
  if (llm === 'groq') {
    groqModelGroup.classList.remove('hidden');
    openaiModelGroup.classList.add('hidden');
  } else if (llm === 'openai') {
    groqModelGroup.classList.add('hidden');
    openaiModelGroup.classList.remove('hidden');
  } else {
    // 'none'
    groqModelGroup.classList.add('hidden');
    openaiModelGroup.classList.add('hidden');
  }
}

providerSelect.addEventListener('change', updateVisibility);
llmProviderSelect.addEventListener('change', updateVisibility);

// Load current configuration
async function loadConfig() {
  try {
    const config = await window.electronAPI.getConfig();
    if (config) {
      if (config.provider) providerSelect.value = config.provider;
      if (config.llmProvider) llmProviderSelect.value = config.llmProvider;
      if (config.groqApiKey) document.getElementById('groqApiKey').value = config.groqApiKey;
      if (config.openaiApiKey) document.getElementById('openaiApiKey').value = config.openaiApiKey;
      if (config.language) document.getElementById('language').value = config.language;
      if (config.groqModel) document.getElementById('groqModel').value = config.groqModel;
      if (config.openaiModel) document.getElementById('openaiModel').value = config.openaiModel;
      document.getElementById('autoLaunch').checked = config.autoLaunch !== false;
      if (config.portableMode) {
        const autoLaunchInput = document.getElementById('autoLaunch');
        autoLaunchInput.checked = false;
        autoLaunchInput.disabled = true;
        autoLaunchInput.closest('.toggle-group').title = 'Portable 版不提供開機自動啟動。';
      }
      if (config.hotkey) document.getElementById('hotkey').value = config.hotkey;
      
      if (config.appVersion) {
        document.getElementById('app-version').textContent = 'v' + config.appVersion;
      }
      
      updateVisibility();
    }
  } catch (err) {
    console.error('載入設定失敗:', err);
  }
}

// Save configuration on Form Submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const config = {
    provider: providerSelect.value,
    llmProvider: llmProviderSelect.value,
    groqApiKey: document.getElementById('groqApiKey').value.trim(),
    openaiApiKey: document.getElementById('openaiApiKey').value.trim(),
    language: document.getElementById('language').value,
    groqModel: document.getElementById('groqModel').value,
    openaiModel: document.getElementById('openaiModel').value,
    autoLaunch: document.getElementById('autoLaunch').checked,
    hotkey: document.getElementById('hotkey').value.trim() || 'Alt+Q'
  };

  try {
    const success = await window.electronAPI.saveConfig(config);
    if (success) {
      saveStatus.textContent = '設定已儲存！';
      saveStatus.style.opacity = 1;
      
      setTimeout(() => {
        saveStatus.style.opacity = 0;
        // Optionally close settings window after save
        window.electronAPI.closeSettings();
      }, 1000);
    } else {
      saveStatus.textContent = '儲存失敗';
      saveStatus.style.color = '#ff453a';
      saveStatus.style.opacity = 1;
    }
  } catch (err) {
    console.error('儲存設定錯誤:', err);
    saveStatus.textContent = '儲存出錯';
    saveStatus.style.color = '#ff453a';
    saveStatus.style.opacity = 1;
  }
});

// Close window button click
closeBtn.addEventListener('click', () => {
  window.electronAPI.closeSettings();
});

// Interactive hotkey input logic
const hotkeyInput = document.getElementById('hotkey');
let tempHotkey = '';

hotkeyInput.addEventListener('focus', () => {
  tempHotkey = hotkeyInput.value;
  hotkeyInput.value = '';
  hotkeyInput.placeholder = '請按下欲設定的快捷鍵組合...';
});

hotkeyInput.addEventListener('blur', () => {
  if (hotkeyInput.value === '') {
    hotkeyInput.value = tempHotkey;
  }
  hotkeyInput.placeholder = '例如：Alt+V';
});

hotkeyInput.addEventListener('keydown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  const keys = [];
  
  // Detect modifiers
  if (e.ctrlKey) keys.push('Ctrl');
  if (e.altKey) keys.push('Alt');
  if (e.shiftKey) keys.push('Shift');
  if (e.metaKey) keys.push('Cmd');
  
  const key = e.key;
  const isModifier = ['Control', 'Alt', 'Shift', 'Meta'].includes(key);
  
  if (!isModifier) {
    let keyName = key;
    if (key === ' ') {
      keyName = 'Space';
    } else if (key.length === 1) {
      keyName = key.toUpperCase();
    } else if (key === 'ArrowUp') {
      keyName = 'Up';
    } else if (key === 'ArrowDown') {
      keyName = 'Down';
    } else if (key === 'ArrowLeft') {
      keyName = 'Left';
    } else if (key === 'ArrowRight') {
      keyName = 'Right';
    }
    
    keys.push(keyName);
  }
  
  if (keys.length > 0) {
    hotkeyInput.value = keys.join('+');
  }
});

// Run load configuration on start
loadConfig();
