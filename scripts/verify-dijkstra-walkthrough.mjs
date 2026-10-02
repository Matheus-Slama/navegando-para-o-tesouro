import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./map-test-loader.mjs', import.meta.url);
const { DIJKSTRA_FIXED_PHASE, getDijkstraFixedMap } = await import('../src/game/config/dijkstra-fixed-map.js');
const { createDijkstraWalkthrough } = await import('../src/game/core/dijkstra-walkthrough.js');
const { isValidGraph } = await import('../src/game/core/map-rules.js');
const { dijkstra } = await import('../src/game/core/dijkstra.js');

// O atalho barato só existe se uma seta de entrada for percorrida ao contrário.
const directionGraph = {
  nodes: ['start-blue', 'ahead', 'behind', 'finish'].map((id) => ({ id, label: id })),
  edges: [
    { id: 'incoming', from: 'behind', to: 'start-blue', weight: 1 },
    { id: 'shortcut', from: 'behind', to: 'finish', weight: 1 },
    { id: 'outgoing', from: 'start-blue', to: 'ahead', weight: 5 },
    { id: 'arrival', from: 'ahead', to: 'finish', weight: 5 }
  ],
  metadata: { directed: true }
};
const directionFrames = createDijkstraWalkthrough(directionGraph);
assert.equal(directionFrames.at(-1).distances.finish, 10);
assert.ok(directionFrames.every((frame) => frame.distances.behind === Infinity));
assert.equal(dijkstra(directionGraph.nodes, directionGraph.edges, 'start-blue', 'finish', true).distance, 10);
assert.equal(dijkstra(directionGraph.nodes, directionGraph.edges, 'start-blue', 'finish', false).distance, 2);

const exhaustedBranch = {
  nodes: directionGraph.nodes,
  edges: [
    { id: 'ahead', from: 'start-blue', to: 'ahead', weight: 1 },
    { id: 'behind', from: 'start-blue', to: 'behind', weight: 2 },
    { id: 'arrival', from: 'ahead', to: 'finish', weight: 4 },
    { id: 'return', from: 'behind', to: 'ahead', weight: 1 }
  ],
  metadata: { directed: true }
};
const exhaustedFrames = createDijkstraWalkthrough(exhaustedBranch);
assert.equal(exhaustedFrames.at(-1).distances.finish, 5);
assert.deepEqual(exhaustedFrames.filter((frame) => frame.step === 5).map((frame) => frame.currentId),
  ['start-blue', 'ahead', 'behind', 'finish'],
  'Uma ilha sem saídas pendentes também deve ser confirmada na ordem de custo.');
assert.ok(!exhaustedFrames.some((frame) => frame.step === 6 && frame.currentId === 'behind'),
  'A confirmação não deve reavaliar vizinhos já confirmados.');
assert.equal(dijkstra(exhaustedBranch.nodes, exhaustedBranch.edges, 'start-blue', 'finish').distance, 5);

// Outro ramo ainda precisa ser analisado quando sua seta permite avançar.
const usefulBranch = structuredClone(exhaustedBranch);
usefulBranch.edges.at(-1).to = 'finish';
const usefulFrames = createDijkstraWalkthrough(usefulBranch);
assert.ok(usefulFrames.some((frame) => frame.step === 4 && frame.currentId === 'behind'));
assert.equal(usefulFrames.at(-1).distances.finish, 3);
assert.equal(dijkstra(usefulBranch.nodes, usefulBranch.edges, 'start-blue', 'finish').distance, 3);

