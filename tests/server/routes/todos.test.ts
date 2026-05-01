import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import { createApp } from '../../../src/server/app.js';

let db: Database.Database;
let app: Express;
let userId: number;

beforeEach(async () => {
  db = createDb(':memory:');
  runSchema(db);
  app = createApp(db);
  const res = await request(app).post('/api/users').send({ name: 'Alice', type: 'parent' });
  userId = res.body.id;
});

afterEach(() => {
  db.close();
});

describe('GET /api/todos', () => {
  it('returns 400 when userId is missing', async () => {
    const res = await request(app).get('/api/todos');
    expect(res.status).toBe(400);
  });

  it('returns empty array for user with no todos', async () => {
    const res = await request(app).get(`/api/todos?userId=${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns todos for the given user', async () => {
    await request(app).post('/api/todos').send({ user_id: userId, title: 'Buy milk' });
    const res = await request(app).get(`/api/todos?userId=${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Buy milk');
  });
});

describe('POST /api/todos', () => {
  it('creates a todo and returns 201', async () => {
    const res = await request(app).post('/api/todos').send({ user_id: userId, title: 'Buy milk' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.completed).toBe(false);
    expect(res.body.is_recurring).toBe(false);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/todos').send({ user_id: userId });
    expect(res.status).toBe(400);
  });

  it('creates a recurring todo', async () => {
    const res = await request(app).post('/api/todos').send({
      user_id: userId,
      title: 'Daily standup',
      is_recurring: true,
      recurrence_rule: 'daily',
    });
    expect(res.status).toBe(201);
    expect(res.body.is_recurring).toBe(true);
    expect(res.body.recurrence_rule).toBe('daily');
  });
});

describe('PUT /api/todos/:id', () => {
  it('updates a todo', async () => {
    const created = await request(app).post('/api/todos').send({ user_id: userId, title: 'Old' });
    const res = await request(app).put(`/api/todos/${created.body.id}`).send({ title: 'New' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).put('/api/todos/999').send({ title: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/todos/:id', () => {
  it('deletes a todo and returns 204', async () => {
    const created = await request(app).post('/api/todos').send({ user_id: userId, title: 'Del' });
    const res = await request(app).delete(`/api/todos/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).delete('/api/todos/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/todos/:id/complete', () => {
  it('marks a todo as completed', async () => {
    const created = await request(app).post('/api/todos').send({ user_id: userId, title: 'T' });
    const res = await request(app).post(`/api/todos/${created.body.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
    expect(res.body.completed_at).toBeTypeOf('string');
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).post('/api/todos/999/complete');
    expect(res.status).toBe(404);
  });
});
