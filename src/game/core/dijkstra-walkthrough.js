import { createDijkstraWalkthrough as createFullWalkthrough } from './dijkstra-walkthrough-old.js';
import { formatCost } from './text.js';

// 24 cenas no mapa, três explicações de exceções e uma conclusão: 28 passos.
const MAP_SCENES = 24;

export function createDijkstraWalkthrough(graph, startId = 'start-blue', finishId = 'finish') {
  const frames = createFullWalkthrough(graph, startId, finishId);
  if (frames.length <= MAP_SCENES || frames.at(-1).step !== 9) return frames;
  const middle = frames.slice(4, -3);
  const count = MAP_SCENES - 7;
  const labels = new Map(graph.nodes.map((node) => [node.id, node.label]));
  // Cada descoberta do tesouro tem sua própria cena, antes de confirmar o destino.
  const boundaries = new Set([middle.length - 1]);
  middle.forEach((frame, index) => {
    if (frame.step === 7 && frame.targetId === finishId) boundaries.add(index);
  });
  for (let index = 0; index < count && boundaries.size < count; index++) {
    boundaries.add(Math.floor((index + 1) * middle.length / count) - 1);
  }
  for (let index = 0; boundaries.size < count; index++) boundaries.add(index);
  let offset = 0;
  const condensed = [...boundaries].sort((a, b) => a - b).map((end) => {
    const group = middle.slice(offset, end + 1);
    offset = end + 1;
    const last = group.at(-1);
    const actions = group.flatMap((frame) => {
      if (frame.step === 5) return [labels.get(frame.currentId) + ': custo ' + formatCost(frame.distances[frame.currentId]) + ' confirmado.'];
      if (frame.step === 7) return [labels.get(frame.currentId) + ' \u2192 ' + labels.get(frame.targetId) + ': ' + (frame.improved
        ? 'atualize o custo para ' + formatCost(frame.distances[frame.targetId]) + '.'
        : 'mantenha ' + formatCost(frame.distances[frame.targetId]) + ': não melhorou.')];
      return [];
    });
    const arrival = last.step === 7 && last.targetId === finishId;
    const previousCost = arrival ? group.find((frame) => frame.step === 6 && frame.targetId === finishId)?.distances[finishId] : undefined;
    return {
      ...last,
      title: arrival ? 'Tesouro: custo ainda provisório' : actions.length ? 'Avance pelo menor custo' : last.title,
      text: arrival
        ? `Tesouro: ${formatCost(last.distances[finishId])}. ${previousCost === Infinity ? 'A primeira rota pode não ser a melhor.' : 'Só uma soma menor atualiza o custo e o anterior.'} Continue pelo menor custo pendente. Pare apenas quando o tesouro for o menor e estiver confirmado.`
        : actions.length ? actions.join(' ') : last.text,
      formula: group.filter((frame) => frame.step === 6).map((frame) => frame.formula).join(' \u2022 '),
      edgeIds: [...new Set(group.flatMap((frame) => frame.edgeIds))]
    };
  });
  const anchor = condensed.at(-1);
  const exceptions = [
    {
      title: 'Empates e pesos especiais',
      text: 'Empate entre os menores pendentes: escolha qualquer um. Rota de custo igual: mantenha o anterior; pode haver vários caminhos mínimos. Peso zero vale; negativo não permite usar Dijkstra.'
    },
    {
      title: 'Setas, ciclos e becos sem saída',
      text: 'Siga as setas; sem direção, vale ir e voltar. Sem saída útil? Escolha outro pendente pelo menor custo. Ignore pontos confirmados: ciclos e voltas ao mesmo ponto não barateiam a rota com pesos não negativos.'
    },
    {
      title: 'Fim da busca e caminho',
      text: 'Sem pendentes alcançáveis e tesouro em ∞: não há caminho. Tesouro confirmado: pare e siga os anteriores para recuperar a rota. Origem igual ao destino: custo zero. Vale a menor soma, não a quantidade de trechos.'
    }
  ].map((lesson) => ({ ...anchor, ...lesson, step: 8, lesson: true, edgeIds: [], currentId: null, targetId: null, formula: '' }));
  return [...frames.slice(0, 4), ...condensed, ...exceptions, ...frames.slice(-3)];
}
