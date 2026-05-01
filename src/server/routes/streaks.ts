import { Router } from 'express';
import type Database from 'better-sqlite3';
import { ensureStreakRecord } from '../models/streaks.js';

export function createStreaksRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/:userId', (req, res) => {
    const userId = Number(req.params.userId);
    res.json(ensureStreakRecord(db, userId));
  });

  return router;
}
