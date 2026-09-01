import { FINISH_ISLAND, START_ISLANDS } from '@/game/config/phases';
import { GAME_ASSETS } from '@/game/config/gameAssets';
import islandPlacement from '@/game/config/islandPlacement.json';
import { createSeededRandom, randomInt, shuffle } from '@/game/core/random';
import { getPhaseResults } from '@/game/core/dijkstra';
import { DirectedGraph, UndirectedGraph } from 'graphology';
import erdosRenyi from 'graphology-generators/random/erdos-renyi';

/**
 * Gera um grafo jogável com vencedor único.
 *
 * A geração é controlada:
 * - ilhas iniciais e final são fixas;
 * - ilhas intermediárias são distribuídas no mapa;
 * - cada barco recebe uma rota principal;
 * - rotas extras são adicionadas;
 * - Dijkstra valida se existe um único vencedor.
 */
export function generateGraphForPhase(phase, seed = Date.now()) {
  let attempt = 0;

  while (attempt < 200) {
    const graph = buildCandidateGraph(phase, seed + attempt * 97);
    const results = getPhaseResults(graph, phase);

    if (isValidGraph(graph, results, phase)) {
      return {
        ...graph,
        seed: seed + attempt * 97,
        results
      };
    }

    attempt += 1;
  }

  throw new Error(`Não foi possível gerar um mapa válido para a fase ${phase.id}.`);
}

function isValidGraph(graph, results, phase) {
  if (results.ordered.length !== START_ISLANDS.length || !results.hasUniqueWinner) {
    return false;
  }

  const [winner, second] = results.ordered;

  if (phase.minimumEdgeCount && graph.edges.length < phase.minimumEdgeCount) {
    return false;
  }

  if (phase.minimumWinnerPathNodes && winner.path.length < phase.minimumWinnerPathNodes) {
    return false;
  }

  return second.distance - winner.distance >= phase.uniqueWinnerGap;
}

function buildCandidateGraph(phase, seed) {
  const random = createSeededRandom(seed);
  const nodes = [
    ...START_ISLANDS.map((start) => ({ ...start, type: 'start' })),
    ...createIntermediateNodes(phase, random),
    { ...FINISH_ISLAND, type: 'finish' }
  ];
  const edges = [];
  const intermediateNodes = nodes.filter((node) => node.type === 'intermediate');
  const forcedWinnerIndex = randomInt(random, 0, START_ISLANDS.length - 1);
  const GraphClass = phase.directed ? DirectedGraph : UndirectedGraph;
  const maximumRandomEdges = phase.directed
    ? intermediateNodes.length * (intermediateNodes.length - 1)
    : intermediateNodes.length * (intermediateNodes.length - 1) / 2;
  const topology = erdosRenyi(GraphClass, {
    order: intermediateNodes.length,
    approximateSize: Math.min(
      maximumRandomEdges,
      Math.max(intermediateNodes.length - 1, phase.extraRouteCount + intermediateNodes.length)
    ),
    rng: random
  });

  connectRandomBackbone(edges, nodes, intermediateNodes, phase, random);

  START_ISLANDS.forEach((start, index) => {
    const baseWeight = randomInt(random, phase.weights.min, phase.weights.max);
    const winnerBonus = index === forcedWinnerIndex
      ? -Math.floor(phase.weights.max / 3)
      : randomInt(random, 1, 5);
    const destinations = shuffle(
      random,
      intermediateNodes.filter((node) => node.y >= 260)
    ).sort((first, second) => distance(start, first) - distance(start, second));

    destinations.some((destination) => addEdge(
      edges,
      nodes,
      start.id,
      destination.id,
      Math.max(1, baseWeight + winnerBonus),
      phase.directed
    ));
  });

  const randomEdges = [];
  topology.forEachEdge((edge, attributes, source, target) => {
    const first = intermediateNodes[Number(source)];
    const second = intermediateNodes[Number(target)];
    const [from, to] = phase.directed && first.y < second.y
      ? [second, first]
      : [first, second];
    randomEdges.push([from.id, to.id]);
  });

  shuffle(random, randomEdges).forEach(([from, to]) => {
    addEdge(
      edges,
      nodes,
      from,
      to,
      randomInt(random, phase.weights.min + 1, phase.weights.max + 5),
      phase.directed
    );
  });

  return {
    nodes,
    edges: edges.map((edge, index) => ({ ...edge, id: `edge-${index}` })),
    metadata: {
      phaseId: phase.id,
      difficulty: phase.difficulty,
      challengeType: phase.challengeType,
      objective: phase.objective,
      directed: phase.directed,
      islandCount: phase.islandCount,
      score: phase.score,
      hints: phase.hints,
      generator: 'graphology-erdos-renyi'
    }
  };
}

