# Regressão de interface

A matriz em `devices.json` cobre 11 viewports: celular compacto 320×568, iPhone SE, iPhone 13/14, Android Galaxy e Pixel, celular horizontal, iPad Mini e Air, tablet horizontal, notebook HD e desktop Full HD. Os nomes representam **tamanhos de viewport**, com Chromium e toque emulados; não são aparelhos físicos nem emulação do Safari.

Cada perfil percorre 64 telas/estados reais: menu e áudio, créditos completos, os 12 passos do tutorial inicial e sua pausa, dez fases, dica aberta, estilos das arestas, pausa, corrida, derrota, vitória de fase, desbloqueio de Dijkstra, seus 25 passos e comparações entre barcos, vitória final com texto e ações, e fim da jornada após três erros. O teste usa os controles existentes do jogo; ferramentas de desenvolvimento apenas selecionam fases e informam o vencedor.

## Executar

Requer Node ≥22, dependências instaladas e Chrome ou Edge. O teste abre navegadores **headless isolados por dispositivo**, sem usar seu perfil pessoal, inicia Next.js na porta 3107 e encerra os processos que criou. Dois dispositivos rodam em paralelo por padrão; `--workers=1` reduz o uso de memória e `--workers=3` permite três ao mesmo tempo. Não precisa iniciar Chrome com uma porta de depuração nem abrir o jogo manualmente.

```sh
pnpm test:visual
pnpm test:pre-push
pnpm hooks:install
```

## Firefox e WebKit

Instale os motores de teste após instalar as dependências:

```sh
pnpm test:browsers:install
pnpm test:cross-browser
```

Além da comparação de pixels no Chromium, `test:cross-browser` percorre os mesmos 64 estados nos 11 viewports em **Firefox e WebKit**, com Playwright instalado apenas como dependência de desenvolvimento. Verifica os fluxos, toque nos perfis móveis, pausa, imagens, erros JavaScript, geometria e acesso às ações até a vitória final. O hook de pre-push e o CI exigem essa matriz inteira também. Os navegadores e os testes não são incluídos no jogo publicado.

Cada motor gera sua própria galeria e capturas PNG: `results/firefox/index.html` e `results/webkit/index.html`. Esses dois motores validam funcionamento e geometria; **não comparam pixels com as referências do Chromium**, pois fontes e rasterização variam entre motores. As referências WebP existentes e a comparação de pixels do Chromium continuam em uso, sem atualização automática.

WebKit é o motor usado pelo Safari, mas o WebKit do Playwright no Windows não é o Safari instalado em um Mac ou iPhone. Firefox usa Gecko; seus perfis pequenos verificam viewport responsivo e toque, pois Playwright não oferece emulação móvel completa nesse motor. Testes em Safari/iOS e aparelhos reais continuam necessários para confirmar particularidades dessas plataformas.

Para diagnosticar um único motor ou viewport (não substitui a matriz completa):

```sh
pnpm test:visual --engine=webkit --devices=mobile-compact,mobile-landscape
pnpm test:visual --engine=firefox --devices=desktop-hd
```

O hook é instalado automaticamente por `pnpm install` (script `prepare`); `pnpm hooks:install` permite reinstalá-lo. Ele exige alterações já commitadas e executa lint, regras do jogo, build de produção e a matriz visual inteira antes de cada push. Um erro bloqueia o envio. O deploy no GitHub também depende da regressão visual; pull requests executam a mesma suíte e guardam os resultados como artefato. Hooks locais podem ser ignorados pelo Git, por isso existe também a verificação no CI.

Configuração opcional:

- `VISUAL_BROWSER_PATH`: caminho do Chrome/Edge.
- `VISUAL_PORT`: porta do servidor isolado (padrão 3107).
- `VISUAL_BASE_URL`: servidor **de desenvolvimento** já iniciado; precisa das ferramentas de fases. A suíte normal inicia seu próprio servidor.
- `pnpm test:visual --devices=mobile-compact,mobile-landscape`: diagnóstico parcial; não substitui a matriz antes do push.

## Capturas e revisão

O padrão aprovado do menu mantém recorde e botões centralizados. No celular em pé, os créditos ficam independentes do bloco, junto à corda inferior, e o volume fica 12px mais baixo. No tablet, os botões são mais largos; na horizontal, ficam lado a lado. As áreas de toque têm pelo menos 44px e não podem se sobrepor. Nos celulares deitados, a margem inferior dos créditos é de 4px; nos demais perfis, de pelo menos 24px, respeitando também a área segura do aparelho.

