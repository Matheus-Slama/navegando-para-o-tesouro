import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, copyFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { launchBrowser, launchServer, openPage } from './visual/browser.mjs';
import { auditLayout, compareImages } from './visual/audit.mjs';
import { verifyGuards } from './visual/guards.mjs';
import { writeReport } from './visual/report.mjs';
import { TUTORIAL_STEPS } from '../src/game/config/tutorial.js';

const update = process.argv.includes('--update');
assert.ok(typeof WebSocket === 'function', 'A regressão visual requer Node 22 ou superior (WebSocket nativo).');
const selection = process.argv.find(argument => argument.startsWith('--devices='))?.split('=')[1].split(',');
const workers = Number(process.argv.find(argument => argument.startsWith('--workers='))?.split('=')[1] ?? 2);
assert.ok(Number.isInteger(workers) && workers >= 1 && workers <= 3, 'Use entre 1 e 3 workers.');
const profiles = JSON.parse(await readFile('tests/visual/devices.json', 'utf8'));
if (selection) assert.ok(selection.every(id => profiles.some(profile => profile.id === id)), 'Dispositivo desconhecido');
const devices = profiles.filter(profile => !selection || selection.includes(profile.id));
const root = path.resolve('tests/visual');
const output = path.join(root, 'results');
const baseline = path.join(root, 'baselines');
await mkdir(output, { recursive: true });
const report = { generatedAt: new Date().toISOString(), platform: process.platform, update, complete: !selection, devices, screenshots: [], errors: [] };
const server = await launchServer(output);
let browser;
const deviceBrowsers = new Set();
let cleaned = false;
async function cleanup() {
  if (cleaned) return;
  cleaned = true;
  try {
    await Promise.allSettled([...deviceBrowsers].map(item => item.close()));
    await browser?.close();
  } finally { await server.close(); }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  cleanup().finally(() => process.exit(signal === 'SIGINT' ? 130 : 143));
});

// Mask only values that depend on elapsed wall time. Their layout is still audited.
const captureCSS = `
  .dev-panel, nextjs-portal { visibility: hidden !important; }
  .victory-treasure__paper { animation: none !important; }
  html[data-visual-capture] *, html[data-visual-capture] *::before, html[data-visual-capture] *::after {
    transition: none !important; animation: none !important; caret-color: transparent !important;
  }
  html[data-visual-capture] .game-hud__time,
  html[data-visual-capture] .game-hud__score,
  html[data-visual-capture] .victory-treasure__score,
  html[data-visual-capture] .pause-game p,
  html[data-visual-capture] .race-result p:has(br) { visibility: hidden !important; }
`;

