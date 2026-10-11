// O símbolo ∞ precisa de tamanho e alinhamento próprios na fonte pirata.
// Isolar somente esse caractere permite aplicar o CSS sem alterar os números
// nem os cálculos, e mantém o mesmo tratamento nas dicas e fórmulas.
export function TutorialText({ text }) {
  return text.split(/(∞)/).map((part, index) => part === '∞'
    ? <span className="dijkstra-fixed-map__infinity" key={index}>∞</span> : part);
}
