// App local em localhost:3000 e Chrome de teste em --remote-debugging-port=9224:
// node scripts/verify-game-hint-responsive.mjs (sem dependências extras).
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
    if (runtimeErrors.length) throw new Error(JSON.stringify(runtimeErrors));
    if (await evaluate(`Boolean(${expression})`)) return;
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
async function resizeCorner(corner, dx, dy, touch = false) {
  const handle = await rect(`.game-hint__resize-handle[data-corner="${corner}"]`);
  const start = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
  if (touch) {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + dx, y: start.y + dy, id: 1 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...start, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: start.x + dx, y: start.y + dy, button: 'left', buttons: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: start.x + dx, y: start.y + dy, button: 'left', clickCount: 1 });
  }
  await pause();
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

const sizes = [[320,568],[360,640],[375,667],[390,844],[412,915],[430,932],[568,320],[667,375],[844,390]];
let checks = 0;
async function audit(context) {
  await evaluate('document.fonts.ready.then(() => true)');
  const failures = await evaluate(`(() => {
    const card = document.querySelector('.game-hint:not([hidden])');
    if (!card) return ['missing card'];
    const errors = [];
    const bounds = card.getBoundingClientRect();
    if (bounds.left < -1 || bounds.top < -1 || bounds.right > innerWidth + 1 || bounds.bottom > innerHeight + 1) errors.push('card outside viewport');
    for (const element of card.querySelectorAll('.game-hint__panel, .game-hint__content, .game-hint__body, .game-hint__footer, h2, p, nav, button, .dijkstra-fixed-map__comparison, .dijkstra-fixed-map__completion-actions')) {
      if (element.matches('.game-hint__drag-handle, .game-hint__resize-handle')) continue;
      const r = element.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.left < bounds.left - 1 || r.right > bounds.right + 1 || element.scrollWidth > element.clientWidth + 1) errors.push(element.className + ': horizontal overflow ' + element.scrollWidth + '/' + element.clientWidth);
      if (element.matches('.game-hint__footer') && (r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1 || r.height < 20)) errors.push('footer outside card or inaccessible');
    }
    const body = card.querySelector('.game-hint__body');
    const br = body.getBoundingClientRect();
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const range = document.createRange(); range.selectNodeContents(walker.currentNode);
      const parent = walker.currentNode.parentElement.closest('p, h2') || body;
      const pr = parent.getBoundingClientRect();
      for (const r of range.getClientRects()) if (r.left < Math.max(br.left, pr.left) - 1 || r.right > Math.min(br.right, pr.right) + 1) errors.push('text outside paragraph: ' + walker.currentNode.textContent);
    }
    return errors;
  })()`);
  assert.deepEqual(failures, [], context);
  checks++;
}
async function advance() {
  await evaluate("document.querySelector('.game-hint__arrow:not(.game-hint__arrow--back)').click()");
  await pause(25);
}
try {
  await send('Runtime.enable');
  for (const [width,height] of sizes) {
    await viewport(width,height,true);
    await send('Page.navigate',{url:baseUrl});
    await waitFor("document.querySelector('.start-screen button') && Object.keys(document.querySelector('.start-screen button')).some(key => key.startsWith('__reactProps'))");
    await clickText('Tutorial');
    await waitFor("document.querySelector('.tutorial-screen .game-hint')");
    for (let step=0;step<30;step++) {
      await audit(width+'x'+height+' initial tutorial '+step);
      if (await evaluate("!!document.querySelector('.game-hint__actions')")) break;
      await advance();
    }
    await evaluate("document.querySelector('.game-hint__actions button:last-child').click()");
    await waitFor("document.querySelector('.dev-panel')");
    if (!await evaluate("!!document.querySelector('.dev-panel select')")) await click('.dev-panel__toggle');
    await evaluate(`(() => {const s=document.querySelector('.dev-panel select');s.value='9';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor("document.querySelector('.game-hint__dijkstra-toggle')");
    await click('.game-hint__toggle');
    await audit(width+'x'+height+' phase hint');
    await click('.game-hint__dijkstra-toggle');
    await waitFor("document.querySelector('.dijkstra-fixed-map')");
    for (let step=0;step<25;step++) {
      await audit(width+'x'+height+' Dijkstra '+(step+1));
      if(step<24) await advance();
    }
    await screenshot('responsive-'+width+'x'+height);
    await evaluate(`(() => {
      const b=document.querySelector('.game-hint__body');
      const p=document.createElement('p');p.className='dijkstra-fixed-map__formula';
      p.append('123456789 < ');const infinity=document.createElement('span');infinity.className='dijkstra-fixed-map__infinity';infinity.textContent=String.fromCharCode(8734);p.append(infinity);b.append(p);
      const long=document.createElement('p');long.textContent='PalavraMuitoLongaSemEspacos'.repeat(30);b.append(long);
      const img=document.createElement('img');img.src='/assets/game/ui/icon-hint.png';img.width=1254;img.height=1254;b.append(img);
      const footer=document.querySelector('.game-hint__footer');const button=document.createElement('button');button.textContent='Um texto longo para conferir o ajuste dos botoes no componente reutilizado';footer.append(button);
    })()`);
    await pause();
    await audit(width+'x'+height+' long content and infinity');
    await screenshot('responsive-stress-'+width+'x'+height);
    const beforeResize = await rect();
    await resizeCorner('bottom-right',-1000,-20,true);
    assert.ok((await rect()).width < beforeResize.width, 'Touch must shrink the card');
    await audit(width+'x'+height+' resized');
    await viewport(height,width,true);
    await audit(width+'x'+height+' rotated after resize');
    console.log(width+'x'+height+': tutorials, phase hint, infinity, buttons, resize and rotation OK');
  }
  assert.deepEqual(runtimeErrors,[]);
  console.log(checks+' responsive checks passed.');
} finally {
  socket.close();
  await fetch(browserUrl+'/json/close/'+target.id);
}
