import { Router } from 'express';
import type Database from 'better-sqlite3';
import { requirePin } from '../middleware/pin.js';
import {
  listPhoneBook,
  createPhoneBookEntry,
  updatePhoneBookEntry,
  deletePhoneBookEntry,
} from '../models/phoneBook.js';

export function createPhoneBookRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(listPhoneBook(db));
  });

  router.post('/', requirePin(db), (req, res) => {
    const { name, phone, emoji, position } = req.body as {
      name: string;
      phone: string;
      emoji?: string;
      position?: number;
    };
    if (!name || !phone) {
      res.status(400).json({ error: 'name and phone are required' });
      return;
    }
    const entry = createPhoneBookEntry(db, {
      name,
      phone,
      emoji: emoji ?? '',
      position: position ?? 0,
    });
    res.status(201).json(entry);
  });

  router.put('/:id', requirePin(db), (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
      const entry = updatePhoneBookEntry(
        db,
        id,
        req.body as Partial<{ name: string; phone: string; emoji: string; position: number }>,
      );
      res.json(entry);
    } catch {
      res.status(404).json({ error: 'Not found' });
    }
  });

  router.delete('/:id', requirePin(db), (req, res) => {
    const id = parseInt(req.params.id, 10);
    deletePhoneBookEntry(db, id);
    res.status(204).end();
  });

  return router;
}
