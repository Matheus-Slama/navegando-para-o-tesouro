import DIJKSTRA_STEPS from '@/game/config/json/dijkstra-steps-old.json';
import { getNextDijkstraStep } from '@/game/core/dijkstra';

import { formatCost } from './text.js';

export function createDijkstraWalkthrough(graph, startId = 'start-blue', finishId = 'finish') {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  if (!nodes.has(startId) || !nodes.has(finishId)) throw new Error('Origem ou destino inválido.');
  if (graph.edges.some((edge) => !nodes.has(edge.from) || !nodes.has(edge.to) || !Number.isFinite(edge.weight) || edge.weight < 0)) {
    throw new Error('Dijkstra exige conexões válidas com pesos não negativos.');
  }
  const name = (id, next = false) => nodes.get(id).type === 'intermediate'
    ? (next ? 'Próxima ilha destacada' : 'Ilha destacada') : nodes.get(id).label;
  const distances = Object.fromEntries(graph.nodes.map((node) => [node.id, Infinity]));
  const previous = Object.fromEntries(graph.nodes.map((node) => [node.id, null]));
  const confirmed = new Set();
  const frames = [];
  const add = (step, extra = {}) => frames.push({
    step, ...DIJKSTRA_STEPS[step], distances: { ...distances }, previous: { ...previous },
    confirmed: [...confirmed], currentId: null, targetId: null, edgeIds: [], path: [],
    showCosts: true, formula: '', ...extra
  });
  add(0, { showCosts: false });
  add(1, { showCosts: false });
  add(2, { currentId: startId, showCosts: false, ...(startId !== 'start-blue' ? {
    title: `Comece escolhendo ${name(startId)}`,
    text: `Vamos começar por ${name(startId)}, destacado no mapa. Acompanhe os próximos passos para encontrar o melhor caminho dele até o tesouro.`
  } : {}) });
  distances[startId] = 0;
  add(3, { currentId: startId });

  while (confirmed.size < nodes.size) {
    const { currentId, neighbors } = getNextDijkstraStep(graph.edges, distances, confirmed, graph.metadata.directed);
    if (!currentId) {
      add(8, { title: 'Não há caminho', text: 'Não há mais pontos alcançáveis ainda não confirmados. O tesouro não pode ser alcançado desta origem.' });
      return frames;
    }
    add(4, { currentId, text: `${name(currentId)}: custo ${distances[currentId]}, o menor entre os pontos alcançáveis ainda não confirmados.` });
    confirmed.add(currentId);
    add(5, { currentId, text: `${name(currentId)}: custo ${distances[currentId]} confirmado. O ✓ marca um valor definitivo.` });
    if (currentId === finishId) break;

    for (const { edge, target: targetId } of neighbors) {
      if (confirmed.has(targetId)) continue;
      const oldDistance = distances[targetId];
      const candidate = distances[currentId] + edge.weight;
      const improved = candidate < oldDistance;
      const focus = { currentId, targetId, edgeIds: [edge.id] };
      add(6, { ...focus, text: `${name(currentId)} → ${name(targetId, true)}. Siga a seta que sai do ponto atual e some o custo acumulado ao peso da rota destacada.`, formula: `${distances[currentId]} + ${edge.weight} = ${candidate}` });
      if (improved) {
        distances[targetId] = candidate;
        previous[targetId] = currentId;
      }
      add(7, {
        ...focus, improved,
        title: improved ? 'Atualize o custo' : 'Mantenha o custo',
        text: improved ? `${name(targetId, true)} muda de ${formatCost(oldDistance)} para ${candidate}. Anterior: ${name(currentId)}.` : `${name(targetId, true)} já tem custo ${formatCost(oldDistance)}. Esta alternativa não melhora o caminho.`,
        formula: `${candidate} ${improved ? '<' : '≥'} ${formatCost(oldDistance)}`
      });
    }
    const origin = nodes.get(currentId).type === 'intermediate' ? 'da ilha destacada' : `de ${name(currentId)}`;
    add(8, { currentId, text: neighbors.length === 0
      ? 'Não há vizinhos não confirmados para atualizar. Escolha o próximo menor custo.'
      : `Terminamos as saídas ${origin}. Escolha o próximo menor custo.` });
  }

  const path = [finishId];
  const edgeIds = [];
  while (path[0] !== startId) {
    const target = path[0];
    const source = previous[target];
    const edge = graph.edges.find((item) => (item.from === source && item.to === target) || (!graph.metadata.directed && item.from === target && item.to === source));
    path.unshift(source);
    edgeIds.unshift(edge.id);
  }
  add(9, { path: [...path], edgeIds: [...edgeIds] });
  return frames;
}
