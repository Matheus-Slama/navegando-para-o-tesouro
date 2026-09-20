import maps from '@/game/config/dijkstra-fixed-maps.json';
import { PHASES } from '@/game/config/phases';
import { getPhaseResults } from '@/game/core/dijkstra';

export const DIJKSTRA_FIXED_PHASE = PHASES.at(-1);

// Mapas salvos: entrar novamente no tutorial não sorteia ilhas, rotas ou pesos.
const graphs = Object.fromEntries(Object.entries(maps).map(([layout, graph]) => [
  layout,
  { ...graph, results: getPhaseResults(graph, DIJKSTRA_FIXED_PHASE) }
]));

export function getDijkstraFixedMap(layout = 'mobile') {
  return graphs[layout] ?? graphs.mobile;
}
