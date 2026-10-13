'use client';

import { useEffect, useRef, useState } from 'react';
import { calculateScore } from '@/game/core/scoring';
import { readHighscore, saveHighscore } from '@/game/core/highscore';
import { getWrongBoatPenalty } from '@/game/config/balance';

export function useJourney(running) {
  const [score, setScore] = useState(0);
  const [highscore, setHighscore] = useState(0);
  const [lives, setLives] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const clock = useRef({ accumulated: 0, started: null });
  const settled = useRef(false);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    try {
      const storage = window.localStorage;
      readHighscore(storage).then((best) => { if (active) setHighscore((value) => Math.max(value, best)); });
    } catch {
      // Sem armazenamento, a jornada mantém o recorde apenas nesta sessão.
    }
    return () => { active = false; };
  }, []);

  function currentTime() {
    const { accumulated, started } = clock.current;
    return accumulated + (started === null ? 0 : (performance.now() - started) / 1000);
  }

  useEffect(() => {
    if (!running) return;
    clock.current.started = performance.now();
    const interval = setInterval(() => setElapsed(currentTime()), 200);
    return () => {
      clock.current.accumulated = currentTime();
      clock.current.started = null;
      clearInterval(interval);
    };
  }, [running]);

  function resetClock() {
    clock.current = { accumulated: 0, started: running ? performance.now() : null };
    settled.current = false;
    setElapsed(0);
  }

  function reset() {
    setScore(0);
    setLives(3);
    resetClock();
  }

  function freeze() {
    clock.current.accumulated = currentTime();
    clock.current.started = null;
    setElapsed(clock.current.accumulated);
  }

  function finish(won, phase) {
    if (settled.current) return;
    settled.current = true;
    if (!won) {
      const penalty = getWrongBoatPenalty(currentTime());
      setScore((value) => value - penalty);
      setLives((value) => Math.max(0, value - 1));
      return;
    }
    const points = calculateScore(phase, currentTime());
    const total = score + points;
    setScore(total);
    setHighscore((previous) => Math.max(previous, total));
    // Serializa gravações para que uma vitória antiga não sobrescreva a mais recente.
    writes.current = writes.current.then(async () => {
      try {
        await saveHighscore(window.localStorage, total);
      } catch {
        // Falhas de armazenamento não interrompem a jornada.
      }
    });
  }

  return { score, highscore, lives, elapsed, reset, resetClock, freeze, finish };
}
