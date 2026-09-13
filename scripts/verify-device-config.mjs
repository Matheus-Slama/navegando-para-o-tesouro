import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./map-test-loader.mjs', import.meta.url);

const {
  analyzeDevice,
  getDeviceConfig,
  getDeviceStyles,
  subscribeDeviceChanges
} = await import('../src/game/core/device-config.js');

// Inclui os limites exatos em que o jogo troca de formato.
const viewports = [
  [320, 568, 'mobile'],
  [390, 844, 'mobile'],
  [599, 800, 'mobile'],
  [600, 800, 'tablet'],
  [768, 1024, 'tablet'],
  [1024, 1366, 'tablet'],
  [599, 599, 'wide'],
  [600, 600, 'wide'],
  [1024, 1024, 'wide'],
  [1366, 768, 'wide'],
  [1920, 1080, 'wide'],
  [2560, 1080, 'wide'],
  [568, 320, 'wideCompact'],
  [800, 500, 'wideCompact'],
  [800, 501, 'wide'],
  [500, 500, 'wideCompact'],
  [499, 500, 'mobile'],
  [500, 499, 'wideCompact']
];

for (const [width, height, expectedId] of viewports) {
  const device = analyzeDevice({ width, height });
  assert.equal(device.id, expectedId, `${width} x ${height}`);
  assert.equal(device.width, width);
  assert.equal(device.height, height);
  assert.equal(device.orientation, width >= height ? 'landscape' : 'portrait');
  assert.equal(device.layout, expectedId === 'wideCompact' ? 'wide' : expectedId);
  assert.deepEqual(device.map, getDeviceConfig(expectedId).map);
  assert.deepEqual(device.sizes, getDeviceConfig(expectedId).sizes);
}

for (const id of ['mobile', 'tablet', 'wide', 'wideCompact']) {
  const config = getDeviceConfig(id);
  assert.strictEqual(getDeviceConfig(id), config, `Perfil estavel: ${id}`);
  assert.equal(config.id, id);
  assert.ok(Object.keys(config.sizes).length > 0);
  assert.ok(Object.keys(config.map).length > 0);
  assert.ok(Object.keys(config.assets).length > 0);
  const styles = getDeviceStyles(config);
  assert.ok(Object.keys(styles).length > 0);
  for (const [property, value] of Object.entries(styles)) {
    assert.ok(property.startsWith('--'), `Variavel CSS invalida: ${property}`);
    assert.ok(typeof value === 'string' || typeof value === 'number');
  }
}

assert.strictEqual(getDeviceConfig('desconhecido'), getDeviceConfig('mobile'));
assert.strictEqual(getDeviceConfig(), getDeviceConfig('mobile'));
assert.equal(typeof globalThis.window, 'undefined');
assert.equal(analyzeDevice().id, 'mobile');
assert.doesNotThrow(() => subscribeDeviceChanges(() => {})());

class FakeWindow extends EventTarget {
  constructor(width, height) {
    super();
    this.innerWidth = width;
    this.innerHeight = height;
  }
}

// Simula o celular sendo girado e a janela voltando ao formato vertical.
const browser = new FakeWindow(390, 844);
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });

try {
  assert.equal(analyzeDevice().id, 'mobile');
  let notifications = 0;
  const unsubscribe = subscribeDeviceChanges(() => { notifications += 1; }, browser);
  const initialNotifications = notifications;

  browser.innerWidth = 844;
  browser.innerHeight = 390;
  browser.dispatchEvent(new Event('orientationchange'));
  assert.ok(notifications > initialNotifications, 'Rotacao deve avisar o jogo');
  assert.equal(analyzeDevice().id, 'wideCompact');

  const beforeResize = notifications;
  browser.innerWidth = 768;
  browser.innerHeight = 1024;
  browser.dispatchEvent(new Event('resize'));
  assert.ok(notifications > beforeResize, 'Resize deve avisar o jogo');
  assert.equal(analyzeDevice().id, 'tablet');

  unsubscribe();
  const afterUnsubscribe = notifications;
  browser.dispatchEvent(new Event('resize'));
  browser.dispatchEvent(new Event('orientationchange'));
  assert.equal(notifications, afterUnsubscribe, 'Listeners devem ser removidos');

  let defaultNotifications = 0;
  const unsubscribeDefault = subscribeDeviceChanges(() => { defaultNotifications += 1; });
  const beforeDefaultResize = defaultNotifications;
  browser.dispatchEvent(new Event('resize'));
  assert.ok(defaultNotifications > beforeDefaultResize);
  unsubscribeDefault();
} finally {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else delete globalThis.window;
}

console.log(`${viewports.length} viewports, SSR e eventos de tela validados.`);
