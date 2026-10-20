// Executed in the browser. Keep this function independent of Node imports.
export function auditLayout() {
  const issues = [];
  const visible = element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      && !element.closest('[hidden], [inert], .sr-only, .dev-panel, nextjs-portal');
  };
  const label = element => element.getAttribute('aria-label') || element.textContent.trim().slice(0, 90) || element.className;
  const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2
    && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
  // Sprites have transparent margins: compare their painted pixels, not the PNG box.
  const paintedRect = container => {
    const image = container.querySelector('img');
    if (!image?.complete || !image.naturalWidth) return container.getBoundingClientRect();
    const cache = window.__visualPaintBounds ??= new Map();
    const source = image.currentSrc || image.src;
    if (!cache.has(source)) {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] > 32) {
          left = Math.min(left, x); right = Math.max(right, x + 1);
          top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
        }
      }
      cache.set(source, { left: left / canvas.width, right: right / canvas.width, top: top / canvas.height, bottom: bottom / canvas.height });
    }
    const bounds = cache.get(source);
    const rect = image.getBoundingClientRect();
    return { left: rect.x + bounds.left * rect.width, right: rect.x + bounds.right * rect.width,
      top: rect.y + bounds.top * rect.height, bottom: rect.y + bounds.bottom * rect.height };
  };
  const modal = document.querySelector('dialog[open], .race-result[aria-modal="true"]');
  const scope = modal ?? document;
  const creditsPage = !!document.querySelector('main article');
  if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('Rolagem horizontal na página');
  if (!creditsPage && document.documentElement.scrollHeight > innerHeight + 1) issues.push('Rolagem vertical inesperada na página');
  const controls = [...scope.querySelectorAll('button, a, select')].filter(visible)
    .filter(element => !element.matches('.game-hint__drag-handle, .game-hint__resize-handle, .dijkstra-fixed-map__edge-navigation'));
  for (const element of controls) {
    const rect = element.getBoundingClientRect();
    const scrollParent = element.closest('.game-hint__body, .game-dialog, .race-result');
    const canScroll = scrollParent && /auto|scroll/.test(getComputedStyle(scrollParent).overflowY)
      && scrollParent.scrollHeight > scrollParent.clientHeight + 1;
    if (rect.left < -1 || rect.right > innerWidth + 1) issues.push(`Controle cortado na horizontal: ${label(element)}`);
    if (!creditsPage && !canScroll && (rect.top < -1 || rect.bottom > innerHeight + 1)) issues.push(`Controle cortado na vertical: ${label(element)}`);
    if (!element.disabled && rect.top >= 0 && rect.bottom <= innerHeight) {
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      if (!hit || !(hit === element || element.contains(hit))) issues.push(`Controle coberto: ${label(element)}`);
    }
    // The floating "Novo" badge intentionally extends beyond its icon button.
    if (element.textContent.trim() && !element.querySelector('.game-hint__power-label')
      && element.scrollWidth > element.clientWidth + 2) issues.push(`Texto do controle transbordando: ${label(element)}`);
  }
  for (let index = 0; index < controls.length; index++) {
    for (const other of controls.slice(index + 1)) {
      if (overlap(controls[index].getBoundingClientRect(), other.getBoundingClientRect())) issues.push(`Controles sobrepostos: ${label(controls[index])} / ${label(other)}`);
    }
  }
  for (const image of [...document.images].filter(visible)) {
    if (!image.complete || image.naturalWidth === 0) issues.push(`Imagem indisponível: ${image.getAttribute('src')}`);
  }
  for (const element of [...scope.querySelectorAll('h1,h2,h3,p,.game-hint__footer,.start-screen__highscore,.treasure-anchor')].filter(visible)) {
    if (element.scrollWidth > element.clientWidth + 2) issues.push(`Conteúdo transbordando: ${label(element)}`);
    const scrollParent = element.closest('.game-hint__body, .game-dialog, .race-result');
    if (!creditsPage && element.getBoundingClientRect().top < -1 && (!scrollParent || scrollParent.scrollTop === 0)) {
      issues.push(`Conteúdo cortado acima da área rolável: ${label(element)}`);
    }
  }
  if (!modal) {
    const hud = document.querySelector('.game-hud');
    const treasure = document.querySelector('.treasure-anchor');
    if (hud && treasure && overlap(paintedRect(hud), paintedRect(treasure))) issues.push('HUD sobreposto ao tesouro');
    const menu = document.querySelector('.start-screen');
    if (menu) {
      const credit = menu.querySelector('.start-screen__credits').getBoundingClientRect();
      if (innerHeight - credit.bottom < 23) issues.push('Créditos sem margem inferior de 24px');
      const score = menu.querySelector('.start-screen__highscore');
      const currentTop = score.getBoundingClientRect().top;
      menu.style.setProperty('--menu-content-bottom', 'max(var(--menu-bottom), env(safe-area-inset-bottom))');
      if (Math.abs(score.getBoundingClientRect().top - currentTop) > 1) issues.push('Créditos deslocaram o recorde');
      menu.style.removeProperty('--menu-content-bottom');
      for (const control of controls) if (overlap(score.getBoundingClientRect(), control.getBoundingClientRect())) issues.push(`Recorde sobreposto a ${label(control)}`);
    }
  }
  return { issues: [...new Set(issues)], controls: controls.length, width: innerWidth, height: innerHeight };
}

// Pixel comparison runs in Chromium so no native image dependency is needed.
export async function compareImages(expected, actual) {
  const load = source => new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = `data:image/webp;base64,${source}`;
  });
  const [before, after] = await Promise.all([load(expected), load(actual)]);
  if (before.width !== after.width || before.height !== after.height) return { ratio: 1, dimensions: false };
  const canvas = document.createElement('canvas'); canvas.width = after.width; canvas.height = after.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(before, 0, 0); const a = context.getImageData(0, 0, canvas.width, canvas.height);
  context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(after, 0, 0);
  const b = context.getImageData(0, 0, canvas.width, canvas.height);
  let changed = 0;
  for (let index = 0; index < a.data.length; index += 4) {
    const different = Math.max(Math.abs(a.data[index] - b.data[index]), Math.abs(a.data[index + 1] - b.data[index + 1]), Math.abs(a.data[index + 2] - b.data[index + 2])) > 24;
    if (different) changed++;
    b.data[index] = different ? 255 : Math.round(b.data[index] * 0.25);
    b.data[index + 1] = different ? 0 : Math.round(b.data[index + 1] * 0.25);
    b.data[index + 2] = different ? 120 : Math.round(b.data[index + 2] * 0.25);
  }
  context.putImageData(b, 0, 0);
  const ratio = changed / (canvas.width * canvas.height);
  return { ratio, dimensions: true, diff: ratio > 0.002 ? canvas.toDataURL('image/png').split(',')[1] : null };
}
