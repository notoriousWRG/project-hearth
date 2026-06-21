import { Router } from 'express';
import type Database from 'better-sqlite3';
import { getEatingOutState, subtractEatingOut, resetEatingOut } from '../models/eatingOut.js';

export function createEatingOutRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(getEatingOutState(db));
  });

  router.post('/subtract', (req, res) => {
    const { amount } = req.body as { amount?: number };
    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: 'amount must be a positive number' });
      return;
    }
    res.json(subtractEatingOut(db, amount));
  });

  router.post('/reset', (_req, res) => {
    res.json(resetEatingOut(db));
  });

  return router;
}
