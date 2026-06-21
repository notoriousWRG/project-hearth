import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema, runMigrations } from '../../../src/server/db/schema.js';
import { createApp } from '../../../src/server/app.js';
import { setSetting } from '../../../src/server/models/settings.js';

let db: Database.Database;
let app: Express;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  runMigrations(db);
  app = createApp(db);
  setSetting(db, 'eating_out_weekly_amount', 60);
});

afterEach(() => {
  db.close();
});

describe('GET /api/eating-out', () => {
  it('returns state with remaining and weeklyAmount', async () => {
    const res = await request(app).get('/api/eating-out');
    expect(res.status).toBe(200);
    expect(res.body.remaining).toBe(60);
    expect(res.body.weeklyAmount).toBe(60);
    expect(res.body.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('POST /api/eating-out/subtract', () => {
  it('subtracts an amount and returns updated state', async () => {
    const res = await request(app).post('/api/eating-out/subtract').send({ amount: 20 });
    expect(res.status).toBe(200);
    expect(res.body.remaining).toBe(40);
  });

  it('returns 400 for missing amount', async () => {
    const res = await request(app).post('/api/eating-out/subtract').send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative amount', async () => {
    const res = await request(app).post('/api/eating-out/subtract').send({ amount: -5 });
    expect(res.status).toBe(400);
  });

  it('allows subtraction that takes remaining below zero', async () => {
    const res = await request(app).post('/api/eating-out/subtract').send({ amount: 80 });
    expect(res.status).toBe(200);
    expect(res.body.remaining).toBe(-20);
  });
});

describe('POST /api/eating-out/reset', () => {
  it('resets remaining to weekly amount', async () => {
    await request(app).post('/api/eating-out/subtract').send({ amount: 40 });
    const res = await request(app).post('/api/eating-out/reset');
    expect(res.status).toBe(200);
    expect(res.body.remaining).toBe(60);
  });
});
