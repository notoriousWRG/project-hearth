import { Router } from 'express';
import type Database from 'better-sqlite3';
import type { Chore, ChoreHistoryEntry } from '../../shared/types.js';
import {
  getChoresByUser,
  getChoreById,
  createChore,
  updateChore,
  deleteChore,
  completeChore,
  uncompleteChore,
  getRecurringChores,
  resetRecurringChore,
  reorderChores,
  hasCompletionOnDate,
  addCompletionForDate,
  removeCompletionForDate,
} from '../models/chores.js';
import {
  getAllowanceConfig,
  getTiers,
  calculateEarned,
  getPayoutFraction,
  roundToQuarter,
  recordDailyEarning,
  sumWeeklyEarnings,
  updateBalances,
  getStoredDailyEarning,
  recalculateDailyEarnings,
} from '../models/allowance.js';
import { evaluateStreakAtReset } from '../models/streaks.js';
import { getSetting, setSetting } from '../models/settings.js';
import { shouldReset, getCurrentResetDate } from '../utils/reset.js';
import { getAllUsers } from '../models/users.js';
import { requirePin } from '../middleware/pin.js';

function filterChoresForToday(chores: Chore[], dayOfWeek: number): Chore[] {
  return chores.filter((c) => {
    if (c.recurrence_rule !== 'weekly') return true;
    return c.recurrence_days?.includes(dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6) ?? false;
  });
}

