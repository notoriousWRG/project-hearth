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

describe('GET /api/users', () => {
  it('returns empty array initially', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all users', async () => {
    await request(app).post('/api/users').send({ name: 'Alice', type: 'parent' });
    await request(app).post('/api/users').send({ name: 'Bob', type: 'child' });
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Alice', type: 'parent', icon: '🌟' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.name).toBe('Alice');
    expect(res.body.type).toBe('parent');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/users').send({ type: 'parent' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when type is missing', async () => {
    const res = await request(app).post('/api/users').send({ name: 'Alice' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/users/:id', () => {
  it('updates a user', async () => {
    const created = await request(app).post('/api/users').send({ name: 'Alice', type: 'parent' });
    const res = await request(app).put(`/api/users/${created.body.id}`).send({ name: 'Alicia' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Alicia');
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).put('/api/users/999').send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/users/:id', () => {
  it('deletes a user and returns 204', async () => {
    const created = await request(app).post('/api/users').send({ name: 'Alice', type: 'parent' });
    const res = await request(app).delete(`/api/users/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).delete('/api/users/999');
    expect(res.status).toBe(404);
  });
});
