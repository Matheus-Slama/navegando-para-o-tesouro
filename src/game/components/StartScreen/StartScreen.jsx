'use client';

import { formatScore } from '@/game/core/text';
import Image from 'next/image';
import Link from 'next/link';
import { useScreenMusic } from '@/game/hooks/useScreenMusic';
import './StartScreen.css';

export function StartScreen({ onStart, onTutorial, highscore = 0 }) {
  const musicRef = useScreenMusic();

  return (
    <section className="start-screen" aria-labelledby="start-screen-title">
      <audio ref={musicRef} src="/assets/game/audio/music-menu.mp3" loop preload="auto" />
      <Link className="start-screen__credits" href="/creditos">Créditos</Link>
      <div className="start-screen__frame">
      <picture className="start-screen__art">
        <source
          media="(min-aspect-ratio: 1/1)"
          srcSet="/assets/game/backgrounds/background-menu-wide.png"
        />
        <source
          media="(min-width: 37.5rem)"
          srcSet="/assets/game/backgrounds/background-menu-portrait.png"
        />
        <img
          src="/assets/game/backgrounds/background-menu-tall.png"
          alt=""
          fetchPriority="high"
        />
      </picture>

      <div className="start-screen__content">
        <h1 id="start-screen-title" className="sr-only">
          Navegando para o Tesouro
        </h1>

        <div className="start-screen__highscore" aria-label={`Recorde: ${formatScore(highscore)} pontos`}>
          <Image src="/assets/game/ui/icon-highscore.png" alt="" width={1254} height={1254} sizes="(min-width: 1024px) 200px, 88px" draggable={false} />
          <span>Recorde <strong>{formatScore(highscore)}</strong></span>
        </div>

        <button type="button" onClick={onTutorial}>
          Tutorial
        </button>

        <button type="button" onClick={onStart}>
          Iniciar jornada
        </button>
      </div>
      </div>
    </section>
  );
}
