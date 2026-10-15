# Verificação de responsividade — 15/10/2026

Alvo: https://matheus-slama.github.io/navegando-para-o-tesouro/

## Método

Chrome com emulação de viewport e toque pelo Chrome DevTools Protocol. A navegação usa eventos de toque, sem chamar diretamente os handlers dos botões. São verificadas as posições dos controles ativos, a possibilidade de acioná-los pelo centro, a largura da página, imagens indisponíveis e exceções JavaScript. Controles atrás de um modal aberto não entram na verificação de interação.

| Formato | Viewports em pixels CSS |
| --- | --- |
| Celular vertical | 320×568, 360×640, 375×667, 390×844, 412×915 |
| Celular horizontal | 568×320, 667×375, 844×390 |
| Tablet | 768×1024 |
| Desktop | 1366×768 |

Em cada tamanho: menu, tutorial inicial, avanço de todas as etapas por toque, tutorial final, início da partida, pausa por toque e retorno. No cenário de 390×844: rotação para 844×390 e retorno, redução da altura útil para 664 pixels, seleção de barco por toque, corrida e resultado. São 55 capturas com medições; nem todas as etapas intermediárias do tutorial recebem captura.

## Resultados e pontos de atenção

- Não foi observado overflow horizontal, controles ativos fora da tela ou imagens quebradas nos cenários verificados.
- Rotação e alteração da altura útil mantiveram os controles da partida acessíveis.
- Capturas inspecionadas visualmente: partida e tutorial final em 320×568; tutorial final em 568×320; partida com altura reduzida em 390×664; resultado em 390×844.
- Os botões laterais medem 28×28 pixels em 320×568 e 36×36 em diversos celulares. Foram acionáveis no teste, mas são pequenos para uso confortável com o dedo. Este é o principal ponto de melhoria encontrado.
- Em paisagem com pouca altura, o texto do tutorial depende de rolagem interna no painel. Os botões de navegação e início permaneceram visíveis.

Também foram executados os testes de lógica: 300 mapas, 18 cenários de configuração de telas, recordes e os percursos de Dijkstra. O lint passou.

## Reexecutar

Inicie um Chrome de teste com perfil separado e `--remote-debugging-port=9227`, depois execute `pnpm test:browser:responsive`. O script usa o site publicado por padrão. `GAME_RESPONSIVE_URL` seleciona outro endereço e `GAME_RESPONSIVE_CDP` seleciona o endpoint do navegador. Capturas e relatório JSON ficam em `.next/responsive-*`.

## Limites

Emulação no Chrome não substitui aparelhos físicos. Este teste não valida Safari/iOS, Firefox, recortes de tela e safe areas em hardware real, desempenho em celulares fracos ou rede lenta. A redução de altura simula espaço útil menor, mas não reproduz o comportamento real das barras do Safari. A corrida visual foi testada na primeira fase; as demais fases têm validação lógica de mapas, não uma jornada visual completa. Créditos e o tutorial interativo de Dijkstra não fazem parte deste teste visual.
