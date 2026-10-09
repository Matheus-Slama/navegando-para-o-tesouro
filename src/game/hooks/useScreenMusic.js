'use client';

import { useEffect, useRef } from 'react';

export function useScreenMusic() {
  const musicRef = useRef(null);

  useEffect(() => {
    const music = musicRef.current;
    let disposed = false;
    music.volume = 0.35;

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
      music.currentTime = 0;
    };
  }, []);

  return musicRef;
}
