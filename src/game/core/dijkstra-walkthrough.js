import { DIJKSTRA_STEPS } from '@/game/config/dijkstra-steps';
import { getNextDijkstraStep } from '@/game/core/dijkstra';

const format = (value) => Number.isFinite(value) ? String(value) : '∞';

export function createDijkstraWalkthrough(graph, startId = 'start-blue', finishId = 'finish') {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  if (!nodes.has(startId) || !nodes.has(finishId)) throw new Error('Origem ou destino inválido.');
  if (graph.edges.some((edge) => !nodes.has(edge.from) || !nodes.has(edge.to) || !Number.isFinite(edge.weight) || edge.weight < 0)) {
    throw new Error('Dijkstra exige conexões válidas com pesos não negativos.');
  }
  const name = (id) => nodes.get(id).type === 'intermediate' ? 'Ilha destacada' : nodes.get(id).label;
  const distances = Object.fromEntries(graph.nodes.map((node) => [node.id, Infinity]));
  const previous = Object.fromEntries(graph.nodes.map((node) => [node.id, null]));
  const confirmed = new Set();
  const frames = [];
  const add = (step, extra = {}) => frames.push({
    step, ...DIJKSTRA_STEPS[step], distances: { ...distances }, previous: { ...previous },
    confirmed: [...confirmed], currentId: null, targetId: null, edgeIds: [], path: [],
    showCosts: true, formula: '', ...extra
  });
  add(0, { currentId: startId, showCosts: false, text: `Vamos focar no ${name(startId).toLowerCase()} nesse tutorial.` });
  distances[startId] = 0;
  add(1, { currentId: startId, text: 'Veja os custos junto aos pontos: 0 na origem e ∞ nos demais.' });

  while (confirmed.size < nodes.size) {
    const { currentId, neighbors } = getNextDijkstraStep(graph.edges, distances, confirmed, finishId, graph.metadata.directed);
    if (!currentId) {
      add(6, { title: 'Não há caminho', text: 'Não há mais pontos alcançáveis com saídas pendentes. O tesouro não pode ser alcançado desta origem.' });
      return frames;
    }
    add(2, { currentId, text: `${name(currentId)}: custo ${distances[currentId]}, o menor entre os pontos que ainda podem avançar ou o tesouro. Ilhas cujas saídas só levam a pontos confirmados são ignoradas.` });
    confirmed.add(currentId);
    add(3, { currentId, text: `${name(currentId)}: custo ${distances[currentId]} confirmado. O ✓ marca um valor definitivo.` });
    if (currentId === finishId) break;

    for (const { edge, target: targetId } of neighbors) {
      if (confirmed.has(targetId)) continue;
      const oldDistance = distances[targetId];
      const candidate = distances[currentId] + edge.weight;
      const improved = candidate < oldDistance;
      const focus = { currentId, targetId, edgeIds: [edge.id] };
      add(4, { ...focus, text: `${name(currentId)} → ${name(targetId)}. Siga a seta que sai do ponto atual e some o custo acumulado ao peso da rota destacada.`, formula: `${distances[currentId]} + ${edge.weight} = ${candidate}` });
      if (improved) {
        distances[targetId] = candidate;
        previous[targetId] = currentId;
      }
      add(5, {
        ...focus, improved,
        title: improved ? 'Atualize o custo' : 'Mantenha o custo',
        text: improved ? `${name(targetId)} muda de ${format(oldDistance)} para ${candidate}. Anterior: ${name(currentId)}.` : `${name(targetId)} já tem custo ${format(oldDistance)}. Esta alternativa não melhora o caminho.`,
        formula: `${candidate} ${improved ? '<' : '≥'} ${format(oldDistance)}`
      });
    }
    const origin = nodes.get(currentId).type === 'intermediate' ? 'da ilha destacada' : `de ${name(currentId)}`;
    add(6, { currentId, text: `Terminamos as saídas ${origin}. Escolha o próximo menor custo, ignorando ilhas sem saídas para pontos ainda não confirmados. O tesouro continua sendo um destino válido.` });
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
  const weights = edgeIds.map((id) => graph.edges.find((edge) => edge.id === id).weight);
  add(7, { currentId: finishId, path: [...path], edgeIds: [...edgeIds], text: `Chegamos ao tesouro! O menor custo desde o ${name(startId).toLowerCase()} é ${distances[finishId]}.`, formula: `${weights.join(' + ')} = ${distances[finishId]}` });
  add(8, { path: [...path], edgeIds: [...edgeIds] });
  add(9, { path: [...path], edgeIds: [...edgeIds] });
  return frames;
}
