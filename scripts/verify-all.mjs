import { spawnSync } from 'node:child_process';

for (const name of ['maps', 'highscore', 'device-config', 'dijkstra-walkthrough', 'dijkstra-selection']) {
  console.log(`\nVerificando ${name}...`);
  const result = spawnSync(process.execPath, [`scripts/verify-${name}.mjs`], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
