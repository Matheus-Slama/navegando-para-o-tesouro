// Chrome de teste separado em --remote-debugging-port=9227.
// node scripts/verify-responsive.mjs; GAME_RESPONSIVE_URL permite testar localmente.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';


const baseUrl = process.env.GAME_RESPONSIVE_URL ?? 'https://matheus-slama.github.io/navegando-para-o-tesouro/';
const browserUrl = process.env.GAME_RESPONSIVE_CDP ?? 'http://127.0.0.1:9227';
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


const results = [];
async function touch(selector) {
  const p = await evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{...p,id:1}]});
  await send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
  await pause(200);
}
async function audit(screen,w,h) {
  await pause(250);
  const data=await evaluate(`(() => {
    const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[inert]')};
    const scope=document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')||document;
    const controls=[...scope.querySelectorAll('button,a')].filter(visible).map(e=>{const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {label:e.getAttribute('aria-label')||e.textContent.trim(),x:r.x,y:r.y,w:r.width,h:r.height,disabled:e.disabled,reachable:!!hit&&(e===hit||e.contains(hit)),outside:r.x < -1||r.y < -1||r.right>innerWidth+1||r.bottom>innerHeight+1}});
    return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,controls,brokenImages:[...document.images].filter(e=>visible(e)&&e.complete&&!e.naturalWidth).map(e=>e.src)};
  })()`);
  results.push({screen,w,h,...data});
  const shot=await send('Page.captureScreenshot');
  await writeFile('.next/responsive-'+w+'x'+h+'-'+screen+'.png',Buffer.from(shot.data,'base64'));
}
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setTouchEmulationEnabled',{enabled:true});
  for (const [w,h] of [[320,568],[360,640],[375,667],[390,844],[412,915],[568,320],[667,375],[844,390],[768,1024],[1366,768]]) {
    await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});
    await send('Page.navigate',{url:baseUrl});
    await waitFor("document.querySelector('.start-screen button')"); await pause(1000);
    await audit('menu',w,h);
    await touch('.start-screen__content button');
    await waitFor("document.querySelector('.tutorial-screen')");
    await audit('tutorial',w,h);
    for(let i=0;i<20;i++) {
      if(await evaluate("!!document.querySelector('.game-hint__actions')"))break;
      await touch('.game-hint__navigation button:last-child');
    }
    await audit('tutorial-final',w,h);
    await touch('.game-hint__actions button:last-child');
    await waitFor("document.querySelector('.boat-dock__boat') && !document.querySelector('.tutorial-screen')");
    await audit('game',w,h);
    await touch('.game-hint__pause');
    await waitFor("document.querySelector('.pause-game[open]')");
    await audit('pause',w,h);
    await touch('.pause-game button');
    await waitFor("!document.querySelector('.pause-game')");
    if(w===390) {
      for(const [width,height] of [[844,390],[390,664],[390,844]]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
        await audit('rotation',width,height);
      }
      await touch('.boat-dock__boat');
      await waitFor("document.querySelector('.animated-boat')");
      await audit('race',w,h);
      await waitFor("document.querySelector('.race-result--victory, .race-result--defeat')");
      await audit('result',w,h);
    }
    console.log(w+'x'+h+' checked');
  }
  await writeFile('.next/responsive-report.json',JSON.stringify({results,runtimeErrors},null,2));
  const issues=results.flatMap(r=>r.controls.filter(c=>!c.disabled&&(c.outside||!c.reachable)).map(c=>({screen:r.screen,viewport:r.w+'x'+r.h,...c})));
  console.log(JSON.stringify({screens:results.length,runtimeErrors,overflow:results.filter(r=>r.overflow).map(r=>[r.screen,r.w,r.h]),issues,brokenImages:results.filter(r=>r.brokenImages.length)},null,2));
  assert.equal(issues.length,0,'Controle cortado ou coberto');
  assert.ok(results.every(r=>!r.overflow && !r.brokenImages.length),'Overflow ou imagem indisponivel');
  assert.equal(runtimeErrors.length,0,'Erro JavaScript');
} finally {socket.close();await fetch(browserUrl+'/json/close/'+target.id);}
