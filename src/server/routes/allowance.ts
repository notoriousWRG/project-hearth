import { Router } from 'express';
import type Database from 'better-sqlite3';
import {
  getAllowanceConfig,
  setAllowanceConfig,
  getTiers,
  setTier,
  deleteAllTiers,
  getPayoutFraction,
  roundToQuarter,
  sumWeeklyEarnings,
  updateBalances,
} from '../models/allowance.js';
import { getChoresByUser } from '../models/chores.js';
import { requirePin } from '../middleware/pin.js';

function getSundayOfWeek(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

function getSaturdayOfWeek(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() + (6 - dow));
  return d.toISOString().slice(0, 10);
}

export function createAllowanceRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/:userId', requirePin(db), (req, res) => {
    const userId = Number(req.params.userId);
    const config = getAllowanceConfig(db, userId) ?? null;
    const tiers = config ? getTiers(db, config.id) : [];
    res.json({ config, tiers });
  });

  router.put('/:userId', requirePin(db), (req, res) => {
    const userId = Number(req.params.userId);
    const { amount, streak_threshold, reset_day, period_start, tiers } = req.body as Record<
      string,
      unknown
    >;
    if (typeof amount !== 'number') {
      res.status(400).json({ error: 'amount is required and must be a number' });
      return;
    }
    const config = setAllowanceConfig(db, userId, {
      amount,
      streak_threshold: typeof streak_threshold === 'number' ? streak_threshold : 7,
      reset_day: typeof reset_day === 'number' ? reset_day : 0,
      period_start:
        typeof period_start === 'string' ? period_start : new Date().toISOString().slice(0, 10),
    });
    deleteAllTiers(db, config.id);
    const newTiers = Array.isArray(tiers)
      ? (tiers as { percent_complete: number; percent_payout: number }[]).map((t) =>
          setTier(db, config.id, t.percent_complete, t.percent_payout),
        )
      : [];
    res.json({ config, tiers: newTiers });
  });

  router.get('/:userId/banking', (req, res) => {
    const userId = Number(req.params.userId);
    const config = getAllowanceConfig(db, userId);
    if (!config) {
      res.json({
        thisWeekEarned: 0,
        todayEarned: 0,
        savingsBalance: 0,
        titheBalance: 0,
        checkingBalance: 0,
      });
      return;
    }
    const now = new Date();
    const todayDow = now.getDay();
    const weekStart = getSundayOfWeek(now);
    const weekEnd = getSaturdayOfWeek(now);
    const thisWeekEarned = sumWeeklyEarnings(db, userId, weekStart, weekEnd);

    // Today's live earning from current chore completion state
    const allChores = getChoresByUser(db, userId);
    const todayChores = allChores.filter((c) => {
      if (c.recurrence_rule === 'weekly') {
        return c.recurrence_days?.includes(todayDow as 0 | 1 | 2 | 3 | 4 | 5 | 6) ?? false;
      }
      return true;
    });
    const total = todayChores.length;
    const completed = todayChores.filter((c) => c.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const tiers = getTiers(db, config.id);
    const todayEarned = roundToQuarter((config.amount / 7) * getPayoutFraction(tiers, percent));

    res.json({
      thisWeekEarned,
      todayEarned,
      savingsBalance: config.savings_balance,
      titheBalance: config.tithe_balance,
      checkingBalance: config.checking_balance,
    });
  });

  router.patch('/:userId/balances', requirePin(db), (req, res) => {
    const userId = Number(req.params.userId);
    const config = getAllowanceConfig(db, userId);
    if (!config) {
      res.status(404).json({ error: 'No allowance config for this user' });
      return;
    }
    const { savings_balance, tithe_balance, checking_balance } = req.body as Record<
      string,
      unknown
    >;
    updateBalances(db, userId, {
      savings_balance: typeof savings_balance === 'number' ? savings_balance : undefined,
      tithe_balance: typeof tithe_balance === 'number' ? tithe_balance : undefined,
      checking_balance: typeof checking_balance === 'number' ? checking_balance : undefined,
    });
    const updated = getAllowanceConfig(db, userId)!;
    res.json({
      savingsBalance: updated.savings_balance,
      titheBalance: updated.tithe_balance,
      checkingBalance: updated.checking_balance,
    });
  });

  router.post('/:userId/payout', requirePin(db), (req, res) => {
    const userId = Number(req.params.userId);
    const config = getAllowanceConfig(db, userId);
    if (!config) {
      res.status(404).json({ error: 'No allowance config for this user' });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const updated = setAllowanceConfig(db, userId, {
      amount: config.amount,
      streak_threshold: config.streak_threshold,
      reset_day: config.reset_day,
      period_start: today,
    });
    res.json(updated);
  });

  return router;
}
