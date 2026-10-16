'use client';

import { useEffect, useRef } from 'react';
import { useMusicMuted } from './useMusicMuted';

const MUSIC_VOLUME = 0.35;
const INITIAL_VOLUME = 0.02;
const FADE_DURATION_MS = 3000;

export function useScreenMusic(paused = false) {
  const musicRef = useRef(null);
  const volumeRef = useRef(INITIAL_VOLUME);
  const [muted] = useMusicMuted();

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    let disposed = false;
    let frameId;
    let starting = false;
    music.volume = volumeRef.current;
    if (paused || muted) {
      music.pause();
      return;
    }

    function fadeIn() {
      let previousTime = performance.now();
      function increaseVolume(now) {
        if (disposed || music.paused) return;
        const elapsed = now - previousTime;
        previousTime = now;
        volumeRef.current = Math.min(MUSIC_VOLUME,
          volumeRef.current + (MUSIC_VOLUME - INITIAL_VOLUME) * elapsed / FADE_DURATION_MS);
        music.volume = volumeRef.current;
        if (volumeRef.current < MUSIC_VOLUME) frameId = requestAnimationFrame(increaseVolume);
      }
      if (volumeRef.current < MUSIC_VOLUME) frameId = requestAnimationFrame(increaseVolume);
    }

    function playMusic() {
      if (disposed || starting || !music.paused) return;
      starting = true;
      music.play().then(() => {
        if (!disposed) fadeIn();
      }).catch(() => {
        // Browsers may require a user interaction before allowing audio.
      }).finally(() => {
        starting = false;
      });
    }

    playMusic();
    window.addEventListener('pointerdown', playMusic);
    window.addEventListener('keydown', playMusic);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
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
