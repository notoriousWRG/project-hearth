import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import { createApp } from '../../../src/server/app.js';

let db: Database.Database;
let app: Express;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  app = createApp(db);
});

afterEach(() => {
  db.close();
});

describe('POST /api/settings/verify-pin', () => {
  it('returns valid=true when no PIN is set', async () => {
    const res = await request(app).post('/api/settings/verify-pin').send({ pin: 'anything' });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('returns valid=true for correct PIN', async () => {
    await request(app).put('/api/settings').send({ key: 'pin', value: '1234' });
    const res = await request(app).post('/api/settings/verify-pin').send({ pin: '1234' });
    expect(res.body.valid).toBe(true);
  });

  it('returns valid=false for wrong PIN', async () => {
    await request(app).put('/api/settings').send({ key: 'pin', value: '1234' });
    const res = await request(app).post('/api/settings/verify-pin').send({ pin: 'wrong' });
    expect(res.body.valid).toBe(false);
  });
});

describe('GET /api/settings (PIN-protected)', () => {
  it('returns 200 when no PIN is configured', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
  });

  it('returns 401 without PIN header when PIN is set', async () => {
    // Set the PIN directly via DB (bypass the route which needs PIN to set PIN)
    await request(app).put('/api/settings').send({ key: 'pin', value: '1234' });
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
  });

  it('returns 200 with correct PIN header', async () => {
    await request(app).put('/api/settings').send({ key: 'pin', value: '1234' });
    const res = await request(app).get('/api/settings').set('x-pin', '1234');
    expect(res.status).toBe(200);
  });

  it('returns all settings as key-value object', async () => {
    await request(app).put('/api/settings').send({ key: 'theme', value: 'clean' });
    const res = await request(app).get('/api/settings');
    expect(res.body.theme).toBe('clean');
  });
});

describe('PUT /api/settings (PIN-protected)', () => {
  it('saves a setting', async () => {
    const res = await request(app).put('/api/settings').send({ key: 'theme', value: 'farmstead' });
    expect(res.status).toBe(200);
    expect(res.body.key).toBe('theme');
  });

  it('returns 400 when key is missing', async () => {
    const res = await request(app).put('/api/settings').send({ value: 'something' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when PIN is required but not provided', async () => {
    await request(app).put('/api/settings').send({ key: 'pin', value: '1234' });
    const res = await request(app).put('/api/settings').send({ key: 'theme', value: 'clean' });
    expect(res.status).toBe(401);
  });

  it('saves with correct PIN', async () => {
    await request(app).put('/api/settings').send({ key: 'pin', value: '1234' });
    const res = await request(app)
      .put('/api/settings')
      .set('x-pin', '1234')
      .send({ key: 'theme', value: 'whimsy' });
    expect(res.status).toBe(200);
  });
});
