# Benchmark de carregamento — 21/10/2026

## Resultado

O carregamento ainda precisa melhorar em conexões móveis: a mediana de desempenho do Lighthouse foi **67/100 no mobile** e **76/100 no desktop**. O principal custo observado é a transferência de imagens e áudio. A auditoria do menu registrou **17,62 MiB**, incluindo as imagens antecipadas do tutorial.

O pré-carregamento funciona: no benchmark de navegação, a espera entre clicar em Tutorial e suas imagens estarem prontas caiu de **12,95 s para 0,84 s**, redução de **93,5%**. Esse ganho exige permanecer no menu até os downloads terminarem: aproximadamente **16,52 s** no cenário medido. Ele antecipa o trabalho e melhora a resposta após o clique; não reduz os bytes nem o tempo total necessário para baixar tudo.

As medições são locais e não representam um iPhone real ou o site atualmente publicado.

## Versão e metodologia

- Código-base: commit `dda1a17`, mais as alterações locais de WebP sem perdas e pré-carregamento do tutorial, ainda sem commit na coleta.
- Build de produção exportado pelo Next.js 16.3.1, com configuração de GitHub Pages e prefixo `/navegando-para-o-tesouro`.
- URL: `http://127.0.0.1:3199/navegando-para-o-tesouro/`.
- Lighthouse **13.5.0**, Chrome **155.0.0.0**, Windows; automação dos benchmarks de navegação com Playwright **1.64.1**.
- Três execuções independentes por perfil do Lighthouse. Os resumos usam a mediana de cada métrica; não representam necessariamente uma única execução.
- Lighthouse mobile: preset padrão, viewport **412 × 823**, DPR **1,75**, rede simulada de **1.638,4 Kbps**, RTT **150 ms**, CPU **4×** mais lenta.
- Lighthouse desktop: preset oficial completo, incluindo user-agent desktop, viewport **1350 × 940**, DPR **1**, rede simulada de **10.240 Kbps**, RTT **40 ms**, CPU **1×**.
- Lighthouse usa `throttlingMethod: simulate`: FCP/LCP e pontuações abaixo são estimativas do modelo de rede/CPU, não tempos cronometrados num aparelho físico.
- Benchmark do tutorial: viewport **390 × 844**, DPR **3**, toque habilitado, Chrome com rede efetivamente limitada via CDP a **10 Mbps de download**, **1 Mbps de upload**, latência configurada de **80 ms** e CPU **4×**. São condições diferentes das do Lighthouse.
- Cada execução do tutorial usa um contexto novo, inicialmente sem cache. O cenário aquecido espera o pré-carregamento e a rede ficarem ociosos antes do clique.
- Servidor estático local sem gzip/Brotli, com `Cache-Control: public, max-age=3600`. Esse comportamento não replica o CDN, a compressão, o TLS ou os cabeçalhos reais do GitHub Pages.
- Não foram criados testes de regressão visual nem arquivos de prints. Os dados de auditoria salvos excluem as auditorias de capturas.

## Lighthouse: medianas

| Indicador | Mobile | Desktop |
| --- | ---: | ---: |
| Desempenho | **67/100** | **76/100** |
| Acessibilidade automatizada | 100/100 | 100/100 |
| Boas práticas | 96/100 | 92/100 |
| SEO | 100/100 | 100/100 |
| FCP — primeiro conteúdo visível | 1,37 s | 0,35 s |
| LCP — maior conteúdo visível | **34,52 s** | **5,64 s** |
| Speed Index | 2,55 s | 0,53 s |
| TBT — bloqueio da thread principal | 332 ms | 72 ms |
| CLS — deslocamento de layout | 0 | 0,00699 |
| Transferência contabilizada na auditoria | 17,62 MiB | 17,62 MiB |

As pontuações de acessibilidade e SEO cobrem apenas as verificações automáticas do menu. Não equivalem a uma revisão completa de acessibilidade, SEO ou das demais telas.

### Execuções individuais

| Perfil | Execução | Desempenho | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 1 | 68 | 1,215 s | 36,165 s | 307 ms | 0 |
| Mobile | 2 | 67 | 1,367 s | 34,511 s | 332 ms | 0 |
| Mobile | 3 | 66 | 1,373 s | 34,515 s | 361 ms | 0 |
| Desktop | 1 | 71 | 0,354 s | 5,643 s | 183 ms | 0,00699 |
| Desktop | 2 | 76 | 0,342 s | 5,874 s | 44 ms | 0,00699 |
| Desktop | 3 | 76 | 0,350 s | 5,600 s | 72 ms | 0,00699 |

### Como interpretar o LCP

