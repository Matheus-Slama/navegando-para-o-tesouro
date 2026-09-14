import { dijkstra } from './dijkstra.js';

export function getNodeLabel(graph, nodeId) {
  const node = graph.nodes.find((item) => item.id === nodeId);
  return node?.label ?? nodeId;
}

export function formatCost(value) {
  return Number.isFinite(value) ? String(value) : '∞';
}

function neighbors(graph, nodeId, directed) {
  return graph.edges.flatMap((edge) => {
    if (edge.from === nodeId) return [{ target: edge.to, weight: edge.weight }];
    if (!directed && edge.to === nodeId) return [{ target: edge.from, weight: edge.weight }];
    return [];
  });
}

export function getRouteWeights(graph, path, directed) {
  return path.slice(1).map((nodeId, index) => {
    const edge = neighbors(graph, path[index], directed)
      .find((neighbor) => neighbor.target === nodeId);
    return edge?.weight ?? Number.POSITIVE_INFINITY;
  });
}

// A geração oferece pares que exercitam o conceito da fase. A busca por uma
// alternativa mantém mapas externos úteis sem enumerar todos os caminhos simples.
export function getLearningRoutes(graph, phase, startId) {
  const finishId = graph.nodes.find((node) => node.type === 'finish')?.id ?? 'finish';
  const shortest = dijkstra(graph.nodes, graph.edges, startId, finishId, phase.directed);
  if (!Number.isFinite(shortest.distance)) return [];

  const candidates = [shortest, ...(graph.metadata?.learning?.[startId]?.routes ?? [])];
  if (phase.id > 1 && candidates.length < 3) {
    shortest.path.slice(1).forEach((target, index) => {
      const source = shortest.path[index];
      const edges = graph.edges.filter((edge) => !(
        (edge.from === source && edge.to === target)
        || (!phase.directed && edge.from === target && edge.to === source)
      ));
      candidates.push(dijkstra(graph.nodes, edges, startId, finishId, phase.directed));
    });
  }

  const seen = new Set();
  const routes = candidates.flatMap(({ path }) => {
    const key = path.join('|');
    if (seen.has(key) || path[0] !== startId || path.at(-1) !== finishId) return [];
    const weights = getRouteWeights(graph, path, phase.directed);
    const distance = weights.reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(distance)) return [];
    seen.add(key);
    return [{ path, weights, distance }];
  });
  if (phase.id === 1) return routes.slice(0, 1);

  const best = routes[0];
  const alternatives = routes.slice(1).filter((route) => route.distance > best.distance);
  const matchesConcept = (route) => {
    if (phase.challengeType === 'weighted-sum') return best.path.length > route.path.length;
    if (phase.challengeType !== 'weighted-full-path') return true;
    const divergence = best.path.findIndex((nodeId, index) => route.path[index] !== nodeId);
    return divergence > 0 && route.weights[divergence - 1] < best.weights[divergence - 1];
  };
  const alternative = alternatives.find(matchesConcept) ?? alternatives[0] ?? routes[1];
  const pair = alternative ? [best, alternative] : [best];
  // A resposta correta não fica sempre na primeira opção.
  return (Number(graph.seed ?? 0) + startId.length) % 2 ? pair.reverse() : pair;
}

export function createDijkstraExercise(graph, startId, directed = true) {
  if (!graph.nodes.some((node) => node.id === startId)) throw new Error('Origem inexistente.');
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  if (graph.edges.some((edge) => !Number.isFinite(edge.weight) || edge.weight <= 0
    || !nodeIds.has(edge.from) || !nodeIds.has(edge.to))) {
    throw new Error('A atividade exige conexões válidas e pesos positivos.');
  }
  return {
    stage: 'initialize',
    startId,
    finishId: graph.nodes.find((node) => node.type === 'finish')?.id ?? 'finish',
    directed,
    distances: Object.fromEntries(graph.nodes.map((node) => [node.id, Number.POSITIVE_INFINITY])),
    previous: Object.fromEntries(graph.nodes.map((node) => [node.id, null])),
    settled: [],
    currentId: null,
    pending: [],
    route: [],
    mistakes: 0,
    improvements: 0
  };
}

export function getMinimumPendingNodes(state) {
  const pending = Object.entries(state.distances)
    .filter(([id, cost]) => !state.settled.includes(id) && Number.isFinite(cost));
  const minimum = Math.min(...pending.map(([, cost]) => cost));
  return pending.filter(([, cost]) => cost === minimum).map(([id]) => id);
}

function readNumber(value) {
  return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
    ? Number(value) : Number.NaN;
}

