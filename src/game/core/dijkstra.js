export function dijkstra(nodes, edges, startId, finishId, directed = true) {
  const distances = {};
  const previous = {};
  const pathCounts = {};
  const visited = new Set();

  nodes.forEach((node) => {
    distances[node.id] = Number.POSITIVE_INFINITY;
    previous[node.id] = null;
    pathCounts[node.id] = 0;
  });

  distances[startId] = 0;
  pathCounts[startId] = 1;

  while (visited.size < nodes.length) {
    const { currentId, neighbors } = getNextDijkstraStep(edges, distances, visited, directed);

    if (!currentId) {
      break;
    }

    if (currentId === finishId) {
      break;
    }

    visited.add(currentId);

    neighbors.forEach(({ target, weight }) => {
      if (visited.has(target)) {
        return;
      }

      const possibleDistance = distances[currentId] + weight;

      if (possibleDistance < distances[target]) {
        distances[target] = possibleDistance;
        previous[target] = currentId;
        pathCounts[target] = pathCounts[currentId];
      } else if (possibleDistance === distances[target]) {
        // Com pesos positivos, todos os predecessores chegam antes do destino.
        // Basta distinguir uma rota de duas ou mais rotas mínimas.
        pathCounts[target] = Math.min(2, pathCounts[target] + pathCounts[currentId]);
      }
    });
  }

  const path = buildPath(previous, startId, finishId);

  return {
    distance: distances[finishId],
    path,
    shortestPathCount: pathCounts[finishId] ?? 0
  };
}

// Confirma o menor custo alcançável, mesmo quando não há vizinhos a atualizar.
export function getNextDijkstraStep(edges, distances, visited, directed = true) {
  let selectedId = null;
  let selectedDistance = Number.POSITIVE_INFINITY;
  let selectedNeighbors = [];

  Object.entries(distances).forEach(([nodeId, distance]) => {
    if (!visited.has(nodeId) && distance < selectedDistance) {
      const neighbors = getNeighbors(edges, nodeId, directed)
        .filter(({ target }) => target !== nodeId && !visited.has(target));
      selectedId = nodeId;
      selectedDistance = distance;
      selectedNeighbors = neighbors;
    }
  });

  return { currentId: selectedId, neighbors: selectedNeighbors };
}

function getNeighbors(edges, currentId, directed) {
  const neighbors = [];

  edges.forEach((edge) => {
    if (edge.from === currentId) {
      neighbors.push({
        edge,
        target: edge.to,
        weight: edge.weight
      });
    }

    if (!directed && edge.to === currentId) {
      neighbors.push({
        edge,
        target: edge.from,
        weight: edge.weight
      });
    }
  });

  return neighbors;
}

function buildPath(previous, startId, finishId) {
  const path = [];
  let current = finishId;

  while (current) {
    path.unshift(current);

    if (current === startId) {
      return path;
    }

    current = previous[current];
  }

  return [];
}

export function getPhaseResults(graph, phase) {
  const starts = graph.nodes.filter((node) => node.type === 'start');

  const results = starts.map((start) => ({
    startId: start.id,
    boat: start.boat,
    label: start.label,
    ...dijkstra(graph.nodes, graph.edges, start.id, 'finish', (phase.directed ?? true))
  }));

  const reachable = results.filter((result) => Number.isFinite(result.distance));
  const ordered = reachable.sort((a, b) => a.distance - b.distance);

  return {
    all: results,
    ordered,
    winner: ordered[0] ?? null,
    hasUniqueWinner:
      ordered.length > 1 && ordered[0].distance < ordered[1].distance
  };
}
