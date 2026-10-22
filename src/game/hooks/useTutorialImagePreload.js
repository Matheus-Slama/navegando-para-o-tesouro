'use client';

import { useEffect } from 'react';
import { getImageProps } from 'next/image';
import { GAME_ASSETS } from '@/game/config/gameAssets';
import { TUTORIAL_GRAPH } from '@/game/config/tutorial';
import { getMapProfile } from '@/game/core/map-layout';

const cachedImages = new Map();
const ui = (name) => `/assets/game/ui/${name}.webp`;
const responsive = (src, sizes, width = 1254, height = 1254) =>
  getImageProps({ src, alt: '', width, height, sizes }).props;

function tutorialImages(layout) {
  const sheets = new Set(TUTORIAL_GRAPH.nodes
    .filter((node) => node.sprite)
    .map((node) => GAME_ASSETS.islandSheets[node.sprite.sheetIndex].src));

  return [
    { src: getMapProfile(layout).asset },
    { src: ui('panel-modal') },
    { src: ui('panel-hud') },
    { src: ui('indicator-lives-3') },
    ...[...sheets].map((src) => ({ src })),
    ...Object.values(GAME_ASSETS.boats).map((src) =>
      responsive(src, '(max-width: 37.5rem) 25vw, 20vw')),
    responsive(GAME_ASSETS.treasures.small, '(max-width: 37.5rem) 30vw, 16vw'),
    responsive(ui('icon-tutorial-arrow'), '68px', 1717, 916),
    responsive(ui('icon-pause'), '44px'),
    responsive(ui('icon-hint'), '44px'),
    responsive(ui('icon-settings'), '36px', 64, 64),
    { src: ui('button-rectangle') },
    { src: ui('button-default') }
  ];
}

function warmImage({ src, srcSet, sizes }) {
  const key = `${src}|${srcSet ?? ''}|${sizes ?? ''}|${window.innerWidth}|${window.devicePixelRatio}`;
  if (cachedImages.has(key)) return cachedImages.get(key);

  const request = new Promise((resolve) => {
    const image = new window.Image();
    const finish = (loaded) => {
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      if (!loaded) cachedImages.delete(key);
      resolve();
    };
    const timeout = setTimeout(() => finish(false), 20000);
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.fetchPriority = 'low';
    image.decoding = 'async';
    if (sizes) image.sizes = sizes;
    if (srcSet) image.srcset = srcSet;
    image.src = src;
  });
  cachedImages.set(key, request);
  return request;
}

export function useTutorialImagePreload(layout, menuReady) {
  useEffect(() => {
    if (!menuReady) return;
    let stopped = false;
    const timer = setTimeout(async () => {
      // Keep the menu responsive and avoid flooding mobile connections.
      const queue = tutorialImages(layout);
      async function worker() {
        while (!stopped && queue.length) await warmImage(queue.shift());
      }
      await Promise.all([worker(), worker()]);
    }, 300);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [layout, menuReady]);
}
