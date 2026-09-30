'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { GAME_ASSETS } from '@/game/config/gameAssets';
import './AnimatedBoat.css';

export function AnimatedBoats({ graph, raceStarted, animationKey, onWinnerArrive }) {
  if (!raceStarted) return null;

  return (
    <div className="animated-boat__track" aria-live="polite">
      {graph.results.all.map((result) => {
        const boat = graph.nodes.find((node) => node.id === result.startId);

        return (
          <RacingBoat
            key={`${animationKey}-${result.startId}`}
            graph={graph}
            boat={boat}
            result={result}
            winnerDistance={graph.results.winner.distance}
            isWinner={result.startId === graph.results.winner.startId}
            onWinnerArrive={onWinnerArrive}
          />
        );
      })}
    </div>
  );
}

function RacingBoat({ graph, boat, result, winnerDistance, isWinner, onWinnerArrive }) {
  const boatRef = useRef(null);
  const onArrival = useRef(onWinnerArrive);

  useEffect(() => { onArrival.current = onWinnerArrive; }, [onWinnerArrive]);

  useEffect(() => {
    const element = boatRef.current;
    const track = element?.parentElement;
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    const pathNodes = result.path.map((nodeId) => nodesById.get(nodeId)).filter(Boolean);

    if (!track || !element || pathNodes.length < 2) return undefined;

    const points = pathNodes.map((node) => ({
      x: node.x / 10,
      y: node.y / 6.5
    }));
    const segmentWeights = result.path.slice(1).map((nodeId, index) => {
      const previousId = result.path[index];
      const matchingEdges = graph.edges.filter((route) =>
        (route.from === previousId && route.to === nodeId) ||
        (!graph.metadata.directed && route.from === nodeId && route.to === previousId)
      );

      return matchingEdges.length
        ? Math.min(...matchingEdges.map((edge) => edge.weight))
        : 1;
    });
    const pathCost = segmentWeights.reduce((total, weight) => total + weight, 0);
    let accumulatedCost = 0;
    const keyframes = points.map((point, index) => {
      if (index > 0) accumulatedCost += segmentWeights[index - 1];

      return {
        left: `${point.x}%`,
        top: `${point.y}%`,
        offset: index === points.length - 1
          ? 1
          : Math.min(1, Math.max(0, pathCost ? accumulatedCost / pathCost : 0))
      };
    });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const costDifference = result.distance - winnerDistance;
    const duration = reducedMotion ? 1 : 6400 + 12000 * (1 - Math.exp(-costDifference / 10));
    const animation = element.animate(keyframes, {
      duration,
      easing: 'linear',
      fill: 'forwards'
    });

    if (isWinner) {
      animation.finished.then(() => onArrival.current?.()).catch(() => {});
    }

    return () => animation.cancel();
  }, [boat.id, graph, isWinner, result, winnerDistance]);

  return (
    <Image
      ref={boatRef}
      className="animated-boat"
      src={GAME_ASSETS.boats[boat.boat]}
      alt={`${boat.label} navegando até o tesouro`}
      width={1254}
      height={1254}
      sizes="20vw"
      priority
    />
  );
}
