export const DIJKSTRA_STEPS = [
  {
    title: 'Conheça o algoritmo de Dijkstra',
    text: 'O algoritmo de Dijkstra encontra o menor caminho. Ele compara a soma dos pesos das rotas para descobrir o melhor caminho.'
  },
  {
    title: 'Mova e redimensione o card de dicas',
    text: 'Arraste o card pelas bordas para movê-lo. Para redimensioná-lo, arraste um dos cantos. Ajuste a posição e o tamanho para acompanhar o mapa.'
  },
  {
    title: 'Comece escolhendo o barco azul',
    text: 'Vamos começar pelo barco azul, destacado no mapa. Acompanhe os próximos passos para encontrar o melhor caminho dele até o tesouro.'
  },
  {
    title: 'Anote os custos',
    text: 'O barco começa com 0 (zero). Os outros pontos começam com ∞: caminho ainda desconhecido.'
  },
  {
    title: 'Escolha o menor custo',
    text: 'Escolha o menor custo total entre todos os pontos descobertos ainda não confirmados. Respeite o sentido das setas.'
  },
  {
    title: 'Confirme o ponto',
    text: 'Marque o ponto escolhido como confirmado. Seu menor custo está definido. Se for o tesouro, a busca terminou.'
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
    text: 'Após examinar todas as saídas, escolha novamente o menor custo ainda não confirmado. Continue até confirmar o tesouro.'
  },
  {
    title: 'Compare os barcos',
    text: 'Recomece as contas para cada barco. Compare os custos até o tesouro: a menor soma vence.'
  }
];
