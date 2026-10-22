const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const { chromium } = require(require.resolve('playwright', { paths: [path.resolve('.next/benchmark-tools')] }));

const base = '/navegando-para-o-tesouro';
const root = path.resolve('out');
const destination = path.resolve('docs/benchmarks/2026-10-21');
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.txt': 'text/x-component', '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const output = { date: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), workingTree: 'WebP lossless + tutorial preload, not committed', lighthouse: [], tutorial: [], assets: [] };

async function serve(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    let relative = decodeURIComponent(url.pathname);
    if (relative === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    if (!relative.startsWith(base + '/')) { res.writeHead(404); res.end(); return; }
    relative = relative.slice(base.length + 1);
    let file = path.resolve(root, relative || 'index.html');
    if (!file.startsWith(root + path.sep)) throw Error('Outside export');
    try { if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html'); }
    catch (error) {
      // Static Next exports place navigation payloads alongside the route.
      const match = relative.match(/^(.*)\/(__next\.[^/]+\.txt)$/);
      if (!match) throw error;
      file = path.join(root, match[1], match[2]);
    }
    const body = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'public, max-age=3600' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}

async function save() { await fs.mkdir(destination, { recursive: true }); await fs.writeFile(path.join(destination, 'measurements.json'), JSON.stringify(output, null, 2) + '\n'); }

async function main() {
  const server = http.createServer((req, res) => void serve(req, res));
  await new Promise((resolve) => server.listen(3199, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:3199${base}/`;
  let chrome, browser;
  try {
    const lhPath = path.resolve('.next/benchmark-tools/node_modules/lighthouse/core/index.js');
    const lhRequire = createRequire(lhPath);
    const { default: lighthouse } = await import(pathToFileURL(lhPath));
    const { launch } = await import(pathToFileURL(lhRequire.resolve('chrome-launcher')));
    const { default: desktopConfig } = await import(pathToFileURL(path.resolve('.next/benchmark-tools/node_modules/lighthouse/core/config/desktop-config.js')));
    chrome = await launch({ chromePath, userDataDir: await fs.mkdtemp(path.resolve('.next/benchmark-chrome-')), chromeFlags: ['--headless=new', '--disable-gpu', '--no-first-run'], logLevel: 'silent' });
    for (const profile of ['mobile', 'desktop']) {
      for (let run = 1; run <= 3; run++) {
        console.log(`Lighthouse ${profile} ${run}/3 starting`);
        const config = { extends: 'lighthouse:default', settings: { onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], skipAudits: ['screenshot-thumbnails', 'final-screenshot'] } };
        if (profile === 'desktop') Object.assign(config.settings, desktopConfig.settings);
        const result = await lighthouse(url, { port: chrome.port, logLevel: 'error', output: 'json' }, config);
        const lhr = result.lhr;
        const audits = Object.fromEntries(Object.entries(lhr.audits).filter(([id]) => !['screenshot-thumbnails', 'final-screenshot'].includes(id)));
        output.lighthouse.push({ profile, run, lighthouseVersion: lhr.lighthouseVersion, userAgent: lhr.userAgent, fetchTime: lhr.fetchTime, settings: lhr.configSettings, environment: lhr.environment, warnings: lhr.runWarnings, runtimeError: lhr.runtimeError, categories: Object.fromEntries(Object.entries(lhr.categories).map(([id, category]) => [id, { score: category.score }])), audits });
        await save();
        console.log(`Lighthouse ${profile} ${run}/3: ${lhr.categories.performance.score * 100}; LCP ${Math.round(lhr.audits['largest-contentful-paint'].numericValue)} ms`);
      }
    }
    await chrome.kill(); chrome = null;
    browser = await chromium.launch({ executablePath: chromePath, headless: true });
    for (const scenario of ['immediate', 'preloaded']) {
      for (let run = 1; run <= 3; run++) {
        console.log(`Tutorial ${scenario} ${run}/3 starting`);
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 10 * 1000 * 1000 / 8, uploadThroughput: 1 * 1000 * 1000 / 8 });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await page.addInitScript(() => {
          window.benchmarkLcp = 0;
          new PerformanceObserver((list) => { for (const e of list.getEntries()) window.benchmarkLcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        });
        const errors = []; page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Tutorial', exact: true }).waitFor();
        // Wait until React attached handlers, without intentionally waiting for preloads.
        await page.waitForFunction(() => !!document.querySelector('.start-screen img') && Object.keys(document.querySelector('.start-screen img')).some((k) => k.startsWith('__reactFiber')));
        if (scenario === 'preloaded') {
          await page.waitForFunction(() => performance.getEntriesByType('resource').some((e) => e.name.endsWith('/button-default.webp')), null, { timeout: 90000 });
          await page.waitForLoadState('networkidle');
        }
        const before = await page.evaluate(() => ({ at: performance.now(), lcp: window.benchmarkLcp, resources: performance.getEntriesByType('resource').map((e) => ({ name: e.name, transferSize: e.transferSize, decodedBodySize: e.decodedBodySize, end: e.responseEnd })), fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime }));
        await page.getByRole('button', { name: 'Tutorial', exact: true }).click();
        await page.locator('.tutorial-screen').waitFor();
        const mounted = await page.evaluate(() => performance.now());
        await page.waitForFunction(() => {
          const images = [...document.querySelectorAll('.tutorial-screen img')].filter((image) => image.getBoundingClientRect().width > 0);
          const resources = performance.getEntriesByType('resource');
          return images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 0) && ['panel-modal.webp', 'sheet-islands-1.webp', 'background-map-mobile.webp'].every((name) => resources.some((e) => e.name.endsWith('/' + name)));
        }, null, { timeout: 90000 });
        await page.evaluate(async () => { await Promise.all([...document.querySelectorAll('.tutorial-screen img')].filter((x) => x.complete && x.naturalWidth).map((x) => x.decode().catch(() => {}))); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); });
        const after = await page.evaluate(() => ({ at: performance.now(), resources: performance.getEntriesByType('resource').map((e) => ({ name: e.name, transferSize: e.transferSize, decodedBodySize: e.decodedBodySize, end: e.responseEnd })) }));
        output.tutorial.push({ scenario, run, settings: { viewport: '390x844', dpr: 3, downloadMbps: 10, uploadMbps: 1, latencyMs: 80, cpuSlowdown: 4 }, before, after, mountMs: mounted - before.at, readyMs: after.at - before.at, errors });
        console.log(`Tutorial ${scenario} ${run}/3: ready ${Math.round(after.at - before.at)} ms; menu wait ${Math.round(before.at)} ms`);
        await context.close(); await save();
      }
    }
    async function assets(dir) {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) await assets(file);
        else if (file.endsWith('.webp')) {
          const old = file.replace(/\.webp$/, '.png').replaceAll('\\', '/');
          const bytes = (await fs.stat(file)).size;
          const original = execFileSync('git', ['cat-file', '-s', `HEAD:${old}`], { encoding: 'utf8' }).trim();
          output.assets.push({ file: file.replaceAll('\\', '/'), before: Number(original), after: bytes });
        }
      }
    }
    await assets('public/assets/game'); await save();
    console.log('DONE: ' + destination);
  } finally {
    await chrome?.kill(); await browser?.close();
    server.closeAllConnections(); await new Promise((resolve) => server.close(resolve));
  }
}
main().catch(async (error) => { console.error(error); output.error = error.stack; await save(); process.exitCode = 1; });
