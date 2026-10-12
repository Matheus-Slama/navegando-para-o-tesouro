/**
 * Configurações usadas para gerar o grafo de cada dificuldade.
 * O peso é o custo de atravessar uma conexão entre ilhas; o custo de uma
 * rota é a soma dos pesos das conexões percorridas.
 *
 * minimumEdgeWeight / maximumEdgeWeight: limites inclusivos do peso sorteado
 * para cada conexão (aresta).
 * islandCount.minimumIslandCount / maximumIslandCount: limites da quantidade
 * de ilhas intermediárias, sem contar as origens dos barcos e o tesouro.
 * extraRouteCount: parâmetro que controla a quantidade de conexões extras
 * na geração do mapa.
 * minimumEdgeCount: quantidade mínima de conexões exigida no grafo.
 * minimumWinnerPathNodes: quantidade mínima de vértices no caminho vencedor,
 * contando a origem do barco e o tesouro.
 */
export const WEIGHT_RANGES = Object.freeze({
  easy: Object.freeze({ minimumEdgeWeight: 1, maximumEdgeWeight: 4, extraRouteCount: 2, islandCount: Object.freeze({ minimumIslandCount: 6, maximumIslandCount: 7 }) }),
  medium: Object.freeze({ minimumEdgeWeight: 1, maximumEdgeWeight: 8, extraRouteCount: 10, islandCount: Object.freeze({ minimumIslandCount: 8, maximumIslandCount: 9 }) }),
  hard: Object.freeze({ minimumEdgeWeight: 2, maximumEdgeWeight: 20, extraRouteCount: 18, islandCount: Object.freeze({ minimumIslandCount: 10, maximumIslandCount: 15 }) }),
  veryHard: Object.freeze({
    minimumEdgeWeight: 2, maximumEdgeWeight: 35, extraRouteCount: 32,
    islandCount: Object.freeze({ minimumIslandCount: 17, maximumIslandCount: 23 }),
    // Exige alternativas suficientes e um caminho vencedor com várias etapas.
    minimumEdgeCount: 24, minimumWinnerPathNodes: 6,
  }),
});

export function getWeightRange(difficulty) {
  const range = WEIGHT_RANGES[difficulty];
  if (!range) throw new Error(`Faixa de pesos ausente para a dificuldade ${difficulty}.`);
  return range;
}
