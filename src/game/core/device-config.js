import deviceSizes from '@/game/config/json/device-sizes.json';

const configurations = new Map();
const styles = new WeakMap();

export function getDeviceConfig(id = deviceSizes.defaultDevice) {
  if (!deviceSizes.devices[id]) return getDeviceConfig(deviceSizes.defaultDevice);
  if (configurations.has(id)) return configurations.get(id);
  const device = deviceSizes.devices[id];
  const base = device.extends ? getDeviceConfig(device.extends) : deviceSizes.defaults;
  const config = {
    ...base,
    ...device,
    id,
    sizes: { ...base.sizes, ...device.sizes },
    map: { ...base.map, ...device.map },
    assets: { ...base.assets, ...device.assets }
  };
  configurations.set(id, config);
  return config;
}

// Usa a área disponível para o jogo, inclusive ao redimensionar a janela.
// Não depende do nome do aparelho nem do user agent do navegador.
export function analyzeDevice(viewport) {
  const current = viewport ?? (typeof window === 'undefined'
    ? deviceSizes.fallbackViewport
    : { width: window.innerWidth, height: window.innerHeight });
  const width = Number.isFinite(current.width) && current.width > 0 ? current.width : deviceSizes.fallbackViewport.width;
  const height = Number.isFinite(current.height) && current.height > 0 ? current.height : deviceSizes.fallbackViewport.height;
  const id = deviceSizes.selectionOrder.find((key) => {
    const match = deviceSizes.devices[key].match;
    return (match.minWidth === undefined || width >= match.minWidth)
      && (match.maxHeight === undefined || height <= match.maxHeight)
      && (match.minAspectRatio === undefined || width / height >= match.minAspectRatio);
  }) ?? deviceSizes.defaultDevice;
  return { ...getDeviceConfig(id), width, height, orientation: width >= height ? 'landscape' : 'portrait' };
}

export function getDeviceStyles(config) {
  if (!styles.has(config)) {
    styles.set(config, Object.fromEntries(Object.entries(config.sizes).map(([name, value]) => [`--${name}`, value])));
  }
  return styles.get(config);
}

export function subscribeDeviceChanges(onChange, target = typeof window === 'undefined' ? null : window) {
  if (!target) return () => {};
  target.addEventListener('resize', onChange);
  target.addEventListener('orientationchange', onChange);
  return () => {
    target.removeEventListener('resize', onChange);
    target.removeEventListener('orientationchange', onChange);
  };
}
