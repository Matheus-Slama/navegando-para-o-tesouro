import { createDijkstraWalkthrough as createFullWalkthrough } from './dijkstra-walkthrough-old.js';
import { formatCost } from './text.js';

// 24 cenas no mapa e uma conclusão: 25 passos.
const MAP_SCENES = 24;

export function createDijkstraWalkthrough(graph, startId = 'start-blue', finishId = 'finish') {
  const frames = createFullWalkthrough(graph, startId, finishId);
  if (frames.length <= MAP_SCENES || frames.at(-1).step !== 9) return frames;
  const middle = frames.slice(4, -3);
  const count = MAP_SCENES - 7;
  const name = (id, next = false) => {
    const node = graph.nodes.find((node) => node.id === id);
    return node.type === 'intermediate' ? (next ? 'Próxima ilha destacada' : 'Ilha destacada') : node.label;
  };
  // Cada descoberta do tesouro tem sua própria cena, antes de confirmar o destino.
  const boundaries = new Set([middle.length - 1]);
  middle.forEach((frame, index) => {
    if (frame.step === 7 && frame.targetId === finishId) boundaries.add(index);
  });
  for (let index = 0; index < count && boundaries.size < count; index++) {
    boundaries.add(Math.floor((index + 1) * middle.length / count) - 1);
  }
  for (let index = 0; boundaries.size < count; index++) boundaries.add(index);
  // No percurso azul, o passo 10 confirma a segunda ilha (custo 8).
  // Agrupe antes as outras saídas da primeira ilha, mantendo a ordem da busca.
  if (startId === 'start-blue') {
    const confirmations = middle.flatMap((frame, index) =>
      frame.step === 5 && graph.nodes.find((node) => node.id === frame.currentId)?.type === 'intermediate' ? [index] : []);
    const confirmation = confirmations[1];
    if (confirmation !== undefined) {
      const introductory = [...boundaries].sort((a, b) => a - b).filter((index) => index < confirmation).slice(0, 4);
      if (introductory.length === 4 && introductory.at(-1) < confirmation - 2) {
        for (const index of boundaries) if (index <= confirmation) boundaries.delete(index);
        for (const index of [...introductory, confirmation - 2, confirmation]) boundaries.add(index);
        for (let index = confirmation + 1; boundaries.size < count && index < middle.length; index++) boundaries.add(index);
      }
    }
  }
  let offset = 0;
  const condensed = [...boundaries].sort((a, b) => a - b).map((end) => {
    const group = middle.slice(offset, end + 1);
    offset = end + 1;
    const last = group.at(-1);
    const actions = group.flatMap((frame) => {
      if (frame.step === 5) return [name(frame.currentId) + ': custo ' + formatCost(frame.distances[frame.currentId]) + ' confirmado.'];
      if (frame.step === 7) return [name(frame.currentId) + ' \u2192 ' + name(frame.targetId, true) + ': ' + (frame.improved
        ? 'atualize o custo para ' + formatCost(frame.distances[frame.targetId]) + '.'
        : 'mantenha ' + formatCost(frame.distances[frame.targetId]) + ': não melhorou.')];
      return [];
    });
    if (last.step === 7 && last.targetId !== finishId) {
      actions.push('Após analisar todas as saídas, escolha o ponto com o menor custo acumulado ainda não confirmado.');
    }
    const arrival = last.step === 7 && last.targetId === finishId;
    const alternative = arrival && !last.improved;
    const alternativeEdge = alternative ? graph.edges.find((edge) => edge.id === last.edgeIds[0]) : null;
    const previousCost = arrival ? group.find((frame) => frame.step === 6 && frame.targetId === finishId)?.distances[finishId] : undefined;
    return {
      ...last,
      title: alternative ? 'Confira a outra rota' : arrival ? 'Tesouro: custo ainda provisório' : actions.length ? 'Avance pelo menor custo' : last.title,
      text: alternative
        ? `Antes de confirmar o tesouro, confira a ilha da outra rota: custo ${formatCost(last.distances[last.currentId])}, menor que ${formatCost(last.distances[finishId])}. Por ela, a soma é ${formatCost(last.distances[last.currentId])} + ${alternativeEdge.weight} = ${formatCost(last.distances[last.currentId] + alternativeEdge.weight)}. Essa rota não melhora o caminho: mantenha ${formatCost(last.distances[finishId])} no tesouro. Pare apenas quando o tesouro for o menor custo ainda não confirmado.`
        : arrival
        ? `Tesouro: ${formatCost(last.distances[finishId])}. ${previousCost === Infinity ? 'A primeira rota pode não ser a melhor.' : 'Só uma soma menor atualiza o custo e o anterior.'} Continue pelo menor custo pendente. Pare apenas quando o tesouro for o menor e estiver confirmado.`
        : actions.length ? actions.join(' ') : last.text,
      formula: group.filter((frame) => frame.step === 6).map((frame) => frame.formula).join(' \u2022 '),
      edgeIds: [...new Set(group.flatMap((frame) => frame.edgeIds))]
    };
  });
  return [...frames.slice(0, 4), ...condensed, ...frames.slice(-3)];
}
