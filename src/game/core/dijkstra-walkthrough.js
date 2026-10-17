import { createDijkstraWalkthrough as createFullWalkthrough } from './dijkstra-walkthrough-old.js';
import { formatCost } from './text.js';

// 24 cenas no mapa e uma conclusão: 25 passos ao todo.
const MAP_SCENES = 24;

export function createDijkstraWalkthrough(graph, startId = 'start-blue', finishId = 'finish') {
  const frames = createFullWalkthrough(graph, startId, finishId);
  if (frames.length <= MAP_SCENES || frames.at(-1).step !== 9) return frames;
  const middle = frames.slice(4, -3);
  const count = MAP_SCENES - 7;
  const labels = new Map(graph.nodes.map((node) => [node.id, node.label]));
  const condensed = Array.from({ length: count }, (_, index) => {
    const group = middle.slice(Math.floor(index * middle.length / count), Math.floor((index + 1) * middle.length / count));
    const last = group.at(-1);
    const actions = group.flatMap((frame) => {
      if (frame.step === 5) return [labels.get(frame.currentId) + ': custo ' + formatCost(frame.distances[frame.currentId]) + ' confirmado.'];
      if (frame.step === 7) return [labels.get(frame.currentId) + ' \u2192 ' + labels.get(frame.targetId) + ': ' + (frame.improved
        ? 'atualize o custo para ' + formatCost(frame.distances[frame.targetId]) + '.'
        : 'mantenha o custo ' + formatCost(frame.distances[frame.targetId]) + '; esta alternativa não melhora o caminho.')];
      return [];
    });
    return {
      ...last,
      title: actions.length ? 'Avance pelo menor custo' : last.title,
      text: actions.length ? actions.join(' ') : last.text,
      formula: group.filter((frame) => frame.step === 6).map((frame) => frame.formula).join(' \u2022 '),
      edgeIds: [...new Set(group.flatMap((frame) => frame.edgeIds))]
    };
  });
  return [...frames.slice(0, 4), ...condensed, ...frames.slice(-3)];
}
