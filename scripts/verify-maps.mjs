import assert from 'node:assert/strict';
import { register } from 'node:module';

// Permite executar os módulos do jogo no Node sem iniciar o Next.
register('./map-test-loader.mjs', import.meta.url);

const { generateGraphForPhase } = await import('../src/game/core/graphGenerator.js');
const { PHASES, START_ISLANDS, FINISH_ISLAND } = await import('../src/game/config/phases.js');
const { isValidGraph, removeInvalidIslands } = await import('../src/game/core/map-rules.js');
const { getMapProfile, getWaterBounds, getNodeRadii } = await import('../src/game/core/map-layout.js');
const { createRandomSeed } = await import('../src/game/core/random.js');

assert.equal(PHASES.length, 10);
assert.deepEqual(PHASES.map((phase) => phase.id), Array.from({ length: 10 }, (_, index) => index + 1));
assert.equal(PHASES.at(-1).enableDijkstraTutorial, true);

let previousSeed = null;
for (let sample = 0; sample < 100; sample += 1) {
  const seed = createRandomSeed(previousSeed);
  assert.ok(Number.isInteger(seed) && seed > 0 && seed < 2147483647);
  assert.notEqual(seed, previousSeed);
  previousSeed = seed;
}
for (const layout of ['mobile', 'tablet', 'wide']) {
  for (const phase of PHASES) {
    const first = generateGraphForPhase(phase, undefined, layout);
    const second = generateGraphForPhase(phase, undefined, layout);
    assert.ok(isValidGraph(first, first.results, phase));
    assert.ok(isValidGraph(second, second.results, phase));
    assert.notDeepEqual({ nodes: first.nodes, edges: first.edges }, { nodes: second.nodes, edges: second.edges },
      `Novas partidas repetiram o mapa: ${layout}, fase ${phase.id}`);
    assert.deepEqual(generateGraphForPhase(phase, first.seed, layout), first);
    const retry = generateGraphForPhase(phase, first.seed, layout, first.results.winner.startId);
    assert.ok(isValidGraph(retry, retry.results, phase));
    assert.notEqual(retry.results.winner.startId, first.results.winner.startId,
      `Nova tentativa repetiu o vencedor: ${layout}, fase ${phase.id}`);
    assert.notDeepEqual({ nodes: retry.nodes, edges: retry.edges }, { nodes: first.nodes, edges: first.edges });
  }
}

// Uma remoção pode deixar a próxima ilha sem entrada ou sem saída.
for (const missing of ['incoming', 'outgoing']) {
  const nodes = [
    ...START_ISLANDS.map((node) => ({ ...node, type: 'start' })),
    { ...FINISH_ISLAND, type: 'finish' },
    { id: 'a', type: 'intermediate' },
    { id: 'b', type: 'intermediate' }
  ];
  const validEdges = START_ISLANDS.map((node) => ({ from: node.id, to: FINISH_ISLAND.id, weight: 1 }));
  const branch = missing === 'incoming'
    ? [['a', 'b'], ['a', FINISH_ISLAND.id], ['b', FINISH_ISLAND.id]]
    : [[START_ISLANDS[0].id, 'a'], ['a', 'b'], [FINISH_ISLAND.id, 'b']];
  const edges = [...validEdges, ...branch.map(([from, to]) => ({ from, to, weight: 1 }))];
  const cleaned = removeInvalidIslands({ nodes, edges }, { directed: false });
  assert.deepEqual(cleaned.nodes, nodes.filter((node) => node.type !== 'intermediate'));
  assert.deepEqual(cleaned.edges, validEdges);
}

let count = 0;
for (const layout of ['mobile', 'tablet', 'wide']) {
  for (const phase of PHASES) {
    for (let sample = 1; sample <= 10; sample += 1) {
      const seed = phase.id * 1000 + sample * 101;
      const graph = generateGraphForPhase(phase, seed, layout);
      assert.ok(isValidGraph(graph, graph.results, phase));
      assert.equal(graph.results.winner.shortestPathCount, 1);
      assert.equal(graph.results.ordered.length, 4);
      assert.ok(graph.edges.every((edge) => Number.isInteger(edge.weight)
        && edge.weight >= phase.weights.minimumEdgeWeight && edge.weight <= phase.weights.maximumEdgeWeight),
      `Peso fora da dificuldade: ${layout}, fase ${phase.id}, seed ${graph.seed}`);
      const profile = getMapProfile(layout);
      const islands = graph.nodes.filter((node) => node.type === 'intermediate');
      if (sample === 1 && phase.directed === false) {
        // Inverter as pontas mantém custos e conectividade do grafo não direcionado,
        // mas deve ser rejeitado se todas as setas entrarem ou saírem da mesma ilha.
        const island = islands[0];
        for (const missing of ['incoming', 'outgoing']) {
          const edges = graph.edges.map((edge) => (
            missing === 'incoming' ? edge.to === island.id : edge.from === island.id
          ) ? { ...edge, from: edge.to, to: edge.from } : edge);
          assert.equal(isValidGraph({ ...graph, edges }, graph.results, phase), false,
            `Validação aceitou ilha sem ${missing}: ${layout}, fase ${phase.id}`);
        }
      }
      for (const island of islands) {
        const context = `${layout}, fase ${phase.id}, seed ${graph.seed}, ${island.id}`;
        assert.ok(graph.edges.some((edge) => edge.to === island.id), `Ilha sem entrada: ${context}`);
        assert.ok(graph.edges.some((edge) => edge.from === island.id), `Ilha sem saída: ${context}`);
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
            : phase.directed === false && edge.to === nodeId ? edge.from : null;
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
