import { FINISH_ISLAND, START_ISLANDS } from '@/game/config/phases';
import { randomInt, shuffle } from '@/game/core/random';
import { getMapProfile, getNodeRadii, getWaterBounds } from '@/game/core/map-layout';

/**
 * Regras das ilhas intermediárias:
 * 1. Devem ser alcançáveis a partir de algum barco.
 * 2. Devem ter um caminho até o tesouro.
 * 3. Devem ter pelo menos uma entrada e uma saída em todas as fases.
 * 4. Só pode existir uma rota com o peso mínimo vencedor, mesmo entre
 *    caminhos diferentes que saem do mesmo barco.
 * 5. As ilhas devem caber na água do perfil escolhido para a tela.
 * Nas fases direcionadas, os caminhos respeitam o sentido das setas.
 * As partidas e o tesouro não precisam ter entrada e saída.
 *
 * Primeiro completamos conexões; depois removemos ilhas inválidas.
 * A validação final também confere pesos, vencedor e dificuldade.
 */

/** Tenta completar conexões; addEdge verifica as restrições geométricas. */
export function completeIslandConnections(edges, nodes, intermediateNodes, phase, random, addEdge) {
  // Completa entradas e saidas sem cruzar rotas nem sobrepor ilhas.
  intermediateNodes.forEach((node) => {
    for (const incoming of [true, false]) {
      if (edges.some((edge) => (incoming ? edge.to : edge.from) === node.id)) continue;
      const candidates = shuffle(random, nodes.filter((candidate) => incoming
        ? candidate.type !== 'finish' && candidate.y > node.y
        : candidate.type !== 'start' && candidate.y < node.y
      )).sort((first, second) => distance(node, first) - distance(node, second));
      candidates.some((candidate) => addEdge(
        edges, nodes,
        incoming ? candidate.id : node.id,
        incoming ? node.id : candidate.id,
        randomInt(random, phase.weights.min, phase.weights.max), phase.directed
      ));
    }
  });

}

/** Repete a remoção porque excluir uma ilha pode desconectar outra. */
export function removeInvalidIslands(graph, phase) {
  let { nodes, edges } = graph;
  // Descarta ilhas que a geometria nao permitiu conectar, em vez de exibir becos sem saida.
  while (true) {
    const candidate = { nodes, edges };
    const reachable = getReachableNodes(candidate, START_ISLANDS.map((node) => node.id), phase.directed);
    const reachesFinish = getReachableNodes(candidate, [FINISH_ISLAND.id], phase.directed, true);
    const invalidIds = new Set(nodes.filter((node) => node.type === 'intermediate' && (
      !reachable.has(node.id) || !reachesFinish.has(node.id) ||
      !hasIncomingAndOutgoingEdges(edges, node.id)
    )).map((node) => node.id));
    if (!invalidIds.size) break;
    nodes = nodes.filter((node) => !invalidIds.has(node.id));
    edges = edges.filter((edge) => !invalidIds.has(edge.from) && !invalidIds.has(edge.to));
  }

  return { nodes, edges };
}

/** Valida as conexões e as condições de vitória e dificuldade da fase. */
export function isValidGraph(graph, results, phase) {
  const allEdgesHaveWeights = graph.edges.every((edge) =>
    Number.isFinite(edge.weight) && edge.weight > 0
  );

  if (!allEdgesHaveWeights) {
    return false;
  }

  if (!isInsideMapWater(graph)) return false;

  if (results.ordered.length !== START_ISLANDS.length || !results.hasUniqueWinner) {
    return false;
  }

  const reachableFromBoats = getReachableNodes(graph, START_ISLANDS.map((node) => node.id), phase.directed);
  const canReachTreasure = getReachableNodes(graph, [FINISH_ISLAND.id], phase.directed, true);
  if (graph.nodes.some((node) => node.type === 'intermediate' && (
    !reachableFromBoats.has(node.id) || !canReachTreasure.has(node.id) ||
    !hasIncomingAndOutgoingEdges(graph.edges, node.id)
  ))) {
    return false;
  }

  const [winner, second] = results.ordered;

  // O desempate entre barcos não basta: o próprio vencedor pode ter
  // dois caminhos mínimos diferentes. Nesse caso, geramos outro mapa.
  if (winner.shortestPathCount !== 1) {
    return false;
  }

  if (phase.minimumEdgeCount && graph.edges.length < phase.minimumEdgeCount) {
    return false;
  }

  if (phase.minimumWinnerPathNodes && winner.path.length < phase.minimumWinnerPathNodes) {
    return false;
  }

  return second.distance - winner.distance >= phase.uniqueWinnerGap;
}

function hasIncomingAndOutgoingEdges(edges, nodeId) {
  return edges.some((edge) => edge.to === nodeId && edge.from !== nodeId) &&
    edges.some((edge) => edge.from === nodeId && edge.to !== nodeId);
}

export function isInsideMapWater(graph) {
  const layout = graph.metadata?.layout ?? 'mobile';
  const profile = getMapProfile(layout);
  const islands = graph.nodes.filter((node) => node.type === 'intermediate');
  const dense = graph.metadata?.dense ?? islands.length >= 15;
  return islands.every((node) => {
    const x = node.x / 10;
    const y = node.y / 6.5;
    const water = getWaterBounds(profile, y);
    const margin = getNodeRadii(node, dense, layout).x / 10;
    return y >= 26 && y <= 80 && x - margin >= water.left && x + margin <= water.right;
  });
}

function getReachableNodes(graph, startingIds, directed, reverse = false) {
  const visited = new Set(startingIds);
  const pending = [...startingIds];
  while (pending.length) {
    const current = pending.pop();
    graph.edges.forEach((edge) => {
      const from = reverse ? edge.to : edge.from;
      const to = reverse ? edge.from : edge.to;
      const neighbor = from === current ? to : !directed && to === current ? from : null;
      if (neighbor && !visited.has(neighbor)) {
        visited.add(neighbor);
        pending.push(neighbor);
      }
    });
  }
  return visited;
}

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}
