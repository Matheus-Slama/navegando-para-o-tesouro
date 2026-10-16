import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useMusicMuted } from '@/game/hooks/useMusicMuted';
import { GameModal } from '@/game/components/GameDialog/GameModal';
import './DijkstraUnlock.css';

export function DijkstraUnlock({ onContinue }) {
  const soundRef = useRef(null);
  const [muted] = useMusicMuted();

  useEffect(() => {
    const sound = soundRef.current;
    sound.volume = 0.55;
    let disposed = false;
    let started = false;
    let pending = false;
    function playUnlock() {
      if (disposed || started || pending || sound.muted) return;
      pending = true;
      sound.play().then(() => {
        started = true;
      }).catch(() => {
        // Retry on interaction if the browser blocks automatic playback.
      }).finally(() => { pending = false; });
    }
    // Defer until after effect setup, including React Strict Mode's cleanup.
    const timer = setTimeout(playUnlock, 0);
    window.addEventListener('pointerdown', playUnlock);
    window.addEventListener('keydown', playUnlock);
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener('pointerdown', playUnlock);
      window.removeEventListener('keydown', playUnlock);
      sound.pause();
      sound.currentTime = 0;
    };
  }, []);

  return (
    <GameModal className="dijkstra-unlock" labelledBy="dijkstra-unlock-title" onClose={onContinue}>
      <audio ref={soundRef} src="/assets/game/audio/sfx-dijkstra-unlock.wav" preload="auto" muted={muted} />
      <Image src="/assets/game/ui/icon-dijkstra.svg" alt="" width={80} height={80} />
      <p className="dijkstra-unlock__eyebrow">Um novo poder foi revelado!</p>
      <h2 id="dijkstra-unlock-title">Você ganhou um poder especial!</h2>
      <p>Ao navegar por águas mais perigosas, você encontrou o mapa de um antigo capitão. Nele estava o segredo para descobrir as rotas mais baratas: o poder de Dijkstra!</p>
      <p>Use a bandeira destacada no mapa para aprender a comparar os custos das ilhas, passo a passo, e encontrar o melhor caminho até o tesouro.</p>
      <button type="button" onClick={onContinue}>Continuar aventura</button>
    </GameModal>
  );
}
