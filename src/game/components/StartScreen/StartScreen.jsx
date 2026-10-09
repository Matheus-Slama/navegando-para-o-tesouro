'use client';

import Image from 'next/image';
import './StartScreen.css';

export function StartScreen({ onStart, onTutorial, highscore = 0 }) {
  return (
    <section className="start-screen" aria-labelledby="start-screen-title">
      <div className="start-screen__frame">
      <picture className="start-screen__art">
        <source
          media="(min-aspect-ratio: 1/1)"
          srcSet="/assets/game/backgrounds/start-screen-wide.png"
        />
        <source
          media="(min-width: 37.5rem)"
          srcSet="/assets/game/backgrounds/start-screen-portrait.png"
        />
        <img
          src="/assets/game/backgrounds/start-screen-tall.png"
          alt=""
          fetchPriority="high"
        />
      </picture>

      <div className="start-screen__content">
        <h1 id="start-screen-title" className="sr-only">
          Navegando para o Tesouro
        </h1>

        <div className="start-screen__highscore" aria-label={`Recorde: ${highscore.toLocaleString('pt-BR')} pontos`}>
          <Image src="/assets/game/ui/highscore-trophy.png" alt="" width={1254} height={1254} sizes="(min-width: 1024px) 200px, 88px" draggable={false} />
          <span>Recorde <strong>{highscore.toLocaleString('pt-BR')}</strong></span>
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
