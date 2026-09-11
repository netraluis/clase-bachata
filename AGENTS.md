<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diseño

Toda la interfaz sigue el sistema de diseño Compás, documentado en `docs/DESIGN.md`. Antes de crear o tocar una pantalla, léelo. Tokens y componentes están en `src/app/globals.css`; no se inventan colores, tamaños de texto ni radios fuera de los definidos ahí.
