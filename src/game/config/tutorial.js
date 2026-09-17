export const TUTORIAL_STEPS = [
  {
    title: 'Bem-vindo ao Navegando para o Tesouro',
    text: 'Neste jogo, você precisa descobrir qual barco chega ao tesouro pelo caminho de menor custo.'
  },
  {
    title: 'Ilhas e caminhos',
    text: 'Cada ilha representa um vértice do grafo. Cada rota entre ilhas representa uma aresta.'
  },
  {
    title: 'Custos',
    text: 'Todas as rotas possuem custos. O melhor caminho nem sempre é o mais curto visualmente, mas aquele com o menor custo total. Pense no custo como o nível de dificuldade da rota.'
  },
  {
    title: 'Corrida dos barcos',
    text: 'Escolha um barco para iniciar a corrida. O barco com menor custo chega primeiro.'
  },
  {
    title: 'Dicas',
    text: 'Use a lâmpada quando precisar de ajuda. As dicas explicam os conceitos de forma mais explícita durante o jogo.'
  }
];

const startNodes = [
  { id: 'start-red', label: 'Barco Vermelho', boat: 'red', x: 125, y: 600 },
  { id: 'start-blue', label: 'Barco Azul', boat: 'blue', x: 375, y: 600 },
  { id: 'start-green', label: 'Barco Verde', boat: 'green', x: 625, y: 600 },
  { id: 'start-black', label: 'Barco Preto', boat: 'black', x: 875, y: 600 }
].map((node) => ({ ...node, type: 'start' }));

const islandSprite = { sheetIndex: 0, column: 0, row: 0 };

export const TUTORIAL_GRAPH = {
  nodes: [
    ...startNodes,
    { id: 'island-left', label: 'Ilha esquerda', type: 'intermediate', x: 275, y: 365, sprite: islandSprite },
    { id: 'island-right', label: 'Ilha direita', type: 'intermediate', x: 725, y: 365, sprite: islandSprite },
    { id: 'island-center', label: 'Ilha central', type: 'intermediate', x: 500, y: 225, sprite: islandSprite },
    { id: 'finish', label: 'Ilha do Tesouro', type: 'finish', x: 500, y: 55 }
  ],
  edges: [
    { id: 'tutorial-edge-1', from: 'start-red', to: 'island-left', weight: 2 },
    { id: 'tutorial-edge-2', from: 'start-blue', to: 'island-left', weight: 3 },
    { id: 'tutorial-edge-3', from: 'start-green', to: 'island-right', weight: 1 },
    { id: 'tutorial-edge-4', from: 'start-black', to: 'island-right', weight: 3 },
    { id: 'tutorial-edge-5', from: 'island-left', to: 'island-center', weight: 2 },
    { id: 'tutorial-edge-6', from: 'island-right', to: 'island-center', weight: 4 },
    { id: 'tutorial-edge-7', from: 'island-center', to: 'finish', weight: 1 }
  ],
  metadata: {
    directed: false
  },
  results: {
    all: [
      { startId: 'start-red', distance: 5, path: ['start-red', 'island-left', 'island-center', 'finish'] },
      { startId: 'start-blue', distance: 6, path: ['start-blue', 'island-left', 'island-center', 'finish'] },
      { startId: 'start-green', distance: 6, path: ['start-green', 'island-right', 'island-center', 'finish'] },
      { startId: 'start-black', distance: 8, path: ['start-black', 'island-right', 'island-center', 'finish'] }
    ],
    winner: { startId: 'start-red', distance: 5 }
  }
};
