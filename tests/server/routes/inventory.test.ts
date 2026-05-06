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

describe('GET /api/inventory', () => {
  it('returns empty array initially', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('filters by location', async () => {
    await request(app)
      .post('/api/inventory')
      .send({ name: 'Milk', category: 'dairy', location: 'icebox', notes: '' });
    await request(app)
      .post('/api/inventory')
      .send({ name: 'Rice', category: 'pantry', location: 'pantry', notes: '' });
    const res = await request(app).get('/api/inventory?location=icebox');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Milk');
  });

  it('returns all items when no location filter', async () => {
    await request(app)
      .post('/api/inventory')
      .send({ name: 'Milk', category: 'dairy', location: 'icebox', notes: '' });
    await request(app)
      .post('/api/inventory')
      .send({ name: 'Rice', category: 'pantry', location: 'pantry', notes: '' });
    const res = await request(app).get('/api/inventory');
    expect(res.body).toHaveLength(2);
  });
});

describe('POST /api/inventory', () => {
  it('creates an item and returns 201', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .send({ name: 'Milk', category: 'dairy', location: 'icebox', notes: '' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.name).toBe('Milk');
    expect(res.body.location).toBe('icebox');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .send({ category: 'dairy', location: 'icebox', notes: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when location is missing', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .send({ name: 'Milk', category: 'dairy', notes: '' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when (name, location) pair already exists', async () => {
    await request(app)
      .post('/api/inventory')
      .send({ name: 'Milk', category: 'dairy', location: 'icebox', notes: '' });
    const res = await request(app)
      .post('/api/inventory')
      .send({ name: 'Milk', category: 'dairy', location: 'icebox', notes: '' });
    expect(res.status).toBe(409);
  });

  it('allows same name in different locations', async () => {
    await request(app)
      .post('/api/inventory')
      .send({ name: 'Butter', category: 'dairy', location: 'icebox', notes: '' });
    const res = await request(app)
      .post('/api/inventory')
      .send({ name: 'Butter', category: 'dairy', location: 'pantry', notes: '' });
    expect(res.status).toBe(201);
  });
});

describe('PUT /api/inventory/:id', () => {
  it('updates an item', async () => {
    const created = await request(app)
      .post('/api/inventory')
      .send({ name: 'Milk', category: 'dairy', location: 'icebox', notes: '' });
    const res = await request(app)
      .put(`/api/inventory/${created.body.id}`)
      .send({ notes: 'organic' });
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('organic');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).put('/api/inventory/999').send({ notes: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/inventory/:id', () => {
  it('deletes an item and returns 204', async () => {
    const created = await request(app)
      .post('/api/inventory')
      .send({ name: 'Milk', category: 'dairy', location: 'icebox', notes: '' });
    const res = await request(app).delete(`/api/inventory/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).delete('/api/inventory/999');
    expect(res.status).toBe(404);
  });
});
