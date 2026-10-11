# Navegando para o Tesouro

Jogo educativo web para o ensino do **problema do caminho mínimo em grafos**.

O projeto foi feito em **Next.js + React + SVG/CSS**, sem Phaser. A ideia é manter uma arquitetura simples para o TCC: mapa fixo, ilhas como vértices, rotas como arestas, pesos, direção, dicas, animação dos barcos e cálculo do vencedor com o algoritmo de Dijkstra.

## Por que não Phaser?

O Phaser é ótimo para jogos com física, colisão, tiles, câmera e spritesheets complexos. Neste projeto, as principais mecânicas são:

- tela inicial;
- tutorial fixo;
- mapa fixo;
- ilhas posicionadas como vértices;
- rotas com direção e peso;
- geração controlada de grafos;
- cálculo do menor caminho;
- animação dos barcos seguindo vértices;
- feedback pedagógico e dicas.

Tudo isso funciona bem com **React + SVG**, deixando o código mais fácil de explicar, testar e adaptar.

## Como rodar

### 1. Instale as dependências

```bash
pnpm install
```

### 2. Rode o projeto

```bash
pnpm dev
```

O jogo abre em:

```bash
http://localhost:3000
```

## Estrutura do projeto

```text
app/
  layout.jsx
  page.jsx
  globals.css

src/game/
  components/
    GameShell/
    StartScreen/
    TutorialScreen/
    DijkstraTutorial/
    GameBoard/
    GraphCanvas/
    HintDialog/
    PhaseInfo/
    ResultsPanel/

  config/
    gameAssets.js
    phases.js
    tutorial.js

  core/
    dijkstra.js
    gameMath.js
    graphGenerator.js
    random.js

  hooks/
    useBoatRace.js

public/assets/game/
  backgrounds/
  islands/
  boats/
  icons/
  music/
```

## Fluxo do jogo

1. O jogador entra na **tela inicial**.
2. O jogo mostra o **tutorial fixo**.
3. A fase é gerada a partir do arquivo `phases.js`.
4. O jogador escolhe um dos barcos.
5. Os barcos fazem a corrida.
6. O algoritmo de Dijkstra calcula o melhor caminho de cada origem até a ilha do tesouro.
7. O jogo mostra se a escolha do jogador estava correta.
8. O jogador avança para a próxima fase.

## Arquivo principal de fases

As fases ficam em:

```text
src/game/config/json/maps.json
```

Exemplo de configuração:

```js
{
  id: 3,
  name: 'Pesos nas rotas',
  difficulty: 'médio',
  objective: 'Somar os pesos das arestas para encontrar o menor custo.',
  islandCount: 8,
  extraRouteCount: 6,
  weights: { min: 1, max: 9 },
  directed: false,
  uniqueWinnerGap: 4,
  score: { base: 250, hintPenalty: 25, wrongChoicePenalty: 40 },
  hints: [
    'Some os números das rotas para comparar os caminhos.',
    'O menor caminho é aquele com menor soma de pesos.',
    'Um caminho com mais arestas pode vencer se os pesos forem pequenos.'
  ]
}
```

### Campos importantes

| Campo | Função |
|---|---|
| `islandCount` | Quantidade fixa ou intervalo `{ min, max }` de ilhas intermediárias |
| `extraRouteCount` | Quantidade de rotas extras entre ilhas |
| `weights` | Peso mínimo e máximo; os pesos são sempre exibidos no mapa |
| `difficulty` | Dificuldade apresentada para a fase |
| `score` | Pontuação base e penalidades |
| `directed` | Define se as rotas têm direção |
| `uniqueWinnerGap` | Diferença mínima entre o vencedor e o segundo colocado |
| `hints` | Dicas pedagógicas da fase |

## Tutorial fixo

O tutorial fica em:

```text
src/game/config/tutorial.js
```

Ele é separado das fases para deixar claro que o tutorial não é gerado aleatoriamente.

## Tutorial Dijkstra

O botão **Tutorial Dijkstra**, abaixo de **Tutorial** na tela inicial, demonstra o algoritmo sobre o mapa fixo da última fase. Um popover compacto com setas acompanha cada escolha, soma e atualização. Custos acumulados aparecem junto aos pontos: 0 no barco azul, ∞ nos demais e ✓ nos custos confirmados. Os pesos das rotas permanecem os mesmos. A rota analisada e o caminho final recebem destaque dourado.

