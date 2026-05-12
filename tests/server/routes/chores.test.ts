import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema, runMigrations } from '../../../src/server/db/schema.js';
import { createApp } from '../../../src/server/app.js';
import {
  setAllowanceConfig,
  setTier,
  recordDailyEarning,
} from '../../../src/server/models/allowance.js';
import { addCompletionForDate } from '../../../src/server/models/chores.js';
import { setSetting } from '../../../src/server/models/settings.js';

let db: Database.Database;
let app: Express;
let userId: number;

beforeEach(async () => {
  db = createDb(':memory:');
  runSchema(db);
  runMigrations(db);
  app = createApp(db);
  const res = await request(app).post('/api/users').send({ name: 'Kid', type: 'child' });
  userId = res.body.id;
});

afterEach(() => {
  db.close();
});

describe('GET /api/chores', () => {
  it('returns 400 when userId is missing', async () => {
    const res = await request(app).get('/api/chores');
    expect(res.status).toBe(400);
  });

  it('returns empty array for user with no chores', async () => {
    const res = await request(app).get(`/api/chores?userId=${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/chores', () => {
  it('creates a chore and returns 201', async () => {
    const res = await request(app)
      .post('/api/chores')
      .send({ user_id: userId, title: 'Make bed', icon: '🛏️' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.completed).toBe(false);
    expect(res.body.is_bonus).toBe(false);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/chores').send({ user_id: userId });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/chores/:id', () => {
  it('updates a chore', async () => {
    const created = await request(app).post('/api/chores').send({ user_id: userId, title: 'Old' });
    const res = await request(app).put(`/api/chores/${created.body.id}`).send({ title: 'New' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).put('/api/chores/999').send({ title: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/chores/:id', () => {
  it('deletes a chore and returns 204', async () => {
    const created = await request(app).post('/api/chores').send({ user_id: userId, title: 'Del' });
    const res = await request(app).delete(`/api/chores/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).delete('/api/chores/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/chores/:id/complete', () => {
  it('completes a chore and returns completion record', async () => {
    const created = await request(app)
      .post('/api/chores')
      .send({ user_id: userId, title: 'Dishes' });
    const res = await request(app).post(`/api/chores/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.completion.chore_id).toBe(created.body.id);
    expect(res.body.streak).toBeUndefined();
  });

  it('returns 404 for missing chore', async () => {
    const res = await request(app).post('/api/chores/999/complete');
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/chores/:id/complete', () => {
  it('marks a completed chore as incomplete', async () => {
    const created = await request(app)
      .post('/api/chores')
      .send({ user_id: userId, title: 'Dishes' });
    await request(app).post(`/api/chores/${created.body.id}/complete`);

    const res = await request(app).delete(`/api/chores/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(false);
    expect(res.body.completed_at).toBeNull();
  });

  it('returns 404 for missing chore', async () => {
    const res = await request(app).delete('/api/chores/999/complete');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/chores/progress/:userId', () => {
  it('returns zeros when no chores', async () => {
    const res = await request(app).get(`/api/chores/progress/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 0,
      completed: 0,
      percent: 0,
      earned: 0,
      streak_threshold: 7,
    });
  });

  it('calculates percent correctly', async () => {
    const c1 = await request(app).post('/api/chores').send({ user_id: userId, title: 'A' });
    const c2 = await request(app).post('/api/chores').send({ user_id: userId, title: 'B' });
    await request(app).post(`/api/chores/${c1.body.id}/complete`);
    const res = await request(app).get(`/api/chores/progress/${userId}`);
    expect(res.body.total).toBe(2);
    expect(res.body.completed).toBe(1);
    expect(res.body.percent).toBe(50);
    // No allowance config → earned = 0
    expect(res.body.earned).toBe(0);
    void c2; // suppress unused warning
  });

  it('calculates earned amount from allowance config', async () => {
    const config = setAllowanceConfig(db, userId, {
      amount: 10,
      streak_threshold: 5,
      reset_day: 0,
      period_start: '2026-05-01',
    });
    setTier(db, config.id, 50, 50); // 50% chores done → 50% payout
    setTier(db, config.id, 100, 100);

    const c1 = await request(app).post('/api/chores').send({ user_id: userId, title: 'A' });
    const c2 = await request(app).post('/api/chores').send({ user_id: userId, title: 'B' });
    await request(app).post(`/api/chores/${c1.body.id}/complete`);
    await request(app).post(`/api/chores/${c2.body.id}/complete`);

    const res = await request(app).get(`/api/chores/progress/${userId}`);
    expect(res.body.percent).toBe(100);
    expect(res.body.earned).toBe(10); // 100% tier → 100% of $10
  });
});

describe('GET /api/streaks/:userId', () => {
  it('returns a streak record with defaults', async () => {
    const res = await request(app).get(`/api/streaks/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.current_streak).toBe(0);
    expect(res.body.user_id).toBe(userId);
  });
});

describe('weekly chore filtering', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('weekly chore appears on its scheduled day', async () => {
    // Pin time to a Monday (day 1)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T10:00:00Z')); // Monday

    await request(app)
      .post('/api/chores')
      .send({
        user_id: userId,
        title: 'Monday only',
        is_recurring: true,
        recurrence_rule: 'weekly',
        recurrence_days: [1], // Monday
      });

    const res = await request(app).get(`/api/chores?userId=${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Monday only');
  });

  it('weekly chore is hidden on other days', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T10:00:00Z')); // Tuesday

    await request(app)
      .post('/api/chores')
      .send({
        user_id: userId,
        title: 'Monday only',
        is_recurring: true,
        recurrence_rule: 'weekly',
        recurrence_days: [1], // Monday
      });

    const res = await request(app).get(`/api/chores?userId=${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
  });

  it('all=true returns weekly chore even on off days', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-05T10:00:00Z')); // Tuesday

    await request(app)
      .post('/api/chores')
      .send({
        user_id: userId,
        title: 'Monday only',
        is_recurring: true,
        recurrence_rule: 'weekly',
        recurrence_days: [1],
      });

    const res = await request(app).get(`/api/chores?userId=${userId}&all=true`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Monday only');
  });

  it('daily chore always appears regardless of day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-07T10:00:00Z')); // Thursday

    await request(app).post('/api/chores').send({
      user_id: userId,
      title: 'Daily task',
      is_recurring: true,
      recurrence_rule: 'daily',
    });

    const res = await request(app).get(`/api/chores?userId=${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('progress only counts weekly chores scheduled for today', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-04T10:00:00Z')); // Monday

    // Monday chore (visible today)
    const monRes = await request(app)
      .post('/api/chores')
      .send({
        user_id: userId,
        title: 'Monday task',
        is_recurring: true,
        recurrence_rule: 'weekly',
        recurrence_days: [1],
      });
    // Wednesday chore (not visible today)
    await request(app)
      .post('/api/chores')
      .send({
        user_id: userId,
        title: 'Wednesday task',
        is_recurring: true,
        recurrence_rule: 'weekly',
        recurrence_days: [3],
      });

    await request(app).post(`/api/chores/${monRes.body.id}/complete`);

    const prog = await request(app).get(`/api/chores/progress/${userId}`);
    // Only the Monday chore is visible; it's completed → 100%
    expect(prog.body.total).toBe(1);
    expect(prog.body.completed).toBe(1);
    expect(prog.body.percent).toBe(100);
  });

  it('POST /api/chores saves recurrence_days and returns them', async () => {
    const res = await request(app)
      .post('/api/chores')
      .send({
        user_id: userId,
        title: 'Weekend',
        is_recurring: true,
        recurrence_rule: 'weekly',
        recurrence_days: [0, 6],
      });
    expect(res.status).toBe(201);
    expect(res.body.recurrence_days).toEqual([0, 6]);
    expect(res.body.recurrence_rule).toBe('weekly');
  });
});

const PIN = '1234';

describe('GET /api/chores/history (pin-protected)', () => {
  const FIXED_NOW = new Date('2026-05-12T10:00:00Z');

  beforeEach(() => {
    setSetting(db, 'pin', PIN);
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 401 without a PIN', async () => {
    const res = await request(app).get(`/api/chores/history?userId=${userId}&date=2026-05-12`);
    expect(res.status).toBe(401);
  });

  it('returns 400 when userId is missing', async () => {
    const res = await request(app).get('/api/chores/history?date=2026-05-12').set('x-pin', PIN);
    expect(res.status).toBe(400);
  });

  it('returns 400 for a date more than 7 days ago', async () => {
    const res = await request(app)
      .get(`/api/chores/history?userId=${userId}&date=2026-05-04`)
      .set('x-pin', PIN);
    expect(res.status).toBe(400);
  });

  it('returns history for today with chores and earned=0 (no config)', async () => {
    await request(app).post('/api/chores').send({ user_id: userId, title: 'Dishes', icon: '🍽️' });
    const res = await request(app)
      .get(`/api/chores/history?userId=${userId}&date=2026-05-12`)
      .set('x-pin', PIN);
    expect(res.status).toBe(200);
    expect(res.body.chores).toHaveLength(1);
    expect(res.body.chores[0].completed).toBe(false);
    expect(res.body.earned).toBe(0);
  });

  it('returns completion status from chore_completions for a past day', async () => {
    const created = await request(app)
      .post('/api/chores')
      .send({ user_id: userId, title: 'Dishes', icon: '🍽️' });
    addCompletionForDate(db, created.body.id, '2026-05-11');
    const res = await request(app)
      .get(`/api/chores/history?userId=${userId}&date=2026-05-11`)
      .set('x-pin', PIN);
    expect(res.status).toBe(200);
    expect(res.body.chores[0].completed).toBe(true);
  });

  it('returns stored earned for a past day', async () => {
    await request(app).post('/api/chores').send({ user_id: userId, title: 'Dishes' });
    recordDailyEarning(db, userId, '2026-05-11', 1.25);
    const res = await request(app)
      .get(`/api/chores/history?userId=${userId}&date=2026-05-11`)
      .set('x-pin', PIN);
    expect(res.body.earned).toBe(1.25);
  });
});

describe('POST /api/chores/:id/history/toggle (pin-protected)', () => {
  const FIXED_NOW = new Date('2026-05-12T10:00:00Z');

  beforeEach(() => {
    setSetting(db, 'pin', PIN);
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 401 without a PIN', async () => {
    const created = await request(app).post('/api/chores').send({ user_id: userId, title: 'A' });
    const res = await request(app)
      .post(`/api/chores/${created.body.id}/history/toggle`)
      .send({ date: '2026-05-11', userId });
    expect(res.status).toBe(401);
  });

  it('returns 400 for a date outside the 7-day window', async () => {
    const created = await request(app).post('/api/chores').send({ user_id: userId, title: 'A' });
    const res = await request(app)
      .post(`/api/chores/${created.body.id}/history/toggle`)
      .set('x-pin', PIN)
      .send({ date: '2026-05-04', userId });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown chore', async () => {
    const res = await request(app)
      .post('/api/chores/999/history/toggle')
      .set('x-pin', PIN)
      .send({ date: '2026-05-11', userId });
    expect(res.status).toBe(404);
  });

  it('marks a past-day chore as completed', async () => {
    const created = await request(app).post('/api/chores').send({ user_id: userId, title: 'A' });
    const res = await request(app)
      .post(`/api/chores/${created.body.id}/history/toggle`)
      .set('x-pin', PIN)
      .send({ date: '2026-05-11', userId });
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  it('unmarks a past-day chore that was already completed', async () => {
    const created = await request(app).post('/api/chores').send({ user_id: userId, title: 'A' });
    addCompletionForDate(db, created.body.id, '2026-05-11');
    const res = await request(app)
      .post(`/api/chores/${created.body.id}/history/toggle`)
      .set('x-pin', PIN)
      .send({ date: '2026-05-11', userId });
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(false);
  });

  it('recalculates earned for a past day with allowance config', async () => {
    const config = setAllowanceConfig(db, userId, {
      amount: 7,
      streak_threshold: 5,
      reset_day: 0,
      period_start: '2026-05-10',
    });
    setTier(db, config.id, 100, 100);
    const created = await request(app).post('/api/chores').send({ user_id: userId, title: 'A' });
    const res = await request(app)
      .post(`/api/chores/${created.body.id}/history/toggle`)
      .set('x-pin', PIN)
      .send({ date: '2026-05-11', userId });
    expect(res.body.earned).toBe(1); // $7/week ÷ 7 days × 100% = $1
  });

  it('toggles today and returns earned=0', async () => {
    const created = await request(app).post('/api/chores').send({ user_id: userId, title: 'A' });
    const res = await request(app)
      .post(`/api/chores/${created.body.id}/history/toggle`)
      .set('x-pin', PIN)
      .send({ date: '2026-05-12', userId });
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
    expect(res.body.earned).toBe(0);
  });
});
