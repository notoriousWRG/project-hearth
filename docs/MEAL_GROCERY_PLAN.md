# 🍳 Hearth — Meal Plan & Grocery List v2

**Status:** Active | May 2026
**Audience:** Claude Code / implementation agent
**Companion:** [Intent Document](./INTENT.md), [Master Implementation Plan](./IMPLEMENTATION_PLAN.md)

**Purpose:** Phased build plan for the meal-planning + grocery-list overhaul. Follows the same TDD-first conventions as the master plan: failing test → minimum code → refactor → all green → commit.

---

# What We're Building

A practical upgrade to the existing meal plan and grocery flow. The current version is a freeform-text grid + a flat list. This version makes the meal plan literate about meals you actually cook, knows what's already in your kitchen, and produces a shopping list that reflects what you actually need to buy.

## User-facing changes

1. **Visual differentiation of filled vs empty meal-plan days.** A glanceable signal — at the day-column level, not just per slot — for "this day is planned" vs "this day is blank."
2. **Saved Meals.** A master list of meals you've used. Each meal is a name + a configurable ingredient list. Ingredients don't display in the meal-plan grid — they're attached behind the meal and used when generating the grocery list.
3. **Pick-from-list when planning.** A "pick saved meal" button next to the meal-slot input. Free-text typing still works (and a typed name not in the list can be saved as a new meal).
4. **Three grocery views: Shopping, Pantry, Icebox.** Pantry and Icebox are persistent inventories you maintain (what's in the cupboards / freezer right now). Shopping is the to-buy list.
5. **Smart Generate Grocery List.** Computes needed ingredients from this week's planned meals, subtracts what's already in Pantry and Icebox, adds the remainder to Shopping. Deduplicates across meals.
6. **Export grocery list to plain text.** One-tap copy-to-clipboard, formatted by category. (Email/Notion deferred to later.)

## Non-goals for this feature

- No quantities/units in v1. Ingredient = name + category. (We'll add this if it proves needed; the schema leaves room.)
- No recipe instructions/steps. A meal is a planning unit, not a recipe.
- No barcode scan, no auto-deplete from pantry, no expiration tracking. Pantry/Icebox are manually maintained.
- No per-slot ingredient overrides ("tacos but no cheese this week"). One meal = one ingredient list. Edit the meal if you want to change it.
- Email and Notion export — Phase 2 (the plumbing is here, the buttons aren't).

---

# Design Decisions Locked In

These came out of the kickoff conversation and shape the schema and API.

| Decision | Choice |
|---|---|
| Meals model | Saved meal = name + attached ingredient list. Single source of truth — no per-slot override. |
| Meal-plan slot | References a saved meal by `meal_id`, OR keeps a freeform `description` (back-compat with existing rows). |
| Inventory model | Persistent `inventory_items` table with a `location` column (`pantry` \| `icebox`). Manually edited. |
| Autofill UX | Explicit "Pick from saved meals" button opens a list. Typing the input is always free text. New names get an offer to "Save as a meal." |
| Export v1 | Plain text → clipboard, grouped by category. |
| Filled/empty day signal | Day column gets a fill state: `empty` / `partial` / `full`, styled via theme tokens. |

---

# Schema Changes

Adds three tables and one column. No destructive migration — existing `meal_plan` rows continue to work via the `description` fallback.

```sql
-- New: master list of saved meals
CREATE TABLE IF NOT EXISTS meals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- New: ingredients attached to a meal
CREATE TABLE IF NOT EXISTS meal_ingredients (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id  INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  name     TEXT    NOT NULL,
  category TEXT    NOT NULL DEFAULT 'other',  -- matches GroceryCategory
  position INTEGER NOT NULL DEFAULT 0
);

-- New: persistent pantry/icebox inventory
CREATE TABLE IF NOT EXISTS inventory_items (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT    NOT NULL COLLATE NOCASE,
  category TEXT    NOT NULL DEFAULT 'other',
  location TEXT    NOT NULL,                  -- 'pantry' | 'icebox'
  notes    TEXT    NOT NULL DEFAULT '',
  UNIQUE(name, location)
);

-- Modify: meal_plan gains an optional reference to a saved meal
ALTER TABLE meal_plan ADD COLUMN meal_id INTEGER REFERENCES meals(id) ON DELETE SET NULL;
```

### Type additions (`src/shared/types.ts`)

```ts
export type InventoryLocation = 'pantry' | 'icebox';

export interface Meal {
  id: number;
  name: string;
  created_at: string;
  ingredients: MealIngredient[];
}

export interface MealIngredient {
  id: number;
  meal_id: number;
  name: string;
  category: GroceryCategory;
  position: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  category: GroceryCategory;
  location: InventoryLocation;
  notes: string;
}

// MealPlanEntry gets a nullable meal_id
export interface MealPlanEntry {
  id: number;
  week_start_date: string;
  day_of_week: DayOfWeek;
  meal_type: MealType;
  description: string;       // still here, used for freetext + display fallback
  meal_id: number | null;    // new
}
```

`description` stays so existing rows render correctly. When a slot has a `meal_id`, we display the meal's name from the joined `meals.name`; the `description` field is kept in sync on save.

---

# Generate-Grocery Algorithm

Replaces the current "create one grocery item per meal description" logic.

```
Input: weekStartDate
  1. Fetch all meal_plan entries for the week.
  2. For each entry with meal_id, fetch its meal_ingredients.
     For each entry without meal_id but with description, treat as a single
       freetext ingredient (category 'other') so legacy rows still work.
  3. Aggregate all ingredients into a unique set keyed by lowercased name.
     Preserve category from first occurrence.
  4. Subtract anything matching (case-insensitive) a row in inventory_items
     (any location).
  5. For each remaining ingredient:
       - skip if a non-checked grocery_items row already exists with the same
         name (case-insensitive)
       - else INSERT a new grocery_items row, source='meal_plan',
         meal_plan_id = NULL (it's an aggregate, not tied to one slot)
  6. Return the list of items added.
```

The "already on the list" check is a name match, not the old `meal_plan_id` match — that one was wrong-shaped for an aggregate-and-dedupe flow.

---

# Milestones

Each milestone is independently shippable, fully tested, and merged before the next begins. `npm test` and `npm run lint` must be green at every commit.

---

## Milestone M1: Schema + Data Layer

**Goal:** New tables exist, models can CRUD them, all in-memory tests green. No API, no UI yet.

### Steps (TDD)

1. **Test:** `tests/server/db/schema.test.ts` — add assertions that `meals`, `meal_ingredients`, `inventory_items` tables exist and that `meal_plan.meal_id` column exists.
2. **Code:** Update `src/server/db/schema.ts` (`SCHEMA_SQL`) with the new tables and the `ALTER TABLE`. Mirror in `schema.sql` (the human-reference copy).
3. **Test:** `tests/server/models/meals.test.ts` — extend with `createMeal`, `getAllMeals`, `getMealById` (returns ingredients joined), `updateMeal`, `deleteMeal`, `findMealByName` (case-insensitive).
4. **Code:** New module `src/server/models/savedMeals.ts` (separate from existing `meals.ts` which handles the meal-plan grid). Functions return `Meal` with hydrated ingredients.
5. **Test:** `tests/server/models/mealIngredients.test.ts` — `setIngredients(mealId, ingredients[])` (replace-all semantics), `getIngredients(mealId)`.
6. **Code:** Implement in `src/server/models/savedMeals.ts` (or a sibling file).
7. **Test:** `tests/server/models/inventory.test.ts` — CRUD by location; `findByName(name, location?)`; uniqueness on (name, location).
8. **Code:** New module `src/server/models/inventory.ts`.
9. **Test:** Update `tests/server/models/meals.test.ts` (existing meal-plan model) to cover the new `meal_id` column on `MealPlanEntry`.
10. **Code:** Update `src/server/models/meals.ts` and the `MealPlanEntry`/`NewMealPlanEntry` types.
11. Run full suite. Green. Commit: `M1: schema + data layer for saved meals & inventory`.

### Acceptance

- [ ] `meals`, `meal_ingredients`, `inventory_items` tables created
- [ ] `meal_plan.meal_id` column present
- [ ] Saved-meal model returns hydrated ingredients
- [ ] Inventory model enforces (name, location) uniqueness
- [ ] All existing tests still green
- [ ] No file-DB artifacts from tests

---

## Milestone M2: API Routes

**Goal:** REST endpoints for the new models; updated meal-plan and generate-grocery endpoints.

### Route additions

```
GET    /api/meals                       # list all saved meals (no ingredients)
GET    /api/meals/:id                   # one saved meal with ingredients
POST   /api/meals                       # create { name, ingredients?: [...] }
PUT    /api/meals/:id                   # update name and/or ingredients (replace-all)
DELETE /api/meals/:id

GET    /api/inventory                   # ?location=pantry|icebox (optional filter)
POST   /api/inventory                   # create
PUT    /api/inventory/:id
DELETE /api/inventory/:id

GET    /api/grocery/export?format=text  # returns { text: "..." } grouped by category
```

### Route changes

- `PUT /api/meal-plan` accepts an optional `meal_id`. If provided, the server hydrates `description` from the meal's name (so the existing client display path keeps working without joins).
- `POST /api/meal-plan/generate-grocery` rewritten to use the algorithm above.

### Steps (TDD)

1. **Test:** `tests/server/routes/savedMeals.test.ts` — happy + error case for each endpoint, including ingredient round-trips.
2. **Code:** `src/server/routes/savedMeals.ts`. Wire into `app.ts` at `/api/meals`.
3. **Test:** `tests/server/routes/inventory.test.ts` — CRUD + location filter + (name, location) uniqueness 409.
4. **Code:** `src/server/routes/inventory.ts`. Wire into `app.ts`.
5. **Test:** Update `tests/server/routes/meals.test.ts` for the `meal_id` round-trip on `PUT /api/meal-plan`.
6. **Code:** Update `src/server/routes/meals.ts`.
7. **Test:** Rewrite the integration test for `POST /api/meal-plan/generate-grocery`. Cases:
   - Saved-meal-based plan: ingredients aggregate, one grocery row per unique name.
   - Item already in pantry: skipped.
   - Item already in icebox: skipped.
   - Same ingredient in two different meals: one grocery row.
   - Ingredient already on shopping (unchecked): not duplicated.
   - Legacy freetext-only meal_plan row: still produces one grocery item.
8. **Code:** Implement the new generate logic in `src/server/routes/meals.ts` (or extract to `src/server/services/generateGrocery.ts` for testability).
9. **Test:** `tests/server/routes/grocery.test.ts` — add a test for `GET /api/grocery/export?format=text`. Asserts category grouping, check-state ignored or noted (we'll export only unchecked items).
10. **Code:** Add the export endpoint to `src/server/routes/grocery.ts`. Pure formatting function in `src/server/services/exportGrocery.ts` so the unit test can target it directly.
11. All green. Commit: `M2: API routes for saved meals, inventory, smart generate, export`.

### Acceptance

- [ ] Every new endpoint has happy + error tests
- [ ] Generate-grocery covers all six cases above
- [ ] Export endpoint returns text grouped by category, unchecked items only
- [ ] Existing meal-plan and grocery endpoints still pass their tests

---

## Milestone M3: Saved Meals Management UI

**Goal:** A place to view, create, edit, and delete saved meals (with their ingredients). Lives in Settings (PIN-protected) since it's parent-only configuration.

### Component plan

- New view: `src/client/components/SavedMealsSection.ts` — added to `SettingsPanel.ts`.
- List of saved meals (alphabetical), each row shows name + ingredient count.
- Click a row to expand inline editor: name, ingredient list (name + category dropdown each), add/remove ingredient, save/delete.
- Inline create form at the top.

### Steps (TDD)

1. **Test:** `tests/client/components/SavedMealsSection.test.ts` — renders empty state, renders a list of meals, expands a row to edit, adds an ingredient, removes an ingredient, saves, deletes.
2. **Code:** Build the component with a `SavedMealsApi` interface (matches the M2 endpoints).
3. **Code:** Wire into `SettingsPanel.ts` between existing sections, behind PIN gate.
4. **Code:** Theme-tokened styles in `components.css`. No hardcoded colors.
5. Visual sanity-check on each theme. Commit: `M3: saved meals management in settings`.

### Acceptance

- [ ] Create / edit / delete saved meals end-to-end
- [ ] Ingredient editor supports add, remove, reorder (or at least add/remove in v1)
- [ ] Each ingredient has a category picker (GroceryCategory values)
- [ ] PIN-gated like other settings sections
- [ ] All three themes render correctly

---

## Milestone M4: Meal Plan UX Updates

**Goal:** Pick-from-saved-meals on the meal slot, save-as-meal offer for new names, day-column fill-state styling.

### UX details

- **Slot edit mode** gets a small button next to the input: `📋 Pick`. Opens a popover with the saved meals list (filterable). Click a meal → fills input + sets `meal_id`. Free-text still works.
- **On save with a typed name** that doesn't match any saved meal: subtle "Save as meal" link appears next to the slot. Tapping it creates the saved meal (no ingredients yet) and links the slot to it.
- **Day column states:**
  - `empty` — no meals filled. Muted column, faded "+" placeholders.
  - `partial` — 1–3 of 4 meal slots filled. Subtle accent on header.
  - `full` — all 4 meal slots filled. Accent header + slight color wash.
  - Implemented as `data-fill="empty|partial|full"` on `.meal-day` so each theme styles it independently.

### Steps (TDD)

1. **Test:** `tests/client/components/MealPlanGrid.test.ts` — add cases for the day-column `data-fill` attribute (empty, partial, full).
2. **Code:** Compute fill state per day in `MealPlanGrid.ts`, set on the column element.
3. **Code:** Theme styling for `[data-fill]` in each theme CSS file.
4. **Test:** Add cases for the saved-meals picker: button renders in edit mode, opens list, selecting a meal sets the slot value and `meal_id`.
5. **Code:** Build the picker (small inline popover, no modal). Pass the saved-meals list in via the API interface.
6. **Test:** Save-as-meal flow — typing a new name and committing, "Save as meal" link appears; clicking it calls the create-meal endpoint and updates the slot.
7. **Code:** Implement the save-as-meal flow.
8. **Test:** `meal_id` round-trip — saving via picker stores `meal_id`; subsequent loads display the meal's name.
9. **Code:** Update the upsert payload to include `meal_id` when set.
10. Commit: `M4: meal plan picker, save-as-meal, day fill state`.

### Acceptance

- [ ] Empty / partial / full day states visually distinct in each theme
- [ ] Picker shows all saved meals, filterable
- [ ] Selecting a saved meal links the slot via `meal_id`
- [ ] Free-text entry still works
- [ ] "Save as meal" appears for new names; promotes to saved meal on click
- [ ] Existing meal-plan tests still pass

---

## Milestone M5: Grocery Tabs — Shopping / Pantry / Icebox

**Goal:** The grocery view becomes a 3-tab surface. Shopping is the existing list. Pantry and Icebox are new persistent inventories.

### Component plan

- Rename/refactor `GroceryList.ts` → orchestrator that holds a tab bar and renders one of three list components.
- Shopping tab: existing behavior.
- Pantry tab: list of `InventoryItem` where `location='pantry'`. Add/edit/delete. Same category groupings as grocery for visual consistency.
- Icebox tab: same as Pantry, `location='icebox'`.
- A "Move to Pantry/Icebox" action on a *checked* shopping item — convenience to log purchases as inventory after a trip. (Optional, behind a small button. Decide during build whether to ship in M5 or defer; lean toward shipping.)

### Steps (TDD)

1. **Test:** `tests/client/components/GroceryView.test.ts` (renamed) — three tabs render, switching tabs swaps content, persists last-active tab in `localStorage` (or session memory — match the rest of the codebase).
2. **Code:** Tab orchestrator component.
3. **Test:** Pantry tab — load items, create item, edit item, delete item.
4. **Code:** `InventoryList.ts` component, parameterized by location.
5. **Test:** Icebox tab — same shape, different location filter.
6. **Code:** Reuse the same component with a `location` prop.
7. **Test:** "Move to Pantry/Icebox" on a checked shopping item creates an inventory row and removes the grocery row.
8. **Code:** Implement move-to-inventory action (calls inventory POST + grocery DELETE).
9. Commit: `M5: grocery view tabs for shopping, pantry, icebox`.

### Acceptance

- [ ] Three tabs render and switch
- [ ] Pantry and Icebox CRUD work end-to-end
- [ ] Both inventory tabs respect the same theme styling as Shopping
- [ ] Move-to-inventory action works (or, if deferred, ticket noted in this doc)
- [ ] Existing Shopping tests still pass

---

## Milestone M6: Smart Generate + Export

**Goal:** Wire the M2 backend changes through the UI. Generate button uses the new aggregation. Export button copies a formatted list.

### Steps (TDD)

1. **Test:** Update `MealPlanGrid` test for the generate button feedback message — count reflects aggregated additions, not per-slot.
2. **Code:** No grid changes needed if the API contract holds; verify and update feedback copy ("Added 7 items to shopping list").
3. **Test:** `GroceryView.test.ts` — Export button calls the export endpoint and writes the result to `navigator.clipboard`. Use a clipboard mock.
4. **Code:** Add Export button to the Shopping tab toolbar. On click, fetch `/api/grocery/export`, write to clipboard, show "Copied" feedback.
5. **Test:** End-to-end smoke (server + client mocks): plan a week with two meals sharing one ingredient + one item in pantry → generate → grocery list contains exactly the expected items.
6. Commit: `M6: smart generate + plain-text export`.

### Acceptance

- [ ] Generate uses the new algorithm; pantry/icebox subtraction works visibly
- [ ] Export copies category-grouped text to clipboard
- [ ] "Copied" feedback shown briefly, no modal
- [ ] All tests green; lint clean

---

# Phase-2 Hooks (Don't Build, But Don't Block)

Schema and API leave room for these without rework:

- **Quantities/units on ingredients.** Add `quantity REAL` and `unit TEXT` columns to `meal_ingredients` and `inventory_items` later. Generate logic gets a "do we have enough?" check.
- **Notion export.** New `/api/grocery/export?format=notion` endpoint, Notion token in settings. Same shape on the client — different format option.
- **Email export.** `mailto:` link variant of the same endpoint output.
- **Meal tags / categories** (e.g. "weeknight," "guest-friendly," "fast"). New table or a TEXT column on `meals`.
- **Ingredient substitution.** A `meal_ingredient_alts` table, or just a free-text "or" inside the name field if we never need it structured.

---

# Open Questions

To resolve during build, not blocking the plan:

1. **Should ingredient names be normalized?** ("Onion" vs "onions" vs "yellow onion".) v1 = exact-match (case-insensitive) only. If pantry comparison feels brittle, add a `canonical_name` column or a small alias table.
2. **Should the saved-meal picker support inline-edit-ingredients?** Probably not — keep that flow in Settings. But a "View ingredients" tooltip on hover could be nice.
3. **Filled-vs-empty: any per-meal-type weighting?** (E.g., dinner-only weeks shouldn't look "partial.") v1 treats all four slots equal. Revisit if it feels off.
4. **Auto-fresh on a pantry/icebox item that gets re-bought.** v1 = duplicates blocked by UNIQUE(name, location). User edits notes if they want to track quantity casually.

---

# Dependency Justification

No new runtime or dev dependencies expected. All new work uses existing stack (Express, better-sqlite3, vanilla TS). If a fuzzy-match library becomes appealing for ingredient matching, document it in the master plan's Dependency Justification Log first.

---

# Update the Master Plan

When M6 ships, update `docs/IMPLEMENTATION_PLAN.md`:

- Phase 2 Readiness Checklist: tick "Recipe database with auto-parsing" (we have the simpler version) and "Grocery list export."
- Add a one-line note in the Milestone 5 acceptance criteria pointing to this doc as the v2 reference.
