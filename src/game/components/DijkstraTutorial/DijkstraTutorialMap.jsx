'use client';

import { PHASES } from '@/game/config/phases';
import { DIJKSTRA_FIXED_PHASE, getDijkstraFixedMap } from '@/game/config/dijkstra-fixed-map';
import { getMapProfile } from '@/game/core/map-layout';
import { MapGraph } from '@/game/components/MapGraph/MapGraph';
import { TreasureAnchor } from '@/game/components/TreasureAnchor/TreasureAnchor';
import { BoatDock } from '@/game/components/BoatDock/BoatDock';
import '@/game/components/GameBoard/GameBoard.css';
import './DijkstraTutorialMap.css';

export function DijkstraTutorialMap({ onExit, layout = 'mobile' }) {
  const graph = getDijkstraFixedMap(layout);
  const treasure = graph.nodes.find((node) => node.type === 'finish');
  const boats = graph.nodes.filter((node) => node.type === 'start');

  return (
    <section className="game-board dijkstra-fixed-map" data-layout={layout} aria-label="Tutorial Dijkstra: mapa fixo da última fase">
      <picture className="game-board__background">
        <img src={getMapProfile(layout).asset} alt="" fetchPriority="high" />
      </picture>

      <MapGraph graph={graph} phase={DIJKSTRA_FIXED_PHASE} selectedStartId={null} routeStyle="chevrons" />
      <TreasureAnchor node={treasure} phaseIndex={PHASES.length - 1} totalPhases={PHASES.length} />
      <div inert>
        <BoatDock boats={boats} selectedStartId={null} />
      </div>

      <button className="dijkstra-fixed-map__exit" type="button" onClick={onExit}>
        ← Menu
      </button>
    </section>
  );
}
