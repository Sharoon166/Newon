# Project instructions

## Tooling

- **Package manager: `pnpm`.** Always use `pnpm` for installs, scripts and ad-hoc commands
  (`pnpm add`, `pnpm remove`, `pnpm exec <tool>`, `pnpm dev`, `pnpm build`).
  Do **not** use `npm` or `yarn`, and do not edit or create `package-lock.json` /
  `yarn.lock` — `pnpm-lock.yaml` is the single source of truth.
  If a stray `package-lock.json` exists, treat it as stale.
- Typecheck: `pnpm exec tsc --noEmit`
- Lint: `pnpm exec eslint <path>`

## Stack notes

- Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui components, TanStack Table.
- MongoDB via Mongoose (`src/models/*`), server actions in `src/features/*/actions/index.ts`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
