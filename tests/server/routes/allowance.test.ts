import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import { createApp } from '../../../src/server/app.js';
import { setSetting } from '../../../src/server/models/settings.js';

const PIN = '1234';

let db: Database.Database;
let app: Express;
let userId: number;

beforeEach(async () => {
  db = createDb(':memory:');
  runSchema(db);
  setSetting(db, 'pin', PIN);
  app = createApp(db);
  const res = await request(app).post('/api/users').send({ name: 'Kraft', type: 'child' });
  userId = res.body.id;
});

afterEach(() => {
  db.close();
});

describe('GET /api/allowance/:userId', () => {
  it('returns 401 without PIN', async () => {
    const res = await request(app).get(`/api/allowance/${userId}`);
    expect(res.status).toBe(401);
  });

  it('returns null config when none exists', async () => {
    const res = await request(app).get(`/api/allowance/${userId}`).set('x-pin', PIN);
    expect(res.status).toBe(200);
    expect(res.body.config).toBeNull();
    expect(res.body.tiers).toEqual([]);
  });

  it('returns existing config and tiers', async () => {
    // Seed via PUT first
    await request(app)
      .put(`/api/allowance/${userId}`)
      .set('x-pin', PIN)
      .send({
        amount: 10,
        streak_threshold: 5,
        reset_day: 0,
        period_start: '2026-05-01',
        tiers: [
          { percent_complete: 50, percent_payout: 50 },
          { percent_complete: 100, percent_payout: 100 },
        ],
      });

    const res = await request(app).get(`/api/allowance/${userId}`).set('x-pin', PIN);
    expect(res.status).toBe(200);
    expect(res.body.config.amount).toBe(10);
    expect(res.body.config.streak_threshold).toBe(5);
    expect(res.body.tiers).toHaveLength(2);
    expect(res.body.tiers[0].percent_complete).toBe(50);
  });
});

describe('PUT /api/allowance/:userId', () => {
  it('returns 401 without PIN', async () => {
    const res = await request(app).put(`/api/allowance/${userId}`).send({});
    expect(res.status).toBe(401);
  });

  it('creates config and tiers', async () => {
    const res = await request(app)
      .put(`/api/allowance/${userId}`)
      .set('x-pin', PIN)
      .send({
        amount: 10,
        streak_threshold: 7,
        reset_day: 0,
        period_start: '2026-05-01',
        tiers: [{ percent_complete: 100, percent_payout: 100 }],
      });
    expect(res.status).toBe(200);
    expect(res.body.config.amount).toBe(10);
    expect(res.body.tiers).toHaveLength(1);
  });

  it('replaces existing tiers on update', async () => {
    // Create with 2 tiers
    await request(app)
      .put(`/api/allowance/${userId}`)
      .set('x-pin', PIN)
      .send({
        amount: 10,
        streak_threshold: 7,
        reset_day: 0,
        period_start: '2026-05-01',
        tiers: [
          { percent_complete: 50, percent_payout: 50 },
          { percent_complete: 100, percent_payout: 100 },
        ],
      });

    // Update with only 1 tier
    const res = await request(app)
      .put(`/api/allowance/${userId}`)
      .set('x-pin', PIN)
      .send({
        amount: 15,
        streak_threshold: 7,
        reset_day: 0,
        period_start: '2026-05-01',
        tiers: [{ percent_complete: 100, percent_payout: 100 }],
      });
    expect(res.body.config.amount).toBe(15);
    expect(res.body.tiers).toHaveLength(1);
  });

  it('returns 400 when amount is missing', async () => {
    const res = await request(app)
      .put(`/api/allowance/${userId}`)
      .set('x-pin', PIN)
      .send({ streak_threshold: 7, reset_day: 0, period_start: '2026-05-01', tiers: [] });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/allowance/:userId/payout', () => {
  it('returns 401 without PIN', async () => {
    const res = await request(app).post(`/api/allowance/${userId}/payout`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when no config exists', async () => {
    const res = await request(app).post(`/api/allowance/${userId}/payout`).set('x-pin', PIN);
    expect(res.status).toBe(404);
  });

  it('updates period_start to today', async () => {
    await request(app).put(`/api/allowance/${userId}`).set('x-pin', PIN).send({
      amount: 10,
      streak_threshold: 7,
      reset_day: 0,
      period_start: '2026-01-01',
      tiers: [],
    });

    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app).post(`/api/allowance/${userId}/payout`).set('x-pin', PIN);
    expect(res.status).toBe(200);
    expect(res.body.period_start).toBe(today);
  });
});
