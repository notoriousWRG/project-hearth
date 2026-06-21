import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema, runMigrations } from '../../../src/server/db/schema.js';
import { setSetting, getSetting } from '../../../src/server/models/settings.js';
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
} from '../../../src/server/models/cleaning.js';

let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

describe('zones CRUD', () => {
  it('getZones returns empty initially', () => {
    expect(getZones(db)).toEqual([]);
  });

  it('createZone inserts and returns a zone', () => {
    const zone = createZone(db, { name: 'Kitchen', position: 0 });
    expect(zone.id).toBeTypeOf('number');
    expect(zone.name).toBe('Kitchen');
    expect(zone.position).toBe(0);
  });

  it('getZones returns zones ordered by position', () => {
    createZone(db, { name: 'B', position: 1 });
    createZone(db, { name: 'A', position: 0 });
    const zones = getZones(db);
    expect(zones.map((z) => z.name)).toEqual(['A', 'B']);
  });

  it('updateZone changes name', () => {
    const zone = createZone(db, { name: 'Old', position: 0 });
    const updated = updateZone(db, zone.id, { name: 'New' });
    expect(updated.name).toBe('New');
  });

  it('deleteZone removes the zone', () => {
    const zone = createZone(db, { name: 'Gone', position: 0 });
    deleteZone(db, zone.id);
    expect(getZones(db)).toHaveLength(0);
  });
});

describe('tasks CRUD', () => {
  it('createTask and getTasksBySection work for daily tasks', () => {
    createTask(db, {
      section: 'daily',
      zone_id: null,
      day_of_week: null,
      group_label: 'morning',
      title: 'Make beds',
      position: 0,
    });
    const tasks = getTasksBySection(db, 'daily');
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Make beds');
    expect(tasks[0].completed).toBe(false);
    expect(tasks[0].group_label).toBe('morning');
  });

  it('createTask for zone section with zone_id', () => {
    const zone = createZone(db, { name: 'Kitchen', position: 0 });
    createTask(db, {
      section: 'zone',
      zone_id: zone.id,
      day_of_week: null,
      group_label: null,
      title: 'Scrub stovetop',
      position: 0,
    });
    const tasks = getTasksBySection(db, 'zone', zone.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].zone_id).toBe(zone.id);
  });

  it('createTask for focus section with day_of_week', () => {
    createTask(db, {
      section: 'focus',
      zone_id: null,
      day_of_week: 6,
      group_label: null,
      title: 'Vacuum',
      position: 0,
    });
    const tasks = getTasksBySection(db, 'focus', null, 6);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].day_of_week).toBe(6);
  });

  it('updateTask changes title', () => {
    const task = createTask(db, {
      section: 'daily',
      zone_id: null,
      day_of_week: null,
      group_label: 'morning',
      title: 'Old title',
      position: 0,
    });
    const updated = updateTask(db, task.id, { title: 'New title' });
    expect(updated.title).toBe('New title');
  });

  it('deleteTask removes the task', () => {
    const task = createTask(db, {
      section: 'daily',
      zone_id: null,
      day_of_week: null,
      group_label: 'morning',
      title: 'Gone',
      position: 0,
    });
    deleteTask(db, task.id);
    expect(getTasksBySection(db, 'daily')).toHaveLength(0);
  });

  it('completeTask marks completed and sets completed_at', () => {
    const task = createTask(db, {
      section: 'daily',
      zone_id: null,
      day_of_week: null,
      group_label: 'morning',
      title: 'Make beds',
      position: 0,
    });
    const completed = completeTask(db, task.id);
    expect(completed.completed).toBe(true);
    expect(completed.completed_at).not.toBeNull();
  });

  it('uncompleteTask clears completion', () => {
    const task = createTask(db, {
      section: 'daily',
      zone_id: null,
      day_of_week: null,
      group_label: 'morning',
      title: 'Make beds',
      position: 0,
    });
    completeTask(db, task.id);
    const uncompleted = uncompleteTask(db, task.id);
    expect(uncompleted.completed).toBe(false);
    expect(uncompleted.completed_at).toBeNull();
  });
});

