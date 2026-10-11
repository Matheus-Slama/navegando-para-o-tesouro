export const WRONG_BOAT_PENALTY = 250;

export function getPhaseBalance(id) {
  if (!Number.isInteger(id) || id < 1) throw new Error(`ID de fase inválido: ${id}.`);
  return {
    // Fases maiores dão mais pontos e tempo para analisar o mapa.
    score: { maxScore: id * 1000, targetTimeSeconds: 20 + (id - 1) * 15 },
  };
}
