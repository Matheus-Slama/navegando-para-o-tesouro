import { chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

chmodSync('.githooks/pre-push', 0o755);
const result = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('Hook pre-push instalado.');
