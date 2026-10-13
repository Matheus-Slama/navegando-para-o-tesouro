# Navegando para o Tesouro

Jogo educativo web sobre o problema do caminho mínimo em grafos, desenvolvido com Next.js, React, SVG e CSS. As ilhas representam vértices; as conexões representam arestas com custos e direção.

Consulte o [FAQ](FAQ.md) para explicações das escolhas técnicas e a [convenção dos assets](public/assets/README.md) para nomes de imagens, músicas e fontes.

## Executar

Requisitos: Node.js 20.9 ou superior e pnpm 9.12.3.

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:3000`. Para produção, use `pnpm build` e depois `pnpm start`. No PowerShell com scripts bloqueados, use `pnpm.cmd` no lugar de `pnpm`.

## Verificar

```bash
pnpm check
```

Executa lint, todas as verificações que não precisam de navegador e o build. Uma falha interrompe a sequência.

| Comando | Verificação |
|---|---|
| `pnpm test` | Todas as verificações de lógica abaixo |
| `pnpm test:maps` | 300 mapas gerados nos três formatos |
| `pnpm test:highscore` | Recordes, armazenamento, adulteração e pontuação |
| `pnpm test:devices` | Perfis e limites de tamanho de tela |
| `pnpm test:dijkstra` | Tutorial, ordem de seleção e custos dos quatro barcos |
| `pnpm lint` | Regras de código |
| `pnpm build` | Compilação de produção |

As verificações de interface precisam da aplicação rodando e de um Chrome de teste com perfil separado e depuração remota:

- `pnpm test:browser:hint`: porta padrão 9224; aceita `GAME_HINT_URL` e `GAME_HINT_CDP`.
- `pnpm test:browser:pause`: porta padrão 9226; aceita `GAME_PAUSE_URL` e `GAME_PAUSE_CDP`.

Exemplo de argumentos para o Chrome de teste: `--remote-debugging-port=9224 --user-data-dir=<pasta-temporaria-do-teste>`. Essas verificações não fazem parte de `pnpm check`, pois dependem do navegador externo.

## Organização

```text
app/                     Páginas principal e de créditos, layout e estilos globais
src/game/components/     Telas, tabuleiro, diálogos e controles
src/game/hooks/          Jornada, áudio, dispositivos e animação
src/game/core/           Algoritmos, geração, validação e persistência
src/game/config/json/    Fases, mapas fixos, posições e perfis de tela
src/game/config/         Composição das configurações e balanceamento
src/game/enums/          Faixas de dificuldade
public/assets/game/      Imagens e músicas
public/fonts/            Fonte local
public/licenses/         Licenças das fontes
scripts/                 Verificações e geração da fonte
```

## Fluxo e pontuação

O jogador inicia uma jornada de dez fases com três vidas. Em cada fase, compara os custos e escolhe um dos quatro barcos. Cada barco percorre seu menor caminho; vence o de menor custo total. Uma escolha incorreta remove uma vida e desconta `250 ÷ tempo de escolha em segundos`. Quanto mais rápido o erro, maior a perda. O total pode ficar negativo e aparece em vermelho no HUD.

Uma escolha correta concede `(id × 1000) ÷ tempo de escolha em segundos`, sem limite máximo: quanto mais rápido o acerto, maior a recompensa. Os cálculos usam frações de segundo e arredondam o resultado para um inteiro. Tempos iguais a zero, negativos ou não finitos resultam em zero pontos. As regras ficam em `config/balance.js` e `core/scoring.js`. O HUD ajusta a fonte para acomodar pontuações maiores.

O recorde é salvo no navegador, sem sincronização entre dispositivos. A proteção com AES-GCM dificulta edição casual, mas a chave também fica no cliente e não impede trapaças. A jornada em andamento não é restaurada após recarregar a página.

## Fases e mapas

`src/game/config/json/maps.json` define as dez fases. Exemplo de estrutura:

```json
{
  "id": 1,
  "name": "Primeiros custos",
  "difficulty": "easy",
  "enableDijkstraTutorial": false,
  "hints": ["Some os custos de todas as conexões até o tesouro."]
}
```

`enums/weight-ranges.js` define pesos, quantidade de ilhas e rotas extras por dificuldade. `config/phases.js` combina esses perfis com o balanceamento. Grafos são direcionados por padrão; `directed: false` permite configurar exercícios sem direção.

O gerador usa uma semente numérica, calcula os resultados com Dijkstra e rejeita candidatos sem conectividade, sem vencedor único ou com mais de uma rota mínima para o vencedor. Também verifica as restrições geométricas e de dificuldade. Há um limite de 2.000 tentativas; se nenhuma funcionar, a geração informa um erro.

## Tutorial de Dijkstra

Os mapas demonstrativos ficam em `config/json/dijkstra-fixed-maps.json`, com versões mobile, tablet e wide. Os conceitos ficam em `config/json/dijkstra-steps.json`; as cenas são calculadas em `core/dijkstra-walkthrough.js`.

O tutorial mostra inicialização, escolha do menor custo provisório, relaxamento das conexões, confirmação e caminho final. Permite avançar, voltar e comparar os barcos. O barco azul tem uma única rota mínima vencedora nos três formatos.

Os mapas do tutorial são compactos: `config/dijkstra-fixed-map.js` mantém a faixa de pesos da última fase, mas define mínimos próprios de 23 conexões e cinco vértices no caminho vencedor. As fases geradas mantêm as exigências de seu perfil de dificuldade.

## Imagens e responsividade

`config/gameAssets.js` define barcos, tesouros e folhas de sprites das ilhas. Os fundos do mapa ficam em `config/json/islandPlacement.json`; os perfis de dispositivo ficam em `config/json/device-sizes.json`.

`useDeviceConfig` observa as dimensões da janela; `useMapLayout` fornece o formato do mapa. A seleção não depende do nome do aparelho. O projeto usa imagens próprias, SVG para conexões e CSS para disposição e apresentação.

## Música e volume

`useScreenMusic` mantém o volume em 35% e acompanha a pausa. Se o navegador bloquear o início automático, uma interação por toque, clique ou teclado permite tentar novamente.

As faixas ficam em `public/assets/game/audio/`. As músicas do mapa e do tutorial foram convertidas de WAV para OGG Vorbis, qualidade 4, para reduzir o download. Autores, fontes, licenças e alterações estão em [CREDITS.md](public/assets/game/audio/CREDITS.md) e na página `/creditos`.

## Explicação para o TCC

O jogo representa o problema do caminho mínimo por meio de uma jornada de barcos até um tesouro. Dijkstra calcula o menor custo de cada origem ao destino, enquanto dicas e demonstrações explicitam os conceitos. React organiza a interface e SVG representa as conexões. Next.js fornece a estrutura web e o processo de build. A geração controlada e as verificações automatizadas ajudam a evitar mapas ambíguos e erros no cálculo dos caminhos.
