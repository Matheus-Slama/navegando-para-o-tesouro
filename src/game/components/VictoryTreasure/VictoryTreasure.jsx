'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMusicMuted } from '@/game/hooks/useMusicMuted';
import { GameDialog } from '@/game/components/GameDialog/GameDialog';
import { formatScore } from '@/game/core/text';
import './VictoryTreasure.css';

// Six hand-drawn poses, held longer at the start to build anticipation.
const POSES = [0, 3100, 3900, 4600, 5200, 5800];

export function VictoryTreasure({ onContinue, onBackToMenu, score, highscore }) {
  const [pose, setPose] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const continueRef = useRef(null);
  const jingleRef = useRef(null);
  const [muted] = useMusicMuted();

  useEffect(() => {
    if (!loaded || revealed) return;
    const sound = jingleRef.current;
    sound.volume = 0.45;
    let started = false;
    let pending = false;
    let disposed = false;
    function playJingle() {
      if (started || pending || disposed || sound.muted) return;
      pending = true;
      sound.play().then(() => {
        started = true;
      }).catch(() => {
        // Retry on interaction when automatic playback is blocked.
      }).finally(() => { pending = false; });
    }
    playJingle();
    window.addEventListener('pointerdown', playJingle);
    window.addEventListener('keydown', playJingle);
    return () => {
      disposed = true;
      window.removeEventListener('pointerdown', playJingle);
      window.removeEventListener('keydown', playJingle);
      sound.pause();
      sound.currentTime = 0;
    };
  }, [loaded, revealed]);

  useEffect(() => {
    if (!loaded) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers = POSES.slice(1).map((delay, index) =>
      setTimeout(() => setPose(index + 1), reduced ? 0 : delay));
    timers.push(setTimeout(() => setRevealed(true), reduced ? 50 : 7000));
    return () => timers.forEach(clearTimeout);
  }, [loaded]);

  useEffect(() => {
    if (revealed) continueRef.current?.focus({ preventScroll: true });
  }, [revealed]);

  return (
    <GameDialog labelledBy="victory-title" className={`victory-treasure ${loaded ? 'victory-treasure--playing' : ''} ${revealed ? 'victory-treasure--revealed' : ''}`}>
      <audio ref={jingleRef} src="/assets/game/audio/sfx-victory-jingle.ogg" preload="auto" muted={muted} loop={!revealed} />
      <h2 id="victory-title" className="sr-only">Você venceu! O verdadeiro tesouro</h2>
      <div className="victory-treasure__stage" aria-hidden="true">
        <div className="victory-treasure__rays" />
        <div className="victory-treasure__halo" />
        <div className="victory-treasure__zoom">
          <div className="victory-treasure__shake">
            <div className="victory-treasure__sprite" style={{ backgroundPosition: `${(pose % 3) * 50}% ${Math.floor(pose / 3) * 100}%` }} />
          </div>
        </div>
        {Array.from({ length: 20 }, (_, i) => (
          <i key={i} className="victory-treasure__spark" style={{ '--angle': `${i * 137.5}deg`, '--delay': `${2 + (i % 7) * .3}s`, '--distance': `${100 + (i % 5) * 35}px` }} />
        ))}
      </div>
      {/* Wait for the actual sheet before starting the cinematic clock. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="victory-treasure__preload" src="/assets/game/treasures/treasure-victory-sheet.png" alt="" onLoad={() => setLoaded(true)} onError={() => { setLoaded(true); setRevealed(true); }} />
      <p className="sr-only" role="status">{revealed ? 'O verdadeiro tesouro foi aprender a encontrar o melhor caminho. Obrigado por jogar!' : 'O baú do tesouro está se abrindo…'}</p>
      <div className="victory-treasure__paper" hidden={!revealed}>
        <span className="victory-treasure__eyebrow">Jornada concluída</span>
        <h3>O verdadeiro tesouro…</h3>
        <p>foi aprender a encontrar o melhor caminho.</p>
        <strong>Obrigado por jogar!</strong>
        <p className="victory-treasure__score">Pontuação: {formatScore(score)} · Recorde: {formatScore(highscore)}</p>
        <div className="victory-treasure__actions">
          <button ref={continueRef} type="button" onClick={onContinue}>Jogar novamente</button>
          <button type="button" onClick={onBackToMenu}>Voltar ao menu</button>
          <Link href="/creditos">Créditos</Link>
        </div>
      </div>
    </GameDialog>
  );
}
