import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema, runMigrations } from '../../../src/server/db/schema.js';
import { createApp } from '../../../src/server/app.js';
import { setSetting } from '../../../src/server/models/settings.js';
import { seedCleaningDefaults } from '../../../src/server/models/cleaning.js';

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

describe('GET /api/cleaning', () => {
  it('returns board with empty arrays when no data seeded', async () => {
    const res = await request(app).get('/api/cleaning');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('activeZone');
    expect(res.body).toHaveProperty('zoneTasks');
    expect(res.body).toHaveProperty('focusTasks');
    expect(res.body).toHaveProperty('morningTasks');
    expect(res.body).toHaveProperty('beforeBedTasks');
    expect(res.body).toHaveProperty('homesteadTasks');
    expect(res.body).toHaveProperty('todayFocus');
  });

  it('seeds defaults on first call and returns a board with tasks', async () => {
    const res = await request(app).get('/api/cleaning');
    expect(res.status).toBe(200);
    expect(res.body.morningTasks.length).toBeGreaterThan(0);
    expect(res.body.zoneTasks.length).toBeGreaterThan(0);
    expect(res.body.activeZone).not.toBeNull();
    expect(res.body.activeZone.name).toBe('Sunroom & entry');
  });

  it('returns boolean completed field on tasks', async () => {
    const res = await request(app).get('/api/cleaning');
    expect(res.body.morningTasks[0].completed).toBe(false);
  });
});

describe('POST /api/cleaning/tasks/:id/complete', () => {
  it('marks a task complete', async () => {
    const boardRes = await request(app).get('/api/cleaning');
    const taskId = boardRes.body.morningTasks[0].id;

    const res = await request(app).post(`/api/cleaning/tasks/${taskId}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
    expect(res.body.completed_at).not.toBeNull();
  });

  it('returns 404 for non-existent task', async () => {
    const res = await request(app).post('/api/cleaning/tasks/99999/complete');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/cleaning/tasks/:id/uncomplete', () => {
  it('clears completion on a task', async () => {
    const boardRes = await request(app).get('/api/cleaning');
    const taskId = boardRes.body.morningTasks[0].id;

    await request(app).post(`/api/cleaning/tasks/${taskId}/complete`);
    const res = await request(app).post(`/api/cleaning/tasks/${taskId}/uncomplete`);
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(false);
    expect(res.body.completed_at).toBeNull();
  });
});

describe('PIN-protected cleaning management', () => {
  it('GET /api/cleaning/zones returns all zones (requires pin)', async () => {
    seedCleaningDefaults(db);
    const res = await request(app).get('/api/cleaning/zones').set('x-pin', '1234');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(4);
  });

  it('GET /api/cleaning/zones returns 401 without pin', async () => {
    const res = await request(app).get('/api/cleaning/zones');
    expect(res.status).toBe(401);
  });

  it('POST /api/cleaning/zones creates a zone', async () => {
    const res = await request(app)
      .post('/api/cleaning/zones')
      .set('x-pin', '1234')
      .send({ name: 'Garage', position: 0 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Garage');
  });

  it('PUT /api/cleaning/zones/:id updates a zone', async () => {
    seedCleaningDefaults(db);
    const zonesRes = await request(app).get('/api/cleaning/zones').set('x-pin', '1234');
    const zoneId = zonesRes.body[0].id;

    const res = await request(app)
      .put(`/api/cleaning/zones/${zoneId}`)
      .set('x-pin', '1234')
      .send({ name: 'Updated Zone' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Zone');
  });

  it('DELETE /api/cleaning/zones/:id deletes a zone', async () => {
    const createRes = await request(app)
      .post('/api/cleaning/zones')
      .set('x-pin', '1234')
      .send({ name: 'Temp', position: 0 });
    const zoneId = createRes.body.id;

    const res = await request(app).delete(`/api/cleaning/zones/${zoneId}`).set('x-pin', '1234');
    expect(res.status).toBe(204);
  });

  it('POST /api/cleaning/tasks creates a task', async () => {
    seedCleaningDefaults(db);
    const res = await request(app).post('/api/cleaning/tasks').set('x-pin', '1234').send({
      section: 'daily',
      zone_id: null,
      day_of_week: null,
      group_label: 'morning',
      title: 'New task',
      position: 99,
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New task');
  });

  it('DELETE /api/cleaning/tasks/:id deletes a task', async () => {
    const boardRes = await request(app).get('/api/cleaning');
    const taskId = boardRes.body.morningTasks[0].id;

    const res = await request(app).delete(`/api/cleaning/tasks/${taskId}`).set('x-pin', '1234');
    expect(res.status).toBe(204);
  });

  it('PUT /api/cleaning/flight-plan updates flight plan labels', async () => {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const res = await request(app)
      .put('/api/cleaning/flight-plan')
      .set('x-pin', '1234')
      .send({ labels });
    expect(res.status).toBe(200);
    expect(res.body.labels).toEqual(labels);
  });

  it('PUT /api/cleaning/flight-plan returns 400 when not exactly 7 labels', async () => {
    const res = await request(app)
      .put('/api/cleaning/flight-plan')
      .set('x-pin', '1234')
      .send({ labels: ['A', 'B'] });
    expect(res.status).toBe(400);
  });
});
