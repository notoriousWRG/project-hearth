import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import {
  getSetting,
  setSetting,
  getAllSettings,
  deleteSetting,
} from '../../../src/server/models/settings.js';

let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
});

afterEach(() => {
  db.close();
});

describe('settings model', () => {
  it('getSetting returns undefined for missing key', () => {
    expect(getSetting(db, 'nonexistent')).toBeUndefined();
  });

  it('setSetting and getSetting round-trip a string', () => {
    setSetting(db, 'theme', 'clean');
    expect(getSetting<string>(db, 'theme')).toBe('clean');
  });

  it('setSetting and getSetting round-trip a number', () => {
    setSetting(db, 'pin', 1234);
    expect(getSetting<number>(db, 'pin')).toBe(1234);
  });

  it('setSetting and getSetting round-trip an object', () => {
    setSetting(db, 'config', { a: 1, b: 'hello' });
    expect(getSetting<{ a: number; b: string }>(db, 'config')).toEqual({ a: 1, b: 'hello' });
  });

  it('setSetting replaces existing value', () => {
    setSetting(db, 'theme', 'clean');
    setSetting(db, 'theme', 'whimsy');
    expect(getSetting<string>(db, 'theme')).toBe('whimsy');
    expect(
      (db.prepare("SELECT COUNT(*) as c FROM settings WHERE key = 'theme'").get() as { c: number })
        .c,
    ).toBe(1);
  });

  it('getAllSettings returns all key-value pairs', () => {
    setSetting(db, 'theme', 'clean');
    setSetting(db, 'reset_time', '06:00');
    const all = getAllSettings(db);
    expect(all.theme).toBe('clean');
    expect(all.reset_time).toBe('06:00');
  });

  it('getAllSettings returns empty object when no settings', () => {
    expect(getAllSettings(db)).toEqual({});
  });

  it('deleteSetting removes the key and returns true', () => {
    setSetting(db, 'theme', 'clean');
    expect(deleteSetting(db, 'theme')).toBe(true);
    expect(getSetting(db, 'theme')).toBeUndefined();
  });

  it('deleteSetting returns false for missing key', () => {
    expect(deleteSetting(db, 'ghost')).toBe(false);
  });
});
