import type Database from 'better-sqlite3';
import type { Chore, NewChore, ChoreCompletion } from '../../shared/types.js';

type RawChore = {
  id: number;
  user_id: number;
  title: string;
  icon: string;
  completed: number;
  is_recurring: number;
  recurrence_rule: string | null;
  is_bonus: number;
  bonus_amount: number | null;
  position: number;
  created_at: string;
  completed_at: string | null;
};

type RawCompletion = {
  id: number;
  chore_id: number;
  completed_at: string;
  period_id: string;
};

function mapChore(row: RawChore): Chore {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    icon: row.icon,
    completed: row.completed === 1,
    is_recurring: row.is_recurring === 1,
    recurrence_rule: row.recurrence_rule as Chore['recurrence_rule'],
    is_bonus: row.is_bonus === 1,
    bonus_amount: row.bonus_amount,
    position: row.position,
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}

function mapCompletion(row: RawCompletion): ChoreCompletion {
  return {
    id: row.id,
    chore_id: row.chore_id,
    completed_at: row.completed_at,
    period_id: row.period_id,
  };
}

export function getChoresByUser(db: Database.Database, userId: number): Chore[] {
  const rows = db
    .prepare('SELECT * FROM chores WHERE user_id = ? ORDER BY position ASC')
    .all(userId) as RawChore[];
  return rows.map(mapChore);
}

export function getChoreById(db: Database.Database, id: number): Chore | undefined {
  const row = db.prepare('SELECT * FROM chores WHERE id = ?').get(id) as RawChore | undefined;
  return row ? mapChore(row) : undefined;
}

export function createChore(db: Database.Database, data: NewChore): Chore {
  const row = db
    .prepare(
      `INSERT INTO chores (user_id, title, icon, completed, is_recurring, recurrence_rule, is_bonus, bonus_amount, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    )
    .get(
      data.user_id,
      data.title,
      data.icon,
      data.completed ? 1 : 0,
      data.is_recurring ? 1 : 0,
      data.recurrence_rule,
      data.is_bonus ? 1 : 0,
      data.bonus_amount,
      data.position,
    ) as RawChore;
  return mapChore(row);
}

export function updateChore(
  db: Database.Database,
  id: number,
  data: Partial<NewChore>,
): Chore | undefined {
  const current = getChoreById(db, id);
  if (!current) return undefined;
  const merged = { ...current, ...data };
  db.prepare(
    `UPDATE chores SET title = ?, icon = ?, completed = ?, is_recurring = ?, recurrence_rule = ?,
     is_bonus = ?, bonus_amount = ?, position = ? WHERE id = ?`,
  ).run(
    merged.title,
    merged.icon,
    merged.completed ? 1 : 0,
    merged.is_recurring ? 1 : 0,
    merged.recurrence_rule,
    merged.is_bonus ? 1 : 0,
    merged.bonus_amount,
    merged.position,
    id,
  );
  return getChoreById(db, id);
}

export function deleteChore(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM chores WHERE id = ?').run(id);
  return result.changes > 0;
}

export function completeChore(
  db: Database.Database,
  choreId: number,
  periodId: string,
): ChoreCompletion {
  const now = new Date().toISOString();
  const completion = db
    .prepare(
      'INSERT INTO chore_completions (chore_id, completed_at, period_id) VALUES (?, ?, ?) RETURNING *',
    )
    .get(choreId, now, periodId) as RawCompletion;
  db.prepare('UPDATE chores SET completed = 1, completed_at = ? WHERE id = ?').run(now, choreId);
  return mapCompletion(completion);
}

export function getChoreCompletions(
  db: Database.Database,
  choreId: number,
  periodId: string,
): ChoreCompletion[] {
  const rows = db
    .prepare('SELECT * FROM chore_completions WHERE chore_id = ? AND period_id = ?')
    .all(choreId, periodId) as RawCompletion[];
  return rows.map(mapCompletion);
}

export function getCompletionsByPeriod(
  db: Database.Database,
  userId: number,
  periodId: string,
): ChoreCompletion[] {
  const rows = db
    .prepare(
      `SELECT cc.* FROM chore_completions cc
       JOIN chores c ON cc.chore_id = c.id
       WHERE c.user_id = ? AND cc.period_id = ?`,
    )
    .all(userId, periodId) as RawCompletion[];
  return rows.map(mapCompletion);
}

export function reorderChores(db: Database.Database, userId: number, orderedIds: number[]): void {
  const update = db.prepare('UPDATE chores SET position = ? WHERE id = ? AND user_id = ?');
  const tx = db.transaction(() => {
    orderedIds.forEach((id, index) => update.run(index, id, userId));
  });
  tx();
}

export function getRecurringChores(db: Database.Database, userId: number): Chore[] {
  const rows = db
    .prepare('SELECT * FROM chores WHERE user_id = ? AND is_recurring = 1 ORDER BY position ASC')
    .all(userId) as RawChore[];
  return rows.map(mapChore);
}

export function resetRecurringChore(db: Database.Database, id: number): Chore | undefined {
  db.prepare('UPDATE chores SET completed = 0, completed_at = NULL WHERE id = ?').run(id);
  return getChoreById(db, id);
}

export function uncompleteChore(db: Database.Database, id: number): Chore | undefined {
  const chore = getChoreById(db, id);
  if (!chore) return undefined;
  db.prepare('UPDATE chores SET completed = 0, completed_at = NULL WHERE id = ?').run(id);
  return getChoreById(db, id);
}
