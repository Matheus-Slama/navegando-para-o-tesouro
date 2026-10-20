import { spawn } from 'node:child_process';

// Run the full device matrix on both engines. Diagnostic filters are not forwarded.
let failed = false;
for (const engine of ['firefox', 'webkit']) {
  console.log(`\nCompatibilidade: ${engine}`);
  const child = spawn(process.execPath, ['scripts/verify-visual.mjs', `--engine=${engine}`], {
    stdio: 'inherit', windowsHide: true,
  });
  const status = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => resolve(code));
  });
  if (status !== 0) failed = true;
}
if (failed) process.exitCode = 1;
