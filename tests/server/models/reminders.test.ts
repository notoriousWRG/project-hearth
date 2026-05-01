import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import {
  getAllReminders,
  getActiveReminders,
  getRemindersDueOn,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
  dismissReminder,
} from '../../../src/server/models/reminders.js';

let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
});

afterEach(() => {
  db.close();
});

describe('reminders model', () => {
  it('getAllReminders returns empty initially', () => {
    expect(getAllReminders(db)).toEqual([]);
  });

  it('createReminder returns a reminder with id and boolean fields', () => {
    const r = createReminder(db, { title: 'Dentist', due_date: '2026-05-10' });
    expect(r.id).toBeTypeOf('number');
    expect(r.dismissed).toBe(false);
    expect(r.created_at).toBeTypeOf('string');
  });

  it('getReminderById returns the correct reminder', () => {
    const r = createReminder(db, { title: 'Dentist', due_date: '2026-05-10' });
    expect(getReminderById(db, r.id)?.title).toBe('Dentist');
  });

  it('getReminderById returns undefined for missing id', () => {
    expect(getReminderById(db, 999)).toBeUndefined();
  });

  it('updateReminder modifies fields', () => {
    const r = createReminder(db, { title: 'Old', due_date: '2026-05-10' });
    const updated = updateReminder(db, r.id, { title: 'New' });
    expect(updated?.title).toBe('New');
  });

  it('updateReminder returns undefined for missing id', () => {
    expect(updateReminder(db, 999, { title: 'Ghost' })).toBeUndefined();
  });

  it('deleteReminder removes and returns true', () => {
    const r = createReminder(db, { title: 'Del', due_date: '2026-05-10' });
    expect(deleteReminder(db, r.id)).toBe(true);
    expect(getReminderById(db, r.id)).toBeUndefined();
  });

  it('deleteReminder returns false for missing id', () => {
    expect(deleteReminder(db, 999)).toBe(false);
  });

  it('dismissReminder sets dismissed=true', () => {
    const r = createReminder(db, { title: 'Dismiss me', due_date: '2026-05-10' });
    const dismissed = dismissReminder(db, r.id);
    expect(dismissed?.dismissed).toBe(true);
  });

  it('getActiveReminders excludes dismissed reminders', () => {
    createReminder(db, { title: 'Active', due_date: '2026-05-10' });
    const d = createReminder(db, { title: 'Gone', due_date: '2026-05-10' });
    dismissReminder(db, d.id);
    const active = getActiveReminders(db);
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe('Active');
  });

  it('getRemindersDueOn returns only reminders with matching due_date', () => {
    createReminder(db, { title: 'Today', due_date: '2026-05-01' });
    createReminder(db, { title: 'Tomorrow', due_date: '2026-05-02' });
    const today = getRemindersDueOn(db, '2026-05-01');
    expect(today).toHaveLength(1);
    expect(today[0].title).toBe('Today');
  });
});
