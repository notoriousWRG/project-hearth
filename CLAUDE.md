# Hearth — Claude Code Instructions

## Project

Self-hosted family dashboard. Node.js + Express backend, vanilla TS frontend, SQLite database.
Runs on Mac Mini, accessed via LAN browser.

## Project Context

See docs/INTENT.md and docs/IMPLEMENTATION_PLAN.md before any work session.

## Tech Stack

- Runtime: Node.js 20+
- Language: TypeScript (strict mode)
- Backend: Express
- Database: SQLite via better-sqlite3
- Frontend: Vanilla TypeScript + HTML/CSS (no framework)
- Bundler: Vite
- Test runner: Vitest
- Linting: ESLint + Prettier

## Commands

- `npm test` — run all tests (must pass before any commit)
- `npm run dev` — start dev server with hot reload
- `npm run build` — production build
- `npm run lint` — lint and format check
- `npm run db:setup` — initialize SQLite database
- `npm run db:reset` — drop and recreate database

## Workflow

1. Write a failing test first
2. Write the minimum code to pass it
3. Refactor if needed
4. Run `npm test` — all tests must pass
5. Run `npm run lint` — no errors
6. Commit with a descriptive message referencing the milestone

## Conventions

- No external dependencies without documented justification
- Keep functions small and single-purpose
- Use explicit return types on all exported functions
- Database queries go in src/server/models/, not in route handlers
- Shared types between client and server go in src/shared/types.ts
- Test files mirror source structure: src/server/routes/todos.ts → tests/server/routes/todos.test.ts
- CSS custom properties for all theme values — no hardcoded colors

## Architecture Notes

- No authentication. PIN protection is a simple middleware check for /api/settings routes only.
- All state in SQLite. No in-memory state that survives restart.
- Frontend served as static files from Express in production.
- Recurring task reset handled by a lightweight check on each request or a startup routine — not a cron job.
