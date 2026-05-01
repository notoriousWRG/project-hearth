import { describe, it, expect, afterEach } from 'vitest';
import { createDb } from '../../../src/server/db/connection.js';
import type Database from 'better-sqlite3';

let db: Database.Database;

afterEach(() => {
  if (db?.open) db.close();
});

describe('createDb', () => {
  it('returns an open database', () => {
    db = createDb(':memory:');
    expect(db.open).toBe(true);
  });

  it('enables foreign key enforcement', () => {
    db = createDb(':memory:');
    const fk = db.pragma('foreign_keys', { simple: true });
    expect(fk).toBe(1);
  });

  it('can execute a simple query', () => {
    db = createDb(':memory:');
    const row = db.prepare('SELECT 1 AS val').get() as { val: number };
    expect(row.val).toBe(1);
  });

  it('closes cleanly', () => {
    db = createDb(':memory:');
    db.close();
    expect(db.open).toBe(false);
  });
});
