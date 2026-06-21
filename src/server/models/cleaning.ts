import type Database from 'better-sqlite3';
import type {
  CleaningZone,
  CleaningTask,
  CleaningSection,
  DailyGroupLabel,
} from '../../shared/types.js';
import { getSetting, setSetting } from './settings.js';
import { shouldReset, getCurrentResetDate } from '../utils/reset.js';

type RawTask = {
  id: number;
  section: string;
  zone_id: number | null;
  day_of_week: number | null;
  group_label: string | null;
  title: string;
  position: number;
  completed: number;
  completed_at: string | null;
  created_at: string;
};

function toTask(raw: RawTask): CleaningTask {
  return {
    ...raw,
    section: raw.section as CleaningSection,
    group_label: raw.group_label as DailyGroupLabel | null,
    completed: raw.completed === 1,
  };
}

function getMondayISO(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoToMs(iso: string): number {
  return new Date(iso + 'T00:00:00').getTime();
}

// ── Zones ────────────────────────────────────────────────────────────────────

export function getZones(db: Database.Database): CleaningZone[] {
  return db.prepare('SELECT * FROM cleaning_zones ORDER BY position ASC').all() as CleaningZone[];
}

export function createZone(
  db: Database.Database,
  data: { name: string; position: number },
): CleaningZone {
  const result = db
    .prepare('INSERT INTO cleaning_zones (name, position) VALUES (?, ?)')
    .run(data.name, data.position);
  return { id: result.lastInsertRowid as number, name: data.name, position: data.position };
}

export function updateZone(
  db: Database.Database,
  id: number,
  data: Partial<{ name: string; position: number }>,
): CleaningZone {
  const existing = db.prepare('SELECT * FROM cleaning_zones WHERE id = ?').get(id) as CleaningZone;
  const updated = { ...existing, ...data };
  db.prepare('UPDATE cleaning_zones SET name = ?, position = ? WHERE id = ?').run(
    updated.name,
    updated.position,
    id,
  );
  return updated;
}

export function deleteZone(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM cleaning_zones WHERE id = ?').run(id);
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export function getTasksBySection(
  db: Database.Database,
  section: CleaningSection,
  zoneId?: number | null,
  dayOfWeek?: number | null,
): CleaningTask[] {
  if (section === 'zone' && zoneId != null) {
    return (
      db
        .prepare(
          'SELECT * FROM cleaning_tasks WHERE section = ? AND zone_id = ? ORDER BY position ASC',
        )
        .all(section, zoneId) as RawTask[]
    ).map(toTask);
  }
  if (section === 'focus' && dayOfWeek != null) {
    return (
      db
        .prepare(
          'SELECT * FROM cleaning_tasks WHERE section = ? AND day_of_week = ? ORDER BY position ASC',
        )
        .all(section, dayOfWeek) as RawTask[]
    ).map(toTask);
  }
  return (
    db
      .prepare('SELECT * FROM cleaning_tasks WHERE section = ? ORDER BY position ASC')
      .all(section) as RawTask[]
  ).map(toTask);
}

export function createTask(
  db: Database.Database,
  data: {
    section: CleaningSection;
    zone_id: number | null;
    day_of_week: number | null;
    group_label: DailyGroupLabel | null;
    title: string;
    position: number;
  },
): CleaningTask {
  const result = db
    .prepare(
      `INSERT INTO cleaning_tasks (section, zone_id, day_of_week, group_label, title, position)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      data.section,
      data.zone_id ?? null,
      data.day_of_week ?? null,
      data.group_label ?? null,
      data.title,
      data.position,
    );
  const raw = db
    .prepare('SELECT * FROM cleaning_tasks WHERE id = ?')
    .get(result.lastInsertRowid) as RawTask;
  return toTask(raw);
}

export function updateTask(
  db: Database.Database,
  id: number,
  data: Partial<{
    title: string;
    position: number;
    group_label: DailyGroupLabel | null;
    day_of_week: number | null;
    zone_id: number | null;
  }>,
): CleaningTask {
  const raw = db.prepare('SELECT * FROM cleaning_tasks WHERE id = ?').get(id) as RawTask;
  const merged = { ...raw, ...data };
  db.prepare(
    `UPDATE cleaning_tasks
     SET title = ?, position = ?, group_label = ?, day_of_week = ?, zone_id = ?
     WHERE id = ?`,
  ).run(
    merged.title,
    merged.position,
    merged.group_label ?? null,
    merged.day_of_week ?? null,
    merged.zone_id ?? null,
    id,
  );
  return toTask({ ...merged, id });
}

export function deleteTask(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM cleaning_tasks WHERE id = ?').run(id);
}

export function completeTask(db: Database.Database, id: number): CleaningTask {
  const now = new Date().toISOString();
  db.prepare('UPDATE cleaning_tasks SET completed = 1, completed_at = ? WHERE id = ?').run(now, id);
  const raw = db.prepare('SELECT * FROM cleaning_tasks WHERE id = ?').get(id) as RawTask;
  return toTask(raw);
}

export function uncompleteTask(db: Database.Database, id: number): CleaningTask {
  db.prepare('UPDATE cleaning_tasks SET completed = 0, completed_at = NULL WHERE id = ?').run(id);
  const raw = db.prepare('SELECT * FROM cleaning_tasks WHERE id = ?').get(id) as RawTask;
  return toTask(raw);
}

// ── Active zone ───────────────────────────────────────────────────────────────

export function getActiveZone(db: Database.Database, now: Date = new Date()): CleaningZone | null {
  const zones = getZones(db);
  if (zones.length === 0) return null;

  const anchor = getSetting<string>(db, 'cleaning_zone_anchor');
  if (!anchor) return zones[0];

  const anchorMs = isoToMs(anchor);
  const currentMonday = getMondayISO(now);
  const currentMs = isoToMs(currentMonday);

  const weeksDiff = Math.floor((currentMs - anchorMs) / (7 * 24 * 60 * 60 * 1000));
  const index = ((weeksDiff % zones.length) + zones.length) % zones.length;
  return zones[index];
}

// ── Reset ─────────────────────────────────────────────────────────────────────

export function applyCleaningReset(db: Database.Database, now: Date = new Date()): void {
  const resetTime = getSetting<string>(db, 'reset_time') ?? '00:00';
  const lastReset = getSetting<string>(db, 'last_cleaning_daily_reset');

  if (!lastReset || shouldReset(lastReset, resetTime, now)) {
    db.prepare(
      `UPDATE cleaning_tasks SET completed = 0, completed_at = NULL
       WHERE section IN ('daily', 'focus')`,
    ).run();
    setSetting(db, 'last_cleaning_daily_reset', getCurrentResetDate(now, resetTime));
  }

  const activeZone = getActiveZone(db, now);
  const lastActiveZoneId = getSetting<number>(db, 'cleaning_active_zone_id');

  if (activeZone && activeZone.id !== lastActiveZoneId) {
    // Zone rotated — reset that zone's tasks
    const prevId = lastActiveZoneId ?? activeZone.id;
    db.prepare(
      `UPDATE cleaning_tasks SET completed = 0, completed_at = NULL
       WHERE section = 'zone' AND zone_id = ?`,
    ).run(prevId);
    setSetting(db, 'cleaning_active_zone_id', activeZone.id);
  }
}

// ── Seed defaults ─────────────────────────────────────────────────────────────

export function seedCleaningDefaults(db: Database.Database): void {
  const existing = getZones(db);
  if (existing.length > 0) return;

  const zoneNames = ['Sunroom & entry', 'Main room & kitchen', 'Bathrooms & bedrooms', 'Basement'];
  const zones = zoneNames.map((name, i) => createZone(db, { name, position: i }));

  // Zone deep-clean tasks
  const zoneTasks: Record<string, string[]> = {
    'Sunroom & entry': [
      'Sweep & mop sunroom floor',
      'Wipe down entry surfaces',
      'Clean sunroom windows',
      'Tidy entry closet',
      'Wipe front door & glass',
    ],
    'Main room & kitchen': [
      'Wipe stovetop & oven exterior',
      'Clean microwave inside',
      'Wipe counters & backsplash',
      'Clean sink & faucet',
      'Wipe cabinet fronts',
      'Mop kitchen floor',
      'Dust living room surfaces',
      'Vacuum rugs & upholstery',
    ],
    'Bathrooms & bedrooms': [
      'Scrub tub/shower',
      'Clean toilets',
      'Wipe mirrors & glass',
      'Wash bath mats',
      'Change bedding',
      'Vacuum under beds',
      'Dust surfaces & shelves',
    ],
    Basement: [
      'Sweep basement floor',
      'Tidy storage areas',
      'Check laundry area',
      'Wipe down appliances',
      'Clear any clutter',
    ],
  };

  for (const zone of zones) {
    const tasks = zoneTasks[zone.name] ?? [];
    tasks.forEach((title, i) => {
      createTask(db, {
        section: 'zone',
        zone_id: zone.id,
        day_of_week: null,
        group_label: null,
        title,
        position: i,
      });
    });
  }

  // Daily morning routine
  const morningTasks = [
    'Make beds',
    'Swish & swipe bathrooms',
    'Start a load of laundry',
    'Wipe kitchen counters',
  ];
  morningTasks.forEach((title, i) => {
    createTask(db, {
      section: 'daily',
      zone_id: null,
      day_of_week: null,
      group_label: 'morning',
      title,
      position: i,
    });
  });

  // Daily before-bed routine
  const bedTasks = ['Shine the sink', 'Clear hot spots', 'Lay out tomorrow'];
  bedTasks.forEach((title, i) => {
    createTask(db, {
      section: 'daily',
      zone_id: null,
      day_of_week: null,
      group_label: 'before_bed',
      title,
      position: i,
    });
  });

  // Daily homestead
  const homesteadTasks = ['Feed & water animals', 'Collect eggs', 'Evening lock-up'];
  homesteadTasks.forEach((title, i) => {
    createTask(db, {
      section: 'daily',
      zone_id: null,
      day_of_week: null,
      group_label: 'homestead',
      title,
      position: i,
    });
  });

  // Focus tasks by day (0=Sun … 6=Sat)
  const focusByDay: Record<number, string[]> = {
    0: ['Rest & plan the week ahead'],
    1: ['Zone focus'],
    2: ['Zone focus'],
    3: ['Zone focus', 'Meal & grocery prep'],
    4: ['Zone focus'],
    5: ['Catch-all: paperwork, car, desk'],
    6: [
      'Vacuum',
      'Mop',
      'Dust surfaces',
      'Polish mirrors',
      'Empty trash',
      'Change sheets',
      'Quick bathroom wipe',
      'Tidy entry',
    ],
  };

  for (const [dayStr, tasks] of Object.entries(focusByDay)) {
    const day = parseInt(dayStr, 10);
    tasks.forEach((title, i) => {
      createTask(db, {
        section: 'focus',
        zone_id: null,
        day_of_week: day,
        group_label: null,
        title,
        position: i,
      });
    });
  }

  // Flight plan labels
  const flightPlan = [
    'Rest & plan',
    'Zone focus',
    'Zone focus',
    'Zone focus + meal & grocery prep',
    'Zone focus',
    'Catch-all: paperwork, car, desk',
    'Weekly Home Blessing',
  ];
  setSetting(db, 'cleaning_flight_plan', flightPlan);

  // Anchor to current Monday
  const now = new Date();
  setSetting(db, 'cleaning_zone_anchor', getMondayISO(now));
  setSetting(db, 'cleaning_active_zone_id', zones[0].id);
}
