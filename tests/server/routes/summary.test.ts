import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema, runMigrations } from '../../../src/server/db/schema.js';
import { createApp } from '../../../src/server/app.js';

let db: Database.Database;
let app: Express;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  runMigrations(db);
  app = createApp(db);
});

afterEach(() => {
  db.close();
});

describe('GET /api/summary', () => {
  it('returns empty state when database has no users', async () => {
    const res = await request(app).get('/api/summary');
    expect(res.status).toBe(200);
    expect(res.body.children).toEqual([]);
    expect(res.body.reminders).toEqual([]);
    expect(res.body.meals).toEqual({ breakfast: '', lunch: '', dinner: '', snack: '' });
    expect(res.body.affirmation).toBe("Green's are good to people");
  });

  it('excludes parent users from children array', async () => {
    await request(app)
      .post('/api/users')
      .send({ name: 'WR', type: 'parent', icon: '👤', display_order: 0 });

    const res = await request(app).get('/api/summary');
    expect(res.status).toBe(200);
    expect(res.body.children).toEqual([]);
  });

  it('includes chore progress for child users', async () => {
    const userRes = await request(app)
      .post('/api/users')
      .send({ name: 'Kraft', type: 'child', icon: '⭐', display_order: 1 });
    const child = userRes.body;

    await request(app).post('/api/chores').send({
      user_id: child.id,
      title: 'Feed chickens',
      icon: '🐔',
      is_recurring: true,
      recurrence_rule: 'daily',
    });
    await request(app).post('/api/chores').send({
      user_id: child.id,
      title: 'Make bed',
      icon: '🛏',
      is_recurring: true,
      recurrence_rule: 'daily',
    });

    const res = await request(app).get('/api/summary');
    expect(res.status).toBe(200);
    expect(res.body.children).toHaveLength(1);
    const summary = res.body.children[0];
    expect(summary.name).toBe('Kraft');
    expect(summary.total).toBe(2);
    expect(summary.completed).toBe(0);
    expect(summary.percent).toBe(0);
    expect(summary.streak).toBe(0);
  });

  it('reflects completed chores in percent', async () => {
    const userRes = await request(app)
      .post('/api/users')
      .send({ name: 'Golden', type: 'child', icon: '🌟', display_order: 2 });
    const child = userRes.body;

    const c1 = await request(app)
      .post('/api/chores')
      .send({ user_id: child.id, title: 'Sweep', icon: '🧹', is_recurring: false });
    const c2 = await request(app)
      .post('/api/chores')
      .send({ user_id: child.id, title: 'Water plants', icon: '🌱', is_recurring: false });

    await request(app).post(`/api/chores/${c1.body.id}/complete`);

    const res = await request(app).get('/api/summary');
    const summary = res.body.children[0];
    expect(summary.completed).toBe(1);
    expect(summary.percent).toBe(50);
    // c2 is unused in this assertion, just needed for total=2
    expect(c2.body.id).toBeGreaterThan(0);
  });

  it("includes only today's undismissed reminders", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await request(app).post('/api/reminders').send({ title: 'Today task', due_date: today });
    const future = await request(app)
      .post('/api/reminders')
      .send({ title: 'Future task', due_date: '2099-12-31' });
    const toBesDismissed = await request(app)
      .post('/api/reminders')
      .send({ title: 'Dismissed today', due_date: today });
    await request(app).post(`/api/reminders/${toBesDismissed.body.id}/dismiss`);

    expect(future.body.id).toBeGreaterThan(0);

    const res = await request(app).get('/api/summary');
    expect(res.body.reminders).toHaveLength(1);
    expect(res.body.reminders[0].title).toBe('Today task');
  });

  it('excludes weekly chores not scheduled for today from total count', async () => {
    const userRes = await request(app)
      .post('/api/users')
      .send({ name: 'Kraft', type: 'child', icon: '⭐', display_order: 1 });
    const child = userRes.body;

    // Daily chore — always visible
    await request(app).post('/api/chores').send({
      user_id: child.id,
      title: 'Feed chickens',
      icon: '🐔',
      is_recurring: true,
      recurrence_rule: 'daily',
    });

    // Weekly chore scheduled for every day EXCEPT today — should not count
    const todayDow = new Date().getDay();
    const otherDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== todayDow);
    await request(app).post('/api/chores').send({
      user_id: child.id,
      title: 'Not today chore',
      icon: '🚫',
      is_recurring: true,
      recurrence_rule: 'weekly',
      recurrence_days: otherDays,
    });

    const res = await request(app).get('/api/summary');
    const summary = res.body.children[0];
    expect(summary.total).toBe(1);
    expect(summary.completed).toBe(0);
  });

  it('returns static affirmation', async () => {
    const res = await request(app).get('/api/summary');
    expect(res.body.affirmation).toBe("Green's are good to people");
  });
});
