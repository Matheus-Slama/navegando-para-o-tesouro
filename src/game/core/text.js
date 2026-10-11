const scoreFormatter = new Intl.NumberFormat('pt-BR');

// O cronômetro usa minutos e segundos para caber no HUD; truncar e limitar
// a zero evita frações ou tempos negativos durante atualizações do relógio.
export function formatElapsedTime(elapsed) {
  const seconds = Math.max(0, Math.floor(elapsed));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// Centraliza os separadores de milhares para que HUD, recorde e resultados
// mostrem a mesma pontuação, sem repetir a escolha do idioma em cada tela.
export function formatScore(value) {
  return scoreFormatter.format(value);
}

// Dijkstra começa com custos desconhecidos. Usar ∞ mantém a notação do
// algoritmo nas dicas, fórmulas e tabelas sem expor o texto JavaScript Infinity.
export function formatCost(value) {
  return Number.isFinite(value) ? String(value) : '∞';
}

// Os botões de comparação já representam barcos e têm pouco espaço;
// removemos apenas o prefixo inicial, preservando o restante do nome.
export function shortBoatLabel(label) {
  return label.replace(/^Barco /, '');
}
