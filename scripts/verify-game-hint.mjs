// Com o app em localhost:3000 e um Chrome de teste em --remote-debugging-port=9224:
// node scripts/verify-game-hint.mjs (sem dependências extras).
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.GAME_HINT_URL ?? 'http://localhost:3000';
const browserUrl = process.env.GAME_HINT_CDP ?? 'http://127.0.0.1:9224';
const target = await (await fetch(`${browserUrl}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const runtimeErrors = [];
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails);
  if (!message.id) return;
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
const pause = (ms = 120) => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression) {
  for (let i = 0; i < 120; i++) {
    if (await evaluate(expression)) return;
    await pause();
  }
  throw new Error(`Condição não atingida: ${expression}`);
}
const rect = (selector = '.game-hint') => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; })()`);
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); await pause(); }
async function clickText(text) {
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}).click()`);
  await pause();
}
async function dragTo(x, y, touch = false) {
  const r = await rect('.game-hint__drag-handle[data-edge="top"]');
  const start = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  if (touch) {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...start, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  await pause();
}
async function assertInside() {
  const card = await rect(), bounds = await rect('.game-hint-layer');
  assert.ok(card.x >= bounds.x - 1 && card.y >= bounds.y - 1 && card.right <= bounds.right + 1 && card.bottom <= bounds.bottom + 1,
    `Card fora dos limites: ${JSON.stringify({ card, bounds })}`);
}
async function viewport(width, height, mobile = false) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  await pause(400);
}
async function screenshot(name) {
  const result = await send('Page.captureScreenshot');
  await mkdir('.next/game-hint-checks', { recursive: true });
  await writeFile(`.next/game-hint-checks/${name}.png`, Buffer.from(result.data, 'base64'));
}

try {
  await send('Runtime.enable');
  await viewport(1280, 800);
  await send('Page.navigate', { url: baseUrl });
  await waitFor(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Tutorial Dijkstra')`);
  await clickText('Tutorial Dijkstra');
  await waitFor(`!!document.querySelector('.game-hint__title')`);
  await assertInside();
  await click('.dijkstra-fixed-map__arrow:not(.dijkstra-fixed-map__arrow--back)');
  assert.equal(await evaluate(`document.querySelector('.game-hint__title').textContent`), 'Anote os custos');
  const before = await rect();
  await dragTo(before.x - 100, before.y + 140);
  const moved = await rect();
  assert.ok(Math.abs(before.x - moved.x) > 20 || Math.abs(before.y - moved.y) > 20, 'O mouse deve mover a dica.');
  await click('.dijkstra-fixed-map__arrow:not(.dijkstra-fixed-map__arrow--back)');
  assert.equal((await rect()).x, moved.x, 'Mudar a etapa mantém a posição escolhida.');
  await evaluate(`document.querySelector('.game-hint__drag-handle').focus()`);
  const counter = await evaluate(`document.querySelector('.dijkstra-fixed-map__navigation > span').textContent`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await pause();
  assert.ok((await rect()).x > moved.x, 'As setas movem a dica quando a borda tem foco.');
  assert.equal(await evaluate(`document.querySelector('.dijkstra-fixed-map__navigation > span').textContent`), counter, 'Arraste por teclado não avança o tutorial.');
  await click('.game-hint__toggle');
  assert.equal(await evaluate(`document.querySelector('.game-hint').dataset.minimized`), 'true');
  assert.ok((await rect()).width <= 80);
  assert.equal(await evaluate(`document.querySelector('.game-hint__content').hidden`), true);
  await dragTo(2000, 1500);
  await assertInside();
  await click('.game-hint__toggle');
  await assertInside();
  await screenshot('desktop');
  console.log('Desktop: conteúdo dinâmico, arraste, teclado, limites e minimizar/restaurar OK.');

  await viewport(390, 844, true);
  await waitFor(`document.querySelector('.dijkstra-fixed-map')?.dataset.layout === 'mobile'`);
  await assertInside();
  const touchBefore = await rect();
  await dragTo(100, 420, true);
  assert.notEqual((await rect()).y, touchBefore.y, 'O toque deve mover a dica.');
  await assertInside();
  await screenshot('mobile');
  await viewport(844, 390, true);
  await assertInside();
  // Conteúdo longo e imagens permanecem dentro da moldura, com rolagem interna.
  await evaluate(`document.querySelector('.game-hint__body').append(document.createTextNode(' Dica longa.'.repeat(500)))`);
  await pause();
  await assertInside();
  assert.ok(await evaluate(`(() => { const b=document.querySelector('.game-hint__body'); return b.scrollHeight > b.clientHeight; })()`));
  await screenshot('landscape-scroll');
  console.log('Toque, rotação e rolagem interna em tela baixa OK.');

  await click('.dijkstra-fixed-map__exit');
  await clickText('Tutorial');
  await waitFor(`!!document.querySelector('.tutorial-screen .game-hint')`);
  const firstTitle = await evaluate(`document.querySelector('.game-hint__title').textContent`);
  await clickText('Próximo');
  assert.notEqual(await evaluate(`document.querySelector('.game-hint__title').textContent`), firstTitle);
  while (await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Próximo')`)) await clickText('Próximo');
  await clickText('Começar fase 1');
  await waitFor(`document.querySelector('.game-hint')?.dataset.minimized === 'true'`);
  await click('.game-hint__toggle');
  const firstHint = await evaluate(`document.querySelector('.game-hint__body').textContent`);
  await clickText('Outra dica');
  assert.notEqual(await evaluate(`document.querySelector('.game-hint__body').textContent`), firstHint);
  await clickText('Entendi');
  assert.equal(await evaluate(`document.querySelector('.game-hint').dataset.minimized`), 'true');
  assert.deepEqual(runtimeErrors, []);
  console.log('Tutorial inicial e dicas das fases: abertura controlada, ações e navegação OK.');
} finally {
  socket.close();
  await fetch(`${browserUrl}/json/close/${target.id}`);
}
