const { clipboard } = require('electron');
const { execFile } = require('child_process');

function runPasteShortcut() {
  return new Promise((resolve, reject) => {
    const script = "$wshell = New-Object -ComObject Wscript.Shell; $wshell.SendKeys('^v')";
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true },
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });
}

async function pasteText(text) {
  if (!text) {
    return;
  }

  clipboard.writeText(text);
  await new Promise((resolve) => setTimeout(resolve, 200));
  await runPasteShortcut();
}

module.exports = {
  pasteText
};