Os dois botões de seta avançam e desfazem as contas; no teclado, use ← e →. Também é possível recolher a explicação e comparar os quatro barcos no último passo. O barco azul tem o menor custo, sem empate, nos três formatos de tela. Os nove conceitos ficam em `src/game/config/dijkstra-steps.js`; as cenas são calculadas em `src/game/core/dijkstra-walkthrough.js`. Ao mudar o formato da tela, a demonstração reinicia no mapa correspondente. Execute `node scripts/verify-dijkstra-walkthrough.mjs` para validar os estados e as rotas.

Os mapas de celular, tablet e tela horizontal estão salvos em `src/game/config/json/dijkstra-fixed-maps.json`. Cada formato mantém as mesmas ilhas, rotas e pesos ao reabrir o tutorial. A tela é implementada em `src/game/components/DijkstraTutorial/DijkstraTutorialMap.jsx`.

## Como trocar imagens

O projeto já está preparado para receber imagens aos poucos.

Arquivo:

```text
src/game/config/gameAssets.js
```

Exemplo:

```js
export const GAME_ASSETS = {
  backgrounds: {
    menu: '/assets/game/backgrounds/menu-map.png',
    board: '/assets/game/backgrounds/map-board.png'
  },

  boats: {
    red: '/assets/game/boats/red-boat.png',
    blue: '/assets/game/boats/blue-boat.png',
    green: '/assets/game/boats/green-boat.png',
    yellow: '/assets/game/boats/yellow-boat.png'
  }
};
```

### Pastas sugeridas

```text
public/assets/game/backgrounds
public/assets/game/islands
public/assets/game/boats
public/assets/game/icons
public/assets/game/music
```

Enquanto você não adiciona sprites reais, o jogo usa desenhos SVG/CSS simples.

## Algoritmo de Dijkstra

O algoritmo está em:

```text
src/game/core/dijkstra.js
```

Ele recebe:

- lista de nós;
- lista de arestas;
- origem;
- destino;
- se o grafo é direcionado ou não.

Retorna:

```js
{
  distance: 12,
  path: ['start-blue', 'island-2', 'island-5', 'finish']
}
```

O vencedor da fase é o barco cujo caminho possui o menor custo até o tesouro.

## Geração dos grafos

O gerador fica em:

```text
src/game/core/graphGenerator.js
```

Ele faz:

1. cria as quatro posições iniciais dos barcos;
2. cria a ilha final fixa;
3. gera ilhas intermediárias;
4. cria rotas principais para cada barco;
5. adiciona rotas extras;
6. roda Dijkstra;
7. valida se existe um vencedor único;
8. se houver empate, gera outro grafo.

Isso evita fases ambíguas.

## Animação dos barcos

A animação fica em:

```text
src/game/hooks/useBoatRace.js
```

Ela pega o caminho calculado pelo Dijkstra e move os barcos de vértice em vértice.

Cada barco percorre o seu menor caminho. A duração é proporcional ao custo total da rota. Assim, o barco com menor custo chega primeiro.

## Responsividade

A interface foi pensada para:

- celular vertical;
- celular horizontal;
- tablet vertical;
- tablet horizontal;
- desktop.

O SVG usa `viewBox`, então o tabuleiro se adapta ao espaço disponível.

Arquivos principais de responsividade:

```text
src/game/components/GameBoard/GameBoard.css
src/game/components/GraphCanvas/GraphCanvas.css
src/game/components/StartScreen/StartScreen.css
```

## Como adicionar música

Coloque arquivos em:

```text
public/assets/game/music
```

Exemplo:

```text
public/assets/game/music/menu.ogg
public/assets/game/music/phase-1.ogg
```

Depois podemos criar um `AudioManager` para tocar músicas e efeitos.

## Próximos passos sugeridos

1. Trocar o fundo da tela inicial pelo layout final.
2. Trocar o fundo do tabuleiro pelo mapa fixo.
3. Adicionar sprites reais de barcos.
4. Adicionar sprites reais das ilhas.
5. Melhorar a tela de resultado com explicação passo a passo do menor caminho.
6. Ampliar os exemplos do tutorial Dijkstra.
7. Adicionar som e botão de volume.
8. Salvar progresso do jogador no `localStorage`.

## Explicação curta para o TCC

O jogo foi desenvolvido como uma aplicação web em Next.js, utilizando React para a organização da interface e SVG para representar visualmente o grafo. As ilhas correspondem aos vértices, enquanto as rotas correspondem às arestas, podendo possuir pesos e direção conforme a fase. A cada fase, o grafo é gerado de forma controlada a partir de um arquivo de configuração, garantindo a existência de um único menor caminho. O algoritmo de Dijkstra é utilizado para calcular o custo mínimo entre cada ilha inicial e a ilha final, definindo o barco vencedor. A proposta também incorpora dicas e mensagens educativas para tornar os conceitos trabalhados mais explícitos durante a experiência do jogador.
