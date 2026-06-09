const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const candidates = [
  path.resolve(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js'),
  path.resolve(__dirname, '..', '..', 'node_modules', 'vite', 'bin', 'vite.js'),
];

const viteBin = candidates.find((candidate) => fs.existsSync(candidate));

if (!viteBin) {
  console.error('Unable to find Vite. Run npm install before building.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [viteBin, 'build'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
});

process.exit(result.status || 0);
