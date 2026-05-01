import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';

const EXPECTED_TABLES = [
  'users',
  'todos',
  'chores',
  'chore_completions',
  'allowance_config',
  'allowance_tiers',
  'streak_records',
  'meal_plan',
  'grocery_items',
  'reminders',
  'settings',
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
  it('creates all 11 tables', () => {
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
});
