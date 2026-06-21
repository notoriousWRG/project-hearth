import { Router } from 'express';
import type Database from 'better-sqlite3';
import { requirePin } from '../middleware/pin.js';
import { getSetting, setSetting } from '../models/settings.js';
import {
  getZones,
  createZone,
  updateZone,
  deleteZone,
  getTasksBySection,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  uncompleteTask,
  getActiveZone,
  applyCleaningReset,
  seedCleaningDefaults,
} from '../models/cleaning.js';
import type { CleaningBoard } from '../../shared/types.js';

function buildBoard(db: Database.Database, now: Date = new Date()): CleaningBoard {
  const activeZone = getActiveZone(db, now);
  const dayOfWeek = now.getDay();

  const flightPlan = getSetting<string[]>(db, 'cleaning_flight_plan');
  const todayFocus = flightPlan ? (flightPlan[dayOfWeek] ?? '') : '';

  const zoneTasks = activeZone ? getTasksBySection(db, 'zone', activeZone.id) : [];
  const focusTasks = getTasksBySection(db, 'focus', null, dayOfWeek);
  const allDaily = getTasksBySection(db, 'daily');

  return {
    activeZone: activeZone ?? null,
    todayFocus,
    zoneTasks,
    focusTasks,
    morningTasks: allDaily.filter((t) => t.group_label === 'morning'),
    beforeBedTasks: allDaily.filter((t) => t.group_label === 'before_bed'),
    homesteadTasks: allDaily.filter((t) => t.group_label === 'homestead'),
  };
}

export function createCleaningRouter(db: Database.Database): Router {
  const router = Router();

  // Public board endpoint — auto-seeds on first call, applies daily reset
  router.get('/', (req, res) => {
    seedCleaningDefaults(db);
    applyCleaningReset(db);
    res.json(buildBoard(db));
  });

  // Public task toggle endpoints (used directly from the cleaning board UI)
  router.post('/tasks/:id/complete', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const raw = db.prepare('SELECT id FROM cleaning_tasks WHERE id = ?').get(id) as
      | { id: number }
      | undefined;
    if (!raw) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(completeTask(db, id));
  });

  router.post('/tasks/:id/uncomplete', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const raw = db.prepare('SELECT id FROM cleaning_tasks WHERE id = ?').get(id) as
      | { id: number }
      | undefined;
    if (!raw) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(uncompleteTask(db, id));
  });

  // All management routes require PIN
  router.use(requirePin(db));

  // Zone management
  router.get('/zones', (_req, res) => {
    res.json(getZones(db));
  });

  router.post('/zones', (req, res) => {
    const { name, position } = req.body as { name?: string; position?: number };
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    res.status(201).json(createZone(db, { name, position: position ?? 0 }));
  });

  router.put('/zones/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const data = req.body as Partial<{ name: string; position: number }>;
    try {
      res.json(updateZone(db, id, data));
    } catch {
      res.status(404).json({ error: 'Zone not found' });
    }
  });

  router.delete('/zones/:id', (req, res) => {
    deleteZone(db, parseInt(req.params.id, 10));
    res.status(204).end();
  });

  // Task management
  router.post('/tasks', (req, res) => {
    const { section, zone_id, day_of_week, group_label, title, position } = req.body as {
      section?: string;
      zone_id?: number | null;
      day_of_week?: number | null;
      group_label?: string | null;
      title?: string;
      position?: number;
    };
    if (!section || !title) {
      res.status(400).json({ error: 'section and title are required' });
      return;
    }
    res.status(201).json(
      createTask(db, {
        section: section as 'zone' | 'daily' | 'focus',
        zone_id: zone_id ?? null,
        day_of_week: day_of_week ?? null,
        group_label: (group_label ?? null) as 'morning' | 'before_bed' | 'homestead' | null,
        title,
        position: position ?? 0,
      }),
    );
  });

  router.put('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const data = req.body as Partial<{
      title: string;
      position: number;
      group_label: string | null;
      day_of_week: number | null;
      zone_id: number | null;
    }>;
    try {
      res.json(updateTask(db, id, data as Parameters<typeof updateTask>[2]));
    } catch {
      res.status(404).json({ error: 'Task not found' });
    }
  });

  router.delete('/tasks/:id', (req, res) => {
    deleteTask(db, parseInt(req.params.id, 10));
    res.status(204).end();
  });

  // Flight plan labels
  router.get('/flight-plan', (_req, res) => {
    const labels = getSetting<string[]>(db, 'cleaning_flight_plan') ?? [];
    res.json({ labels });
  });

  router.put('/flight-plan', (req, res) => {
    const { labels } = req.body as { labels?: string[] };
    if (!Array.isArray(labels) || labels.length !== 7) {
      res.status(400).json({ error: 'labels must be an array of exactly 7 strings' });
      return;
    }
    setSetting(db, 'cleaning_flight_plan', labels);
    res.json({ labels });
  });

  return router;
}