async function runDevice(device) {
  const deviceBrowser = await launchBrowser();
  deviceBrowsers.add(deviceBrowser);
  const page = await openPage(deviceBrowser.endpoint);
  const { send, evaluate, waitFor, click } = page;
  const directory = path.join(output, device.id);
  await mkdir(directory, { recursive: true });
  await rm(path.join(directory, 'ERRO.png'), { force: true });
  let currentScreen = 'carregamento';
  let captureOrder = 0;
  async function ready() {
    await evaluate(`(async()=>{
      await document.fonts.ready;
      await Promise.all([...document.images].filter(image=>!image.closest('[hidden]')).map(image=>image.decode().catch(()=>{})));
      if(!document.getElementById('visual-capture-css')) {const style=document.createElement('style');style.id='visual-capture-css';style.textContent=${JSON.stringify(captureCSS)};document.head.append(style);}
    })()`);
    await delay(100);
  }
  async function snapshot(name, { fullPage = false } = {}) {
    currentScreen = name;
    await ready();
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
    const audit = await evaluate(`(${auditLayout.toString()})()`);
    if (audit.width !== device.width || audit.height !== device.height) audit.issues.push(`Viewport incorreto: ${audit.width}x${audit.height}; esperado ${device.width}x${device.height}`);
    await evaluate("document.documentElement.dataset.visualCapture='true'");
    await delay(35);
    let clip;
    if (fullPage) {
      const { cssContentSize } = await send('Page.getLayoutMetrics');
      clip = { x: 0, y: 0, width: device.width, height: cssContentSize.height, scale: 1 };
    }
    const screenshot = await send('Page.captureScreenshot', { format: 'webp', quality: 95, captureBeyondViewport: fullPage, ...(clip ? { clip } : {}) });
    await evaluate("delete document.documentElement.dataset.visualCapture");
    const file = `${name}.webp`;
    await rm(path.join(directory, `${name}.diff.png`), { force: true });
    await writeFile(path.join(directory, file), Buffer.from(screenshot.data, 'base64'));
    const entry = { device: device.id, screen: name, file: `${device.id}/${file}`, order: captureOrder++, ...audit };
    if (!update) {
      let expected;
      try { expected = (await readFile(path.join(baseline, device.id, file))).toString('base64'); }
      catch { entry.issues.push('Referência visual ausente. Revise as capturas e execute test:visual:update.'); }
      if (expected) {
        const comparison = await evaluate(`(${compareImages.toString()})(${JSON.stringify(expected)},${JSON.stringify(screenshot.data)})`);
        entry.changedRatio = comparison.ratio;
        if (!comparison.dimensions || comparison.ratio > 0.002) {
          entry.issues.push(`Diferença visual: ${(comparison.ratio * 100).toFixed(3)}% (limite 0,2%)`);
          if (comparison.diff) await writeFile(path.join(directory, `${name}.diff.png`), Buffer.from(comparison.diff, 'base64'));
        }
      }
    }
    report.screenshots.push(entry);
    if (entry.issues.length) console.error(`  ${device.id}/${name}: ${entry.issues.join('; ')}`);
  }
  async function nextTutorial() {
    await click('.game-hint__navigation button:last-child');
  }
  async function winner() {
    await evaluate("document.querySelector('.dev-panel__toggle').click()");
    await waitFor("document.querySelector('.dev-panel__content')");
    const color = await evaluate(`(()=>{const rows=[...document.querySelectorAll('.dev-panel dl div')];return rows.find(row=>row.querySelector('dt').textContent==='Vencedor').querySelector('dd').textContent;})()`);
    await evaluate("document.querySelector('.dev-panel__toggle').click()");
    return { 'Barco Vermelho': 'red', 'Barco Azul': 'blue', 'Barco Verde': 'green', 'Barco Preto': 'black' }[color];
  }
  async function race(color, capture = false) {
    await click(`.boat-dock__boat[data-boat='${color}']`);
    await waitFor("document.querySelector('.animated-boat')");
    await evaluate("document.getAnimations().filter(a=>a.effect?.target?.classList.contains('animated-boat')).forEach(a=>{a.pause();a.currentTime=3000;})");
    if (capture) await snapshot('corrida');
    await evaluate("document.getAnimations().filter(a=>a.effect?.target?.classList.contains('animated-boat')).forEach(a=>a.finish())");
    await waitFor("document.querySelector('.race-result, .victory-treasure')");
  }
  async function selectPhase(index) {
    await evaluate("document.querySelector('.dev-panel__toggle').click()");
    await waitFor("document.querySelector('.dev-panel select')");
    await evaluate(`(()=>{const s=document.querySelector('.dev-panel select');s.value=${JSON.stringify(String(index))};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await delay(100);
    if (await evaluate("!!document.querySelector('.dijkstra-unlock')")) {
      await snapshot('dijkstra-desbloqueado');
      await click('.dijkstra-unlock button');
    }
    await evaluate("document.querySelector('.dev-panel__toggle').click()");
    await ready();
  }
  try {
    await send('Emulation.setDeviceMetricsOverride', { width: device.width, height: device.height, deviceScaleFactor: 1, mobile: device.mobile });
    await send('Emulation.setTouchEmulationEnabled', { enabled: device.mobile });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: 'try { localStorage.clear(); sessionStorage.clear(); } catch { /* Opaque origins have no storage. */ }' });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await send('Page.navigate', { url: server.url });
    await waitFor("document.querySelector('.start-screen__content button')");
    // Wait for hydration, not just server-rendered markup.
    await ready();
    await delay(500);
    await snapshot('menu');
    const mutedBefore = await evaluate("document.querySelector('.start-screen__music').getAttribute('aria-pressed')");
    await click('.start-screen__music');
    assert.notEqual(await evaluate("document.querySelector('.start-screen__music').getAttribute('aria-pressed')"), mutedBefore);
    await snapshot('menu-musica');
    await click('.start-screen__credits');
    await waitFor("document.querySelector('main article')");
    await snapshot('creditos', { fullPage: true });
    await click('main a[href="/"]');
    await waitFor("document.querySelector('.start-screen__content button')");
    await click('.start-screen__content button');
    await waitFor("document.querySelector('.tutorial-screen')");
    for (let step = 1; step <= TUTORIAL_STEPS.length; step++) {
      await snapshot(`tutorial-${String(step).padStart(2, '0')}`);
      if (step < TUTORIAL_STEPS.length) await nextTutorial();
    }
    await click('.game-hint__pause');
    await waitFor("document.querySelector('.pause-game')");
    await snapshot('tutorial-pausa');
    await click('.pause-game button');
    await click('.game-hint__actions button:last-child');
    await waitFor("document.querySelector('.game-board:not(.dijkstra-fixed-map)')");
    await snapshot('fase-01');
    await click('.game-hint__toggle');
    await snapshot('dica-aberta');
    await click('.game-hint__toggle');
    await click('.game-hint__route-control > button');
    await snapshot('estilos-arestas');
    await click('.game-hint__route-options button:last-child');
    await click('.game-hint__pause');
    await waitFor("document.querySelector('.pause-game')");
    const clock = await evaluate("document.querySelector('.game-hud__time').textContent");
    await snapshot('pausa');
    await delay(1050);
    assert.equal(await evaluate("document.querySelector('.game-hud__time').textContent"), clock, 'O relógio avançou durante a pausa');
    await click('.pause-game button');
    const best = await winner();
    await race(['red', 'blue', 'green', 'black'].find(color => color !== best), true);
    await snapshot('derrota');
    await click('.race-result button');
    await race(best);
    await snapshot('vitoria-fase');
    await click('.race-result button');
    // Navigation via existing development tools; no test routes or production backdoors.
    for (let phase = 2; phase <= 10; phase++) {
      await selectPhase(phase - 1);
      await snapshot(`fase-${String(phase).padStart(2, '0')}`);
    }
    await click('.game-hint__dijkstra-toggle');
    await waitFor("document.querySelector('.dijkstra-fixed-map')");
    for (let step = 1; step <= 25; step++) {
      await snapshot(`dijkstra-${String(step).padStart(2, '0')}`);
      if (step === 24) {
        for (const color of ['red', 'green', 'black']) {
          await click(`.dijkstra-fixed-map__comparison button[data-boat='${color}']`);
          await snapshot(`dijkstra-comparacao-${color}`);
        }
        await click(".dijkstra-fixed-map__comparison button[data-boat='blue']");
      }
      if (step < 25) await nextTutorial();
    }
    await click('.dijkstra-fixed-map__completion-actions button:last-child');
    await waitFor("document.querySelector('.game-board:not(.dijkstra-fixed-map)')");
    const finalBest = await winner();
    // Normal motion is kept to exercise the chest loading and animation lifecycle.
    await race(finalBest);
    await waitFor("document.querySelector('.victory-treasure--revealed')", 15000);
    await evaluate("document.querySelector('.victory-treasure').scrollTop=0");
    await snapshot('vitoria-tesouro');
    // A scrollable short dialog must still allow reaching every action.
    for (const selector of ['.victory-treasure__actions button:first-child', '.victory-treasure__actions button:last-of-type', '.victory-treasure__actions a']) {
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest'})`);
      assert.ok(await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===e||e.contains(h);})()`), 'Ação de vitória inacessível');
    }
    await evaluate("document.querySelector('.victory-treasure').scrollTop=document.querySelector('.victory-treasure').scrollHeight");
    await snapshot('vitoria-acoes');
    await click('.victory-treasure__actions button:last-of-type');
    await waitFor("document.querySelector('.start-screen')");
    await click('.start-screen__content button:last-of-type');
    for (let loss = 1; loss <= 3; loss++) {
      const currentBest = await winner();
      await race(['red', 'blue', 'green', 'black'].find(color => color !== currentBest));
      if (loss < 3) await click('.race-result button');
    }
    await snapshot('fim-da-jornada');
    assert.match(await evaluate("document.querySelector('.race-result h2').textContent"), /Fim da jornada/);
    if (page.errors.length || page.responses.length) throw new Error([...page.errors, ...page.responses].join('\n'));
    console.log(`${device.id}: ${report.screenshots.filter(entry => entry.device === device.id).length} telas verificadas`);
  } catch (error) {
    report.errors.push({ device: device.id, screen: currentScreen, message: error.stack });
    console.error(`${device.id}/${currentScreen}: ${error.message}`);
    const shot = await send('Page.captureScreenshot').catch(() => null);
    if (shot) await writeFile(path.join(directory, 'ERRO.png'), Buffer.from(shot.data, 'base64'));
  } finally {
    try { await page.close(); } finally { await deviceBrowser.close(); deviceBrowsers.delete(deviceBrowser); }
  }
}

try {
  browser = await launchBrowser(); report.browser = browser.version;
  await verifyGuards(browser.endpoint);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(workers, devices.length) }, async () => {
    while (cursor < devices.length) await runDevice(devices[cursor++]);
  }));
  report.screenshots.sort((a, b) => devices.findIndex(device => device.id === a.device) - devices.findIndex(device => device.id === b.device) || a.order - b.order);
  const failures = report.screenshots.filter(entry => entry.issues.length);
  report.passed = failures.length === 0 && report.errors.length === 0;
  if (update && report.passed) {
    const inventory = report.screenshots.map(entry => entry.file);
    let previous;
    if (selection) {
      previous = JSON.parse(await readFile(path.join(baseline, 'manifest.json'), 'utf8'));
      assert.equal(previous.browser, browser.version, 'Uma nova versão de navegador exige atualização completa.');
      assert.equal(previous.platform, process.platform, 'Uma nova plataforma exige atualização completa.');
      assert.deepEqual(profiles, previous.devices, 'Uma matriz nova exige atualização completa.');
      assert.deepEqual(inventory, previous.files.filter(file => selection.includes(file.split('/')[0])),
        'Mudanças na cobertura exigem atualização completa.');
    }
    for (const entry of report.screenshots) {
      await mkdir(path.join(baseline, entry.device), { recursive: true });
      await copyFile(path.join(output, entry.file), path.join(baseline, entry.file));
    }
    // Reject stale or unvisited references rather than quietly dropping coverage.
    await writeFile(path.join(baseline, 'manifest.json'), JSON.stringify({ platform: process.platform, browser: browser.version, devices: profiles, files: previous?.files ?? inventory }, null, 2) + '\n');
  } else if (!update && report.passed && !selection) {
    const manifest = JSON.parse(await readFile(path.join(baseline, 'manifest.json'), 'utf8'));
    assert.deepEqual(report.screenshots.map(entry => entry.file), manifest.files, 'A cobertura de telas mudou; revise e atualize as referências.');
    assert.deepEqual(profiles, manifest.devices, 'A matriz de dispositivos mudou.');
    const extra = [];
    for (const device of devices) for (const name of await readdir(path.join(baseline, device.id))) {
      if (name.endsWith('.webp') && !manifest.files.includes(`${device.id}/${name}`)) extra.push(name);
    }
    assert.deepEqual(extra, [], 'Referências obsoletas na pasta baselines.');
  }
  await writeReport(report, output);
  console.log(`\n${report.screenshots.length} capturas; ${failures.length} telas com problemas; ${report.errors.length} erros de fluxo. Relatório: tests/visual/results/index.html`);
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  report.passed = false;
  report.errors.push({ device: 'suite', screen: 'infraestrutura', message: error.stack });
  await writeReport(report, output);
  console.error(error);
  process.exitCode = 1;
} finally { await cleanup(); }
