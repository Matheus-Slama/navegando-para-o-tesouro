export function calculateScore(phase, elapsedSeconds) {
  const { maxScore, targetTimeSeconds } = phase.score;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0 || targetTimeSeconds <= 0) return 0;
  // Até o tempo de referência, concede o máximo. Depois, a recompensa cai
  // proporcionalmente: gastar o dobro do tempo rende metade dos pontos.
  // O limite evita divisão por zero e pontos excessivos por cliques imediatos.
  return Math.round(maxScore * targetTimeSeconds / Math.max(elapsedSeconds, targetTimeSeconds));
}
