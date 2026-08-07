const fs = require('fs');
const path = require('path');

const CURRENT_GROQ_MODEL = 'openai/gpt-oss-20b';
const DEPRECATED_GROQ_MODELS = new Set([
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768'
]);

const DEFAULT_SETTINGS = Object.freeze({
  provider: 'groq',
  groqApiKey: '',
  openaiApiKey: '',
  language: '',
  llmProvider: 'groq',
  groqModel: CURRENT_GROQ_MODEL,
  openaiModel: 'gpt-4o-mini',
  autoLaunch: true,
  hotkey: 'Alt+Q'
});

function normalizeConfig(config = {}, defaults = DEFAULT_SETTINGS) {
  const normalized = { ...defaults, ...config };

  if (DEPRECATED_GROQ_MODELS.has(normalized.groqModel)) {
    normalized.groqModel = CURRENT_GROQ_MODEL;
  }

  return normalized;
}

function createConfigStore({ configPath, legacyConfigPath, defaults = DEFAULT_SETTINGS }) {
  const normalizedDefaults = normalizeConfig(defaults);

  function readConfig(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    return normalizeConfig(JSON.parse(data), normalizedDefaults);
  }

  function load() {
    try {
      if (fs.existsSync(configPath)) {
        return readConfig(configPath);
      }
    } catch (error) {
      console.error('無法讀取設定檔，使用預設值。', error);
    }

    return { ...normalizedDefaults };
  }

  function save(config) {
    try {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(
        configPath,
        JSON.stringify(normalizeConfig(config, normalizedDefaults), null, 2),
        'utf8'
      );
      return true;
    } catch (error) {
      console.error('儲存設定檔失敗:', error);
      return false;
    }
  }

  function initialize() {
    if (fs.existsSync(configPath)) {
      const config = load();
      save(config);
      return config;
    }

    if (legacyConfigPath && legacyConfigPath !== configPath && fs.existsSync(legacyConfigPath)) {
      try {
        const legacyConfig = readConfig(legacyConfigPath);
        if (save(legacyConfig)) {
          console.log('已將舊版設定移轉至使用者資料目錄。');
        }
        return legacyConfig;
      } catch (error) {
        console.error('移轉舊版設定失敗，將使用預設值。', error);
      }
    }

    const config = { ...normalizedDefaults };
    save(config);
    return config;
  }

  return {
    configPath,
    initialize,
    load,
    save
  };
}

module.exports = {
  CURRENT_GROQ_MODEL,
  DEFAULT_SETTINGS,
  normalizeConfig,
  createConfigStore
};
