<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Regressão obrigatória antes do push

- Antes de qualquer `git push`, execute `pnpm test:pre-push` com a matriz completa. Não use `--no-verify`, filtros de dispositivos ou atualização automática de referências para contornar falhas.
- Instale o hook local com `pnpm hooks:install` após clonar o projeto. O hook `.githooks/pre-push` bloqueia o envio se lint, regras, build ou regressão visual falharem.
- As referências estão em `tests/visual/baselines/<dispositivo>/`. A execução gera capturas de todas as telas em `tests/visual/results/<dispositivo>/` e a galeria `tests/visual/results/index.html`.
- Ao mudar a interface, rode a matriz inteira e revise capturas e diferenças, especialmente celulares compactos, orientação horizontal e vitória final. Corrija controles cobertos, cortes, transbordamento e sobreposições antes de atualizar referências.
- `pnpm test:visual:update` serve apenas para aprovar uma mudança visual intencional após revisão; depois rode `pnpm test:visual` sem atualização e confirme que passa. Nunca atualize referências para esconder uma falha.
- Consulte `tests/visual/README.md` para cobertura, comandos e limites. Comparação visual e geometria ajudam a detectar regressões, mas não substituem revisão humana nem testes em aparelhos e navegadores reais.
