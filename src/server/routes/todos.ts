import { Router } from 'express';
import type Database from 'better-sqlite3';
import {
  getTodosByUser,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
  completeTodo,
  resetRecurringTodo,
  getRecurringTodos,
  reorderTodos,
} from '../models/todos.js';
import { getSetting, setSetting } from '../models/settings.js';
import { shouldReset, getCurrentResetDate } from '../utils/reset.js';
import { getAllUsers } from '../models/users.js';

function applyRecurringReset(db: Database.Database): void {
  const resetTime = getSetting<string>(db, 'reset_time') ?? '00:00';
  const lastResetDate = getSetting<string>(db, 'last_reset_date') ?? '1970-01-01';
  const now = new Date();
  if (!shouldReset(lastResetDate, resetTime, now)) return;

  const users = getAllUsers(db);
  for (const user of users) {
    for (const todo of getRecurringTodos(db, user.id)) {
      resetRecurringTodo(db, todo.id);
    }
  }
  setSetting(db, 'last_reset_date', getCurrentResetDate(now, resetTime));
}

export function createTodosRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const userId = Number(req.query.userId);
    if (!userId) {
      res.status(400).json({ error: 'userId query param required' });
      return;
    }
    applyRecurringReset(db);
    res.json(getTodosByUser(db, userId));
  });

  router.post('/', (req, res) => {
    const { user_id, title, position, is_recurring, recurrence_rule } = req.body as Record<
      string,
      unknown
    >;
    if (!user_id || !title) {
      res.status(400).json({ error: 'user_id and title are required' });
      return;
    }
    const todo = createTodo(db, {
      user_id: Number(user_id),
      title: String(title),
      completed: false,
      position: typeof position === 'number' ? position : 0,
      is_recurring: Boolean(is_recurring),
      recurrence_rule: (recurrence_rule as 'daily' | 'weekly' | null) ?? null,
    });
    res.status(201).json(todo);
  });

  router.put('/:id', (req, res) => {
    const updated = updateTodo(db, Number(req.params.id), req.body as Record<string, unknown>);
    if (!updated) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const deleted = deleteTodo(db, Number(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.status(204).send();
  });

  router.post('/:id/complete', (req, res) => {
    const completedAt = new Date().toISOString();
    const todo = completeTodo(db, Number(req.params.id), completedAt);
    if (!todo) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.json(todo);
  });

  router.post('/reorder', (req, res) => {
    const { userId, ids } = req.body as { userId?: number; ids?: number[] };
    if (!userId || !Array.isArray(ids)) {
      res.status(400).json({ error: 'userId and ids required' });
      return;
    }
    reorderTodos(db, userId, ids);
    res.json(getTodosByUser(db, userId));
  });

  router.get('/:id', (req, res) => {
    const todo = getTodoById(db, Number(req.params.id));
    if (!todo) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.json(todo);
  });

  return router;
}
