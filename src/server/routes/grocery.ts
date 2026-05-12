import { Router } from 'express';
import type Database from 'better-sqlite3';
import {
  getAllGroceryItems,
  getGroceryItemById,
  createGroceryItem,
  updateGroceryItem,
  deleteGroceryItem,
  checkItem,
  clearCheckedItems,
} from '../models/grocery.js';
import { formatGroceryAsText } from '../services/exportGrocery.js';

export function createGroceryRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(getAllGroceryItems(db));
  });

  router.post('/', (req, res) => {
    const { name, category, source, meal_plan_id } = req.body as Record<string, unknown>;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const item = createGroceryItem(db, {
      name: String(name),
      category:
        (category as 'produce' | 'protein' | 'pantry' | 'dairy' | 'household' | 'other') ?? 'other',
      checked: false,
      source: (source as 'manual' | 'meal_plan') ?? 'manual',
      meal_plan_id: typeof meal_plan_id === 'number' ? meal_plan_id : null,
    });
    res.status(201).json(item);
  });

  router.put('/:id', (req, res) => {
    const updated = updateGroceryItem(
      db,
      Number(req.params.id),
      req.body as Record<string, unknown>,
    );
    if (!updated) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const deleted = deleteGroceryItem(db, Number(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.status(204).send();
  });

  router.post('/clear-checked', (_req, res) => {
    const count = clearCheckedItems(db);
    res.json({ deleted: count });
  });

  router.patch('/:id/check', (req, res) => {
    const { checked } = req.body as { checked?: boolean };
    if (checked === undefined) {
      res.status(400).json({ error: 'checked field required' });
      return;
    }
    const item = checkItem(db, Number(req.params.id), Boolean(checked));
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(item);
  });

  // Must come before /:id to avoid 'export' being treated as an id
  router.get('/export', (req, res) => {
    if (req.query.format !== 'text') {
      res.status(400).json({ error: 'Only format=text is supported' });
      return;
    }
    const items = getAllGroceryItems(db);
    res.json({ text: formatGroceryAsText(items) });
  });

  router.get('/:id', (req, res) => {
    const item = getGroceryItemById(db, Number(req.params.id));
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(item);
  });

  return router;
}
