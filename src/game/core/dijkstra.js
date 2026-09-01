export function dijkstra(nodes, edges, startId, finishId, directed = true) {
  const distances = {};
  const previous = {};
  const visited = new Set();

  nodes.forEach((node) => {
    distances[node.id] = Number.POSITIVE_INFINITY;
    previous[node.id] = null;
  });

  distances[startId] = 0;

  while (visited.size < nodes.length) {
    const currentId = getUnvisitedNodeWithSmallestDistance(distances, visited);

    if (!currentId) {
      break;
    }

    if (currentId === finishId) {
      break;
    }

    visited.add(currentId);

    const neighbors = getNeighbors(edges, currentId, directed);

    neighbors.forEach(({ target, weight }) => {
      if (visited.has(target)) {
        return;
      }

      const possibleDistance = distances[currentId] + weight;

      if (possibleDistance < distances[target]) {
        distances[target] = possibleDistance;
        previous[target] = currentId;
      }
    });
  }

  const path = buildPath(previous, startId, finishId);

  return {
    distance: distances[finishId],
    path
  };
}

function getUnvisitedNodeWithSmallestDistance(distances, visited) {
  let selectedId = null;
  let selectedDistance = Number.POSITIVE_INFINITY;

  Object.entries(distances).forEach(([nodeId, distance]) => {
    if (!visited.has(nodeId) && distance < selectedDistance) {
      selectedId = nodeId;
      selectedDistance = distance;
    }
  });

  return selectedId;
}

function getNeighbors(edges, currentId, directed) {
  const neighbors = [];

  edges.forEach((edge) => {
    if (edge.from === currentId) {
      neighbors.push({
        target: edge.to,
        weight: edge.weight
      });
    }

    if (!directed && edge.to === currentId) {
      neighbors.push({
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
    ...dijkstra(graph.nodes, graph.edges, start.id, 'finish', phase.directed)
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
