import { getNodeRadii, getRouteBoundary } from '@/game/core/map-layout';
import './MapGraph.css';
import { AnimatedBoats } from '@/game/components/AnimatedBoat/AnimatedBoat';
import { GAME_ASSETS } from '@/game/config/gameAssets';

export function MapGraph({ graph, phase, selectedStartId, animationKey, onWinnerArrive, routeStyle = 'chevrons' }) {
  const layout = graph.metadata.layout ?? 'mobile';
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const islands = graph.nodes.filter((node) => node.type === 'intermediate');
  const isDense = graph.metadata.dense ?? islands.length >= 15;
  const weightPositions = getWeightPositions(graph, nodesById, isDense);
  const usesChevrons = routeStyle === 'chevrons';
  const arrowMarkerId = routeStyle === 'arrows-white' ? 'route-arrow-white' : 'route-arrow-black';

  return (
    <div className={`map-graph${isDense ? ' map-graph--dense' : ''}`} role="img" aria-label={`Mapa da fase ${phase.name}, dificuldade ${phase.difficulty}`}>
      <svg className="map-graph__canvas" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id="route-chevron" viewBox="0 0 14 14" refX="7" refY="7" markerWidth="28" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse">
          <path className="map-graph__chevron" d="M 1.5 1.5 L 6.5 7 L 1.5 12.5 M 7.5 1.5 L 12.5 7 L 7.5 12.5" />
        </marker>
        <marker id="route-arrow-white" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
          <path className="map-graph__arrow map-graph__arrow--white" d="M 1 1 L 10 6 L 1 11" />
        </marker>
        <marker id="route-arrow-black" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
          <path className="map-graph__arrow map-graph__arrow--black" d="M 1 1 L 10 6 L 1 11" />
        </marker>
      </defs>
      <g className="map-graph__routes">
        {graph.edges.map((edge) => {
          const from = nodesById.get(edge.from);
          const to = nodesById.get(edge.to);
          const route = getVisibleRoute(from, to, isDense, layout);

          return (
            <g key={edge.id}>
              {usesChevrons ? (
                <polyline
                  className="map-graph__route-direction map-graph__route-direction--chevrons"
                  points={getDirectionPoints(route)}
                  markerMid="url(#route-chevron)"
                  markerEnd="url(#route-chevron)"
                />
              ) : (
                <line
                  className={`map-graph__route-direction map-graph__route-direction--${routeStyle}`}
                  x1={route.x1}
                  y1={route.y1}
                  x2={route.x2}
                  y2={route.y2}
                  markerEnd={`url(#${arrowMarkerId})`}
                />
              )}
            </g>
          );
        })}
      </g>
      <g className="map-graph__weight-connectors">
        {graph.edges.map((edge) => {
          const position = weightPositions.get(edge.id);
          if (!position) return null;

          return (
            <line
              key={`${edge.id}-connector`}
              className="map-graph__weight-connector"
              x1={position.anchorX * 10}
              y1={position.anchorY * 6.5}
              x2={position.x * 10}
              y2={position.y * 6.5}
            />
          );
        })}
      </g>
      </svg>

      {graph.edges.map((edge) => {
        const position = weightPositions.get(edge.id);
        if (!position) return null;

        return (
          <span
            key={`${edge.id}-weight`}
            className="map-graph__weight"
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            aria-label={`Tempo da rota: ${edge.weight}`}
            title={`Tempo: ${edge.weight}`}
          >
            <span>{edge.weight}</span>
          </span>
        );
      })}

      {islands.map((island) => {
        const sheet = GAME_ASSETS.islandSheets[island.sprite.sheetIndex];
        const crop = {
          left: sheet.xBounds[island.sprite.column],
          top: sheet.yBounds[island.sprite.row],
          width: sheet.xBounds[island.sprite.column + 1] - sheet.xBounds[island.sprite.column],
          height: sheet.yBounds[island.sprite.row + 1] - sheet.yBounds[island.sprite.row]
        };

        return (
          <div
            key={island.id}
            className="map-graph__island"
            style={{ left: `${island.x / 10}%`, top: `${island.y / 6.5}%` }}
            data-graph-node-id={island.id}
            aria-label={island.label}
          >
            <span
              className="map-graph__island-sprite"
              style={{
                aspectRatio: `${crop.width} / ${crop.height}`
              }}
              aria-hidden="true"
            >
              <span
                className="map-graph__island-sheet"
                style={{
                  width: `${sheet.width / crop.width * 100}%`,
                  height: `${sheet.height / crop.height * 100}%`,
                  left: `${-crop.left / crop.width * 100}%`,
                  top: `${-crop.top / crop.height * 100}%`,
                  backgroundImage: `url(${sheet.src})`
                }}
              />
            </span>
          </div>
        );
      })}

      <AnimatedBoats graph={graph} raceStarted={Boolean(selectedStartId)} animationKey={animationKey} onWinnerArrive={onWinnerArrive} />
    </div>
  );
}

