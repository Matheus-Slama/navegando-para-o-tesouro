// Com o app em localhost:3000 e um Chrome de teste em --remote-debugging-port=9226:
// node scripts/verify-game-pause.mjs (sem dependências extras).
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';


const baseUrl = process.env.GAME_PAUSE_URL ?? 'http://localhost:3000';
const browserUrl = process.env.GAME_PAUSE_CDP ?? 'http://127.0.0.1:9226';
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
    if (runtimeErrors.length) throw new Error(JSON.stringify(runtimeErrors));
    if (await evaluate(`Boolean(${expression})`)) return;
    await pause();
  }
  throw new Error(`Condição não atingida: ${expression}`);
}

const escape = () => send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
const resume = async () => {
  await evaluate("document.querySelector('.pause-game button').click()");
  await waitFor("!document.querySelector('.pause-game')");
};
try {
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: baseUrl });
  await waitFor("document.querySelector('.start-screen button')");
  await pause(2000);
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent === 'Iniciar jornada').click()");
  await waitFor("document.querySelector('.game-hud__time')");
  await pause(1200);
  await escape();
  await waitFor("document.querySelector('.pause-game[open]')");
  const time = await evaluate("document.querySelector('.game-hud__time').textContent");
  await pause(1400);
  assert.equal(await evaluate("document.querySelector('.game-hud__time').textContent"), time);
  assert.ok(await evaluate("document.activeElement === document.querySelector('.pause-game button')"));
  assert.ok(await evaluate("(() => { const r = document.querySelector('.pause-game').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; })()"));
  const screenshot = await send('Page.captureScreenshot');
  await writeFile('.next/game-pause-mobile.png', Buffer.from(screenshot.data, 'base64'));
  await escape();
  assert.ok(await evaluate("!!document.querySelector('.pause-game[open]')"));
  await resume();
  await pause(1200);
  assert.notEqual(await evaluate("document.querySelector('.game-hud__time').textContent"), time);
  console.log('Esc, foco, modal mobile e cronometro verificados.');

  const other = await (await fetch(browserUrl + '/json/new?about:blank', { method: 'PUT' })).json();
  await fetch(browserUrl + '/json/activate/' + other.id);
  await pause(400);
  await fetch(browserUrl + '/json/activate/' + target.id);
  await waitFor("document.querySelector('.pause-game[open]')");
  await resume();
  await fetch(browserUrl + '/json/close/' + other.id);
  console.log('Troca de aba pausa o jogo e exige retorno pelo botao.');

  await evaluate("document.querySelector('.boat-dock__boat').click()");
  await waitFor("document.querySelector('.animated-boat')");
  await pause(400);
  await escape();
  await waitFor("document.querySelector('.pause-game[open]')");
  await pause(100);
  const positions = await evaluate("[...document.querySelectorAll('.animated-boat')].map(b => [getComputedStyle(b).left, getComputedStyle(b).top])");
  await pause(6800);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.animated-boat')].map(b => [getComputedStyle(b).left, getComputedStyle(b).top])"), positions);
  assert.equal(await evaluate("!!document.querySelector('.race-result--victory, .race-result--defeat')"), false);
  await resume();
  await waitFor("document.querySelector('.race-result--victory, .race-result--defeat')");
  assert.equal(runtimeErrors.length, 0, JSON.stringify(runtimeErrors));
  console.log('Barcos congelam durante a pausa e concluem a corrida apos retomar.');
} finally {
  socket.close();
  await fetch(browserUrl + '/json/close/' + target.id);
}