function getSundayOfWeek(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function isDateWithinLastNDays(date: string, n: number): boolean {
  const target = new Date(date + 'T12:00:00');
  const now = new Date();
  const today = new Date(now.toISOString().slice(0, 10) + 'T12:00:00');
  const oldest = new Date(today);
  oldest.setDate(oldest.getDate() - (n - 1));
  return target >= oldest && target <= today;
}

function applyRecurringReset(db: Database.Database): void {
  const resetTime = getSetting<string>(db, 'reset_time') ?? '00:00';
  const lastResetDate = getSetting<string>(db, 'last_chore_reset_date') ?? '1970-01-01';
  const now = new Date();
  if (!shouldReset(lastResetDate, resetTime, now)) return;

  const currentPeriod = getCurrentResetDate(now, resetTime);
  const users = getAllUsers(db);

  // Evaluate streaks for the closing period before clearing completed flags.
  // Use the previous day's day-of-week to filter which chores were visible yesterday.
  if (lastResetDate !== '1970-01-01') {
    const lastResetDay = new Date(lastResetDate + 'T12:00:00');
    const lastDow = lastResetDay.getDay();
    for (const user of users) {
      const allChores = getChoresByUser(db, user.id);
      const chores = filterChoresForToday(allChores, lastDow);
      const total = chores.length;
      const completed = chores.filter((c) => c.completed).length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      const config = getAllowanceConfig(db, user.id);
      let threshold = 100;
      if (config) {
        const tiers = getTiers(db, config.id);
        if (tiers.length > 0) {
          threshold = Math.max(...tiers.map((t) => t.percent_complete));
        }
        if (user.type === 'child') {
          const fraction = getPayoutFraction(tiers, percent);
          const dailyEarned = roundToQuarter((config.amount / 7) * fraction);
          recordDailyEarning(db, user.id, lastResetDate, dailyEarned);
        }
      }

      evaluateStreakAtReset(db, user.id, percent, threshold, lastResetDate);
    }

    // Weekly rollup: fires when Saturday just closed (lastDow === 6)
    if (lastDow === 6) {
      const weekEnd = lastResetDate;
      const weekStartDate = new Date(lastResetDay);
      weekStartDate.setDate(weekStartDate.getDate() - 6);
      const weekStart = weekStartDate.toISOString().slice(0, 10);

      for (const user of users.filter((u) => u.type === 'child')) {
        const config = getAllowanceConfig(db, user.id);
        if (!config) continue;
        const gross = sumWeeklyEarnings(db, user.id, weekStart, weekEnd);
        if (gross === 0) continue;
        const tithe = roundToQuarter(gross / 7);
        const savings = roundToQuarter(gross / 7);
        const checking = gross - tithe - savings;
        updateBalances(db, user.id, {
          savings_balance: config.savings_balance + savings,
          tithe_balance: config.tithe_balance + tithe,
          checking_balance: config.checking_balance + checking,
        });
      }
    }
  }

  for (const user of users) {
    for (const chore of getRecurringChores(db, user.id)) {
      resetRecurringChore(db, chore.id);
    }
  }
  setSetting(db, 'last_chore_reset_date', currentPeriod);
}

export function createChoresRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/progress/:userId', (req, res) => {
    const userId = Number(req.params.userId);
    const allChores = getChoresByUser(db, userId);
    const todayDow = new Date().getDay();
    const chores = filterChoresForToday(allChores, todayDow);
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
    const all = getChoresByUser(db, userId);
    if (req.query.all === 'true') {
      res.json(all);
      return;
    }
    const todayDow = new Date().getDay();
    res.json(filterChoresForToday(all, todayDow));
  });

  router.post('/', (req, res) => {
    const {
      user_id,
      title,
      icon,
      is_recurring,
      recurrence_rule,
      recurrence_days,
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
      recurrence_days: Array.isArray(recurrence_days)
        ? (recurrence_days as (0 | 1 | 2 | 3 | 4 | 5 | 6)[])
        : null,
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
    res.json({ completion });
  });

  router.delete('/:id/complete', (req, res) => {
    const updated = uncompleteChore(db, Number(req.params.id));
    if (!updated) {
      res.status(404).json({ error: 'Chore not found' });
      return;
    }
    res.json(updated);
  });

  router.post('/reorder', (req, res) => {
    const { userId, ids } = req.body as { userId?: number; ids?: number[] };
    if (!userId || !Array.isArray(ids)) {
      res.status(400).json({ error: 'userId and ids required' });
      return;
    }
    reorderChores(db, userId, ids);
    // Return all chores unfiltered for the settings UI reorder response
    res.json(getChoresByUser(db, userId));
  });

  router.get('/history', requirePin(db), (req, res) => {
    const userId = Number(req.query.userId);
    const date = String(req.query.date ?? '');
    if (!userId || !date) {
      res.status(400).json({ error: 'userId and date query params required' });
      return;
    }
    if (!isDateWithinLastNDays(date, 7)) {
      res.status(400).json({ error: 'date must be within the last 7 days' });
      return;
    }
    const dow = new Date(date + 'T12:00:00').getDay();
    const allChores = getChoresByUser(db, userId);
    const applicableChores = filterChoresForToday(allChores, dow);
    const today = new Date().toISOString().slice(0, 10);

    const chores: ChoreHistoryEntry[] = applicableChores.map((c) => ({
      choreId: c.id,
      title: c.title,
      icon: c.icon,
      completed: date === today ? c.completed : hasCompletionOnDate(db, c.id, date),
      isBonus: c.is_bonus,
      bonusAmount: c.bonus_amount,
    }));

    let earned: number;
    if (date === today) {
      const config = getAllowanceConfig(db, userId);
      if (config) {
        const total = applicableChores.length;
        const completed = applicableChores.filter((c) => c.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        const tiers = getTiers(db, config.id);
        earned = roundToQuarter((config.amount / 7) * getPayoutFraction(tiers, percent));
      } else {
        earned = 0;
      }
    } else {
      earned = getStoredDailyEarning(db, userId, date);
    }

    res.json({ date, chores, earned });
  });

  router.post('/:id/history/toggle', requirePin(db), (req, res) => {
    const choreId = Number(req.params.id);
    const { date, userId } = req.body as { date?: string; userId?: number };
    if (!date || !userId) {
      res.status(400).json({ error: 'date and userId required' });
      return;
    }
    if (!isDateWithinLastNDays(date, 7)) {
      res.status(400).json({ error: 'date must be within the last 7 days' });
      return;
    }
    const chore = getChoreById(db, choreId);
    if (!chore) {
      res.status(404).json({ error: 'Chore not found' });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const alreadyCompleted =
      date === today ? chore.completed : hasCompletionOnDate(db, choreId, date);
    const nowCompleted = !alreadyCompleted;

    if (nowCompleted) {
      addCompletionForDate(db, choreId, date);
    } else {
      removeCompletionForDate(db, choreId, date);
    }

    if (date === today) {
      const ts = nowCompleted ? new Date().toISOString() : null;
      db.prepare('UPDATE chores SET completed = ?, completed_at = ? WHERE id = ?').run(
        nowCompleted ? 1 : 0,
        ts,
        choreId,
      );
      res.json({ completed: nowCompleted, earned: 0 });
      return;
    }

    const dow = new Date(date + 'T12:00:00').getDay();
    const allChores = getChoresByUser(db, userId);
    const applicableChores = filterChoresForToday(allChores, dow);
    const completedCount = applicableChores.filter((c) =>
      hasCompletionOnDate(db, c.id, date),
    ).length;

    const oldEarned = getStoredDailyEarning(db, userId, date);
    const newEarned = recalculateDailyEarnings(
      db,
      userId,
      date,
      applicableChores.length,
      completedCount,
    );

    const currentSunday = getSundayOfWeek(new Date());
    if (date < currentSunday) {
      const delta = newEarned - oldEarned;
      if (delta !== 0) {
        const config = getAllowanceConfig(db, userId);
        if (config) {
          const tithe = roundToQuarter(delta / 7);
          const savings = roundToQuarter(delta / 7);
          const checking = delta - tithe - savings;
          updateBalances(db, userId, {
            savings_balance: config.savings_balance + savings,
            tithe_balance: config.tithe_balance + tithe,
            checking_balance: config.checking_balance + checking,
          });
        }
      }
    }

    res.json({ completed: nowCompleted, earned: newEarned });
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
