import { spawn, spawnSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export async function launchBrowser() {
  const candidates = [process.env.VISUAL_BROWSER_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  let executable;
  for (const candidate of candidates) {
    try { await access(candidate); executable = candidate; break; } catch { /* Try the next installed browser. */ }
  }
  if (!executable) throw new Error('Chrome/Edge não encontrado. Defina VISUAL_BROWSER_PATH para o executável.');
  const profile = await mkdtemp(path.join(tmpdir(), 'tesouro-visual-'));
  const child = spawn(executable, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--mute-audio',
    '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let launchError;
  child.on('error', error => { launchError = error; });
  let port;
  for (let attempt = 0; attempt < 200; attempt++) {
    if (launchError) throw launchError;
    try { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch { await delay(100); }
  }
  if (!port) { child.kill(); throw new Error('O navegador não iniciou em 20 segundos.'); }
  const endpoint = `http://127.0.0.1:${port}`;
  const version = await (await fetch(`${endpoint}/json/version`)).json();
  let closed = false;
  return { endpoint, version: version.Browser, async close() {
    if (closed) return;
    closed = true;
    try {
      const socket = new WebSocket(version.webSocketDebuggerUrl);
      await new Promise(resolve => { socket.onopen = resolve; socket.onerror = resolve; });
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
      socket.close();
    } finally {
      await delay(300);
      if (child.exitCode === null) child.kill();
      const resolvedProfile = path.resolve(profile);
      if (path.dirname(resolvedProfile) !== path.resolve(tmpdir()) || !path.basename(resolvedProfile).startsWith('tesouro-visual-')) {
        throw new Error('Diretório temporário do navegador fora da área esperada.');
      }
      await rm(resolvedProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
    }
  } };
}

export async function launchServer(logDirectory) {
  if (process.env.VISUAL_BASE_URL) return { url: process.env.VISUAL_BASE_URL, close() {} };
  const port = process.env.VISUAL_PORT ?? '3107';
  const url = `http://127.0.0.1:${port}`;
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

export async function openPage(endpoint) {
  const target = await (await fetch(`${endpoint}/json/new?about:blank`, { method: 'PUT' })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  const responses = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description ?? ''));
    // Chrome requests an optional /favicon.ico even when the game has no favicon.
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400
      && !message.params.response.url.endsWith('/favicon.ico')) responses.push(message.params.response.url);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(new Error(JSON.stringify(message.error))); else request.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout CDP: ${method}`)); }, 30000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    return response.result.value;
  };
  const waitFor = async (expression, timeout = 20000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (errors.length) throw new Error(errors.join('\n'));
      if (await evaluate(`Boolean(${expression})`)) return;
      await delay(75);
    }
    throw new Error(`Elemento/estado não encontrado: ${expression}`);
  };
  const click = async selector => {
    await waitFor(`document.querySelector(${JSON.stringify(selector)})`);
    const point = await evaluate(`(() => {
      const e = document.querySelector(${JSON.stringify(selector)});
      e.scrollIntoView({block:'nearest',inline:'nearest'});
      const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
      const hit=document.elementFromPoint(x,y);
      if(e.disabled||!hit||!(e===hit||e.contains(hit))) throw Error('Botão coberto ou indisponível: '+${JSON.stringify(selector)});
      return {x,y};
    })()`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
    await delay(90);
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  return { send, evaluate, waitFor, click, errors, responses, async close() {
    for (const request of pending.values()) clearTimeout(request.timer);
    socket.close(); await fetch(`${endpoint}/json/close/${target.id}`);
  } };
}
