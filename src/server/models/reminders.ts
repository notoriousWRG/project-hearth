import type Database from 'better-sqlite3';
import type { Reminder, NewReminder } from '../../shared/types.js';

type RawReminder = {
  id: number;
  title: string;
  due_date: string;
  dismissed: number;
  created_at: string;
};

function mapReminder(row: RawReminder): Reminder {
  return {
    id: row.id,
    title: row.title,
    due_date: row.due_date,
    dismissed: row.dismissed === 1,
    created_at: row.created_at,
  };
}

export function getAllReminders(db: Database.Database): Reminder[] {
  const rows = db.prepare('SELECT * FROM reminders ORDER BY due_date ASC').all() as RawReminder[];
  return rows.map(mapReminder);
}

export function getActiveReminders(db: Database.Database): Reminder[] {
  const rows = db
    .prepare('SELECT * FROM reminders WHERE dismissed = 0 ORDER BY due_date ASC')
    .all() as RawReminder[];
  return rows.map(mapReminder);
}

export function getRemindersDueOn(db: Database.Database, date: string): Reminder[] {
  const rows = db
    .prepare('SELECT * FROM reminders WHERE due_date = ? ORDER BY id ASC')
    .all(date) as RawReminder[];
  return rows.map(mapReminder);
}

export function getReminderById(db: Database.Database, id: number): Reminder | undefined {
  const row = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as RawReminder | undefined;
  return row ? mapReminder(row) : undefined;
}

export function createReminder(db: Database.Database, data: NewReminder): Reminder {
  const row = db
    .prepare('INSERT INTO reminders (title, due_date) VALUES (?, ?) RETURNING *')
    .get(data.title, data.due_date) as RawReminder;
  return mapReminder(row);
}

export function updateReminder(
  db: Database.Database,
  id: number,
  data: Partial<NewReminder>,
): Reminder | undefined {
  const current = getReminderById(db, id);
  if (!current) return undefined;
  const merged = { ...current, ...data };
  db.prepare('UPDATE reminders SET title = ?, due_date = ? WHERE id = ?').run(
    merged.title,
    merged.due_date,
    id,
  );
  return getReminderById(db, id);
}

export function deleteReminder(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
  return result.changes > 0;
}

export function dismissReminder(db: Database.Database, id: number): Reminder | undefined {
  db.prepare('UPDATE reminders SET dismissed = 1 WHERE id = ?').run(id);
  return getReminderById(db, id);
}
