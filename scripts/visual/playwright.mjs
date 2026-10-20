import { firefox, webkit } from 'playwright';
import { setTimeout as delay } from 'node:timers/promises';

export async function launchBrowser(engine) {
  const browser = await { firefox, webkit }[engine].launch({ headless: true, timeout: 30000 });
  return { endpoint: browser, version: `${engine}/${browser.version()}`, close: () => browser.close() };
}

export async function openPage(browser, device = { width: 390, height: 844, mobile: false }) {
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: 1,
    // Firefox supports responsive viewports and touch, but not mobile emulation.
    isMobile: browser.browserType().name() === 'webkit' && device.mobile,
    hasTouch: device.mobile,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
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
      // Playwright checks visibility, stability and hit testing before input.
      const control = page.locator(selector).first();
      if (device.mobile) await control.tap();
      else await control.click();
      await delay(90);
    },
    navigate: url => page.goto(url),
    moveMouse: () => page.mouse.move(1, 1),
    screenshot: ({ fullPage = false } = {}) => page.screenshot({ type: 'png', fullPage }),
    close: () => context.close(),
  };
}
