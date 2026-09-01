import './MapGraph.css';
import Image from 'next/image';
import { AnimatedBoats } from '@/game/components/AnimatedBoat/AnimatedBoat';
import { GAME_ASSETS } from '@/game/config/gameAssets';

export function MapGraph({ graph, phase, selectedStartId, animationKey, onWinnerArrive }) {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const islands = graph.nodes.filter((node) => node.type === 'intermediate');
  const weightPositions = getWeightPositions(graph, nodesById);

  return (
    <div className="map-graph" role="img" aria-label={`Mapa da fase ${phase.name}, dificuldade ${phase.difficulty}`}>
      <svg className="map-graph__canvas" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id="route-chevron" viewBox="0 0 14 14" refX="7" refY="7" markerWidth="28" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse">
          <path className="map-graph__chevron" d="M 1.5 1.5 L 6.5 7 L 1.5 12.5 M 7.5 1.5 L 12.5 7 L 7.5 12.5" />
        </marker>
      </defs>
      <g className="map-graph__routes">
        {graph.edges.map((edge) => {
          const from = nodesById.get(edge.from);
          const to = nodesById.get(edge.to);
          const route = getVisibleRoute(from, to);

          return (
            <g key={edge.id}>
              <polyline
                className="map-graph__route-direction"
                points={getDirectionPoints(route)}
                markerMid="url(#route-chevron)"
                markerEnd="url(#route-chevron)"
              />
            </g>
          );
        })}
      </g>
      </svg>

      {graph.edges.map((edge) => {
        if (!phase.weights.visible) return null;
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
            <Image
              className="map-graph__weight-icon"
              src="/assets/game/ui/route-weight-hourglass.png"
              alt=""
              width={1235}
              height={1274}
              sizes="10vw"
            />
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

function getWeightPositions(graph, nodesById) {
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
    const offsets = length < 28
      ? [5, -5, 7, -7, 9, -9]
      : [0, 1.5, -1.5, 3, -3];
    const candidates = [];

    [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74].forEach((progress) => {
      offsets.forEach((offset) => {
        candidates.push({
          x: from.x + deltaX * progress + perpendicular.x * offset,
          y: from.y + deltaY * progress + perpendicular.y * offset
        });
      });
    });

    let position = candidates.find((candidate) =>
      isWeightPositionFree(candidate, graph.nodes, occupied)
    );

    if (position) {
      positions.set(edge.id, position);
      occupied.push(position);
    }
  });

  return positions;
}

function isWeightPositionFree(position, nodes, occupied) {
  const insideMap = position.x > 7 && position.x < 93 && position.y > 9 && position.y < 86;
  const touchesNode = nodes.some((node) => {
    const radii = node.type === 'finish'
      ? { x: 19, y: 11 }
      : node.type === 'start'
        ? { x: 13, y: 7 }
        : { x: 11, y: 5.5 };
    const deltaX = (position.x - node.x / 10) / radii.x;
    const deltaY = (position.y - node.y / 6.5) / radii.y;

    return deltaX ** 2 + deltaY ** 2 < 1;
  });
  const touchesWeight = occupied.some((other) =>
    Math.abs(position.x - other.x) < 14 && Math.abs(position.y - other.y) < 7
  );

  return insideMap && !touchesNode && !touchesWeight;
}

function getVisibleRoute(from, to) {
  const start = getNodeBoundary(from, to);
  const end = getNodeBoundary(to, from);

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

function getNodeBoundary(node, otherNode) {
  const deltaX = otherNode.x - node.x;
  const deltaY = otherNode.y - node.y;
  const radii = {
    start: { x: 105, y: 46 },
    intermediate: { x: 88, y: 28 },
    finish: { x: 55, y: 12 }
  }[node.type];
  const radiusX = radii.x;
  const radiusY = radii.y;
  const scale = 1 / Math.sqrt((deltaX / radiusX) ** 2 + (deltaY / radiusY) ** 2);

  return {
    x: node.x + deltaX * scale,
    y: node.y + deltaY * scale
  };
}