function getWeightPositions(graph, nodesById, isDense) {
  const positions = new Map();
  const occupied = [];

  graph.edges.forEach((edge) => {
    const fromNode = nodesById.get(edge.from);
    const toNode = nodesById.get(edge.to);
    const from = { x: fromNode.x / 10, y: fromNode.y / 6.5 };
    const to = { x: toNode.x / 10, y: toNode.y / 6.5 };
    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;
    const length = Math.hypot(deltaX, deltaY) || 1;
    const perpendicular = { x: -deltaY / length, y: deltaX / length };
    const offsets = isDense
      ? [1.5, -1.5, 2.5, -2.5, 3.5, -3.5, 4.5, -4.5]
      : length < 28
        ? [3.5, -3.5, 5, -5, 6.5, -6.5]
        : [2, -2, 3, -3, 4, -4, 5, -5];
    const candidates = [];

    [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82].forEach((progress) => {
      offsets.forEach((offset) => {
        candidates.push({
          x: from.x + deltaX * progress + perpendicular.x * offset,
          y: from.y + deltaY * progress + perpendicular.y * offset,
          anchorX: from.x + deltaX * progress,
          anchorY: from.y + deltaY * progress
        });
      });
    });

    const position = candidates.find((candidate) =>
      isWeightPositionFree(candidate, graph.nodes, occupied, isDense, graph.metadata.layout)
    ) ?? getBestAvailableWeightPosition(candidates, graph.nodes, occupied);

    positions.set(edge.id, position);
    occupied.push(position);
  });

  return positions;
}

function isWeightPositionFree(position, nodes, occupied, isDense, layout) {
  const insideMap = isInsideWeightArea(position);
  const touchesNode = nodes.some((node) => {
    const nodeRadius = getNodeRadii(node, isDense, layout, true);
    const radii = { x: nodeRadius.x / 10 + 2, y: nodeRadius.y / 6.5 + 1.5 };
    const deltaX = (position.x - node.x / 10) / radii.x;
    const deltaY = (position.y - node.y / 6.5) / radii.y;

    return deltaX ** 2 + deltaY ** 2 < 1;
  });
  const touchesWeight = occupied.some((other) =>
    Math.abs(position.x - other.x) < (layout === 'wide' ? 4 : isDense ? 7 : 10) &&
    Math.abs(position.y - other.y) < (isDense ? 3.25 : 4.5)
  );

  return insideMap && !touchesNode && !touchesWeight;
}

function getBestAvailableWeightPosition(candidates, nodes, occupied) {
  const insideCandidates = candidates.filter(isInsideWeightArea);

  return (insideCandidates.length ? insideCandidates : candidates).reduce((best, candidate) =>
    getWeightPositionScore(candidate, nodes, occupied) > getWeightPositionScore(best, nodes, occupied)
      ? candidate
      : best
  );
}

function getWeightPositionScore(position, nodes, occupied) {
  const nodeDistance = Math.min(...nodes.map((node) =>
    Math.hypot(position.x - node.x / 10, position.y - node.y / 6.5)
  ));
  const weightDistance = occupied.length
    ? Math.min(...occupied.map((other) =>
        Math.hypot((position.x - other.x) / 2, position.y - other.y)
      ))
    : 100;

  return Math.min(nodeDistance, weightDistance);
}

function isInsideWeightArea(position) {
  return position.x > 7 && position.x < 93 && position.y > 9 && position.y < 86;
}

function getVisibleRoute(from, to, isDense, layout) {
  const start = getRouteBoundary(from, to, isDense, layout);
  const end = getRouteBoundary(to, from, isDense, layout);

  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

function getDirectionPoints(route) {
  const length = Math.hypot(route.x2 - route.x1, route.y2 - route.y1);
  const chevronCount = Math.max(3, Math.min(24, Math.floor(length / 21)));

  return Array.from({ length: chevronCount + 1 }, (_, index) => {
    const progress = index / chevronCount;
    const x = route.x1 + (route.x2 - route.x1) * progress;
    const y = route.y1 + (route.y2 - route.y1) * progress;
    return `${x},${y}`;
  }).join(' ');
}
