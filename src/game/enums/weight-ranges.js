// Pesos, ilhas e rotas extras pertencem ao mesmo perfil de dificuldade.
// As faixas de ilhas variam os mapas sem repetir configurações nas fases.
export const WEIGHT_RANGES = Object.freeze({
  facil: Object.freeze({ min: 1, max: 4, extraRouteCount: 2, islandCount: Object.freeze({ min: 6, max: 7 }) }),
  media: Object.freeze({ min: 1, max: 8, extraRouteCount: 10, islandCount: Object.freeze({ min: 8, max: 9 }) }),
  dificil: Object.freeze({ min: 2, max: 20, extraRouteCount: 18, islandCount: Object.freeze({ min: 10, max: 15 }) }),
  muitoDificil: Object.freeze({
    min: 2, max: 35, extraRouteCount: 32,
    islandCount: Object.freeze({ min: 17, max: 23 }),
    // Exige alternativas suficientes e um caminho vencedor com várias etapas.
    minimumEdgeCount: 24, minimumWinnerPathNodes: 6,
  }),
});

const DIFFICULTY_KEYS = Object.freeze({
  'fácil': 'facil',
  'média': 'media',
  'difícil': 'dificil',
  'muito difícil': 'muitoDificil',
});

export function getWeightRange(difficulty) {
  const range = WEIGHT_RANGES[DIFFICULTY_KEYS[difficulty]];
  if (!range) throw new Error(`Faixa de pesos ausente para a dificuldade ${difficulty}.`);
  return range;
}
