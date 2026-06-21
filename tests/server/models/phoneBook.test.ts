import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema, runMigrations } from '../../../src/server/db/schema.js';
import {
  listPhoneBook,
  createPhoneBookEntry,
  updatePhoneBookEntry,
  deletePhoneBookEntry,
} from '../../../src/server/models/phoneBook.js';

let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

describe('listPhoneBook', () => {
  it('returns empty array when no entries', () => {
    expect(listPhoneBook(db)).toEqual([]);
  });

  it('returns entries ordered by position', () => {
    createPhoneBookEntry(db, { name: 'B', phone: '555-0002', emoji: '', position: 1 });
    createPhoneBookEntry(db, { name: 'A', phone: '555-0001', emoji: '', position: 0 });
    const entries = listPhoneBook(db);
    expect(entries.map((e) => e.name)).toEqual(['A', 'B']);
  });
});

describe('createPhoneBookEntry', () => {
  it('inserts and returns a new entry', () => {
    const entry = createPhoneBookEntry(db, {
      name: 'Grandma',
      phone: '555-1234',
      emoji: '👵',
      position: 0,
    });
    expect(entry.id).toBeTypeOf('number');
    expect(entry.name).toBe('Grandma');
    expect(entry.phone).toBe('555-1234');
    expect(entry.emoji).toBe('👵');
  });

  it('auto-assigns next position when not provided', () => {
    const first = createPhoneBookEntry(db, { name: 'A', phone: '1', emoji: '', position: 0 });
    const second = createPhoneBookEntry(db, { name: 'B', phone: '2', emoji: '', position: 1 });
    expect(second.position).toBeGreaterThanOrEqual(first.position);
  });
});

describe('updatePhoneBookEntry', () => {
  it('updates fields', () => {
    const entry = createPhoneBookEntry(db, { name: 'Old', phone: '111', emoji: '', position: 0 });
    const updated = updatePhoneBookEntry(db, entry.id, { name: 'New', phone: '222', emoji: '🎉' });
    expect(updated.name).toBe('New');
    expect(updated.phone).toBe('222');
    expect(updated.emoji).toBe('🎉');
  });

  it('throws for unknown id', () => {
    expect(() => updatePhoneBookEntry(db, 9999, { name: 'X' })).toThrow();
  });
});

describe('deletePhoneBookEntry', () => {
  it('removes the entry', () => {
    const entry = createPhoneBookEntry(db, { name: 'Gone', phone: '000', emoji: '', position: 0 });
    deletePhoneBookEntry(db, entry.id);
    expect(listPhoneBook(db)).toHaveLength(0);
  });

  it('is a no-op for unknown id', () => {
    expect(() => deletePhoneBookEntry(db, 9999)).not.toThrow();
  });
});