A auditoria verifica alinhamento com o recorde, ordem dos controles e tamanho de toque, além de cortes e sobreposições. As referências de pixels registram a posição aprovada do bloco e dos créditos em cada viewport. As guardas incluem um menu válido e versões propositalmente desalinhadas ou pequenas para toque, para confirmar que essas regressões são detectadas.

O Chromium usa Playwright para controlar o Chrome/Edge instalado, incluindo toque nos perfis móveis. A rasterização de testes é feita em software para evitar variações de tiles da GPU, e a captura aguarda dois frames após aplicar as máscaras. As capturas continuam em WebP qualidade 95 pelo protocolo CDP; a tolerância de comparação permanece a mesma.

- `baselines/<dispositivo>/<tela>.webp`: referências versionadas, em WebP qualidade 95 para limitar o tamanho do repositório.
- `baselines/manifest.json`: matriz e inventário das capturas, plataforma e versão do navegador.
- `results/<dispositivo>/<tela>.webp`: capturas da última execução.
- `results/<dispositivo>/<tela>.diff.png`: pixels diferentes destacados em rosa quando há regressão.
- `results/index.html`: galeria para revisão de todas as telas.
- `results/overview.html`: visão geral com menu, tutorial, fase final, Dijkstra e vitória de cada dispositivo.
- `results/report.json`: problemas de geometria, imagens indisponíveis, proporção de pixels alterados e erros de fluxo.
- `results/server.log`: saída do servidor de teste.

`results/` é gerada localmente e ignorada pelo Git. As referências ficam no Git. A galeria é um arquivo HTML local: abra no navegador para ampliar cada captura. O manifesto é escrito somente se toda a execução de atualização passar nas verificações estruturais.

Após uma mudança visual intencional:

1. Rode `pnpm test:visual` e revise as capturas e diferenças.
2. Corrija problemas reais de layout. Referências ausentes também falham.
3. Rode `pnpm test:visual:update` para gerar as novas referências da matriz completa.
4. Revise a galeria e os arquivos modificados; não aprove mudanças inesperadas.
5. Rode `pnpm test:visual` novamente, sem atualizar. Depois commite código e referências juntos.

Com uma referência completa já existente e a mesma cobertura, é possível atualizar somente um perfil revisado com `pnpm test:visual:update --devices=mobile-landscape`. Isso não substitui o passo 5: a validação final e o hook sempre executam todos os dispositivos.

## O que bloqueia

Controles cortados, cobertos, sobrepostos ou com texto transbordando; recorde desalinhado ou coberto; Créditos sem margem inferior; sobreposição visível de HUD e tesouro; rolagem horizontal; rolagem vertical inesperada no jogo; imagens quebradas, recursos HTTP indisponíveis e erros JavaScript; relógio avançando na pausa; ações de vitória inacessíveis; diferenças acima de **0,2%** dos pixels, com tolerância de 24 níveis por canal para pequenas variações de renderização. As margens transparentes dos PNGs são consideradas na geometria de HUD/tesouro. Créditos e diálogos longos podem rolar internamente: o teste verifica o acesso às ações.

Animações CSS são desativadas durante a captura, barcos são posicionados no mesmo instante da corrida, e apenas valores dependentes do tempo (cronômetro e pontuações variáveis) são mascarados. Sua geometria continua sendo auditada. O armazenamento é limpo ao iniciar cada dispositivo para que recordes e preferências não vazem entre perfis. A vitória final usa o ciclo real de carregamento e revelação do baú.

A entrada animada do painel de vitória é desativada na suíte para estabilizar a medição dos botões. As duas capturas da vitória usam posições de rolagem explícitas: início do diálogo e final do conteúdo, sem depender da velocidade da máquina.

A suíte aguarda a transição de tamanho do baú terminar antes de definir essas posições. Assim, a animação não altera a altura rolável entre a medição e a captura.

Antes das capturas, a suíte também aguarda a decodificação das imagens de fundo CSS, incluindo as folhas de sprites das ilhas, além das fontes e imagens HTML. Recursos CSS ausentes falham o fluxo em vez de gerar uma captura incompleta.

As referências foram produzidas no Windows; o CI usa Windows para reduzir diferenças de fontes. Atualizações de Chrome, fontes ou sistema podem exigir revisão das referências. Isso detecta muitas regressões, mas **não garante ausência de todo problema visual**, especialmente em Safari/iOS, zoom, fontes alternativas, teclado virtual e aparelhos físicos. Revise visualmente as mudanças e complemente com esses cenários quando forem relevantes.
