<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Verificação antes do push

- Antes de qualquer `git push`, execute `pnpm test:pre-push`.
- Instale o hook local com `pnpm hooks:install` após clonar o projeto. O hook `.githooks/pre-push` bloqueia o envio se lint, regras do jogo ou build falharem.
