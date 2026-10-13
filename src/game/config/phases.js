import mapConfig from '@/game/config/json/maps.json';
import mapAnchors from '@/game/config/json/map-anchors.json';
import { getWeightRange } from '@/game/enums/weight-ranges';

// Barcos e tesouro são pontos fixos compartilhados pela geração e validação.
export const START_ISLANDS = mapAnchors.starts;
export const FINISH_ISLAND = mapAnchors.finish;

// O JSON guarda os mapas; a dificuldade define os pesos das fases.
export const PHASES = mapConfig.phases.map((phase) => ({
  ...phase,
  weights: getWeightRange(phase.difficulty),
}));
