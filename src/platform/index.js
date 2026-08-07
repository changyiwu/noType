function getPlatformAdapter(platform = process.platform) {
  if (platform === 'win32') {
    return require('./windows');
  }

  if (platform === 'darwin') {
    return require('./macos');
  }

  return {
    async pasteText() {
      throw new Error(`尚未支援此作業系統：${platform}`);
    }
  };
}

module.exports = {
  getPlatformAdapter
};
