import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
export { launchBrowser, openPage } from './chromium.mjs';

export async function launchServer(logDirectory) {
  if (process.env.VISUAL_BASE_URL) return { url: process.env.VISUAL_BASE_URL, close() {} };
  const port = process.env.VISUAL_PORT ?? '3107';
  const url = `http://127.0.0.1:${port}`;
  const occupied = await fetch(url, { signal: AbortSignal.timeout(1000) }).then(() => true, () => false);
  if (occupied) throw new Error(`Porta ${port} já está em uso. Defina VISUAL_PORT ou VISUAL_BASE_URL explicitamente.`);
  await mkdir(logDirectory, { recursive: true });
  const buildRoot = path.resolve('.next-visual');
  await mkdir(buildRoot, { recursive: true });
  const buildDirectory = await mkdtemp(path.join(buildRoot, 'run-'));
  let logs = '';
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', port],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_DIST_DIR: path.relative(process.cwd(), buildDirectory) } });
  child.stdout.on('data', data => { logs += data; });
  child.stderr.on('data', data => { logs += data; });
  let launchError;
  child.on('error', error => { launchError = error; });
  const close = async () => {
    if (child.exitCode === null) {
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      else child.kill();
    }
    await writeFile(path.join(logDirectory, 'server.log'), logs);
    if (path.dirname(path.resolve(buildDirectory)) !== buildRoot || !path.basename(buildDirectory).startsWith('run-')) {
      throw new Error('Diretório de compilação fora da área de teste.');
    }
    await rm(buildDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (launchError || child.exitCode !== null) { await close(); throw launchError ?? new Error(logs); }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        const credits = await fetch(`${url}/creditos`, { signal: AbortSignal.timeout(3000) });
        if (credits.ok) return { url, close };
      }
    } catch { /* Wait for Next.js compilation. */ }
    await delay(250);
  }
  await close();
  throw new Error(`Servidor não iniciou: ${logs.slice(-2000)}`);
}
