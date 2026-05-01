import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import { createUser } from '../../../src/server/models/users.js';
import {
  getChoresByUser,
  getChoreById,
  createChore,
  updateChore,
  deleteChore,
  completeChore,
  getChoreCompletions,
  getCompletionsByPeriod,
  reorderChores,
  resetRecurringChore,
} from '../../../src/server/models/chores.js';

let db: Database.Database;
let userId: number;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  userId = createUser(db, { name: 'Kid', type: 'child', icon: '', display_order: 0 }).id;
});

afterEach(() => {
  db.close();
});

describe('chores model', () => {
  it('getChoresByUser returns empty initially', () => {
    expect(getChoresByUser(db, userId)).toEqual([]);
  });

  it('createChore returns a chore with boolean fields', () => {
    const chore = createChore(db, {
      user_id: userId,
      title: 'Make bed',
      icon: '🛏️',
      completed: false,
      is_recurring: true,
      recurrence_rule: 'daily',
      is_bonus: false,
      bonus_amount: null,
      position: 0,
    });
    expect(chore.id).toBeTypeOf('number');
    expect(chore.completed).toBe(false);
    expect(chore.is_recurring).toBe(true);
    expect(chore.is_bonus).toBe(false);
    expect(chore.bonus_amount).toBeNull();
  });

  it('createChore stores bonus amount', () => {
    const chore = createChore(db, {
      user_id: userId,
      title: 'Bonus',
      icon: '⭐',
      completed: false,
      is_recurring: false,
      recurrence_rule: null,
      is_bonus: true,
      bonus_amount: 2.5,
      position: 0,
    });
    expect(chore.is_bonus).toBe(true);
    expect(chore.bonus_amount).toBe(2.5);
  });

  it('updateChore modifies fields', () => {
    const chore = createChore(db, {
      user_id: userId,
      title: 'Old',
      icon: '',
      completed: false,
      is_recurring: false,
      recurrence_rule: null,
      is_bonus: false,
      bonus_amount: null,
      position: 0,
    });
    const updated = updateChore(db, chore.id, { title: 'New' });
    expect(updated?.title).toBe('New');
  });

  it('deleteChore removes and returns true', () => {
    const chore = createChore(db, {
      user_id: userId,
      title: 'Del',
      icon: '',
      completed: false,
      is_recurring: false,
      recurrence_rule: null,
      is_bonus: false,
      bonus_amount: null,
      position: 0,
    });
    expect(deleteChore(db, chore.id)).toBe(true);
    expect(getChoreById(db, chore.id)).toBeUndefined();
  });

  it('deleteChore returns false for missing id', () => {
    expect(deleteChore(db, 999)).toBe(false);
  });

  it('completeChore inserts a chore_completion and sets chores.completed', () => {
    const chore = createChore(db, {
      user_id: userId,
      title: 'Dishes',
      icon: '',
      completed: false,
      is_recurring: true,
      recurrence_rule: 'daily',
      is_bonus: false,
      bonus_amount: null,
      position: 0,
    });
    const completion = completeChore(db, chore.id, '2026-05-01');
    expect(completion.chore_id).toBe(chore.id);
    expect(completion.period_id).toBe('2026-05-01');
    const updated = getChoreById(db, chore.id);
    expect(updated?.completed).toBe(true);
  });

  it('getChoreCompletions returns completions for chore+period', () => {
    const chore = createChore(db, {
      user_id: userId,
      title: 'C',
      icon: '',
      completed: false,
      is_recurring: true,
      recurrence_rule: 'daily',
      is_bonus: false,
      bonus_amount: null,
      position: 0,
    });
    completeChore(db, chore.id, '2026-05-01');
    const completions = getChoreCompletions(db, chore.id, '2026-05-01');
    expect(completions).toHaveLength(1);
    expect(completions[0].chore_id).toBe(chore.id);
  });

  it('getCompletionsByPeriod returns all completions for a user in a period', () => {
    const c1 = createChore(db, {
      user_id: userId,
      title: 'C1',
      icon: '',
      completed: false,
      is_recurring: true,
      recurrence_rule: 'daily',
      is_bonus: false,
      bonus_amount: null,
      position: 0,
    });
    const c2 = createChore(db, {
      user_id: userId,
      title: 'C2',
      icon: '',
      completed: false,
      is_recurring: true,
      recurrence_rule: 'daily',
      is_bonus: false,
      bonus_amount: null,
      position: 1,
    });
    completeChore(db, c1.id, '2026-05-01');
    completeChore(db, c2.id, '2026-05-01');
    completeChore(db, c1.id, '2026-05-02');
    const may1 = getCompletionsByPeriod(db, userId, '2026-05-01');
    expect(may1).toHaveLength(2);
  });

  it('resetRecurringChore clears completed but leaves chore_completions intact', () => {
    const chore = createChore(db, {
      user_id: userId,
      title: 'R',
      icon: '',
      completed: false,
      is_recurring: true,
      recurrence_rule: 'daily',
      is_bonus: false,
      bonus_amount: null,
      position: 0,
    });
    completeChore(db, chore.id, '2026-05-01');
    resetRecurringChore(db, chore.id);
    expect(getChoreById(db, chore.id)?.completed).toBe(false);
    expect(getChoreCompletions(db, chore.id, '2026-05-01')).toHaveLength(1);
  });

  it('reorderChores updates position', () => {
    const a = createChore(db, {
      user_id: userId,
      title: 'A',
      icon: '',
      completed: false,
      is_recurring: false,
      recurrence_rule: null,
      is_bonus: false,
      bonus_amount: null,
      position: 0,
    });
    const b = createChore(db, {
      user_id: userId,
      title: 'B',
      icon: '',
      completed: false,
      is_recurring: false,
      recurrence_rule: null,
      is_bonus: false,
      bonus_amount: null,
      position: 1,
    });
    reorderChores(db, userId, [b.id, a.id]);
    expect(getChoreById(db, b.id)?.position).toBe(0);
    expect(getChoreById(db, a.id)?.position).toBe(1);
  });
});
