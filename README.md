# Hearth

Self-hosted family dashboard running on a Mac Mini, accessible from any browser on the local network.

See [docs/INTENT.md](docs/INTENT.md) for the full feature spec and design intent.

## Tech Stack

- **Runtime:** Node.js 20+
- **Backend:** Express
- **Database:** SQLite via better-sqlite3
- **Frontend:** Vanilla TypeScript + HTML/CSS (no framework)
- **Bundler:** Vite
- **Tests:** Vitest
- **Linting:** ESLint + Prettier

## Setup

```bash
# Install dependencies
npm install

# Initialize the database
npm run db:setup

# Start development server (hot reload)
npm run dev
```

The dev server runs at `http://localhost:5173` and proxies API requests to the Express backend.

## Commands

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm test`         | Run all tests                        |
| `npm run dev`      | Start dev server with hot reload     |
| `npm run build`    | Production build (output in `dist/`) |
| `npm run lint`     | Lint and format check                |
| `npm run db:setup` | Initialize SQLite database           |
| `npm run db:reset` | Drop and recreate database           |

## Project Structure

```
src/
  server/       Express app, routes, models, DB layer
  client/       Vanilla TS frontend (Vite entry point)
  shared/       Types shared between client and server
tests/          Mirror of src/ structure
scripts/        DB setup and utilities
docs/           Intent document and implementation plan
```
