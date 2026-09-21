import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./map-test-loader.mjs', import.meta.url);
const { DIJKSTRA_FIXED_PHASE, getDijkstraFixedMap } = await import('../src/game/config/dijkstra-fixed-map.js');
const { createDijkstraWalkthrough } = await import('../src/game/core/dijkstra-walkthrough.js');

// Oráculo independente: Bellman-Ford, sem usar a seleção de Dijkstra.
function shortestCosts(graph, source) {
  const costs = Object.fromEntries(graph.nodes.map((node) => [node.id, Infinity]));
  costs[source] = 0;
  for (let pass = 1; pass < graph.nodes.length; pass++) {
    for (const edge of graph.edges) costs[edge.to] = Math.min(costs[edge.to], costs[edge.from] + edge.weight);
  }
  return costs;
}

for (const layout of ['mobile', 'tablet', 'wide']) {
  const graph = getDijkstraFixedMap(layout);
  const original = structuredClone(graph);
  const blueCost = shortestCosts(graph, 'start-blue').finish;
  assert.ok(Number.isFinite(blueCost), `${layout}: o barco azul deve alcançar o tesouro.`);
  for (const boat of graph.nodes.filter((node) => node.type === 'start' && node.id !== 'start-blue')) {
    assert.ok(blueCost < shortestCosts(graph, boat.id).finish, `${layout}: o azul deve ter custo menor que ${boat.label}, sem empate.`);
  }
  assert.equal(graph.results.winner.startId, 'start-blue');
  assert.equal(graph.results.winner.shortestPathCount, 1);
  for (const edge of graph.edges) {
    assert.ok(Number.isInteger(edge.weight) && edge.weight >= DIJKSTRA_FIXED_PHASE.weights.min && edge.weight <= DIJKSTRA_FIXED_PHASE.weights.max,
      `${layout}: peso inválido em ${edge.id}.`);
  }
  for (const result of graph.results.all) {
    const frames = createDijkstraWalkthrough(graph, result.startId);
    const oracle = shortestCosts(graph, result.startId);
    const initial = frames[1];
    assert.equal(initial.step, 1);
    for (const node of graph.nodes) assert.equal(initial.distances[node.id], node.id === result.startId ? 0 : Infinity);
    for (let i = 1; i < frames.length; i++) {
      const frame = frames[i];
      assert.notEqual(frame.distances, frames[i - 1].distances);
      assert.notEqual(frame.previous, frames[i - 1].previous);
      for (const id of frame.confirmed) assert.equal(frame.distances[id], oracle[id], 'Só um custo ótimo pode ser confirmado.');
      for (const edgeId of frame.edgeIds) assert.ok(graph.edges.some((edge) => edge.id === edgeId));
      if (frame.step === 5) {
        const before = frames[i - 1];
        assert.equal(before.step, 4);
        const edge = graph.edges.find((edge) => edge.id === frame.edgeIds[0]);
        const candidate = before.distances[frame.currentId] + edge.weight;
        assert.equal(frame.distances[frame.targetId], Math.min(before.distances[frame.targetId], candidate));
        assert.equal(frame.improved, candidate < before.distances[frame.targetId]);
        assert.equal(frame.previous[frame.targetId], frame.improved ? frame.currentId : before.previous[frame.targetId]);
      }
    }
    const final = frames.at(-1);
    assert.equal(final.step, 8);
    assert.equal(final.distances.finish, oracle.finish);
    assert.equal(final.distances.finish, result.distance);
    assert.deepEqual(final.path, result.path);
    assert.ok(final.confirmed.includes('finish'));
    const pathCost = final.edgeIds.reduce((sum, id) => sum + graph.edges.find((edge) => edge.id === id).weight, 0);
    assert.equal(pathCost, result.distance);
    assert.equal(initial.distances.finish, Infinity, 'Voltar à inicialização deve recuperar ∞.');
    assert.deepEqual(graph, original, 'A demonstração nunca altera o mapa fixo.');
    console.log(`${layout} / ${result.boat}: ${frames.length} cenas, custo ${pathCost}.`);
  }
}
console.log('Inicialização, relaxamentos, confirmação, caminhos e retorno de passos verificados para os 12 percursos.');
