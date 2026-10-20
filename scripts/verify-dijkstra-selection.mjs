import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./map-test-loader.mjs', import.meta.url);
const { getDijkstraFixedMap } = await import('../src/game/config/dijkstra-fixed-map.js');
const { createDijkstraWalkthrough } = await import('../src/game/core/dijkstra-walkthrough.js');
const { getNextDijkstraStep } = await import('../src/game/core/dijkstra.js');

// Mesmo sem nenhuma saída, o custo 49 precisa ser confirmado antes do 54.
assert.deepEqual(getNextDijkstraStep([], { island: 49, finish: 54, unreachable: Infinity }, new Set()),
  { currentId: 'island', neighbors: [] });
assert.equal(getNextDijkstraStep([], { island: 49, finish: 54 }, new Set(['island'])).currentId, 'finish');
assert.equal(getNextDijkstraStep([], { unreachable: Infinity }, new Set()).currentId, null);

for (const layout of ['mobile', 'tablet', 'wide']) {
  const graph = getDijkstraFixedMap(layout);
  for (const result of graph.results.all) {
    const frames = createDijkstraWalkthrough(graph, result.startId);
    // Bellman-Ford como referência independente para os custos finais.
    const costs = Object.fromEntries(graph.nodes.map(({ id }) => [id, id === result.startId ? 0 : Infinity]));
    for (let pass = 1; pass < graph.nodes.length; pass++) {
      for (const edge of graph.edges) costs[edge.to] = Math.min(costs[edge.to], costs[edge.from] + edge.weight);
    }
    for (const frame of frames) {
      if (frame.step === 4) {
        const pending = Object.entries(frame.distances).filter(([id]) => !frame.confirmed.includes(id));
        assert.equal(frame.distances[frame.currentId], Math.min(...pending.map(([, cost]) => cost)));
      }
      for (const id of frame.confirmed) assert.equal(frame.distances[id], costs[id]);
    }
    assert.equal(frames.at(-1).distances.finish, costs.finish);
    assert.equal(result.distance, costs.finish);
    assert.deepEqual(frames.at(-1).path, result.path);
    if (result.startId === 'start-blue') {
      assert.equal(frames.at(-1).distances.finish, 20);
      assert.ok(frames.at(-1).confirmed.includes('island-4'));
      const alternativeIndex = frames.findIndex((frame) => frame.step === 7 && frame.currentId === 'island-6' && frame.targetId === 'finish');
      const finishIndex = frames.findIndex((frame) => frame.step === 5 && frame.currentId === 'finish');
      assert.ok(alternativeIndex >= 0 && alternativeIndex < finishIndex,
        'A outra rota deve ser conferida antes de confirmar o tesouro.');
      const alternative = frames[alternativeIndex];
      assert.equal(alternative.distances['island-6'], 18);
      assert.ok(alternative.confirmed.includes('island-6'));
      assert.ok(!alternative.confirmed.includes('finish'));
      assert.equal(alternative.improved, false);
      assert.equal(alternative.distances.finish, 20);
      assert.match(alternative.text, /18 \+ 4 = 22/);
    }
  }
  console.log(`${layout}: ordem de seleção e custos dos quatro barcos verificados.`);
}
