'use client';

import Image from 'next/image';
import { useMusicMuted } from '@/game/hooks/useMusicMuted';
import './MusicToggle.css';

export function MusicToggle({ className = '', variant = 'default', children }) {
  const [muted, toggle] = useMusicMuted();
  const label = muted ? 'Ligar música' : 'Mutar música';
  return (
    <button type="button" className={`music-toggle music-toggle--${variant} ${className}`} onClick={toggle}
      aria-label={label} title={label} aria-pressed={muted}>
      <Image src={`/assets/game/ui/icon-music-${muted ? 'off' : 'on'}.png`}
        alt="" width={1254} height={1254} sizes="64px" draggable={false} />
      {children}
    </button>
  );
}