function connectRandomBackbone(edges, nodes, intermediateNodes, phase, random) {
  const ordered = [...intermediateNodes].sort((first, second) => first.y - second.y);
  const connected = [nodes.find((node) => node.type === 'finish')];

  ordered.forEach((node) => {
    const candidates = shuffle(random, connected)
      .filter((candidate) => candidate.y < node.y)
      .sort((first, second) => distance(node, first) - distance(node, second));
    const wasConnected = candidates.some((parent) => addEdge(
      edges,
      nodes,
      node.id,
      parent.id,
      randomInt(random, phase.weights.min, phase.weights.max),
      phase.directed
    ));

    if (wasConnected) connected.push(node);
  });
}

function createIntermediateNodes(phase, random) {
  const profile = islandPlacement.profiles[islandPlacement.activeProfile];
  const availableSlots = profile.gridPatterns.flatMap((pattern) =>
    pattern.x.map((x) => ({ x, y: pattern.y }))
  );
  let selectedSlots = [];

  for (let attempt = 0; attempt < 80 && selectedSlots.length < phase.islandCount; attempt += 1) {
    selectedSlots = [];

    shuffle(random, availableSlots).some((slot) => {
      const isFree = selectedSlots.every((selected) => {
        const deltaX = (slot.x - selected.x) / 23;
        const deltaY = (slot.y - selected.y) / 10;
        return deltaX ** 2 + deltaY ** 2 >= 1;
      });

      if (isFree) selectedSlots.push(slot);
      return selectedSlots.length === phase.islandCount;
    });
  }

  if (selectedSlots.length < phase.islandCount) {
    throw new Error(`O perfil ${islandPlacement.activeProfile} não possui posições sem sobreposição suficientes.`);
  }

  return selectedSlots.map((position, index) => ({
      id: `island-${index + 1}`,
      label: `Ilha ${index + 1}`,
      sprite: createRandomIslandSprite(random),
      type: 'intermediate',
      x: Math.round(position.x * 10),
      y: Math.round(position.y * 6.5)
    }));
}

function createRandomIslandSprite(random) {
  const totalIslands = GAME_ASSETS.islandSheets.reduce(
    (total, sheet) => total + sheet.columns * sheet.rows,
    0
  );
  let islandIndex = randomInt(random, 0, totalIslands - 1);

  for (let sheetIndex = 0; sheetIndex < GAME_ASSETS.islandSheets.length; sheetIndex += 1) {
    const sheet = GAME_ASSETS.islandSheets[sheetIndex];
    const sheetSize = sheet.columns * sheet.rows;

    if (islandIndex < sheetSize) {
      return {
        sheetIndex,
        column: islandIndex % sheet.columns,
        row: Math.floor(islandIndex / sheet.columns)
      };
    }

    islandIndex -= sheetSize;
  }

  return { sheetIndex: 0, column: 0, row: 0 };
}

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function addEdge(edges, nodes, from, to, weight, directed) {
  const fromNode = nodes.find((node) => node.id === from);
  const toNode = nodes.find((node) => node.id === to);
  const exists = edges.some((edge) =>
    (edge.from === from && edge.to === to) ||
    (!directed && edge.from === to && edge.to === from)
  );
  const crossesAnotherRoute = edges.some((edge) => {
    if ([edge.from, edge.to].includes(from) || [edge.from, edge.to].includes(to)) {
      return false;
    }

    return segmentsCross(
      fromNode,
      toNode,
      nodes.find((node) => node.id === edge.from),
      nodes.find((node) => node.id === edge.to)
    );
  });
  const overlapsAnotherNode = nodes.some((node) => {
    if (node.id === from || node.id === to) {
      return false;
    }

    return segmentTouchesNode(fromNode, toNode, node);
  });

  if (!exists && !crossesAnotherRoute && !overlapsAnotherNode) {
    edges.push({
      from,
      to,
      weight
    });
    return true;
  }

  return false;
}

function segmentTouchesNode(from, to, node) {
  const radius = getNodeClearance(node);
  const fromX = (from.x - node.x) / radius.x;
  const fromY = (from.y - node.y) / radius.y;
  const toX = (to.x - node.x) / radius.x;
  const toY = (to.y - node.y) / radius.y;
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;
  const lengthSquared = deltaX ** 2 + deltaY ** 2;
  const projection = lengthSquared
    ? Math.min(1, Math.max(0, -(fromX * deltaX + fromY * deltaY) / lengthSquared))
    : 0;
  const closestX = fromX + deltaX * projection;
  const closestY = fromY + deltaY * projection;

  return closestX ** 2 + closestY ** 2 < 1;
}

function getNodeClearance(node) {
  if (node.type === 'finish') return { x: 180, y: 82 };
  if (node.type === 'start') return { x: 120, y: 52 };
  return { x: 112, y: 42 };
}

function segmentsCross(pointA, pointB, pointC, pointD) {
  const orientation = (first, second, third) =>
    (second.x - first.x) * (third.y - first.y) -
    (second.y - first.y) * (third.x - first.x);

  const abC = orientation(pointA, pointB, pointC);
  const abD = orientation(pointA, pointB, pointD);
  const cdA = orientation(pointC, pointD, pointA);
  const cdB = orientation(pointC, pointD, pointB);

  return abC * abD < 0 && cdA * cdB < 0;
}
