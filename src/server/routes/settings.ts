import { Router } from 'express';
import type Database from 'better-sqlite3';
import { getSetting, setSetting, getAllSettings } from '../models/settings.js';
import { requirePin } from '../middleware/pin.js';

export function createSettingsRouter(db: Database.Database): Router {
  const router = Router();

  // PIN verification — not protected
  router.post('/verify-pin', (req, res) => {
    const { pin } = req.body as { pin?: string };
    const stored = getSetting<string>(db, 'pin');
    if (!stored) {
      res.json({ valid: true }); // No PIN set — always valid
      return;
    }
    res.json({ valid: pin === stored });
  });

  // All other settings routes require PIN
  router.use(requirePin(db));

  router.get('/', (_req, res) => {
    res.json(getAllSettings(db));
  });

  router.put('/', (req, res) => {
    const { key, value } = req.body as { key?: string; value?: unknown };
    if (!key) {
      res.status(400).json({ error: 'key is required' });
      return;
    }
    setSetting(db, key, value);
    res.json({ key, value });
  });

  return router;
}
