# Perguntas frequentes — Navegando para o Tesouro

Este FAQ explica a estrutura atual do projeto e os conceitos usados no jogo. As justificativas técnicas descrevem como as tecnologias atendem ao projeto; não constituem um registro da decisão original de escolhê-las.

## Por que o jogo foi feito em Next.js?

O Next.js fornece a estrutura da aplicação web: organiza páginas, integra os componentes React e prepara o projeto para execução e publicação. Neste jogo, ele reúne a página principal, a página de créditos e os recursos usados pela interface.

O cálculo dos caminhos, a geração dos mapas e a pontuação ficam em módulos JavaScript próprios. O Next.js sustenta a aplicação, enquanto esses módulos implementam as regras do jogo.

## O jogo precisa de Next.js para funcionar?

Não. As mecânicas poderiam funcionar em outra estrutura que execute JavaScript no navegador. Uma migração precisaria adaptar a entrada da aplicação, a navegação, as importações e o processo de build, mas poderia reaproveitar grande parte da lógica e dos componentes React.

## Qual é a diferença entre React e Next.js neste projeto?

O React organiza a interface em componentes e atualiza a tela conforme o estado muda: barco escolhido, tempo, vidas, pontuação e fase atual. O Next.js organiza a aplicação que contém esses componentes e fornece seu processo de execução e build.

## Por que usar React, SVG e CSS em vez de uma engine como Phaser?

As mecânicas se concentram em ilhas, conexões, seleção de barcos, dicas e animações sobre um tabuleiro. React organiza os controles e as telas, SVG representa as conexões do grafo e CSS cuida da apresentação. O projeto não depende de um sistema de física ou colisões para implementar suas regras, o que torna essa composição suficiente para a proposta atual.

## Qual é o objetivo educativo do jogo?

Ensinar o problema do caminho mínimo em grafos. O jogador compara as rotas dos barcos até o tesouro, soma os custos das conexões e escolhe o barco com o menor custo total. As dicas e o tutorial de Dijkstra apresentam o raciocínio por trás dessa escolha.

## Como o mapa representa um grafo?

As ilhas representam os vértices e as conexões representam as arestas. Os números nas conexões são os pesos, ou custos de travessia. As setas indicam os sentidos permitidos. Os barcos partem de vértices diferentes e compartilham o mesmo destino: o tesouro.

## O menor caminho é o que passa por menos ilhas?

Não necessariamente. O critério é a soma dos pesos das arestas. Um caminho com custos `2 + 2 + 1 = 5` é melhor que outro com `4 + 3 = 7`, mesmo tendo mais conexões. A distância visual entre as ilhas também não determina o vencedor.

## Por que usar o algoritmo de Dijkstra?

Dijkstra calcula caminhos de menor custo em grafos com pesos não negativos. Os pesos configurados no jogo são positivos, então o algoritmo atende ao problema representado. Ele também permite explicar a solução em etapas: escolher o menor custo provisório, analisar os vizinhos e atualizar os custos conhecidos.

A implementação está em [dijkstra.js](src/game/core/dijkstra.js).

## Como o jogo determina qual barco vence?

O jogo calcula o menor custo de cada posição inicial até o tesouro e compara os resultados. Vence o barco com o menor custo total. Na geração dos mapas, as regras verificam a existência de um vencedor único e de uma única rota mínima para esse vencedor, além das condições de conectividade.

## Os mapas são fixos ou aleatórios?

O projeto possui mapas gerados e mapas fixos para tutoriais. O gerador usa uma semente numérica e as configurações da fase para variar ilhas, conexões e pesos. Cada candidato passa por validações; quando é rejeitado, o gerador tenta outra combinação, até o limite de tentativas.

Os mapas fixos do tutorial de Dijkstra ficam em [dijkstra-fixed-maps.json](src/game/config/json/dijkstra-fixed-maps.json), com versões para os formatos de tela usados pelo jogo.

## Onde ficam as fases e as regras de dificuldade?

As configurações estão divididas por responsabilidade:

| Arquivo | Responsabilidade |
|---|---|
| [maps.json](src/game/config/json/maps.json) | Nomes, dificuldades, dicas e disponibilidade do tutorial de Dijkstra nas dez fases |
| [weight-ranges.js](src/game/enums/weight-ranges.js) | Faixas de pesos, quantidade de ilhas e rotas extras por dificuldade |
| [balance.js](src/game/config/balance.js) | Pontuação máxima, tempo de referência e penalidade por erro |
| [phases.js](src/game/config/phases.js) | Combinação dessas informações para uso no jogo |

## Como funcionam a pontuação e as vidas?

A jornada começa com três vidas. Uma escolha incorreta remove uma vida e desconta até 250 pontos, sem deixar a pontuação negativa. Uma escolha correta concede pontos conforme a fase e o tempo gasto.

Até o tempo de referência da fase, o jogador recebe a pontuação máxima. Depois disso, os pontos diminuem proporcionalmente: gastar o dobro do tempo de referência rende metade do máximo. A fórmula está em [scoring.js](src/game/core/scoring.js).

## O recorde fica salvo? É necessário um banco de dados?

O recorde é salvo no `localStorage` do navegador. Esse recurso não exige um banco de dados no servidor e não sincroniza automaticamente o recorde entre dispositivos. Limpar os dados do site pode apagar o registro.

O código usa AES-GCM para dificultar alterações casuais no valor armazenado. Como a chave e o código ficam no cliente, essa proteção não equivale a um sistema contra trapaças validado por servidor. A implementação está em [highscore.js](src/game/core/highscore.js).

## Para que servem os hooks do jogo?

Os hooks conectam comportamentos ao estado e ao ciclo de vida dos componentes React. Por exemplo:

- `useJourney` controla pontuação, vidas, cronômetro e recorde.
- `useDeviceConfig` acompanha mudanças nas dimensões da janela e seleciona uma configuração de tela.
- `useMapLayout` fornece o formato de mapa dessa configuração.
- `useScreenMusic` controla a reprodução e a pausa da música da tela.

Essa separação permite manter os componentes mais concentrados na apresentação.

## Como o jogo se adapta a celulares, tablets e computadores?

O código escolhe um perfil de acordo com as dimensões e a proporção da área disponível. Ele acompanha redimensionamento e mudança de orientação, em vez de depender do nome ou modelo do aparelho. Os perfis ficam em [device-sizes.json](src/game/config/json/device-sizes.json).

## Por que a música pode começar apenas depois de um toque ou tecla?

A reprodução automática com áudio pode ser bloqueada pelo navegador. O hook `useScreenMusic` tenta iniciar a música e, se necessário, tenta novamente após uma interação por toque, clique ou teclado. Ele também pausa a música conforme o estado recebido pela tela.

O volume da música é fixado em 35% pelo hook `useScreenMusic`.

## Como executar e verificar o projeto?

Instale as dependências com `pnpm install` e inicie o ambiente de desenvolvimento com `pnpm dev`. A aplicação fica disponível em `http://localhost:3000`.

As principais verificações são:

```bash
pnpm check
```

Esse comando executa lint, verificações de mapas, recordes, dispositivos e Dijkstra, além do build de produção. O README descreve os comandos individuais e os testes que precisam de navegador. Executá-los não substitui conferir a experiência visual e a interação no navegador.
