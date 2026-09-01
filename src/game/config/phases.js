import mapConfig from '@/game/config/maps.json';

// O JSON é a fonte única das regras e do balanceamento dos mapas.
export const MAP_SIZE = mapConfig.mapSize;
export const START_ISLANDS = mapConfig.starts;
export const FINISH_ISLAND = mapConfig.finish;
export const GAME_DESIGN = mapConfig.gameDesign;
export const TUTORIAL_MAP = mapConfig.tutorial;

const finalPhase = mapConfig.phases.at(-1);

export const PHASES = mapConfig.testing?.useFinalPhaseRulesOnFirstPhase
  ? mapConfig.phases.map((phase, index) => index === 0
    ? {
        ...finalPhase,
        id: phase.id,
        name: `Teste completo — ${finalPhase.name}`,
        isTestPhase: true
      }
    : phase)
  : mapConfig.phases;
