import type Database from 'better-sqlite3';
import type { Todo, NewTodo } from '../../shared/types.js';

type RawTodo = {
  id: number;
  user_id: number;
  title: string;
  completed: number;
  position: number;
  is_recurring: number;
  recurrence_rule: string | null;
  created_at: string;
  completed_at: string | null;
};

function mapTodo(row: RawTodo): Todo {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    completed: row.completed === 1,
    position: row.position,
    is_recurring: row.is_recurring === 1,
    recurrence_rule: row.recurrence_rule as Todo['recurrence_rule'],
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}

export function getTodosByUser(db: Database.Database, userId: number): Todo[] {
  const rows = db
    .prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY position ASC')
    .all(userId) as RawTodo[];
  return rows.map(mapTodo);
}

export function getTodoById(db: Database.Database, id: number): Todo | undefined {
  const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as RawTodo | undefined;
  return row ? mapTodo(row) : undefined;
}

export function createTodo(db: Database.Database, data: NewTodo): Todo {
  const row = db
    .prepare(
      `INSERT INTO todos (user_id, title, completed, position, is_recurring, recurrence_rule)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
    )
    .get(
      data.user_id,
      data.title,
      data.completed ? 1 : 0,
      data.position,
      data.is_recurring ? 1 : 0,
      data.recurrence_rule,
    ) as RawTodo;
  return mapTodo(row);
}

export function updateTodo(
  db: Database.Database,
  id: number,
  data: Partial<NewTodo>,
): Todo | undefined {
  const current = getTodoById(db, id);
  if (!current) return undefined;
  const merged = { ...current, ...data };
  db.prepare(
    `UPDATE todos SET title = ?, completed = ?, position = ?, is_recurring = ?, recurrence_rule = ? WHERE id = ?`,
  ).run(
    merged.title,
    merged.completed ? 1 : 0,
    merged.position,
    merged.is_recurring ? 1 : 0,
    merged.recurrence_rule,
    id,
  );
  return getTodoById(db, id);
}

export function deleteTodo(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  return result.changes > 0;
}

export function completeTodo(
  db: Database.Database,
  id: number,
  completedAt: string,
): Todo | undefined {
  db.prepare('UPDATE todos SET completed = 1, completed_at = ? WHERE id = ?').run(completedAt, id);
  return getTodoById(db, id);
}

export function resetRecurringTodo(db: Database.Database, id: number): Todo | undefined {
  db.prepare('UPDATE todos SET completed = 0, completed_at = NULL WHERE id = ?').run(id);
  return getTodoById(db, id);
}

export function getRecurringTodos(db: Database.Database, userId: number): Todo[] {
  const rows = db
    .prepare('SELECT * FROM todos WHERE user_id = ? AND is_recurring = 1 ORDER BY position ASC')
    .all(userId) as RawTodo[];
  return rows.map(mapTodo);
}

export function reorderTodos(db: Database.Database, userId: number, orderedIds: number[]): void {
  const update = db.prepare('UPDATE todos SET position = ? WHERE id = ? AND user_id = ?');
  const tx = db.transaction(() => {
    orderedIds.forEach((id, index) => update.run(index, id, userId));
  });
  tx();
}
