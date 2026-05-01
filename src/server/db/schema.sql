-- Hearth database schema
-- Source of truth: src/server/db/schema.ts (SCHEMA_SQL constant)
-- This file is for human reference only and is not executed at runtime.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  type          TEXT    NOT NULL,              -- 'parent' | 'child'
  icon          TEXT    NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS todos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT    NOT NULL,
  completed       INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
  position        INTEGER NOT NULL DEFAULT 0,
  is_recurring    INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
  recurrence_rule TEXT,                        -- 'daily' | 'weekly' | NULL
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS chores (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT    NOT NULL,
  icon            TEXT    NOT NULL DEFAULT '',
  completed       INTEGER NOT NULL DEFAULT 0,
  is_recurring    INTEGER NOT NULL DEFAULT 0,
  recurrence_rule TEXT,
  is_bonus        INTEGER NOT NULL DEFAULT 0,
  bonus_amount    REAL,
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS chore_completions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  chore_id     INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  completed_at TEXT    NOT NULL,
  period_id    TEXT    NOT NULL               -- ISO date of the allowance period start
);

CREATE TABLE IF NOT EXISTS allowance_config (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount           REAL    NOT NULL DEFAULT 0,
  streak_threshold INTEGER NOT NULL DEFAULT 5,
  reset_day        INTEGER NOT NULL DEFAULT 0, -- 0=Sunday per JS Date.getDay()
  period_start     TEXT    NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS allowance_tiers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  config_id        INTEGER NOT NULL REFERENCES allowance_config(id) ON DELETE CASCADE,
  percent_complete INTEGER NOT NULL,           -- 0-100
  percent_payout   INTEGER NOT NULL            -- 0-100
);

CREATE TABLE IF NOT EXISTS streak_records (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_streak      INTEGER NOT NULL DEFAULT 0,
  longest_streak      INTEGER NOT NULL DEFAULT 0,
  last_completed_date TEXT
);

CREATE TABLE IF NOT EXISTS meal_plan (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start_date TEXT    NOT NULL,            -- ISO date of Monday
  day_of_week     INTEGER NOT NULL,            -- 0=Sunday … 6=Saturday
  meal_type       TEXT    NOT NULL,            -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description     TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS grocery_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  category     TEXT    NOT NULL DEFAULT 'other', -- see GroceryCategory type
  checked      INTEGER NOT NULL DEFAULT 0,
  source       TEXT    NOT NULL DEFAULT 'manual', -- 'manual' | 'meal_plan'
  meal_plan_id INTEGER REFERENCES meal_plan(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  due_date   TEXT    NOT NULL,                 -- ISO date YYYY-MM-DD
  dismissed  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL                          -- JSON-encoded value
);
