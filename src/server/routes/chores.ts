import { Router } from 'express';
import type Database from 'better-sqlite3';
import {
  getChoresByUser,
  getChoreById,
  createChore,
  updateChore,
  deleteChore,
  completeChore,
  getRecurringChores,
  resetRecurringChore,
  reorderChores,
} from '../models/chores.js';
import { getAllowanceConfig, getTiers, calculateEarned } from '../models/allowance.js';
import { updateStreakOnCompletion } from '../models/streaks.js';
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
    for (const chore of getRecurringChores(db, user.id)) {
      resetRecurringChore(db, chore.id);
    }
  }
  setSetting(db, 'last_reset_date', getCurrentResetDate(now, resetTime));
}

export function createChoresRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/progress/:userId', (req, res) => {
    const userId = Number(req.params.userId);
    const chores = getChoresByUser(db, userId);
    const total = chores.length;
    const completed = chores.filter((c) => c.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const config = getAllowanceConfig(db, userId);
    let earned = 0;
    const streak_threshold = config?.streak_threshold ?? 7;
    if (config) {
      const tiers = getTiers(db, config.id);
      earned = calculateEarned(config.amount, tiers, percent);
    }

    res.json({ total, completed, percent, earned, streak_threshold });
  });

  router.get('/', (req, res) => {
    const userId = Number(req.query.userId);
    if (!userId) {
      res.status(400).json({ error: 'userId query param required' });
      return;
    }
    applyRecurringReset(db);
    res.json(getChoresByUser(db, userId));
  });

  router.post('/', (req, res) => {
    const {
      user_id,
      title,
      icon,
      is_recurring,
      recurrence_rule,
      is_bonus,
      bonus_amount,
      position,
    } = req.body as Record<string, unknown>;
    if (!user_id || !title) {
      res.status(400).json({ error: 'user_id and title are required' });
      return;
    }
    const chore = createChore(db, {
      user_id: Number(user_id),
      title: String(title),
      icon: icon ? String(icon) : '',
      completed: false,
      is_recurring: Boolean(is_recurring),
      recurrence_rule: (recurrence_rule as 'daily' | 'weekly' | null) ?? null,
      is_bonus: Boolean(is_bonus),
      bonus_amount: typeof bonus_amount === 'number' ? bonus_amount : null,
      position: typeof position === 'number' ? position : 0,
    });
    res.status(201).json(chore);
  });

  router.put('/:id', (req, res) => {
    const updated = updateChore(db, Number(req.params.id), req.body as Record<string, unknown>);
    if (!updated) {
      res.status(404).json({ error: 'Chore not found' });
      return;
    }
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const deleted = deleteChore(db, Number(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Chore not found' });
      return;
    }
    res.status(204).send();
  });

  router.post('/:id/complete', (req, res) => {
    const choreId = Number(req.params.id);
    const chore = getChoreById(db, choreId);
    if (!chore) {
      res.status(404).json({ error: 'Chore not found' });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const completion = completeChore(db, choreId, today);
    const streak = updateStreakOnCompletion(db, chore.user_id, today);
    res.json({ completion, streak });
  });

  router.post('/reorder', (req, res) => {
    const { userId, ids } = req.body as { userId?: number; ids?: number[] };
    if (!userId || !Array.isArray(ids)) {
      res.status(400).json({ error: 'userId and ids required' });
      return;
    }
    reorderChores(db, userId, ids);
    res.json(getChoresByUser(db, userId));
  });

  router.get('/:id', (req, res) => {
    const chore = getChoreById(db, Number(req.params.id));
    if (!chore) {
      res.status(404).json({ error: 'Chore not found' });
      return;
    }
    res.json(chore);
  });

  return router;
}
