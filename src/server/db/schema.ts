import type Database from 'better-sqlite3';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  type          TEXT    NOT NULL,
  icon          TEXT    NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS todos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT    NOT NULL,
  completed       INTEGER NOT NULL DEFAULT 0,
  position        INTEGER NOT NULL DEFAULT 0,
  is_recurring    INTEGER NOT NULL DEFAULT 0,
  recurrence_rule TEXT,
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
  period_id    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS allowance_config (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount           REAL    NOT NULL DEFAULT 0,
  streak_threshold INTEGER NOT NULL DEFAULT 5,
  reset_day        INTEGER NOT NULL DEFAULT 0,
  period_start     TEXT    NOT NULL DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS allowance_tiers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  config_id        INTEGER NOT NULL REFERENCES allowance_config(id) ON DELETE CASCADE,
  percent_complete INTEGER NOT NULL,
  percent_payout   INTEGER NOT NULL
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
  week_start_date TEXT    NOT NULL,
  day_of_week     INTEGER NOT NULL,
  meal_type       TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS grocery_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  category     TEXT    NOT NULL DEFAULT 'other',
  checked      INTEGER NOT NULL DEFAULT 0,
  source       TEXT    NOT NULL DEFAULT 'manual',
  meal_plan_id INTEGER REFERENCES meal_plan(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  due_date   TEXT    NOT NULL,
  dismissed  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export function runSchema(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
}
