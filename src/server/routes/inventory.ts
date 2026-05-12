import { Router } from 'express';
import type Database from 'better-sqlite3';
import type { GroceryCategory, InventoryLocation } from '../../shared/types.js';
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '../models/inventory.js';

export function createInventoryRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const location = req.query.location as InventoryLocation | undefined;
    res.json(getInventoryItems(db, location));
  });

  router.post('/', (req, res) => {
    const { name, category, location, notes } = req.body as Record<string, unknown>;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    if (!location) {
      res.status(400).json({ error: 'location is required' });
      return;
    }
    try {
      const item = createInventoryItem(db, {
        name: String(name),
        category: (category as GroceryCategory) ?? 'other',
        location: location as InventoryLocation,
        notes: notes ? String(notes) : '',
      });
      res.status(201).json(item);
    } catch (err) {
      const error = err as { code?: string };
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(409).json({ error: 'An item with this name already exists at this location' });
        return;
      }
      throw err;
    }
  });

  router.put('/:id', (req, res) => {
    const updated = updateInventoryItem(
      db,
      Number(req.params.id),
      req.body as Partial<Pick<{ category: GroceryCategory; notes: string }, 'category' | 'notes'>>,
    );
    if (!updated) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const deleted = deleteInventoryItem(db, Number(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.status(204).send();
  });

  return router;
}
