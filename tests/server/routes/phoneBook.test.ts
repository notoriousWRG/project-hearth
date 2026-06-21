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
  setSetting(db, 'pin', '1234');
});

afterEach(() => {
  db.close();
});

describe('GET /api/phone-book', () => {
  it('returns empty array initially', async () => {
    const res = await request(app).get('/api/phone-book');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns created entries', async () => {
    await request(app)
      .post('/api/phone-book')
      .set('x-pin', '1234')
      .send({ name: 'Grandma', phone: '555-1234', emoji: '👵' });
    const res = await request(app).get('/api/phone-book');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Grandma');
  });
});

describe('POST /api/phone-book', () => {
  it('creates an entry with valid PIN', async () => {
    const res = await request(app)
      .post('/api/phone-book')
      .set('x-pin', '1234')
      .send({ name: 'Dad', phone: '555-9999', emoji: '👨' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Dad');
    expect(res.body.phone).toBe('555-9999');
    expect(res.body.emoji).toBe('👨');
  });

  it('rejects without PIN', async () => {
    const res = await request(app).post('/api/phone-book').send({ name: 'Dad', phone: '555-9999' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/phone-book')
      .set('x-pin', '1234')
      .send({ phone: '555-9999' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/phone-book/:id', () => {
  it('updates an entry', async () => {
    const created = await request(app)
      .post('/api/phone-book')
      .set('x-pin', '1234')
      .send({ name: 'Old', phone: '111', emoji: '' });
    const res = await request(app)
      .put(`/api/phone-book/${created.body.id}`)
      .set('x-pin', '1234')
      .send({ name: 'New', phone: '222' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .put('/api/phone-book/9999')
      .set('x-pin', '1234')
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('rejects without PIN', async () => {
    const res = await request(app).put('/api/phone-book/1').send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/phone-book/:id', () => {
  it('deletes an entry', async () => {
    const created = await request(app)
      .post('/api/phone-book')
      .set('x-pin', '1234')
      .send({ name: 'Gone', phone: '000', emoji: '' });
    const res = await request(app)
      .delete(`/api/phone-book/${created.body.id}`)
      .set('x-pin', '1234');
    expect(res.status).toBe(204);
    const list = await request(app).get('/api/phone-book');
    expect(list.body).toHaveLength(0);
  });

  it('rejects without PIN', async () => {
    const res = await request(app).delete('/api/phone-book/1');
    expect(res.status).toBe(401);
  });
});
