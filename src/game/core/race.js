export function getPathWeights(graph, path) {
  return path.slice(1).map((to, index) => {
    const from = path[index];
    const edges = graph.edges.filter((edge) =>
      (edge.from === from && edge.to === to) ||
      (!graph.metadata.directed && edge.from === to && edge.to === from)
    );
    if (!edges.length) throw new Error(`O percurso contém uma ligação inexistente: ${from} → ${to}.`);
    return Math.min(...edges.map((edge) => edge.weight));
  });
}

export function getRaceDuration(distance, winnerDistance, reducedMotion = false) {
  return reducedMotion ? 1 : 6400 * distance / winnerDistance;
}
