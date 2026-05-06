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

describe('GET /api/meals', () => {
  it('returns empty array initially', async () => {
    const res = await request(app).get('/api/meals');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns list without ingredients', async () => {
    await request(app).post('/api/meals').send({ name: 'Pasta' });
    const res = await request(app).get('/api/meals');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Pasta');
    expect(res.body[0].ingredients).toBeUndefined();
  });

  it('returns meals sorted by name', async () => {
    await request(app).post('/api/meals').send({ name: 'Tacos' });
    await request(app).post('/api/meals').send({ name: 'Pasta' });
    const res = await request(app).get('/api/meals');
    expect(res.body[0].name).toBe('Pasta');
    expect(res.body[1].name).toBe('Tacos');
  });
});

describe('GET /api/meals/:id', () => {
  it('returns a meal with ingredients', async () => {
    const created = await request(app)
      .post('/api/meals')
      .send({ name: 'Pasta', ingredients: [{ name: 'pasta', category: 'pantry', position: 0 }] });
    const res = await request(app).get(`/api/meals/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Pasta');
    expect(res.body.ingredients).toHaveLength(1);
    expect(res.body.ingredients[0].name).toBe('pasta');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/meals/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/meals', () => {
  it('creates a meal and returns 201', async () => {
    const res = await request(app).post('/api/meals').send({ name: 'Pasta' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.name).toBe('Pasta');
    expect(res.body.ingredients).toEqual([]);
  });

  it('creates a meal with ingredients', async () => {
    const res = await request(app)
      .post('/api/meals')
      .send({
        name: 'Pasta',
        ingredients: [
          { name: 'pasta', category: 'pantry', position: 0 },
          { name: 'tomato sauce', category: 'pantry', position: 1 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.ingredients).toHaveLength(2);
    expect(res.body.ingredients[1].name).toBe('tomato sauce');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/meals').send({});
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/meals/:id', () => {
  it('updates the name', async () => {
    const created = await request(app).post('/api/meals').send({ name: 'Pasta' });
    const res = await request(app).put(`/api/meals/${created.body.id}`).send({ name: 'Pizza' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Pizza');
  });

  it('replaces ingredients', async () => {
    const created = await request(app)
      .post('/api/meals')
      .send({
        name: 'Pasta',
        ingredients: [{ name: 'pasta', category: 'pantry', position: 0 }],
      });
    const res = await request(app)
      .put(`/api/meals/${created.body.id}`)
      .send({ ingredients: [{ name: 'rice', category: 'pantry', position: 0 }] });
    expect(res.status).toBe(200);
    expect(res.body.ingredients).toHaveLength(1);
    expect(res.body.ingredients[0].name).toBe('rice');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).put('/api/meals/999').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/meals/:id', () => {
  it('deletes a meal and returns 204', async () => {
    const created = await request(app).post('/api/meals').send({ name: 'Pasta' });
    const res = await request(app).delete(`/api/meals/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).delete('/api/meals/999');
    expect(res.status).toBe(404);
  });
});
