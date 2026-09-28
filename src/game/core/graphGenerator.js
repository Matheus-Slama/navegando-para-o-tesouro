import { completeIslandConnections, isValidGraph, removeInvalidIslands } from '@/game/core/map-rules';
import { FINISH_ISLAND, START_ISLANDS } from '@/game/config/phases';
import { GAME_ASSETS } from '@/game/config/gameAssets';
import { getMapProfile, getNodeRadii, getRouteBoundary, getWaterBounds } from '@/game/core/map-layout';
import { createSeededRandom, randomInt, shuffle } from '@/game/core/random';
import { getPhaseResults } from '@/game/core/dijkstra';
import { DirectedGraph, UndirectedGraph } from 'graphology';
import erdosRenyi from 'graphology-generators/random/erdos-renyi.js';

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
export function generateGraphForPhase(phase, seed = Date.now(), layout = 'mobile') {
  let attempt = 0;

  while (attempt < 2000) {
    // Se o mapa for rejeitado, muda a seed para tentar outra combinação.
    const graph = buildCandidateGraph(phase, seed + attempt * 97, layout);
    if (!graph) {
      attempt += 1;
      continue;
    }
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

  throw new Error('Não foi possível gerar um mapa válido para este perfil.');
}

function buildCandidateGraph(phase, seed, layout) {
  const random = createSeededRandom(seed);
  const islandCount = getIslandCount(phase.islandCount, random);
  const intermediateNodes = createIntermediateNodes(islandCount, random, layout);
  if (!intermediateNodes) return null;
  let nodes = [
    ...START_ISLANDS.map((start) => ({ ...start, type: 'start' })),
    ...intermediateNodes,
    { ...FINISH_ISLAND, type: 'finish' }
  ];
  let edges = [];
  const forcedWinnerIndex = randomInt(random, 0, START_ISLANDS.length - 1);
  const GraphClass = phase.directed ? DirectedGraph : UndirectedGraph;
  const maximumRandomEdges = phase.directed
    ? intermediateNodes.length * (intermediateNodes.length - 1)
    : intermediateNodes.length * (intermediateNodes.length - 1) / 2;
  const topology = erdosRenyi(GraphClass, {
    order: intermediateNodes.length,
    approximateSize: Math.min(
      maximumRandomEdges,
      phase.extraRouteCount
    ),
    rng: random
  });

  const addLayoutEdge = (...args) => addEdge(...args, layout);
  connectRandomBackbone(edges, nodes, intermediateNodes, phase, random, addLayoutEdge);

  // Dá uma vantagem inicial a um barco, mas a vitória depende do caminho completo.
  START_ISLANDS.forEach((start, index) => {
    const baseWeight = randomInt(random, phase.weights.min, phase.weights.max);
    const winnerBonus = index === forcedWinnerIndex
      ? -Math.max(1, Math.floor(phase.weights.max / 3))
      : randomInt(random, 1, 5);
    const destinations = shuffle(
      random,
      intermediateNodes.filter((node) => node.y >= 260)
    ).sort((first, second) => distance(start, first) - distance(start, second));

    destinations.some((destination) => addLayoutEdge(
      edges,
      nodes,
      start.id,
      destination.id,
      Math.min(phase.weights.max, Math.max(phase.weights.min, baseWeight + winnerBonus)),
      phase.directed
    ));
  });

  const randomEdges = [];
  // As arestas sorteadas ainda precisam caber no desenho do mapa.
  topology.forEachEdge((edge, attributes, source, target) => {
    const first = intermediateNodes[Number(source)];
    const second = intermediateNodes[Number(target)];
    // Nas fases com setas, as rotas seguem de baixo para cima.
    const [from, to] = phase.directed && first.y < second.y
      ? [second, first]
      : [first, second];
    randomEdges.push([from.id, to.id]);
  });

  // Prioriza as conexões que faltam antes de ocupar espaço com rotas extras.
  completeIslandConnections(edges, nodes, intermediateNodes, phase, random, addLayoutEdge);

  shuffle(random, randomEdges).forEach(([from, to]) => {
    addLayoutEdge(
      edges,
      nodes,
      from,
      to,
      randomInt(random, phase.weights.min, phase.weights.max),
      phase.directed
    );
  });

  ({ nodes, edges } = removeInvalidIslands({ nodes, edges }, phase));

  return {
    nodes,
    edges: edges.map((edge, index) => ({ ...edge, id: `edge-${index}` })),
    metadata: {
      layout,
      dense: islandCount >= 15,
      phaseId: phase.id,
      difficulty: phase.difficulty,
      challengeType: phase.challengeType,
      objective: phase.objective,
      directed: phase.directed,
      islandCount: nodes.filter((node) => node.type === 'intermediate').length,
      score: phase.score,
      hints: phase.hints,
      generator: 'graphology-erdos-renyi'
    }
  };
}

function connectRandomBackbone(edges, nodes, intermediateNodes, phase, random, addLayoutEdge) {
  // Começa pelo tesouro e tenta ligar cada ilha a uma que já chega até ele.
  const ordered = [...intermediateNodes].sort((first, second) => first.y - second.y);
  const connected = [nodes.find((node) => node.type === 'finish')];

  ordered.forEach((node) => {
    const candidates = shuffle(random, connected)
      .filter((candidate) => candidate.y < node.y)
      .sort((first, second) => distance(node, first) - distance(node, second));
    const wasConnected = candidates.some((parent) => addLayoutEdge(
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

function createIntermediateNodes(islandCount, random, layout) {
  const profile = getMapProfile(layout);
  const isDense = islandCount >= 15;
  const minimumDistanceX = layout === 'wide' ? (isDense ? 9 : 14)
    : layout === 'tablet' ? (isDense ? 14 : 20) : (isDense ? 17 : 23);
  const availableSlots = profile.gridPatterns.flatMap((pattern) =>
    pattern.x.map((x) => ({ x, y: pattern.y }))
  ).filter((slot) => {
    const water = getWaterBounds(profile, slot.y);
    const margin = getNodeRadii({ type: 'intermediate' }, isDense, layout).x / 10;
    return slot.y >= 26 && slot.x - margin >= water.left && slot.x + margin <= water.right;
  });
  let selectedSlots = [];

  // Uma escolha de posições pode bloquear as seguintes; nesse caso, sorteia de novo.
  for (let attempt = 0; attempt < 80 && selectedSlots.length < islandCount; attempt += 1) {
    selectedSlots = [];

    shuffle(random, availableSlots).some((slot) => {
      const isFree = selectedSlots.every((selected) => {
        const deltaX = (slot.x - selected.x) / minimumDistanceX;
        const deltaY = (slot.y - selected.y) / 10;
        return deltaX ** 2 + deltaY ** 2 >= 1;
      });

      if (isFree) selectedSlots.push(slot);
      return selectedSlots.length === islandCount;
    });
  }

  if (selectedSlots.length < islandCount) {
    return null;
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

function getIslandCount(configuredCount, random) {
  if (Number.isInteger(configuredCount)) return configuredCount;

  // A primeira amostra do LCG varia pouco entre seeds próximas; a segunda
  // distribui corretamente a quantidade ao regenerar mapas em sequência.
  random();
  return randomInt(random, configuredCount.min, configuredCount.max);
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

function addEdge(edges, nodes, from, to, weight, directed, layout) {
  // A rota precisa ficar visível, sem duplicatas, cruzamentos ou ilhas no meio.
  const fromNode = nodes.find((node) => node.id === from);
  const toNode = nodes.find((node) => node.id === to);
  const isDense = nodes.filter((node) => node.type === 'intermediate').length >= 15;
  const hasVisibleSpace = hasEnoughVisibleRoute(fromNode, toNode, nodes, layout);
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

    return segmentTouchesNode(fromNode, toNode, node, isDense, layout);
  });

  if (hasVisibleSpace && !exists && !crossesAnotherRoute && !overlapsAnotherNode) {
    edges.push({
      from,
      to,
      weight
    });
    return true;
  }

  return false;
}

function hasEnoughVisibleRoute(from, to, nodes, layout) {
  // Mede o trecho entre as bordas das ilhas, descontando a parte coberta pelos sprites.
  const isDense = nodes.filter((node) => node.type === 'intermediate').length >= 15;
  const start = getRouteBoundary(from, to, isDense, layout);
  const end = getRouteBoundary(to, from, isDense, layout);
  const directionX = to.x - from.x;
  const directionY = to.y - from.y;
  const travelsForward = (end.x - start.x) * directionX + (end.y - start.y) * directionY > 0;
  const visibleLength = Math.hypot(
    (end.x - start.x) / 10,
    (end.y - start.y) / 6.5
  );

  // Ilhas menores nos mapas densos permitem rotas mais curtas entre as bordas.
  const minimumVisibleLength = isDense ? 6 : 8;
  return travelsForward && visibleLength >= minimumVisibleLength;
}

function segmentTouchesNode(from, to, node, isDense, layout) {
  const margemDaIlha = getNodeRadii(node, isDense, layout, true);

  // Coloca a ilha no centro (0, 0) e transforma sua margem em um círculo de raio 1.
  const inicioX = (from.x - node.x) / margemDaIlha.x;
  const inicioY = (from.y - node.y) / margemDaIlha.y;
  const fimX = (to.x - node.x) / margemDaIlha.x;
  const fimY = (to.y - node.y) / margemDaIlha.y;
  const direcaoX = fimX - inicioX;
  const direcaoY = fimY - inicioY;
  const comprimentoAoQuadrado = direcaoX ** 2 + direcaoY ** 2;

  // Procura o ponto da rota mais próximo do centro da ilha.
  let posicaoNaRota = 0;
  if (comprimentoAoQuadrado > 0) {
    const projecaoDoCentro = -(inicioX * direcaoX + inicioY * direcaoY);
    posicaoNaRota = projecaoDoCentro / comprimentoAoQuadrado;
    // 0 é o início e 1 é o fim: o ponto precisa ficar dentro desse trecho.
    posicaoNaRota = Math.max(0, Math.min(1, posicaoNaRota));
  }

  const pontoMaisProximoX = inicioX + direcaoX * posicaoNaRota;
  const pontoMaisProximoY = inicioY + direcaoY * posicaoNaRota;
  const distanciaAoQuadrado = pontoMaisProximoX ** 2 + pontoMaisProximoY ** 2;

  // Menos de 1 significa que a rota entrou na margem da ilha.
  return distanciaAoQuadrado < 1;
}

function segmentsCross(pointA, pointB, pointC, pointD) {
  const ladoC = getSideOfLine(pointA, pointB, pointC);
  const ladoD = getSideOfLine(pointA, pointB, pointD);
  const ladoA = getSideOfLine(pointC, pointD, pointA);
  const ladoB = getSideOfLine(pointC, pointD, pointB);

  // Para haver cruzamento, cada rota precisa atravessar a linha da outra.
  const primeiraRotaSeparaCD = ladoC * ladoD < 0;
  const segundaRotaSeparaAB = ladoA * ladoB < 0;
  // Encostar na ponta ou ficar na mesma linha não conta como cruzamento aqui.
  return primeiraRotaSeparaCD && segundaRotaSeparaAB;
}

function getSideOfLine(inicio, fim, ponto) {
  const direcaoX = fim.x - inicio.x;
  const direcaoY = fim.y - inicio.y;
  const pontoX = ponto.x - inicio.x;
  const pontoY = ponto.y - inicio.y;

  // O sinal indica o lado da linha; zero indica que o ponto está sobre ela.
  return direcaoX * pontoY - direcaoY * pontoX;
}
