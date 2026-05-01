import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { getSetting } from '../models/settings.js';

export function requirePin(db: Database.Database): RequestHandler {
  return (req, res, next) => {
    const storedPin = getSetting<string>(db, 'pin');
    if (!storedPin) {
      next();
      return;
    }
    const submitted = req.headers['x-pin'] as string | undefined;
    if (submitted !== storedPin) {
      res.status(401).json({ error: 'Invalid PIN' });
      return;
    }
    next();
  };
}
