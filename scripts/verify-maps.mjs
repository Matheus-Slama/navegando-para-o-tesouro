import assert from 'node:assert/strict';
import { register } from 'node:module';

// Permite executar os módulos do jogo no Node sem iniciar o Next.
register('./map-test-loader.mjs', import.meta.url);

const { generateGraphForPhase } = await import('../src/game/core/graphGenerator.js');
const { PHASES } = await import('../src/game/config/phases.js');
const { isValidGraph } = await import('../src/game/core/map-rules.js');
const { getMapProfile, getWaterBounds, getNodeRadii } = await import('../src/game/core/map-layout.js');

let count = 0;
for (const layout of ['mobile', 'tablet', 'wide']) {
  for (const phase of PHASES) {
    for (let sample = 1; sample <= 10; sample += 1) {
      const seed = phase.id * 1000 + sample * 101;
      const graph = generateGraphForPhase(phase, seed, layout);
      assert.ok(isValidGraph(graph, graph.results, phase));
      assert.equal(graph.results.winner.shortestPathCount, 1);
      assert.equal(graph.results.ordered.length, 4);
      const profile = getMapProfile(layout);
      const islands = graph.nodes.filter((node) => node.type === 'intermediate');
      for (const island of islands) {
        const water = getWaterBounds(profile, island.y / 6.5);
        const radius = getNodeRadii(island, graph.metadata.dense, layout).x / 10;
        assert.ok(island.x / 10 - radius >= water.left - 0.1);
        assert.ok(island.x / 10 + radius <= water.right + 0.1);
      }
      // Confere a unicidade enumerando rotas, sem depender da contagem do Dijkstra.
      let winningRoutes = 0;
      function visit(nodeId, cost, visited) {
        if (cost > graph.results.winner.distance) return;
        if (nodeId === 'finish') {
          assert.equal(cost, graph.results.winner.distance);
          winningRoutes += 1;
          return;
        }
        for (const edge of graph.edges) {
          const next = edge.from === nodeId ? edge.to
            : !phase.directed && edge.to === nodeId ? edge.from : null;
          if (next && !visited.has(next)) visit(next, cost + edge.weight, new Set([...visited, next]));
        }
      }
      for (const start of graph.nodes.filter((node) => node.type === 'start')) {
        visit(start.id, 0, new Set([start.id]));
      }
      assert.equal(winningRoutes, 1);
      count += 1;
    }
    console.log(`${layout}: phase ${phase.id} OK`);
  }
}
console.log(`${count} maps validated.`);
