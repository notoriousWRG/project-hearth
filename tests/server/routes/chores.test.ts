import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import { createApp } from '../../../src/server/app.js';
import { setAllowanceConfig, setTier } from '../../../src/server/models/allowance.js';

let db: Database.Database;
let app: Express;
let userId: number;

beforeEach(async () => {
  db = createDb(':memory:');
  runSchema(db);
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
  it('completes a chore and returns completion + streak', async () => {
    const created = await request(app)
      .post('/api/chores')
      .send({ user_id: userId, title: 'Dishes' });
    const res = await request(app).post(`/api/chores/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.completion.chore_id).toBe(created.body.id);
    expect(res.body.streak.current_streak).toBe(1);
    expect(res.body.streak.user_id).toBe(userId);
  });

  it('returns 404 for missing chore', async () => {
    const res = await request(app).post('/api/chores/999/complete');
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
