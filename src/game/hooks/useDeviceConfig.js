'use client';

import { useSyncExternalStore } from 'react';
import { analyzeDevice, getDeviceConfig, subscribeDeviceChanges } from '@/game/core/device-config';

function getSnapshot() {
  return analyzeDevice().id;
}

function getServerSnapshot() {
  return getDeviceConfig().id;
}

export function useDeviceConfig() {
  const id = useSyncExternalStore(subscribeDeviceChanges, getSnapshot, getServerSnapshot);
  return getDeviceConfig(id);
}
