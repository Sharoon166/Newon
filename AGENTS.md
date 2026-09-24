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
