import { Router } from 'express';
import type Database from 'better-sqlite3';
import { getAllUsers, createUser, updateUser, deleteUser, reorderUsers } from '../models/users.js';

export function createUsersRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(getAllUsers(db));
  });

  router.post('/', (req, res) => {
    const { name, type, icon, display_order } = req.body as Record<string, unknown>;
    if (!name || !type) {
      res.status(400).json({ error: 'name and type are required' });
      return;
    }
    const user = createUser(db, {
      name: String(name),
      type: type as 'parent' | 'child',
      icon: icon ? String(icon) : '',
      display_order: typeof display_order === 'number' ? display_order : 0,
    });
    res.status(201).json(user);
  });

  router.put('/:id', (req, res) => {
    const id = Number(req.params.id);
    const updated = updateUser(db, id, req.body as Record<string, unknown>);
    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const deleted = deleteUser(db, Number(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(204).send();
  });

  router.post('/reorder', (req, res) => {
    const { ids } = req.body as { ids?: number[] };
    if (!Array.isArray(ids)) {
      res.status(400).json({ error: 'ids array required' });
      return;
    }
    reorderUsers(db, ids);
    res.json(getAllUsers(db));
  });

  return router;
}