O elemento identificado como LCP foi o botão **Tutorial**, que usa uma imagem de fundo. O valor mobile de 34,52 s é a estimativa de rede lenta do Lighthouse. Na coleta local não limitada usada como entrada dessa simulação, o LCP observado ficou perto de 0,26 s. São medidas diferentes; o resultado não significa que um iPhone real necessariamente demora 35 segundos.

A auditoria também sinalizou descoberta tardia do recurso do LCP e cerca de 500 ms de economia potencial em recursos que bloqueiam a renderização no primeiro ensaio mobile. Não houve comparação A/B com o pré-carregamento desativado: portanto, não foi isolado quanto desse LCP simulado é causado pelo pré-carregamento, pelos arquivos do menu ou pelo modelo de simulação.

## Benchmark: menu → tutorial

“Imagens prontas” significa: tutorial montado; imagens HTML visíveis carregadas; imagens HTML carregadas decodificadas; recursos do mapa mobile, moldura e folha de ilhas presentes no Resource Timing; e dois frames solicitados após isso. Essa definição não mede o primeiro toque real num iPhone nem garante que toda atividade do tutorial, como áudio, tenha terminado.

Os tempos incluem a automação do clique e a verificação no navegador. Não são INP.

| Cenário | Execução | Tempo no menu antes do clique¹ | Clique → tutorial montado | Clique → imagens prontas |
| --- | ---: | ---: | ---: | ---: |
| Entrar imediatamente | 1 | 2,83 s | 1,05 s | 12,76 s |
| Entrar imediatamente | 2 | 2,68 s | 1,75 s | 12,95 s |
| Entrar imediatamente | 3 | 2,60 s | 1,03 s | 12,97 s |
| Esperar pré-carregamento | 1 | 16,40 s | 0,53 s | 0,84 s |
| Esperar pré-carregamento | 2 | 16,52 s | 0,49 s | 0,82 s |
| Esperar pré-carregamento | 3 | 16,56 s | 1,21 s | 1,74 s |

¹ Contado desde o início da navegação; inclui abrir a página e preparar o menu. “Imediatamente” significa clicar assim que a automação encontra o menu hidratado, sem aguardar intencionalmente o pré-carregamento. Não é um cenário com o recurso desligado.

| Mediana | Entrada imediata | Após pré-carregar |
| --- | ---: | ---: |
| Clique → imagens prontas | **12,95 s** | **0,84 s** |
| Navegação inicial → imagens prontas | 15,58 s | 17,34 s |
| Bytes de recursos cuja resposta terminou após o clique² | 17,21 MiB | 0,315 MiB |
| Respostas com bytes transferidos terminadas após o clique² | 24 | 1 |

² Inclui downloads do menu já em andamento, não apenas requisições iniciadas pelo tutorial. Não deve ser interpretado como “peso exclusivo do tutorial”. No cenário aquecido, o único recurso com transferência após o clique foi `music-tutorial.ogg`, aproximadamente 330 KB; as imagens vieram do cache. Não houve exceções JavaScript nas seis execuções de navegação.

## Peso dos arquivos

A comparação dos arquivos WebP locais com os PNGs do commit-base confirma:

| Conjunto | Antes: PNG | Agora: WebP sem perdas | Redução |
| --- | ---: | ---: | ---: |
| 34 imagens | 48.963.163 bytes / 46,70 MiB | 35.652.340 bytes / 34,00 MiB | **27,2%** |

O total de 34 MiB é o conjunto inteiro de imagens do jogo, não o download inicial. A conversão anterior foi validada mantendo as dimensões, o canal alpha e os pixels visíveis; este benchmark compara os tamanhos dos arquivos, não repete essa validação de pixels.

### Distribuição da transferência na primeira auditoria mobile

| Tipo | Transferência |
| --- | ---: |
| Imagens | **14,90 MiB** |
| Áudio do menu | **1,99 MiB** |
| JavaScript | 620,5 KiB |
| Fontes | 61,4 KiB |
| CSS | 52,1 KiB |

O áudio é baixado com `preload="auto"`. A maior parcela é de imagens, incluindo as buscadas preventivamente para o tutorial. Os números não são apenas os recursos necessários para desenhar o primeiro frame.

| Arquivo atual | Tamanho aproximado sem cabeçalhos |
| --- | ---: |
| `background-menu-tall.webp` | 2.293 KiB |
| `music-menu.mp3` | 2.038 KiB |
| `sheet-islands-1.webp` | 1.981 KiB |
| `panel-modal.webp` | 1.783 KiB |
| `background-map-mobile.webp` | 1.432 KiB |
| `panel-hud.webp` | 889 KiB |
| `button-rectangle.webp` | 636 KiB |

## Achados e prioridades sem redesenhar a interface

