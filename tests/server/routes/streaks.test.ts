import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import { createApp } from '../../../src/server/app.js';
import { setSetting } from '../../../src/server/models/settings.js';
import { evaluateStreakAtReset } from '../../../src/server/models/streaks.js';

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

describe('GET /api/streaks/:userId', () => {
  it('returns streak record (no PIN required)', async () => {
    const res = await request(app).get(`/api/streaks/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.current_streak).toBe(0);
    expect(res.body.user_id).toBe(userId);
  });
});

describe('POST /api/streaks/:userId/reset', () => {
  it('returns 401 without PIN', async () => {
    const res = await request(app).post(`/api/streaks/${userId}/reset`);
    expect(res.status).toBe(401);
  });

  it('resets current_streak to 0', async () => {
    evaluateStreakAtReset(db, userId, 100, 100, '2026-05-01');
    evaluateStreakAtReset(db, userId, 100, 100, '2026-05-02');

    const res = await request(app).post(`/api/streaks/${userId}/reset`).set('x-pin', PIN);
    expect(res.status).toBe(200);
    expect(res.body.current_streak).toBe(0);
  });

  it('preserves longest_streak after reset', async () => {
    evaluateStreakAtReset(db, userId, 100, 100, '2026-05-01');
    evaluateStreakAtReset(db, userId, 100, 100, '2026-05-02');
    evaluateStreakAtReset(db, userId, 100, 100, '2026-05-03');

    const res = await request(app).post(`/api/streaks/${userId}/reset`).set('x-pin', PIN);
    expect(res.body.longest_streak).toBe(3);
  });

  it('clears last_completed_date', async () => {
    evaluateStreakAtReset(db, userId, 100, 100, '2026-05-01');

    const res = await request(app).post(`/api/streaks/${userId}/reset`).set('x-pin', PIN);
    expect(res.body.last_completed_date).toBeNull();
  });
});
