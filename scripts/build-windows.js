const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const packageJson = require(path.join(projectRoot, 'package.json'));
const temporaryOutput = fs.mkdtempSync(path.join(os.tmpdir(), 'notype-build-'));
const releaseOutput = path.join(projectRoot, 'dist', `v${packageJson.version}`);
const builderCli = path.join(
  projectRoot,
  'node_modules',
  'electron-builder',
  'out',
  'cli',
  'cli.js'
);

function removeTemporaryOutput() {
  const resolvedTempRoot = path.resolve(os.tmpdir()) + path.sep;
  const resolvedOutput = path.resolve(temporaryOutput);
  if (!resolvedOutput.startsWith(resolvedTempRoot) || !path.basename(resolvedOutput).startsWith('notype-build-')) {
    throw new Error(`拒絕清除非預期的暫存路徑：${resolvedOutput}`);
  }
  fs.rmSync(resolvedOutput, { recursive: true, force: true });
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readPeMachine(filePath) {
  const buffer = fs.readFileSync(filePath);
  const peOffset = buffer.readUInt32LE(0x3c);
  return buffer.readUInt16LE(peOffset + 4);
}

try {
  const result = spawnSync(
    process.execPath,
    [
      builderCli,
      '--win',
      'nsis',
      'portable',
      '--x64',
      '--publish',
      'never',
      `--config.directories.output=${temporaryOutput}`
    ],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit'
    }
  );

  if (result.status !== 0) {
    process.exitCode = result.status || 1;
  } else {
    const payloadExecutable = path.join(temporaryOutput, 'win-unpacked', 'noType.exe');
    const payloadMachine = readPeMachine(payloadExecutable);
    if (payloadMachine !== 0x8664) {
      throw new Error(`內部 noType.exe 並非預期的 x64 PE（Machine=0x${payloadMachine.toString(16)}）。`);
    }

    const artifactNames = fs.readdirSync(temporaryOutput).filter((name) => {
      const filePath = path.join(temporaryOutput, name);
      return fs.statSync(filePath).isFile() && /\.(exe|blockmap|yml)$/i.test(name);
    });
    const executableNames = artifactNames.filter((name) => name.toLowerCase().endsWith('.exe'));

    if (executableNames.length < 2) {
      throw new Error('打包完成但未同時找到 NSIS 與 Portable 執行檔。');
    }

    fs.mkdirSync(releaseOutput, { recursive: true });
    for (const artifactName of artifactNames) {
      fs.copyFileSync(
        path.join(temporaryOutput, artifactName),
        path.join(releaseOutput, artifactName)
      );
    }

    const checksumLines = executableNames
      .sort()
      .map((name) => `${sha256(path.join(releaseOutput, name))}  ${name}`);
    fs.writeFileSync(
      path.join(releaseOutput, 'SHA256SUMS.txt'),
      `${checksumLines.join('\n')}\n`,
      'utf8'
    );
    fs.writeFileSync(
      path.join(releaseOutput, 'BUILD-MANIFEST.json'),
      `${JSON.stringify({
        productName: packageJson.build.productName,
        version: packageJson.version,
        platform: 'win32',
        appArchitecture: 'x64',
        payloadPeMachine: '0x8664',
        artifacts: executableNames.sort()
      }, null, 2)}\n`,
      'utf8'
    );

    console.log(`Windows x64 產物已複製至：${releaseOutput}`);
  }
} finally {
  removeTemporaryOutput();
}
