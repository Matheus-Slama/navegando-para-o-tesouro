import { spawnSync } from 'node:child_process';

const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8', windowsHide: true });
if (status.error) throw status.error;
if (status.status !== 0) process.exit(status.status ?? 1);
if (status.stdout.trim()) {
  console.error('Push bloqueado: há alterações sem commit. Commite primeiro para testar exatamente o código que será enviado.');
  process.exit(1);
}

// Always run the full matrix; a partial developer run cannot authorize a push.
for (const [label, args] of [
  ['Lint', ['node_modules/eslint/bin/eslint.js', '.']],
  ['Regras do jogo', ['scripts/verify-all.mjs']],
  ['Build de produção', ['node_modules/next/dist/bin/next', 'build']],
  ['Regressão visual completa', ['scripts/verify-visual.mjs']]
]) {
  console.log(`\n=== ${label} ===`);
  const environment = { ...process.env, NEXT_DIST_DIR: '.next-visual-build', NEXT_TELEMETRY_DISABLED: '1' };
  delete environment.VISUAL_BASE_URL;
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', windowsHide: true,
    env: environment });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`Push bloqueado: ${label} falhou. Corrija e execute novamente.`);
    process.exit(result.status ?? 1);
  }
}
const after = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8', windowsHide: true });
if (after.error) throw after.error;
if (after.status !== 0 || after.stdout.trim()) {
  console.error('Push bloqueado: arquivos do projeto mudaram durante os testes. Revise e commite antes de tentar novamente.');
  process.exit(1);
}
console.log('\nVerificações aprovadas. Push liberado.');
