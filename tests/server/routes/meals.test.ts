import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import type { Express } from 'express';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import { createApp } from '../../../src/server/app.js';

let db: Database.Database;
let app: Express;

const week = '2026-04-27';

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  app = createApp(db);
});

afterEach(() => {
  db.close();
});

describe('GET /api/meal-plan', () => {
  it('returns 400 when week is missing', async () => {
    const res = await request(app).get('/api/meal-plan');
    expect(res.status).toBe(400);
  });

  it('returns empty array for unknown week', async () => {
    const res = await request(app).get(`/api/meal-plan?week=${week}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns meals for the week', async () => {
    await request(app)
      .put('/api/meal-plan')
      .send({ week_start_date: week, day_of_week: 1, meal_type: 'dinner', description: 'Pasta' });
    const res = await request(app).get(`/api/meal-plan?week=${week}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].description).toBe('Pasta');
  });
});

describe('PUT /api/meal-plan', () => {
  it('creates a meal entry', async () => {
    const res = await request(app)
      .put('/api/meal-plan')
      .send({ week_start_date: week, day_of_week: 1, meal_type: 'dinner', description: 'Pasta' });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Pasta');
  });

  it('replaces an existing slot', async () => {
    await request(app)
      .put('/api/meal-plan')
      .send({ week_start_date: week, day_of_week: 1, meal_type: 'dinner', description: 'Pasta' });
    const res = await request(app)
      .put('/api/meal-plan')
      .send({ week_start_date: week, day_of_week: 1, meal_type: 'dinner', description: 'Pizza' });
    expect(res.body.description).toBe('Pizza');
    const meals = await request(app).get(`/api/meal-plan?week=${week}`);
    expect(meals.body).toHaveLength(1);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).put('/api/meal-plan').send({ week_start_date: week });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/meal-plan/:id', () => {
  it('deletes a meal and returns 204', async () => {
    const created = await request(app)
      .put('/api/meal-plan')
      .send({ week_start_date: week, day_of_week: 1, meal_type: 'dinner', description: 'Pasta' });
    const res = await request(app).delete(`/api/meal-plan/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for missing id', async () => {
    const res = await request(app).delete('/api/meal-plan/999');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/meal-plan — meal_id hydration', () => {
  it('hydrates description from saved meal name when meal_id is provided', async () => {
    const meal = await request(app).post('/api/meals').send({ name: 'Tacos' });
    const res = await request(app).put('/api/meal-plan').send({
      week_start_date: week,
      day_of_week: 3,
      meal_type: 'dinner',
      meal_id: meal.body.id,
    });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Tacos');
    expect(res.body.meal_id).toBe(meal.body.id);
  });

  it('uses provided description when no meal_id given', async () => {
    const res = await request(app).put('/api/meal-plan').send({
      week_start_date: week,
      day_of_week: 3,
      meal_type: 'dinner',
      description: 'Freetext dinner',
    });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Freetext dinner');
    expect(res.body.meal_id).toBeNull();
  });
});

describe('POST /api/meal-plan/generate-grocery', () => {
  it('returns 400 when week is missing', async () => {
    const res = await request(app).post('/api/meal-plan/generate-grocery').send({});
    expect(res.status).toBe(400);
  });

  it('saved-meal plan: aggregates ingredients, one row per unique name', async () => {
    const meal = await request(app)
      .post('/api/meals')
      .send({
        name: 'Pasta',
        ingredients: [
          { name: 'pasta', category: 'pantry', position: 0 },
          { name: 'tomato sauce', category: 'pantry', position: 1 },
        ],
      });
    await request(app).put('/api/meal-plan').send({
      week_start_date: week,
      day_of_week: 1,
      meal_type: 'dinner',
      meal_id: meal.body.id,
    });
    const res = await request(app).post('/api/meal-plan/generate-grocery').send({ week });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].source).toBe('meal_plan');
    expect(res.body[0].meal_plan_id).toBeNull();
  });

  it('skips ingredients already in pantry', async () => {
    await request(app)
      .post('/api/inventory')
      .send({ name: 'pasta', category: 'pantry', location: 'pantry', notes: '' });
    const meal = await request(app)
      .post('/api/meals')
      .send({
        name: 'Pasta',
        ingredients: [
          { name: 'pasta', category: 'pantry', position: 0 },
          { name: 'tomato sauce', category: 'pantry', position: 1 },
        ],
      });
    await request(app).put('/api/meal-plan').send({
      week_start_date: week,
      day_of_week: 1,
      meal_type: 'dinner',
      meal_id: meal.body.id,
    });
    const res = await request(app).post('/api/meal-plan/generate-grocery').send({ week });
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('tomato sauce');
  });

  it('skips ingredients already in icebox', async () => {
    await request(app)
      .post('/api/inventory')
      .send({ name: 'chicken', category: 'protein', location: 'icebox', notes: '' });
    const meal = await request(app)
      .post('/api/meals')
      .send({
        name: 'Chicken Rice',
        ingredients: [
          { name: 'chicken', category: 'protein', position: 0 },
          { name: 'rice', category: 'pantry', position: 1 },
        ],
      });
    await request(app).put('/api/meal-plan').send({
      week_start_date: week,
      day_of_week: 1,
      meal_type: 'dinner',
      meal_id: meal.body.id,
    });
    const res = await request(app).post('/api/meal-plan/generate-grocery').send({ week });
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('rice');
  });

  it('deduplicates same ingredient appearing in two meals', async () => {
    const meal1 = await request(app)
      .post('/api/meals')
      .send({
        name: 'Pasta',
        ingredients: [{ name: 'garlic', category: 'produce', position: 0 }],
      });
    const meal2 = await request(app)
      .post('/api/meals')
      .send({
        name: 'Stir Fry',
        ingredients: [{ name: 'garlic', category: 'produce', position: 0 }],
      });
    await request(app).put('/api/meal-plan').send({
      week_start_date: week,
      day_of_week: 1,
      meal_type: 'dinner',
      meal_id: meal1.body.id,
    });
    await request(app).put('/api/meal-plan').send({
      week_start_date: week,
      day_of_week: 2,
      meal_type: 'dinner',
      meal_id: meal2.body.id,
    });
    const res = await request(app).post('/api/meal-plan/generate-grocery').send({ week });
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('garlic');
  });

  it('does not add ingredient already on shopping list (unchecked)', async () => {
    await request(app).post('/api/grocery').send({ name: 'onion', category: 'produce' });
    const meal = await request(app)
      .post('/api/meals')
      .send({
        name: 'Soup',
        ingredients: [{ name: 'onion', category: 'produce', position: 0 }],
      });
    await request(app).put('/api/meal-plan').send({
      week_start_date: week,
      day_of_week: 1,
      meal_type: 'lunch',
      meal_id: meal.body.id,
    });
    const res = await request(app).post('/api/meal-plan/generate-grocery').send({ week });
    expect(res.body).toHaveLength(0);
  });

  it('legacy freetext entry (no meal_id) produces one grocery item', async () => {
    await request(app).put('/api/meal-plan').send({
      week_start_date: week,
      day_of_week: 1,
      meal_type: 'dinner',
      description: 'Leftovers',
    });
    const res = await request(app).post('/api/meal-plan/generate-grocery').send({ week });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Leftovers');
    expect(res.body[0].category).toBe('other');
  });
});
