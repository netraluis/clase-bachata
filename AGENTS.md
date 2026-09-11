<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diseño

La interfaz se hace con componentes de shadcn/ui, planos y sin personalizar, con el preset `b4ccpYALa4`. Antes de escribir cualquier elemento de interfaz, búscalo en https://ui.shadcn.com/docs/components y descárgalo con `npx shadcn@latest add <componente>`. No se crean clases CSS propias ni se usan colores fuera del tema. Reglas y rutas en `docs/DESIGN.md`.
