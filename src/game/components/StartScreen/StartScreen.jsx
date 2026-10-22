'use client';

import { formatScore } from '@/game/core/text';
import { useCallback, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useScreenMusic } from '@/game/hooks/useScreenMusic';
import { useDeviceConfig } from '@/game/hooks/useDeviceConfig';
import { useTutorialImagePreload } from '@/game/hooks/useTutorialImagePreload';
import './StartScreen.css';
import { MusicToggle } from '@/game/components/MusicToggle/MusicToggle';

const MENU_SPACING_BY_DEVICE = {
  mobile: { '--menu-bottom': '22dvh', '--menu-gap': '0.5rem', '--menu-width': 'min(56vw, 22rem)' },
  tablet: { '--menu-bottom': '17dvh', '--menu-gap': '0.75rem', '--menu-width': 'min(54vw, 22rem)' },
  wide: { '--menu-bottom': '12dvh', '--menu-gap': '0.625rem', '--menu-width': 'min(48vw, 25rem)' },
  wideCompact: { '--menu-bottom': '11dvh', '--menu-gap': '0.25rem', '--menu-width': 'min(52vw, 25rem)' }
};

export function StartScreen({ onStart, onTutorial, highscore = 0 }) {
  const musicRef = useScreenMusic();
  const device = useDeviceConfig();
  const [menuReady, setMenuReady] = useState(false);
  const menuImageRef = useCallback((image) => {
    // A cached background can finish before React attaches its load handler.
    if (image?.complete) setMenuReady(true);
  }, []);
  useTutorialImagePreload(device.layout, menuReady);

  return (
    <section className="start-screen" data-device={device.id} style={MENU_SPACING_BY_DEVICE[device.id]} aria-labelledby="start-screen-title">
      <audio ref={musicRef} src="/assets/game/audio/music-menu.mp3" loop preload="auto" />
      <MusicToggle variant="bare" className="start-screen__music" />
      <div className="start-screen__frame">
      <picture className="start-screen__art">
        <source
          media="(min-aspect-ratio: 1/1)"
          srcSet="/assets/game/backgrounds/background-menu-wide.webp"
        />
        <source
          media="(min-width: 37.5rem)"
          srcSet="/assets/game/backgrounds/background-menu-portrait.webp"
        />
        <img
          ref={menuImageRef}
          src="/assets/game/backgrounds/background-menu-tall.webp"
          alt=""
          fetchPriority="high"
          onLoad={() => setMenuReady(true)}
          onError={() => setMenuReady(true)}
        />
      </picture>

      <div className="start-screen__content">
        <h1 id="start-screen-title" className="sr-only">
          Navegando para o Tesouro
        </h1>

        <div className="start-screen__highscore" aria-label={`Recorde: ${formatScore(highscore)} pontos`}>
          <Image src="/assets/game/ui/icon-highscore.webp" alt="" width={1254} height={1254} sizes="54px" draggable={false} />
          <span>Recorde <strong>{formatScore(highscore)}</strong></span>
        </div>

        <button type="button" onClick={onTutorial}>
          Tutorial
        </button>

        <button type="button" onClick={onStart}>
          Iniciar jornada
        </button>
        <Link className="start-screen__credits" href="/creditos">Créditos</Link>
      </div>
      </div>
    </section>
  );
}
