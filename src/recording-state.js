const STATES = Object.freeze({
  IDLE: 'idle',
  STARTING: 'starting',
  RECORDING: 'recording',
  STOPPING: 'stopping',
  PROCESSING: 'processing'
});

class RecordingState {
  constructor() {
    this.state = STATES.IDLE;
  }

  requestToggle() {
    if (this.state === STATES.IDLE) {
      this.state = STATES.STARTING;
      return 'start';
    }

    if (this.state === STATES.RECORDING) {
      this.state = STATES.STOPPING;
      return 'stop';
    }

    return 'ignore';
  }

  markStarted() {
    if (this.state === STATES.STARTING) {
      this.state = STATES.RECORDING;
    }
  }

  markProcessing() {
    this.state = STATES.PROCESSING;
  }

  reset() {
    this.state = STATES.IDLE;
  }
}

module.exports = {
  RecordingState,
  STATES
};
