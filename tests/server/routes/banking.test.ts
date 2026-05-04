import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema, runMigrations } from '../../../src/server/db/schema.js';
import { createApp } from '../../../src/server/app.js';
import { setSetting } from '../../../src/server/models/settings.js';
import { recordDailyEarning } from '../../../src/server/models/allowance.js';

const PIN = '1234';

let db: Database.Database;
let app: Express;
let userId: number;

beforeEach(async () => {
  db = createDb(':memory:');
  runSchema(db);
  runMigrations(db);
  setSetting(db, 'pin', PIN);
  app = createApp(db);
  const res = await request(app).post('/api/users').send({ name: 'Kraft', type: 'child' });
  userId = res.body.id;
  await request(app)
    .put(`/api/allowance/${userId}`)
    .set('x-pin', PIN)
    .send({
      amount: 7,
      streak_threshold: 5,
      reset_day: 0,
      period_start: '2026-01-05',
      tiers: [{ percent_complete: 100, percent_payout: 100 }],
    });
});

afterEach(() => {
  db.close();
});

describe('GET /api/allowance/:userId/banking', () => {
  it('returns zero totals when no earnings recorded', async () => {
    const res = await request(app).get(`/api/allowance/${userId}/banking`);
    expect(res.status).toBe(200);
    expect(res.body.thisWeekEarned).toBe(0);
    expect(res.body.todayEarned).toBe(0);
    expect(res.body.savingsBalance).toBe(0);
    expect(res.body.titheBalance).toBe(0);
    expect(res.body.checkingBalance).toBe(0);
  });

  it('returns zeros with no config', async () => {
    const res2 = await request(app).post('/api/users').send({ name: 'NoConfig', type: 'child' });
    const noConfigId = res2.body.id;
    const res = await request(app).get(`/api/allowance/${noConfigId}/banking`);
    expect(res.status).toBe(200);
    expect(res.body.thisWeekEarned).toBe(0);
    expect(res.body.todayEarned).toBe(0);
  });

  it('sums current-week daily earnings', async () => {
    const today = new Date().toISOString().slice(0, 10);
    recordDailyEarning(db, userId, today, 1.0);
    const res = await request(app).get(`/api/allowance/${userId}/banking`);
    expect(res.status).toBe(200);
    expect(res.body.thisWeekEarned).toBe(1.0);
  });
});

describe('PATCH /api/allowance/:userId/balances', () => {
  it('returns 401 without PIN', async () => {
    const res = await request(app)
      .patch(`/api/allowance/${userId}/balances`)
      .send({ savings_balance: 5 });
    expect(res.status).toBe(401);
  });

  it('updates savings balance', async () => {
    const res = await request(app)
      .patch(`/api/allowance/${userId}/balances`)
      .set('x-pin', PIN)
      .send({ savings_balance: 3.5 });
    expect(res.status).toBe(200);
    expect(res.body.savingsBalance).toBe(3.5);
  });

  it('rounds to nearest quarter', async () => {
    const res = await request(app)
      .patch(`/api/allowance/${userId}/balances`)
      .set('x-pin', PIN)
      .send({ checking_balance: 4.13 });
    expect(res.status).toBe(200);
    expect(res.body.checkingBalance).toBe(4.25);
  });

  it('updates only the provided fields', async () => {
    await request(app)
      .patch(`/api/allowance/${userId}/balances`)
      .set('x-pin', PIN)
      .send({ savings_balance: 2.0 });
    const res = await request(app)
      .patch(`/api/allowance/${userId}/balances`)
      .set('x-pin', PIN)
      .send({ tithe_balance: 1.0 });
    expect(res.body.savingsBalance).toBe(2.0);
    expect(res.body.titheBalance).toBe(1.0);
  });
});
