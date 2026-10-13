'use client';

import { useEffect, useRef } from 'react';
import { useMusicMuted } from './useMusicMuted';

export function useScreenMusic(paused = false) {
  const musicRef = useRef(null);
  const [muted] = useMusicMuted();

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    let disposed = false;
    music.volume = 0.35;
    if (paused || muted) {
      music.pause();
      return;
    }

    function playMusic() {
      if (disposed || !music.paused) return;
      music.play().then(() => {
        if (disposed) music.pause();
      }).catch(() => {
        // Browsers may require a user interaction before allowing audio.
      });
    }

    playMusic();
    window.addEventListener('pointerdown', playMusic);
    window.addEventListener('keydown', playMusic);

    return () => {
      disposed = true;
      window.removeEventListener('pointerdown', playMusic);
      window.removeEventListener('keydown', playMusic);
      music.pause();
    };
  }, [paused, muted]);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    return () => {
      music.pause();
      music.currentTime = 0;
    };
  }, []);

  return musicRef;
}
