# 🔨 Hearth — Implementation Plan (Claude Code)

**Status:** Active | May 2026

**Audience:** Claude Code / implementation agent

**Purpose:** Step-by-step build plan for Hearth, organized into milestones with TDD workflow, Claude Code conventions, and deployment instructions.

**Companion:** [Intent Document](https://app.notion.com/p/3530c118e1ea81cabc4cc7a6e4d61c7a)

---

# Principles for This Build

1. **TDD always.** Write a failing test, write just enough code to pass it, refactor. No milestone advances until all tests are green.
2. **Simplicity over cleverness.** Minimal dependencies. Every external package needs a clear justification documented in the PR or commit message.
3. **Claude Code optimized.** This doc is the source of truth for the agent. Each milestone has explicit acceptance criteria, file paths, and commands to run.
4. **Incremental and shippable.** Each milestone produces a working, testable artifact. No "big bang" integration.
5. **Document as you go.** README, inline comments, and [CLAUDE.md](http://CLAUDE.md) stay current with each milestone.

---

# Repository Setup

## Initial Structure

```
hearth/
├── CLAUDE.md              # Claude Code project instructions
├── README.md              # Project overview, setup, run instructions
├── LICENSE                # MIT
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── server/
│   │   ├── index.ts       # Express app entry
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   ├── connection.ts
│   │   │   └── migrations/
│   │   ├── routes/
│   │   ├── models/
│   │   └── middleware/
│   ├── client/
│   │   ├── index.html
│   │   ├── main.ts
│   │   ├── components/
│   │   ├── styles/
│   │   │   └── themes/
│   │   └── utils/
│   └── shared/
│       └── types.ts       # Shared TypeScript types
├── tests/
│   ├── server/
│   └── client/
└── scripts/
    └── setup-db.ts
```

## [CLAUDE.md](http://CLAUDE.md) (Claude Code Config)

This file lives at the repo root and tells Claude Code how to work in this project. Create it during Milestone 0.

```
# Hearth — Claude Code Instructions

## Project
Self-hosted family dashboard. Node.js + Express backend, vanilla TS frontend, SQLite database.
Runs on Mac Mini, accessed via LAN browser.

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
```

---

# Milestone 0: Project Scaffold & Tooling

**Goal:** Empty project that builds, lints, and runs a passing test suite.

## Steps

1. Initialize git repo, create GitHub repository (private).
2. `npm init` with project metadata.
3. Install dev dependencies (document justification for each):
    - `typescript` — language
    - `vitest` — test runner (fast, native ESM, zero-config for TS)
    - `eslint` + `@typescript-eslint/*` — linting
    - `prettier` — formatting
    - `vite` — frontend bundler and dev server
4. Install runtime dependencies:
    - `express` — HTTP server (mature, minimal, well-supported)
    - `better-sqlite3` — SQLite driver (synchronous, fast, no ORM overhead)
5. Create `tsconfig.json` with strict mode enabled.
6. Create `.gitignore` (node_modules, dist, *.db, .env).
7. Create `CLAUDE.md` per the template above.
8. Create `README.md` with project overview, setup instructions, and link to Intent Document.
9. Write a smoke test: `tests/smoke.test.ts` that asserts `1 + 1 === 2`.
10. Verify: `npm test` passes, `npm run lint` passes, `npm run build` succeeds.
11. Commit and push.

## Acceptance Criteria

- [ ]  `npm test` runs and passes
- [ ]  `npm run lint` exits clean
- [ ]  `npm run build` produces output in `dist/`
- [ ]  `CLAUDE.md` exists at repo root
- [ ]  `README.md` has setup instructions
- [ ]  GitHub repo is created with initial commit

---

# Milestone 1: Database Schema & Data Layer

**Goal:** SQLite database with all Phase 1 tables, a connection module, and model functions with full test coverage.

## Schema Design

**Tables:**

- `users` — id, name, type (parent|child), icon, display_order
- `todos` — id, user_id, title, completed, position, is_recurring, recurrence_rule, created_at, completed_at
- `chores` — id, user_id (child), title, icon, completed, is_recurring, recurrence_rule, is_bonus, bonus_amount, position, created_at, completed_at
- `chore_completions` — id, chore_id, completed_at, period_id (for tracking across allowance periods)
- `allowance_config` — id, user_id, amount, streak_threshold, reset_day, period_start
- `allowance_tiers` — id, config_id, percent_complete, percent_payout
- `streak_records` — id, user_id, current_streak, longest_streak, last_completed_date
- `meal_plan` — id, week_start_date, day_of_week, meal_type (breakfast|lunch|dinner|snack), description
- `grocery_items` — id, name, category (produce|protein|pantry|dairy|household|other), checked, source (manual|meal_plan), meal_plan_id (nullable)
- `reminders` — id, title, due_date, dismissed, created_at
- `settings` — key, value (JSON string) — for PIN, theme preferences, reset time, etc.

Leave room for Phase 2: the schema should not block adding recipe tables, helper chore categories, or seasonal calendar entries later.

## Steps (TDD)

1. **Test:** Write `tests/server/db/connection.test.ts` — assert database opens, can execute a simple query.
2. **Code:** Create `src/server/db/connection.ts` — exports a function that opens/returns a better-sqlite3 instance. Use `:memory:` for tests, file path for production.
3. **Test:** Write `tests/server/db/schema.test.ts` — assert all tables exist after running schema.
4. **Code:** Create `src/server/db/schema.sql` with all table definitions. Create `scripts/setup-db.ts` to run it.
5. **Test:** Write model tests for each entity (e.g., `tests/server/models/todos.test.ts`) — CRUD operations.
6. **Code:** Implement model modules: `src/server/models/todos.ts`, `chores.ts`, `meals.ts`, `grocery.ts`, `reminders.ts`, `settings.ts`, `users.ts`.
7. **Test:** Write tests for recurring task reset logic.
8. **Code:** Implement reset logic in a shared utility.
9. Run full suite. All green. Commit.

## Acceptance Criteria

- [ ]  All tables created by `schema.sql`
- [ ]  Model functions for CRUD on every entity
- [ ]  Recurring reset logic tested and working
- [ ]  In-memory DB used for all tests (no file artifacts)
- [ ]  `npm test` all green

---

# Milestone 2: API Routes

**Goal:** RESTful API for all Phase 1 features. Fully tested with integration tests.

## Route Map

- `GET/POST /api/users` — list users, seed initial users
- `GET/POST/PUT/DELETE /api/todos` — CRUD todos for a user
- `GET/POST/PUT/DELETE /api/chores` — CRUD chores for a child
- `POST /api/chores/:id/complete` — mark chore complete
- `GET /api/chores/progress/:userId` — chore completion %, tier, earned amount
- `GET /api/streaks/:userId` — current streak info
- `GET/PUT /api/meal-plan?week=YYYY-MM-DD` — get/update meal plan for a week
- `POST /api/meal-plan/generate-grocery` — populate grocery list from current week's meals
- `GET/POST/PUT/DELETE /api/grocery` — CRUD grocery items
- `POST /api/grocery/clear-checked` — remove checked items
- `GET/POST/PUT/DELETE /api/reminders` — CRUD reminders
- `GET/PUT /api/settings` — read/update settings (PIN-protected)
- `POST /api/settings/verify-pin` — verify PIN for settings access

## Steps (TDD)

1. **Test:** Write `tests/server/routes/users.test.ts` using supertest against the Express app.
2. **Code:** Create `src/server/routes/users.ts` with route handlers that call model functions.
3. Repeat for each route group: todos, chores, meal-plan, grocery, reminders, settings.
4. **Test:** Write PIN middleware test — settings routes return 401 without valid PIN.
5. **Code:** Implement PIN middleware in `src/server/middleware/pin.ts`.
6. **Test:** Write integration test for meal-plan → grocery-list flow.
7. **Code:** Wire up the generate-grocery endpoint.
8. All tests green. Commit.

## Accepted Dependencies

- `supertest` (dev) — HTTP assertion library for Express integration tests. Well-established, no alternatives needed.

## Acceptance Criteria

- [ ]  Every route has at least one happy-path and one error-case test
- [ ]  PIN middleware blocks unauthorized settings access
- [ ]  Meal plan → grocery list generation works end-to-end
- [ ]  `npm test` all green

---

# Milestone 3: Theme System & Base Frontend

**Goal:** Vite-served frontend with theme switching, navigation shell, and user selector. No feature screens yet.

## Theme Implementation

All visual theming via CSS custom properties. Three theme files:

- `src/client/styles/themes/clean.css` — minimal, neutral, sans-serif
- `src/client/styles/themes/farmstead.css` — warm earth tones, soft textures
- `src/client/styles/themes/whimsy.css` — bright colors, rounded shapes, playful

Theme is applied by swapping a `data-theme` attribute on `<html>`. The JS reads the user's theme preference from the settings API and applies it.

## Steps (TDD)

1. **Test:** Write tests for theme utility functions (load theme, apply theme, persist preference).
2. **Code:** Implement theme utilities in `src/client/utils/theme.ts`.
3. **Code:** Create the three theme CSS files with documented custom properties.
4. **Code:** Build navigation shell: user selector (icon-based, top bar), main content area, tab/section navigation.
5. **Test:** Write tests for user selector logic (switching users changes view mode).
6. **Code:** Implement user selector component.
7. **Code:** Set up Vite dev server to proxy API requests to Express backend.
8. Visual verification: all three themes render correctly. Commit.

## Acceptance Criteria

- [ ]  Three theme CSS files with documented custom properties
- [ ]  Theme switches correctly via `data-theme` attribute
- [ ]  User selector shows all users with icons
- [ ]  Switching to a child user changes to child view layout
- [ ]  Vite proxies API calls to Express in dev mode
- [ ]  `npm test` all green

---

# Milestone 4: Parent Dashboard — Todos, Chores, Reminders

**Goal:** Working parent view with todo list, parent chore list, and reminders panel.

## Steps (TDD)

1. **Test:** Todo component renders, adds, completes, deletes items.
2. **Code:** Build todo list component with full CRUD against the API.
3. **Test:** Parent chore component renders, handles recurring display.
4. **Code:** Build parent chore list component.
5. **Test:** Reminders component shows today's reminders, allows dismiss.
6. **Code:** Build reminders panel.
7. **Test:** Daily overview component shows date and contextual summary.
8. **Code:** Build daily overview header.
9. Integration test: load parent dashboard, verify all sections render with data.
10. All green. Commit.

## UI Rules (from Intent Doc)

- Functional over decorative
- All actions within 2 taps
- No modal flows that trap you mid-task
- State saves automatically
- Dense enough to be useful at a glance

## Acceptance Criteria

- [ ]  Todo CRUD works end-to-end
- [ ]  Parent chores display with recurring indicators
- [ ]  Reminders show for today, can be dismissed
- [ ]  Daily overview header shows date + context
- [ ]  Auto-save on all interactions (no save button)
- [ ]  `npm test` all green

---

# Milestone 5: Meal Plan & Grocery List

**Goal:** Weekly meal planner and grocery list with the generate-from-meals flow.

## Steps (TDD)

1. **Test:** Meal plan grid renders Mon–Sun with 4 meal slots each.
2. **Code:** Build meal plan weekly view component.
3. **Test:** Clicking a meal slot opens inline edit (not a modal).
4. **Code:** Implement inline meal editing.
5. **Test:** "Generate grocery list" creates items from meal descriptions.
6. **Code:** Wire up the generate button to the API endpoint.
7. **Test:** Grocery list renders with category groupings, check/uncheck works.
8. **Code:** Build grocery list component with category sections.
9. **Test:** "Clear checked" removes completed items.
10. **Code:** Implement clear-checked button.
11. All green. Commit.

## Acceptance Criteria

- [ ]  Meal plan displays full week with all meal types
- [ ]  Meals editable inline, saved automatically
- [ ]  Generate grocery list populates from current week
- [ ]  Grocery items grouped by category
- [ ]  Check/uncheck and clear-checked work
- [ ]  `npm test` all green

---

# Milestone 6: Child View — Chore Tracker & Allowance

**Goal:** Child-facing chore list with icon-first UI, progress tracking, streak display, and allowance summary.

## Children's UI Rules (from Intent Doc)

- Minimum 20px text, 48px tap targets
- Icons primary, text secondary
- Simple language, present tense
- Whimsy theme by default
- No visible complexity — just chores, progress bar, earned amount
- Pre-reader (Golden) must be able to operate without assistance

## Steps (TDD)

1. **Test:** Child chore list renders with icons and large tap targets.
2. **Code:** Build child chore component — icon-first layout, tap to complete.
3. **Test:** Completion animation fires on tap (brief color pulse, not gamified).
4. **Code:** Implement subtle completion animation via CSS.
5. **Test:** Progress bar calculates correctly from completion data.
6. **Code:** Build progress indicator showing chores done, tier reached, earned amount.
7. **Test:** Streak counter increments correctly, badge appears at threshold.
8. **Code:** Build streak display component.
9. **Test:** Allowance summary shows correct earned amount based on tier config.
10. **Code:** Build allowance summary (large friendly text, no math visible to child).
11. All green. Commit.

## Acceptance Criteria

- [ ]  Chore list uses icon-first layout
- [ ]  All tap targets >= 48px
- [ ]  Completion animation is subtle and brief
- [ ]  Progress bar reflects real completion percentage
- [ ]  Streak counter works correctly
- [ ]  Allowance earned amount displays in large text
- [ ]  Whimsy theme loads by default for child views
- [ ]  Golden (pre-reader) can use the view without reading
- [ ]  `npm test` all green

---

# Milestone 7: Settings Panel

**Goal:** PIN-protected settings with chore management, allowance config, theme selection, and payout controls.

## Steps (TDD)

1. **Test:** PIN entry blocks access, correct PIN grants access.
2. **Code:** Build PIN entry screen component.
3. **Test:** Chore management CRUD works per child.
4. **Code:** Build chore management UI (add, edit, reorder, delete, set recurring, set bonus).
5. **Test:** Allowance config saves and loads correctly.
6. **Code:** Build allowance config UI (amount, tiers, streak bonuses).
7. **Test:** Theme selector applies theme per view.
8. **Code:** Build theme selector.
9. **Test:** PIN change flow works.
10. **Code:** Build PIN management UI.
11. **Test:** "Mark as paid" resets allowance balance.
12. **Code:** Build payout button with confirmation.
13. **Test:** Configurable reset time saves and is used by reset logic.
14. **Code:** Build reset time configuration.
15. All green. Commit.

## Acceptance Criteria

- [ ]  PIN required to access settings
- [ ]  Chore CRUD per child with all options (recurring, bonus, icon)
- [ ]  Allowance tiers configurable
- [ ]  Theme selectable per view (parent/child independent)
- [ ]  PIN changeable
- [ ]  "Mark as paid" resets balance
- [ ]  Reset time configurable, defaults to midnight
- [ ]  `npm test` all green

---

# Milestone 8: Family Summary & Tablet Display Mode

**Goal:** A family summary page designed for always-on tablet display. Shows progress for all users, today's reminders, and a simple affirmation.

## Steps (TDD)

1. **Test:** Summary page aggregates chore progress for all children.
2. **Code:** Build family summary component.
3. **Test:** Today's reminders and meal plan show on summary.
4. **Code:** Add reminders and today's meals to summary view.
5. **Code:** Add a rotating affirmation or family quote (stored in settings, parent-configurable).
6. **Code:** Optimize for always-on display: no scroll needed, auto-refresh on interval, prevent screen sleep via Wake Lock API if available.
7. All green. Commit.

## Acceptance Criteria

- [ ]  Summary shows all children's chore progress
- [ ]  Today's reminders visible
- [ ]  Today's meals visible
- [ ]  Affirmation/quote displays
- [ ]  Auto-refreshes periodically
- [ ]  Readable at arm's length on tablet
- [ ]  `npm test` all green

---

# Milestone 9: Polish, Accessibility & Performance

**Goal:** Production-quality polish pass. Accessibility audit, performance check, and UX refinements.

## Steps

1. Accessibility audit: keyboard navigation, screen reader labels, contrast ratios on all three themes.
2. Performance: bundle size check, lazy loading if needed, SQLite query performance with realistic data volume.
3. Responsive design verification on Mac Mini browser and Pixel tablet browser.
4. Error handling: graceful failures for API errors, database issues.
5. Loading states: brief skeleton screens or spinners where needed.
6. Edge cases: empty states (no chores, no meals, no reminders), long text overflow, rapid tapping.
7. All tests still green. Commit.

## Acceptance Criteria

- [ ]  Passes WCAG 2.1 AA contrast on all themes
- [ ]  Keyboard navigable
- [ ]  Works on Chrome (Mac) and Chrome (Android/Pixel tablet)
- [ ]  Graceful error handling throughout
- [ ]  No jank on Pixel tablet
- [ ]  `npm test` all green

---

# Milestone 10: Deployment & Documentation

**Goal:** Hearth runs on the Mac Mini, starts on boot, and is fully documented.

## Steps

1. Production build: `npm run build` produces optimized static assets + server bundle.
2. Create `scripts/install.sh` — installs Node.js if needed, runs npm install, initializes database, builds frontend.
3. Create a launchd plist (macOS) for auto-start on boot.
4. Configure mDNS/Bonjour so `hearth.local` resolves on the LAN.
5. Test full flow: reboot Mac Mini → Hearth starts → accessible from Pixel tablet at `hearth.local`.
6. Final README update with:
    - Full setup instructions
    - How to access from other devices
    - How to back up the SQLite database
    - How to update (git pull, rebuild)
    - Troubleshooting common issues
7. All tests green. Tag release `v1.0.0`. Commit and push.

## Acceptance Criteria

- [ ]  `hearth.local` accessible from any LAN device
- [ ]  App starts automatically on Mac Mini boot
- [ ]  README covers setup, access, backup, update, and troubleshooting
- [ ]  Database backup instructions documented
- [ ]  `v1.0.0` tag pushed to GitHub
- [ ]  All tests green

---

# Dependency Justification Log

Every external dependency must be documented here with its justification.

**Runtime:**

- `express` — mature, minimal HTTP framework. No viable simpler alternative for Node.js.
- `better-sqlite3` — synchronous SQLite driver. Faster and simpler than async alternatives. No ORM overhead.

**Dev:**

- `typescript` — type safety across the stack.
- `vitest` — fast, native TS/ESM support, compatible with Vite.
- `vite` — fast bundler with built-in dev server and HMR.
- `eslint` + `prettier` — code quality and consistency.
- `supertest` — HTTP testing for Express routes.

*Add new entries here as dependencies are added. If you can't write a clear sentence for why it's needed, don't add it.*

---

# Phase 2 Readiness Checklist

Before starting Phase 2, confirm:

- [ ]  Schema supports adding recipe tables without migration pain
- [ ]  Schema supports a "helper" chore category
- [ ]  Settings architecture supports adding new config sections
- [ ]  Grocery list export can be added as a new endpoint + UI button
- [ ]  Seasonal/liturgical calendar can be added as a new view without refactoring navigation
- [ ]  Family summary page can accommodate announcements/message board