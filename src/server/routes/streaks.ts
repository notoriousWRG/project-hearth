import { Router } from 'express';
import type Database from 'better-sqlite3';
import { ensureStreakRecord, resetStreak } from '../models/streaks.js';
import { requirePin } from '../middleware/pin.js';

export function createStreaksRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/:userId', (req, res) => {
    const userId = Number(req.params.userId);
    res.json(ensureStreakRecord(db, userId));
  });

  router.post('/:userId/reset', requirePin(db), (req, res) => {
    const userId = Number(req.params.userId);
    res.json(resetStreak(db, userId));
  });

  return router;
}
