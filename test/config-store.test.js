const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  CURRENT_GROQ_MODEL,
  createConfigStore,
  normalizeConfig
} = require('../src/config-store');

test('normalizeConfig replaces deprecated Groq models', () => {
  assert.equal(
    normalizeConfig({ groqModel: 'mixtral-8x7b-32768' }).groqModel,
    CURRENT_GROQ_MODEL
  );
});

test('config store migrates a legacy config without exposing its contents', (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'notype-config-test-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const legacyConfigPath = path.join(tempRoot, 'legacy', 'config.json');
  const configPath = path.join(tempRoot, 'user-data', 'config.json');
  fs.mkdirSync(path.dirname(legacyConfigPath), { recursive: true });
  fs.writeFileSync(
    legacyConfigPath,
    JSON.stringify({ groqApiKey: 'test-secret', groqModel: 'llama-3.1-8b-instant' }),
    'utf8'
  );

  const store = createConfigStore({ configPath, legacyConfigPath });
  const config = store.initialize();

  assert.equal(config.groqApiKey, 'test-secret');
  assert.equal(config.groqModel, CURRENT_GROQ_MODEL);
  assert.equal(store.load().groqModel, CURRENT_GROQ_MODEL);
  assert.equal(fs.existsSync(configPath), true);
});
