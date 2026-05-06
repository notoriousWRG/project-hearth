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
  period_start     TEXT    NOT NULL DEFAULT (date('now')),
  savings_balance  REAL    NOT NULL DEFAULT 0,
  tithe_balance    REAL    NOT NULL DEFAULT 0,
  checking_balance REAL    NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS allowance_daily_earnings (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date          TEXT    NOT NULL,
  amount_earned REAL    NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
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
  description     TEXT    NOT NULL DEFAULT '',
  meal_id         INTEGER REFERENCES meals(id) ON DELETE SET NULL
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

CREATE TABLE IF NOT EXISTS meals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meal_ingredients (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id  INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  name     TEXT    NOT NULL,
  category TEXT    NOT NULL DEFAULT 'other',
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT    NOT NULL COLLATE NOCASE,
  category TEXT    NOT NULL DEFAULT 'other',
  location TEXT    NOT NULL,
  notes    TEXT    NOT NULL DEFAULT '',
  UNIQUE(name, location)
);
`;

export function runSchema(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
}

export function runMigrations(db: Database.Database): void {
  const choreColumns = db.pragma('table_info(chores)') as { name: string }[];
  if (!choreColumns.some((c) => c.name === 'recurrence_days')) {
    db.exec('ALTER TABLE chores ADD COLUMN recurrence_days TEXT');
  }

  const configColumns = db.pragma('table_info(allowance_config)') as { name: string }[];
  if (!configColumns.some((c) => c.name === 'savings_balance')) {
    db.exec('ALTER TABLE allowance_config ADD COLUMN savings_balance REAL NOT NULL DEFAULT 0');
    db.exec('ALTER TABLE allowance_config ADD COLUMN tithe_balance REAL NOT NULL DEFAULT 0');
    db.exec('ALTER TABLE allowance_config ADD COLUMN checking_balance REAL NOT NULL DEFAULT 0');
  }

  const mealPlanColumns = db.pragma('table_info(meal_plan)') as { name: string }[];
  if (!mealPlanColumns.some((c) => c.name === 'meal_id')) {
    db.exec(
      'ALTER TABLE meal_plan ADD COLUMN meal_id INTEGER REFERENCES meals(id) ON DELETE SET NULL',
    );
  }

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
    name: string;
  }[];
  if (!tables.some((t) => t.name === 'allowance_daily_earnings')) {
    db.exec(`CREATE TABLE allowance_daily_earnings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date          TEXT    NOT NULL,
      amount_earned REAL    NOT NULL DEFAULT 0,
      UNIQUE(user_id, date)
    )`);
  }
}