1. **Reduzir o custo dos pequenos elementos.** O ícone de música continua com 1254 × 1254 pixels para uma área de aproximadamente 41 × 41 pixels na auditoria mobile. Criar variantes compatíveis com o tamanho exibido e a densidade da tela evita transferir o original inteiro. Preservar aparência e conferir nitidez antes de adotar; não reduzir indiscriminadamente os sprites ou fundos.
2. **Otimizar botões e molduras.** O fundo do botão participa do LCP e pesa aproximadamente 636 KiB. Priorizar esses recursos antes de baixar imagens da próxima tela. A análise recomenda testar uma variante menor, sem alterar geometria, cores ou posicionamento.
3. **Rever a antecipação do áudio.** Avaliar `preload="metadata"` ou carregar ao iniciar a reprodução. O menu transfere cerca de 2 MiB de áudio mesmo antes de entrar no tutorial. Validar o início da música e as restrições de reprodução no Safari.
4. **Adaptar o pré-carregamento à conexão.** Manter o ganho de navegação, mas avaliar uma fila menor em rede lenta/economia de dados e aguardar os recursos críticos do menu. O comportamento atual usa duas buscas por vez e prioridade baixa; isso não elimina o volume transferido.
5. **Investigar o 404 da navegação de créditos.** Todas as auditorias registraram `/creditos/__next.creditos.__PAGE__.txt` ausente no servidor estático. O export contém `creditos/__next.creditos/__PAGE__.txt`. Isso reduziu Boas práticas. É um achado desta hospedagem estática local; verificar a rota no GitHub Pages antes de atribuir o mesmo erro à produção.
6. **Revisar a proporção do fundo desktop.** O Lighthouse sinalizou o fundo wide, de proporção 1,78, exibido numa caixa de proporção 1,44. O relatório registra o alerta; não altera o enquadramento nem propõe mudar o design sem revisão.

Essas ações são recomendações. Nenhuma correção adicional de interface, áudio ou política de cache foi aplicada durante o benchmark.

## Limitações

- Não foi medido Safari/iOS nem um iPhone físico. DPR e viewport semelhantes a um celular não emulam o processador, memória, decodificação ou políticas de cache do Safari.
- Não foram medidos INP de campo, consumo de memória num iPhone, uso de bateria, FPS de corridas ou todas as fases do jogo.
- Não houve auditoria do site remoto nem comparação de tempos com os PNGs antigos. A redução de 27,2% é de bytes; não significa automaticamente uma redução de 27,2% no tempo de carregamento.
- O cache local de uma hora é uma condição do ensaio. O reaproveitamento no ambiente publicado depende dos cabeçalhos reais e do cache disponível no aparelho.
- Lighthouse tem variação entre execuções e usa um modelo de simulação. Os três ensaios mostram essa variação; não há intervalo estatístico nem percentil de usuários reais.
- Não há auditorias de captura no JSON salvo. Os relatórios preservam os demais resultados, inclusive falhas e detalhes dos recursos, para conferência.

## Artefatos e reprodução

- [Dados das seis auditorias Lighthouse e seis navegações](benchmarks/2026-10-21/measurements.json).
- [Runner utilizado, com preset desktop corrigido](benchmarks/2026-10-21/run.cjs).

O runner não é um teste de regressão obrigatório e não foi adicionado ao hook de push. Ele usa ferramentas instaladas temporariamente dentro de `.next`, sem alterar as dependências do aplicativo. A execução completa leva alguns minutos, inicia um servidor apenas em `127.0.0.1:3199` e grava os resultados na pasta datada. O caminho do Chrome está configurado para esta máquina Windows.

Na raiz do projeto, PowerShell:

```powershell
$env:GITHUB_PAGES = 'true'
$env:PAGES_BASE_PATH = '/navegando-para-o-tesouro'
pnpm.cmd build
node scripts/prepare-pages.mjs

# Instalar depois do build, pois .next e uma pasta de artefatos descartaveis.
npm.cmd install --prefix .next/benchmark-tools --cache .next/npm-cache --no-save --package-lock=false --ignore-scripts lighthouse@13.5.0 playwright@1.64.1
node docs/benchmarks/2026-10-21/run.cjs
```

A repetição sobrescreve `measurements.json`; preserve uma cópia para comparar rodadas. O Markdown é a análise desta coleta e não é regenerado automaticamente pelo runner. O runner exige Chrome instalado e permissão para iniciar o navegador e abrir a porta local. Perfis temporários ficam sob `.next`.

Referências de interpretação: [simulação e limitação de rede/CPU do Lighthouse](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md), [variação entre execuções](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md) e [perfis mobile e desktop](https://github.com/GoogleChrome/lighthouse/blob/main/docs/emulation.md).
