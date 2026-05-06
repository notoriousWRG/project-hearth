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

describe('GET /api/grocery', () => {
  it('returns empty array initially', async () => {
    const res = await request(app).get('/api/grocery');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/grocery', () => {
  it('creates an item and returns 201', async () => {
    const res = await request(app)
      .post('/api/grocery')
      .send({ name: 'Apples', category: 'produce' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.checked).toBe(false);
    expect(res.body.source).toBe('manual');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/grocery').send({ category: 'produce' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/grocery/:id', () => {
  it('updates an item', async () => {
    const created = await request(app).post('/api/grocery').send({ name: 'Apples' });
    const res = await request(app).put(`/api/grocery/${created.body.id}`).send({ name: 'Bananas' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Bananas');
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).put('/api/grocery/999').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/grocery/:id', () => {
  it('deletes an item and returns 204', async () => {
    const created = await request(app).post('/api/grocery').send({ name: 'Apples' });
    const res = await request(app).delete(`/api/grocery/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).delete('/api/grocery/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/grocery/clear-checked', () => {
  it('removes all checked items and returns count', async () => {
    await request(app).post('/api/grocery').send({ name: 'Apples' });
    const item2 = await request(app).post('/api/grocery').send({ name: 'Milk' });
    await request(app).patch(`/api/grocery/${item2.body.id}/check`).send({ checked: true });
    const res = await request(app).post('/api/grocery/clear-checked');
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(1);
    const remaining = await request(app).get('/api/grocery');
    expect(remaining.body).toHaveLength(1);
  });
});

describe('GET /api/grocery/export', () => {
  it('returns 400 when format is missing', async () => {
    const res = await request(app).get('/api/grocery/export');
    expect(res.status).toBe(400);
  });

  it('returns 400 for unsupported format', async () => {
    const res = await request(app).get('/api/grocery/export?format=json');
    expect(res.status).toBe(400);
  });

  it('returns empty text when no unchecked items', async () => {
    const res = await request(app).get('/api/grocery/export?format=text');
    expect(res.status).toBe(200);
    expect(res.body.text).toBe('');
  });

  it('groups unchecked items by category', async () => {
    await request(app).post('/api/grocery').send({ name: 'Apples', category: 'produce' });
    await request(app).post('/api/grocery').send({ name: 'Milk', category: 'dairy' });
    await request(app).post('/api/grocery').send({ name: 'Bread', category: 'pantry' });
    const res = await request(app).get('/api/grocery/export?format=text');
    expect(res.status).toBe(200);
    expect(res.body.text).toContain('Produce');
    expect(res.body.text).toContain('- Apples');
    expect(res.body.text).toContain('Dairy');
    expect(res.body.text).toContain('- Milk');
    expect(res.body.text).toContain('Pantry');
    expect(res.body.text).toContain('- Bread');
  });

  it('excludes checked items from export', async () => {
    const item = await request(app).post('/api/grocery').send({ name: 'Eggs', category: 'dairy' });
    await request(app).patch(`/api/grocery/${item.body.id}/check`).send({ checked: true });
    await request(app).post('/api/grocery').send({ name: 'Milk', category: 'dairy' });
    const res = await request(app).get('/api/grocery/export?format=text');
    expect(res.body.text).toContain('- Milk');
    expect(res.body.text).not.toContain('Eggs');
  });
});

describe('PATCH /api/grocery/:id/check', () => {
  it('marks item as checked', async () => {
    const created = await request(app).post('/api/grocery').send({ name: 'Apples' });
    const res = await request(app)
      .patch(`/api/grocery/${created.body.id}/check`)
      .send({ checked: true });
    expect(res.status).toBe(200);
    expect(res.body.checked).toBe(true);
  });

  it('returns 400 when checked is missing', async () => {
    const created = await request(app).post('/api/grocery').send({ name: 'Apples' });
    const res = await request(app).patch(`/api/grocery/${created.body.id}/check`).send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).patch('/api/grocery/999/check').send({ checked: true });
    expect(res.status).toBe(404);
  });
});