const unreachable = { ...exhaustedBranch, edges: exhaustedBranch.edges.filter((edge) => edge.to !== 'finish') };
assert.equal(createDijkstraWalkthrough(unreachable).at(-1).title, 'Não há caminho');
assert.equal(dijkstra(unreachable.nodes, unreachable.edges, 'start-blue', 'finish').distance, Infinity);

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
  // Remover a Ilha 18 encurta a rota do tablet em um ponto.
  const phase = { ...DIJKSTRA_FIXED_PHASE, minimumWinnerPathNodes: layout === 'tablet' ? 5 : DIJKSTRA_FIXED_PHASE.minimumWinnerPathNodes };
  assert.ok(isValidGraph(graph, graph.results, phase), `${layout}: mapa fora das regras do tutorial.`);
  assert.equal(graph.metadata.fixed, true);
  const islands = graph.nodes.filter((node) => node.type === 'intermediate');
  assert.equal(graph.metadata.islandCount, islands.length);
  assert.ok(islands.length >= 15, `${layout}: o tutorial deve ter pelo menos 15 ilhas intermediárias.`);
  assert.ok(graph.edges.length >= 23, `${layout}: o tutorial deve ter pelo menos 23 arestas.`);
  assert.ok(!graph.nodes.some((node) => node.id === 'island-18'), `${layout}: a Ilha 18 foi removida.`);
  assert.ok(!graph.edges.some((edge) => edge.from === 'island-18' || edge.to === 'island-18'),
    `${layout}: nenhuma conexão deve apontar para a Ilha 18.`);
  const blueFrames = createDijkstraWalkthrough(graph);
  assert.deepEqual(blueFrames.slice(0, 4).map((frame) => frame.title), [
    'Conheça o algoritmo de Dijkstra',
    'Mova e redimensione o card de dicas',
    'Comece escolhendo o barco azul',
    'Anote os custos'
  ]);
  assert.ok(blueFrames.slice(0, 3).every((frame) => !frame.showCosts && frame.confirmed.length === 0),
    'A apresentação deve vir antes das contas.');
  assert.equal(blueFrames[2].currentId, 'start-blue', 'O terceiro passo deve destacar o barco azul.');
  if (layout === 'wide') {
    const islandIndex = blueFrames.findIndex((frame) => frame.step === 5 && frame.currentId === 'island-8');
    const treasureIndex = blueFrames.findIndex((frame) => frame.step === 4 && frame.currentId === 'finish');
    assert.ok(islandIndex >= 0 && islandIndex < treasureIndex,
      'A Ilha 8, de custo 49, deve ser confirmada antes de selecionar o tesouro de custo 54.');
    assert.equal(blueFrames[islandIndex].distances['island-8'], 49);
    assert.equal(blueFrames[treasureIndex].distances.finish, 54);
    assert.ok(blueFrames.some((frame) => frame.targetId === 'island-8'),
      'A rota que chega à Ilha 8 continua sendo calculada no sentido correto.');
  }
  // A bifurcação deve aparecer na demonstração, antes de confirmar o tesouro.
  assert.ok(graph.nodes.some((node) => node.type === 'intermediate'
    && graph.results.winner.path.includes(node.id)
    && new Set(blueFrames.filter((frame) => frame.step === 6 && frame.currentId === node.id)
      .map((frame) => frame.targetId)).size >= 2),
  `${layout}: a rota azul deve explorar uma ilha com várias saídas.`);
  assert.ok(blueFrames.some((frame, index) => frame.step === 7 && frame.improved
    && Number.isFinite(blueFrames[index - 1].distances[frame.targetId])),
  `${layout}: a demonstração deve melhorar um custo já conhecido.`);
  for (const edge of graph.edges) {
    assert.ok(Number.isInteger(edge.weight) && edge.weight >= DIJKSTRA_FIXED_PHASE.weights.min && edge.weight <= DIJKSTRA_FIXED_PHASE.weights.max,
      `${layout}: peso inválido em ${edge.id}.`);
  }
  for (const result of graph.results.all) {
    const frames = createDijkstraWalkthrough(graph, result.startId);
    const oracle = shortestCosts(graph, result.startId);
    const initial = frames[3];
    assert.equal(initial.step, 3);
    for (const node of graph.nodes) assert.equal(initial.distances[node.id], node.id === result.startId ? 0 : Infinity);
    for (let i = 1; i < frames.length; i++) {
      const frame = frames[i];
      assert.notEqual(frame.distances, frames[i - 1].distances);
      assert.notEqual(frame.previous, frames[i - 1].previous);
      for (const id of frame.confirmed) assert.equal(frame.distances[id], oracle[id], 'Só um custo ótimo pode ser confirmado.');
      for (const edgeId of frame.edgeIds) assert.ok(graph.edges.some((edge) => edge.id === edgeId));
      if (frame.step === 4) {
        const pendingCosts = Object.entries(frame.distances)
          .filter(([id]) => !frame.confirmed.includes(id)).map(([, cost]) => cost);
        assert.equal(frame.distances[frame.currentId], Math.min(...pendingCosts),
          'A seleção deve considerar todos os pontos não confirmados, inclusive os sem saídas pendentes.');
      }
      if (frame.step === 6 || frame.step === 7) {
        const edge = graph.edges.find((edge) => edge.id === frame.edgeIds[0]);
        assert.equal(edge.from, frame.currentId, 'A análise só pode usar setas que saem do ponto atual.');
        assert.equal(edge.to, frame.targetId, 'O vizinho deve ser o destino da seta.');
        assert.ok(!frames[i - 1].confirmed.includes(frame.targetId), 'Um ponto confirmado não deve ser reavaliado.');
      }
      if (frame.step === 7) {
        const before = frames[i - 1];
        assert.equal(before.step, 6);
        const edge = graph.edges.find((edge) => edge.id === frame.edgeIds[0]);
        const candidate = before.distances[frame.currentId] + edge.weight;
        assert.equal(frame.distances[frame.targetId], Math.min(before.distances[frame.targetId], candidate));
        assert.equal(frame.improved, candidate < before.distances[frame.targetId]);
        assert.equal(frame.previous[frame.targetId], frame.improved ? frame.currentId : before.previous[frame.targetId]);
      }
    }
    const final = frames.at(-1);
    const arrivalIndex = frames.findIndex((frame) => frame.step === 5 && frame.currentId === 'finish');
    assert.ok(arrivalIndex >= 0);
    assert.deepEqual(frames.slice(arrivalIndex + 1).map((frame) => frame.step), [9],
      'Após confirmar o tesouro, mostre apenas a comparação sem voltar pelas ilhas.');
    assert.deepEqual(frames[arrivalIndex + 1].path, final.path);
    assert.equal(final.step, 9);
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
