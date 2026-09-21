export const DIJKSTRA_STEPS = [
  {
    title: 'Comece escolhendo um barco',
    text: 'Vamos focar no barco azul nesse tutorial.'
  },
  {
    title: 'Anote os custos',
    text: 'O barco começa com 0. Os outros pontos começam com ∞: caminho ainda desconhecido.'
  },
  {
    title: 'Escolha o menor custo',
    text: 'Entre os pontos ainda não confirmados, escolha o menor custo total desde o barco. Comece pelo próprio barco.'
  },
  {
    title: 'Confirme o ponto',
    text: 'Marque o ponto escolhido como confirmado. Seu menor custo está definido. Se for o tesouro, vá ao passo 8.'
  },
  {
    title: 'Some o próximo trecho',
    text: 'Siga as setas até vizinhos não confirmados. Para cada um, some: custo até aqui + peso da rota.'
  },
  {
    title: 'Guarde o melhor caminho',
    text: 'A soma ficou menor? Atualize o custo do vizinho e anote de onde veio. Caso contrário, mantenha o valor.'
  },
  {
    title: 'Repita a busca',
    text: 'Após examinar todas as saídas, volte ao passo 3. Continue até confirmar o tesouro.'
  },
  {
    title: 'Recupere a rota',
    text: 'Do tesouro, siga os pontos anteriores até o barco. Inverta a sequência: esse é o caminho de menor custo.'
  },
  {
    title: 'Compare os barcos',
    text: 'Recomece as contas para cada barco. Compare os custos até o tesouro: a menor soma vence.'
  }
];
