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
    text: 'Escolha o menor custo total entre os pontos descobertos ainda não confirmados que têm saídas pendentes, ou o tesouro. Respeite o sentido das setas.'
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
    text: 'Após examinar todas as saídas, volte ao passo 3. Continue até confirmar o tesouro.'
  },
  {
    title: 'Tesouro encontrado',
    text: 'O tesouro foi confirmado. Encontramos o menor custo desde o barco.'
  },
  {
    title: 'Compare os barcos',
    text: 'Recomece as contas para cada barco. Compare os custos até o tesouro: a menor soma vence.'
  }
];