export function advanceDijkstraExercise(graph, state, action) {
  const label = (nodeId) => getNodeLabel(graph, nodeId);
  const reject = (message) => ({
    correct: false,
    message,
    state: { ...state, mistakes: state.mistakes + 1 },
    focusNode: state.currentId
  });
  const accept = (next, message, focusNode = next.currentId) => ({
    correct: true, state: next, message, focusNode
  });

  if (state.stage === 'initialize' && action.type === 'initialize') {
    if (readNumber(action.startCost) !== 0 || action.otherCost !== 'infinity') {
      return reject('A origem custa 0: você já está nela. Nas outras ilhas use ∞, pois ainda não foi descoberto um caminho.');
    }
    return accept({ ...state, stage: 'choose', distances: { ...state.distances, [state.startId]: 0 } },
      'Inicialização correta. Agora escolha o menor custo entre todos os vértices pendentes.', state.startId);
  }

  if (state.stage === 'choose' && action.type === 'choose') {
    const minimumIds = getMinimumPendingNodes(state);
    if (!minimumIds.includes(action.nodeId)) {
      if (state.settled.includes(action.nodeId)) return reject('Esse vértice já está confirmado; seu custo mínimo não muda. Escolha um pendente.');
      return reject('Compare todos os custos provisórios da tabela, inclusive os de ilhas distantes. Escolha o menor custo finito; em um empate, qualquer mínimo é válido.');
    }
    const currentId = action.nodeId;
    if (currentId === state.finishId) {
      return accept({
        ...state, currentId, stage: 'reconstruct',
        settled: [...state.settled, currentId], route: [currentId]
      }, 'O tesouro foi escolhido como o menor pendente. Seu custo agora está confirmado. Reconstrua o caminho pelos antecessores.');
    }
    const pending = neighbors(graph, currentId, state.directed)
      .filter(({ target }) => !state.settled.includes(target));
    return accept({ ...state, currentId, pending, stage: pending.length ? 'relax' : 'confirm' },
      pending.length ? `Analise as conexões de ${label(currentId)}. Uma distância provisória só muda se o novo custo for menor.`
        : `${label(currentId)} não tem vizinhos pendentes. Confirme seu custo para continuar.`);
  }

  if (state.stage === 'relax' && action.type === 'relax') {
    const { target, weight } = state.pending[0];
    const candidate = state.distances[state.currentId] + weight;
    const oldCost = state.distances[target];
    const improves = candidate < oldCost;
    if (readNumber(action.candidateCost) !== candidate) {
      return reject(`O custo até ${label(state.currentId)} é ${state.distances[state.currentId]} e a ligação até ${label(target)} pesa ${weight}. Some esses dois valores.`);
    }
    if (action.decision !== (improves ? 'update' : 'keep')) {
      return reject(improves
        ? `${candidate} é menor que ${formatCost(oldCost)}. Atualize o custo provisório e registre ${label(state.currentId)} como antecessor.`
        : `${candidate} não é menor que ${formatCost(oldCost)}. Mantenha o custo e o antecessor conhecidos; empate também não exige atualização.`);
    }
    const pending = state.pending.slice(1);
    const next = {
      ...state, pending, stage: pending.length ? 'relax' : 'confirm',
      improvements: state.improvements + Number(improves && Number.isFinite(oldCost)),
      distances: improves ? { ...state.distances, [target]: candidate } : state.distances,
      previous: improves ? { ...state.previous, [target]: state.currentId } : state.previous
    };
    return accept(next, improves
      ? `${label(target)}: ${formatCost(oldCost)} → ${candidate}. Antecessor: ${label(state.currentId)}.`
      : `${label(target)} continua com ${formatCost(oldCost)}. O caminho por ${label(state.currentId)} não melhora esse custo.`, target);
  }

  if (state.stage === 'confirm' && action.type === 'confirm') {
    const next = { ...state, settled: [...state.settled, state.currentId], currentId: null, stage: 'choose' };
    if (!getMinimumPendingNodes(next).length) {
      return accept({ ...next, stage: 'unreachable' }, 'Não há vértices pendentes com custo finito. O tesouro não é alcançável desta origem.');
    }
    return accept(next, `${label(state.currentId)} confirmado. Compare novamente todos os pendentes antes de escolher o próximo.`);
  }

  if (state.stage === 'reconstruct' && action.type === 'predecessor') {
    const last = state.route.at(-1);
    const expected = state.previous[last];
    if (!expected || action.nodeId !== expected) return reject(`Consulte o antecessor de ${label(last)} na tabela. Ele indica de onde veio o menor custo confirmado.`);
    const route = [...state.route, expected];
    return accept({ ...state, route, stage: expected === state.startId ? 'cost' : 'reconstruct' },
      expected === state.startId ? 'Você chegou à origem. Lendo o caminho na ordem inversa, temos a rota até o tesouro.'
        : `Agora encontre o antecessor de ${label(expected)}.`, expected);
  }

  if (state.stage === 'cost' && action.type === 'cost') {
    if (readNumber(action.cost) !== state.distances[state.finishId]) {
      return reject('Confira o custo confirmado do tesouro e a soma dos pesos da rota reconstruída.');
    }
    return accept({ ...state, stage: 'complete' }, 'Caminho mínimo e custo confirmados. Agora compare este barco com os demais na corrida.');
  }

  return reject('Conclua a etapa atual antes de continuar.');
}
