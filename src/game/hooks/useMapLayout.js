'use client';

import { useDeviceConfig } from '@/game/hooks/useDeviceConfig';

export function useMapLayout() {
  return useDeviceConfig().layout;
}