describe('getActiveZone rotation', () => {
  it('returns null when no zones exist', () => {
    setSetting(db, 'cleaning_zone_anchor', '2026-06-15'); // a Monday
    expect(getActiveZone(db)).toBeNull();
  });

  it('returns first zone in week 0', () => {
    createZone(db, { name: 'Zone A', position: 0 });
    createZone(db, { name: 'Zone B', position: 1 });
    // anchor = this Monday, now = Thursday same week → weeksDiff=0 → Zone A
    setSetting(db, 'cleaning_zone_anchor', '2026-06-15'); // Monday June 15
    const now = new Date('2026-06-18T08:00:00'); // Thursday June 18
    const zone = getActiveZone(db, now);
    expect(zone?.name).toBe('Zone A');
  });

  it('returns second zone in week 1', () => {
    createZone(db, { name: 'Zone A', position: 0 });
    createZone(db, { name: 'Zone B', position: 1 });
    // anchor = last Monday, now = this Thursday → weeksDiff=1 → Zone B
    setSetting(db, 'cleaning_zone_anchor', '2026-06-08'); // Monday June 8
    const now = new Date('2026-06-18T08:00:00'); // Thursday June 18 (Monday=June 15)
    const zone = getActiveZone(db, now);
    expect(zone?.name).toBe('Zone B');
  });

  it('wraps around after all zones (mod)', () => {
    createZone(db, { name: 'Zone A', position: 0 });
    createZone(db, { name: 'Zone B', position: 1 });
    // anchor = 2 Mondays ago, now = this Thursday → weeksDiff=2, index=0 → Zone A
    setSetting(db, 'cleaning_zone_anchor', '2026-06-01'); // Monday June 1
    const now = new Date('2026-06-18T08:00:00'); // Thursday June 18 (Monday=June 15)
    const zone = getActiveZone(db, now);
    expect(zone?.name).toBe('Zone A');
  });
});

describe('applyCleaningReset', () => {
  it('resets daily and focus tasks when a new day has passed', () => {
    const task = createTask(db, {
      section: 'daily',
      zone_id: null,
      day_of_week: null,
      group_label: 'morning',
      title: 'Make beds',
      position: 0,
    });
    completeTask(db, task.id);

    // Last reset was yesterday
    setSetting(db, 'last_cleaning_daily_reset', '2026-06-17');
    setSetting(db, 'reset_time', '00:00');

    const now = new Date('2026-06-18T08:00:00');
    applyCleaningReset(db, now);

    const tasks = getTasksBySection(db, 'daily');
    expect(tasks[0].completed).toBe(false);
  });

  it('does not reset when reset date is current', () => {
    const task = createTask(db, {
      section: 'daily',
      zone_id: null,
      day_of_week: null,
      group_label: 'morning',
      title: 'Make beds',
      position: 0,
    });
    completeTask(db, task.id);

    setSetting(db, 'last_cleaning_daily_reset', '2026-06-18');
    setSetting(db, 'reset_time', '00:00');

    const now = new Date('2026-06-18T08:00:00');
    applyCleaningReset(db, now);

    const tasks = getTasksBySection(db, 'daily');
    expect(tasks[0].completed).toBe(true);
  });

  it('resets zone tasks when the active zone changes', () => {
    const zoneA = createZone(db, { name: 'Zone A', position: 0 });
    createZone(db, { name: 'Zone B', position: 1 });

    const task = createTask(db, {
      section: 'zone',
      zone_id: zoneA.id,
      day_of_week: null,
      group_label: null,
      title: 'Deep scrub',
      position: 0,
    });
    completeTask(db, task.id);

    // Simulate: last known active zone is A, but anchor is 1 week back → now Zone B is active
    setSetting(db, 'cleaning_active_zone_id', zoneA.id);
    setSetting(db, 'cleaning_zone_anchor', '2026-06-08'); // Monday June 8 (1 week before June 15)
    setSetting(db, 'last_cleaning_daily_reset', '2026-06-18');
    setSetting(db, 'reset_time', '00:00');

    const now = new Date('2026-06-18T08:00:00'); // Thursday June 18, current Monday = June 15
    applyCleaningReset(db, now);

    // Zone A tasks should be reset (since zone changed away from A)
    const tasks = getTasksBySection(db, 'zone', zoneA.id);
    expect(tasks[0].completed).toBe(false);
  });
});

describe('seedCleaningDefaults', () => {
  it('seeds zones and tasks when none exist', () => {
    seedCleaningDefaults(db);
    const zones = getZones(db);
    expect(zones.length).toBeGreaterThan(0);
    expect(zones[0].name).toContain('Sunroom');
    const morningTasks = getTasksBySection(db, 'daily').filter((t) => t.group_label === 'morning');
    expect(morningTasks.length).toBeGreaterThan(0);
  });

  it('does not double-seed if called twice', () => {
    seedCleaningDefaults(db);
    seedCleaningDefaults(db);
    expect(getZones(db).length).toBe(4);
  });

  it('sets cleaning_zone_anchor setting on first seed', () => {
    seedCleaningDefaults(db);
    expect(getSetting<string>(db, 'cleaning_zone_anchor')).toBeTruthy();
  });
});
