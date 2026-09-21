import { DIJKSTRA_STEPS } from '@/game/config/dijkstra-steps';

const format = (value) => Number.isFinite(value) ? String(value) : '∞';

export function createDijkstraWalkthrough(graph, startId = 'start-blue', finishId = 'finish') {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  if (!nodes.has(startId) || !nodes.has(finishId)) throw new Error('Origem ou destino inválido.');
  if (graph.edges.some((edge) => !nodes.has(edge.from) || !nodes.has(edge.to) || !Number.isFinite(edge.weight) || edge.weight < 0)) {
    throw new Error('Dijkstra exige conexões válidas com pesos não negativos.');
  }
  const name = (id) => nodes.get(id).label;
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
    const currentId = graph.nodes.filter((node) => !confirmed.has(node.id))
      .reduce((best, node) => distances[node.id] < (best ? distances[best] : Infinity) ? node.id : best, null);
    if (!currentId) {
      add(6, { title: 'Não há caminho', text: 'Os pontos restantes têm custo ∞. O tesouro não pode ser alcançado desta origem.' });
      return frames;
    }
    add(2, { currentId, text: `${name(currentId)} o menor custo ainda não confirmado.` });
    confirmed.add(currentId);
    add(3, { currentId, text: `${name(currentId)}: custo ${distances[currentId]} confirmado. O ✓ marca um valor definitivo.` });
    if (currentId === finishId) break;

    const neighbors = graph.edges.flatMap((edge) => edge.from === currentId
      ? [{ edge, targetId: edge.to }]
      : !graph.metadata.directed && edge.to === currentId ? [{ edge, targetId: edge.from }] : []);
    for (const { edge, targetId } of neighbors) {
      if (confirmed.has(targetId)) continue;
      const oldDistance = distances[targetId];
      const candidate = distances[currentId] + edge.weight;
      const improved = candidate < oldDistance;
      const focus = { currentId, targetId, edgeIds: [edge.id] };
      add(4, { ...focus, text: `${name(currentId)} → ${name(targetId)}. Some o custo acumulado ao peso da rota destacada.`, formula: `${distances[currentId]} + ${edge.weight} = ${candidate}` });
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
    add(6, { currentId, text: `Terminamos as saídas de ${name(currentId)}. Agora escolha novamente o menor custo não confirmado.` });
  }

  const path = [finishId];
  const edgeIds = [];
  while (path[0] !== startId) {
    const target = path[0];
    const source = previous[target];
    const edge = graph.edges.find((item) => (item.from === source && item.to === target) || (!graph.metadata.directed && item.from === target && item.to === source));
    path.unshift(source);
    edgeIds.unshift(edge.id);
    add(7, { currentId: source, targetId: target, path: [...path], edgeIds: [...edgeIds], text: `O anterior de ${name(target)} é ${name(source)}. A rota dourada recupera o caminho até o tesouro.` });
  }
  const weights = edgeIds.map((id) => graph.edges.find((edge) => edge.id === id).weight);
  add(7, { path: [...path], edgeIds: [...edgeIds], title: 'Caminho encontrado', text: `Do ${name(startId).toLowerCase()} até o tesouro: custo ${distances[finishId]}. Siga a rota dourada.`, formula: `${weights.join(' + ')} = ${distances[finishId]}` });
  add(8, { path: [...path], edgeIds: [...edgeIds] });
  return frames;
}
