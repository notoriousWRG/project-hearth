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

describe('GET /api/reminders', () => {
  it('returns empty array initially', async () => {
    const res = await request(app).get('/api/reminders');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('?active=true returns only non-dismissed reminders', async () => {
    await request(app).post('/api/reminders').send({ title: 'Active', due_date: '2026-05-10' });
    const r2 = await request(app)
      .post('/api/reminders')
      .send({ title: 'Gone', due_date: '2026-05-10' });
    await request(app).post(`/api/reminders/${r2.body.id}/dismiss`);
    const res = await request(app).get('/api/reminders?active=true');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Active');
  });

  it('?date=YYYY-MM-DD filters by due_date', async () => {
    await request(app).post('/api/reminders').send({ title: 'Today', due_date: '2026-05-01' });
    await request(app).post('/api/reminders').send({ title: 'Later', due_date: '2026-05-10' });
    const res = await request(app).get('/api/reminders?date=2026-05-01');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Today');
  });
});

describe('POST /api/reminders', () => {
  it('creates a reminder and returns 201', async () => {
    const res = await request(app)
      .post('/api/reminders')
      .send({ title: 'Dentist', due_date: '2026-05-10' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.dismissed).toBe(false);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/reminders').send({ due_date: '2026-05-10' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when due_date is missing', async () => {
    const res = await request(app).post('/api/reminders').send({ title: 'Dentist' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/reminders/:id', () => {
  it('updates a reminder', async () => {
    const created = await request(app)
      .post('/api/reminders')
      .send({ title: 'Old', due_date: '2026-05-10' });
    const res = await request(app).put(`/api/reminders/${created.body.id}`).send({ title: 'New' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).put('/api/reminders/999').send({ title: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/reminders/:id', () => {
  it('deletes a reminder and returns 204', async () => {
    const created = await request(app)
      .post('/api/reminders')
      .send({ title: 'Del', due_date: '2026-05-10' });
    const res = await request(app).delete(`/api/reminders/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).delete('/api/reminders/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/reminders/:id/dismiss', () => {
  it('dismisses a reminder', async () => {
    const created = await request(app)
      .post('/api/reminders')
      .send({ title: 'Dentist', due_date: '2026-05-10' });
    const res = await request(app).post(`/api/reminders/${created.body.id}/dismiss`);
    expect(res.status).toBe(200);
    expect(res.body.dismissed).toBe(true);
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).post('/api/reminders/999/dismiss');
    expect(res.status).toBe(404);
  });
});
