import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema, runMigrations } from '../../../src/server/db/schema.js';

const EXPECTED_TABLES = [
  'users',
  'todos',
  'chores',
  'chore_completions',
  'allowance_config',
  'allowance_daily_earnings',
  'allowance_tiers',
  'streak_records',
  'meal_plan',
  'grocery_items',
  'reminders',
  'settings',
  'meals',
  'meal_ingredients',
  'inventory_items',
  'cleaning_zones',
  'cleaning_tasks',
  'phone_book',
];

let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
});

afterEach(() => {
  db.close();
});

describe('runSchema', () => {
  it('creates all 18 tables', () => {
    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>;
    const names = rows.map((r) => r.name).sort();
    expect(names).toEqual([...EXPECTED_TABLES].sort());
  });

  it('todos table has expected columns', () => {
    const cols = db.prepare('PRAGMA table_info(todos)').all() as Array<{ name: string }>;
    const names = cols.map((c) => c.name);
    expect(names).toContain('recurrence_rule');
    expect(names).toContain('completed_at');
    expect(names).toContain('is_recurring');
    expect(names).toContain('user_id');
  });

  it('chores table has bonus columns', () => {
    const cols = db.prepare('PRAGMA table_info(chores)').all() as Array<{ name: string }>;
    const names = cols.map((c) => c.name);
    expect(names).toContain('is_bonus');
    expect(names).toContain('bonus_amount');
  });

  it('settings table uses key as primary key', () => {
    const cols = db.prepare('PRAGMA table_info(settings)').all() as Array<{
      name: string;
      pk: number;
    }>;
    const pkCol = cols.find((c) => c.pk === 1);
    expect(pkCol?.name).toBe('key');
  });

  it('todos has foreign key to users', () => {
    const fks = db.prepare('PRAGMA foreign_key_list(todos)').all() as Array<{ table: string }>;
    expect(fks.some((fk) => fk.table === 'users')).toBe(true);
  });

  it('chore_completions has foreign key to chores', () => {
    const fks = db.prepare('PRAGMA foreign_key_list(chore_completions)').all() as Array<{
      table: string;
    }>;
    expect(fks.some((fk) => fk.table === 'chores')).toBe(true);
  });

  it('can be run twice without error (idempotent via IF NOT EXISTS)', () => {
    expect(() => runSchema(db)).not.toThrow();
  });

  it('meals table has expected columns', () => {
    const cols = db.prepare('PRAGMA table_info(meals)').all() as Array<{ name: string }>;
    const names = cols.map((c) => c.name);
    expect(names).toContain('id');
    expect(names).toContain('name');
    expect(names).toContain('created_at');
  });

  it('meal_ingredients has foreign key to meals', () => {
    const fks = db.prepare('PRAGMA foreign_key_list(meal_ingredients)').all() as Array<{
      table: string;
    }>;
    expect(fks.some((fk) => fk.table === 'meals')).toBe(true);
  });

  it('inventory_items has UNIQUE(name, location) constraint', () => {
    db.exec(
      `INSERT INTO inventory_items (name, category, location) VALUES ('milk', 'dairy', 'pantry')`,
    );
    expect(() =>
      db.exec(
        `INSERT INTO inventory_items (name, category, location) VALUES ('milk', 'dairy', 'pantry')`,
      ),
    ).toThrow();
  });
});

describe('runMigrations', () => {
  it('adds recurrence_days column to chores table', () => {
    runMigrations(db);
    const cols = db.prepare('PRAGMA table_info(chores)').all() as Array<{ name: string }>;
    expect(cols.map((c) => c.name)).toContain('recurrence_days');
  });

  it('adds meal_id column to meal_plan table', () => {
    runMigrations(db);
    const cols = db.prepare('PRAGMA table_info(meal_plan)').all() as Array<{ name: string }>;
    expect(cols.map((c) => c.name)).toContain('meal_id');
  });

  it('is idempotent when column already exists', () => {
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });
});
