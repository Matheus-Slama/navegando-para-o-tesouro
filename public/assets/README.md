# Convenção de nomes dos assets

Use nomes em inglês, minúsculos e separados por hífens, no formato `tipo-funcao[-variante].ext`. Preserve a extensão e escolha nomes que indiquem o uso do recurso no jogo.

| Pasta | Padrão | Exemplo |
|---|---|---|
| `game/backgrounds/` | `background-{tela}-{formato}` | `background-map-mobile.png` |
| `game/boats/` | `boat-{cor}` | `boat-blue.png` |
| `game/islands/` | `sheet-islands-{numero}` | `sheet-islands-1.png` |
| `game/treasures/` | `treasure-{variante}` | `treasure-legendary.png` |
| `game/audio/` | `music-{uso}` | `music-dijkstra-tutorial.ogg` |
| `game/ui/` | `icon-`, `button-`, `panel-` ou `indicator-` | `indicator-lives-3.png` |
| `../fonts/` | `font-{familia}[-variante]` | `font-treasure-zero.ttf` |

Os fundos de mapa usam variantes por dispositivo (`mobile`, `tablet`, `desktop`, `tv`); os fundos de menu usam variantes de formato (`portrait`, `landscape`, `tall`, `wide`).

Ao renomear, atualize componentes, CSS, configurações JSON, scripts geradores e documentação. Confira também caminhos dinâmicos, como o indicador de vidas. Nomes de famílias de fontes no CSS não precisam acompanhar o nome do arquivo.

Os títulos, autores, fontes e licenças das músicas ficam em [audio/CREDITS.md](game/audio/CREDITS.md). A convenção aplica-se aos arquivos de mídia; documentos como `README.md`, `CREDITS.md` e textos de licença mantêm seus nomes próprios.

Consulte também a [convenção das imagens de UI](game/ui/README.md).
