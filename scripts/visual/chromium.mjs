import { access } from 'node:fs/promises';
import { chromium } from 'playwright';

export async function launchBrowser() {
  const candidates = [process.env.VISUAL_BROWSER_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  let executablePath;
  for (const candidate of candidates) {
    try { await access(candidate); executablePath = candidate; break; } catch { /* Try the next installed browser. */ }
  }
  if (!executablePath) throw new Error('Chrome/Edge não encontrado. Defina VISUAL_BROWSER_PATH para o executável.');
  const browser = await chromium.launch({ executablePath, headless: true, timeout: 30000,
    // Software rasterization avoids GPU tile differences between test processes.
    args: ['--hide-scrollbars', '--force-color-profile=srgb', '--mute-audio', '--disable-gpu'] });
  return { endpoint: browser, version: `Chrome/${browser.version()}`, close: () => browser.close() };
}

export async function openPage(browser, device = { width: 390, height: 844, mobile: false }) {
  const context = await browser.newContext({ viewport: { width: device.width, height: device.height },
    deviceScaleFactor: 1, isMobile: device.mobile, hasTouch: device.mobile, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  page.setDefaultTimeout(20000);
  const errors = [];
  const responses = [];
  page.on('pageerror', error => errors.push(error.stack ?? error.message));
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) responses.push(response.url());
  });
  await context.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* Opaque origins have no storage. */ }
  });
  return {
    errors, responses,
    evaluate: expression => page.evaluate(expression),
    async waitFor(expression, timeout = 20000) {
      await page.waitForFunction(expression, undefined, { timeout });
      if (errors.length) throw new Error(errors.join('\n'));
    },
    async click(selector) {
      const control = page.locator(selector).first();
      if (device.mobile) await control.tap();
      else await control.click();
      await page.waitForTimeout(90);
    },
    navigate: url => page.goto(url),
    moveMouse: () => page.mouse.move(1, 1),
    async screenshot({ fullPage = false, format = 'webp' } = {}) {
      let clip;
      if (fullPage) {
        const { cssContentSize } = await session.send('Page.getLayoutMetrics');
        clip = { x: 0, y: 0, width: device.width, height: cssContentSize.height, scale: 1 };
      }
      const shot = await session.send('Page.captureScreenshot', { format,
        ...(format === 'webp' ? { quality: 95 } : {}), captureBeyondViewport: fullPage, ...(clip ? { clip } : {}) });
      return Buffer.from(shot.data, 'base64');
    },
    close: () => context.close(),
  };
}
