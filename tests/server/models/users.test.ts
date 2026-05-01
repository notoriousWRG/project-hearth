import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  reorderUsers,
} from '../../../src/server/models/users.js';

let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
});

afterEach(() => {
  db.close();
});

describe('users model', () => {
  it('getAllUsers returns empty array initially', () => {
    expect(getAllUsers(db)).toEqual([]);
  });

  it('createUser returns a user with id', () => {
    const user = createUser(db, { name: 'Alice', type: 'parent', icon: '🌟', display_order: 0 });
    expect(user.id).toBeTypeOf('number');
    expect(user.name).toBe('Alice');
    expect(user.type).toBe('parent');
  });

  it('getAllUsers returns all created users', () => {
    createUser(db, { name: 'Alice', type: 'parent', icon: '', display_order: 0 });
    createUser(db, { name: 'Bob', type: 'child', icon: '', display_order: 1 });
    const users = getAllUsers(db);
    expect(users).toHaveLength(2);
  });

  it('getUserById returns the correct user', () => {
    const created = createUser(db, { name: 'Alice', type: 'parent', icon: '', display_order: 0 });
    const found = getUserById(db, created.id);
    expect(found?.name).toBe('Alice');
  });

  it('getUserById returns undefined for missing id', () => {
    expect(getUserById(db, 999)).toBeUndefined();
  });

  it('updateUser modifies fields and returns updated user', () => {
    const user = createUser(db, { name: 'Alice', type: 'parent', icon: '', display_order: 0 });
    const updated = updateUser(db, user.id, { name: 'Alicia' });
    expect(updated?.name).toBe('Alicia');
    expect(updated?.type).toBe('parent');
  });

  it('updateUser returns undefined for missing id', () => {
    expect(updateUser(db, 999, { name: 'Ghost' })).toBeUndefined();
  });

  it('deleteUser removes the user and returns true', () => {
    const user = createUser(db, { name: 'Alice', type: 'parent', icon: '', display_order: 0 });
    expect(deleteUser(db, user.id)).toBe(true);
    expect(getUserById(db, user.id)).toBeUndefined();
  });

  it('deleteUser returns false for missing id', () => {
    expect(deleteUser(db, 999)).toBe(false);
  });

  it('reorderUsers updates display_order', () => {
    const a = createUser(db, { name: 'A', type: 'parent', icon: '', display_order: 0 });
    const b = createUser(db, { name: 'B', type: 'child', icon: '', display_order: 1 });
    reorderUsers(db, [b.id, a.id]);
    const users = getAllUsers(db);
    const aRow = users.find((u) => u.id === a.id);
    const bRow = users.find((u) => u.id === b.id);
    expect(bRow?.display_order).toBe(0);
    expect(aRow?.display_order).toBe(1);
  });
});
