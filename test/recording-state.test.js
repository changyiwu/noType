const assert = require('node:assert/strict');
const test = require('node:test');

const { RecordingState, STATES } = require('../src/recording-state');

test('recording state follows one start-stop-processing flow', () => {
  const recordingState = new RecordingState();

  assert.equal(recordingState.requestToggle(), 'start');
  assert.equal(recordingState.state, STATES.STARTING);
  assert.equal(recordingState.requestToggle(), 'ignore');

  recordingState.markStarted();
  assert.equal(recordingState.requestToggle(), 'stop');
  assert.equal(recordingState.state, STATES.STOPPING);

  recordingState.markProcessing();
  assert.equal(recordingState.requestToggle(), 'ignore');

  recordingState.reset();
  assert.equal(recordingState.state, STATES.IDLE);
});
