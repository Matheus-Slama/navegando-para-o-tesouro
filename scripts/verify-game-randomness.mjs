import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const baseUrl = process.env.GAME_RANDOMNESS_URL ?? 'http://localhost:3000';
const browserUrl = process.env.GAME_RANDOMNESS_CDP ?? 'http://127.0.0.1:9237';
const target = await (await fetch(`${browserUrl}/json/new?about:blank`, { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const errors = [];
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  clearTimeout(request.timeout);
  if (message.error) request.reject(new Error(JSON.stringify(message.error)));
  else request.resolve(message.result);
};
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    assert.equal(errors.length, 0, JSON.stringify(errors));
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timeout: ${expression}`);
}
async function click(label) {
  await waitFor(`[...document.querySelectorAll('button')].some(button => button.textContent === ${JSON.stringify(label)})`);
  await waitFor(`[...document.querySelectorAll('button')].some(button => button.textContent === ${JSON.stringify(label)} && Object.keys(button).some(key => key.startsWith('__reactProps')))`);
  await evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent === ${JSON.stringify(label)}).click()`);
}
async function fingerprint() {
  await waitFor("document.querySelector('.map-graph__island')");
  return evaluate(`JSON.stringify({
    islands: [...document.querySelectorAll('.map-graph__island')].map(node => [node.style.left, node.style.top]).sort(),
    routes: [...document.querySelectorAll('.map-graph__routes polyline')].map(node => node.getAttribute('points')).sort()
  })`);
}
async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(new URL(`../.next/${name}.png`, import.meta.url), Buffer.from(result.data, 'base64'));
}
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.navigate', { url: baseUrl });
  await click('Iniciar jornada');
  const first = await fingerprint();
  await screenshot('graph-before-reload');
  await evaluate('new Promise(resolve => setTimeout(resolve, 1200))');
  assert.equal(await fingerprint(), first, 'O cronometro mudou o grafo durante a partida.');

  let reloaded = first;
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: viewport.width < 600 });
    const seen = new Set();
    for (let reload = 0; reload < 5; reload += 1) {
      await send('Page.reload');
      await click('Iniciar jornada');
      reloaded = await fingerprint();
      assert.ok(!seen.has(reloaded), `F5 repetiu o grafo em ${viewport.width}px.`);
      seen.add(reloaded);
      if (viewport.width === 1440 && reload === 0) await screenshot('graph-after-reload');
    }
    console.log(`${viewport.width}px: cinco recargas geraram grafos diferentes.`);
  }
  console.log('O cronometro preserva a partida atual.');

  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await click('Voltar ao menu');
  await click('Iniciar jornada');
  const restarted = await fingerprint();
  assert.notEqual(restarted, reloaded, 'Nova jornada repetiu o grafo.');
  console.log('Voltar ao menu e iniciar gera outro grafo.');

  await click('Modo dev');
  const winner = await evaluate("[...document.querySelectorAll('.dev-panel dl > div')].find(row => row.querySelector('dt').textContent === 'Vencedor').querySelector('dd').textContent");
  const colors = { 'Barco Vermelho': 'red', 'Barco Azul': 'blue', 'Barco Verde': 'green', 'Barco Preto': 'black' };
  await evaluate(`document.querySelector('.boat-dock__boat:not([data-boat="${colors[winner]}"])').click()`);
  await click('Tentar novamente');
  assert.notEqual(await fingerprint(), restarted, 'Tentar novamente repetiu o grafo.');
  console.log('Derrota e nova tentativa geram outras posicoes e conexoes.');

  const beforeVictory = await fingerprint();
  const nextWinner = await evaluate("[...document.querySelectorAll('.dev-panel dl > div')].find(row => row.querySelector('dt').textContent === 'Vencedor').querySelector('dd').textContent");
  await evaluate(`document.querySelector('.boat-dock__boat[data-boat="${colors[nextWinner]}"]').click()`);
  await click('Próxima fase');
  assert.notEqual(await fingerprint(), beforeVictory, 'Proxima fase repetiu o grafo.');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('Proxima fase gera outro grafo, sem erros de JavaScript.');
} finally {
  socket.close();
  await fetch(`${browserUrl}/json/close/${target.id}`);
}
