import { Router } from 'express';
import type Database from 'better-sqlite3';
import {
  getAllReminders,
  getActiveReminders,
  getRemindersDueOn,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
  dismissReminder,
} from '../models/reminders.js';

export function createRemindersRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (req, res) => {
    if (req.query.active === 'true') {
      res.json(getActiveReminders(db));
      return;
    }
    if (req.query.date) {
      res.json(getRemindersDueOn(db, String(req.query.date)));
      return;
    }
    res.json(getAllReminders(db));
  });

  router.post('/', (req, res) => {
    const { title, due_date } = req.body as Record<string, unknown>;
    if (!title || !due_date) {
      res.status(400).json({ error: 'title and due_date are required' });
      return;
    }
    const reminder = createReminder(db, { title: String(title), due_date: String(due_date) });
    res.status(201).json(reminder);
  });

  router.put('/:id', (req, res) => {
    const updated = updateReminder(db, Number(req.params.id), req.body as Record<string, unknown>);
    if (!updated) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const deleted = deleteReminder(db, Number(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    res.status(204).send();
  });

  router.post('/:id/dismiss', (req, res) => {
    const reminder = dismissReminder(db, Number(req.params.id));
    if (!reminder) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    res.json(reminder);
  });

  router.get('/:id', (req, res) => {
    const reminder = getReminderById(db, Number(req.params.id));
    if (!reminder) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    res.json(reminder);
  });

  return router;
}
