import { Router } from 'express';
import type Database from 'better-sqlite3';
import {
  getAllowanceConfig,
  setAllowanceConfig,
  getTiers,
  setTier,
  deleteAllTiers,
} from '../models/allowance.js';

export function createAllowanceRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/:userId', (req, res) => {
    const userId = Number(req.params.userId);
    const config = getAllowanceConfig(db, userId) ?? null;
    const tiers = config ? getTiers(db, config.id) : [];
    res.json({ config, tiers });
  });

  router.put('/:userId', (req, res) => {
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

  router.post('/:userId/payout', (req, res) => {
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
