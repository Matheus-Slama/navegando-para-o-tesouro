'use client';

import { useSyncExternalStore } from 'react';

let muted = false;
const listeners = new Set();
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useMusicMuted() {
  const value = useSyncExternalStore(subscribe, () => muted, () => false);
  return [value, () => {
    muted = !muted;
    listeners.forEach((listener) => listener());
  }];
}
