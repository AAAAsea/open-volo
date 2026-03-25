import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, 'electron', 'resources', 'fn-monitor.swift');
const outputPath = path.join(rootDir, 'electron', 'resources', 'fn-monitor');

if (process.platform !== 'darwin') {
  console.log('[build-fn-listener] Skipped: macOS only.');
  process.exit(0);
}

if (!fs.existsSync(sourcePath)) {
  console.error(`[build-fn-listener] Missing source: ${sourcePath}`);
  process.exit(1);
}

const result = spawnSync('xcrun', ['swiftc', sourcePath, '-O', '-o', outputPath], {
  cwd: rootDir,
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

fs.chmodSync(outputPath, 0o755);
console.log(`[build-fn-listener] Built ${outputPath}`);
