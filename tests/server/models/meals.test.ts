import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import {
  getMealsByWeek,
  getMealById,
  upsertMeal,
  deleteMeal,
  clearWeek,
} from '../../../src/server/models/meals.js';

let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
});

afterEach(() => {
  db.close();
});

const meal1 = {
  week_start_date: '2026-04-27',
  day_of_week: 1 as const,
  meal_type: 'dinner' as const,
  description: 'Pasta',
};

describe('meals model', () => {
  it('getMealsByWeek returns empty for unknown week', () => {
    expect(getMealsByWeek(db, '2026-04-27')).toEqual([]);
  });

  it('upsertMeal creates a new meal entry', () => {
    const entry = upsertMeal(db, meal1);
    expect(entry.id).toBeTypeOf('number');
    expect(entry.description).toBe('Pasta');
    expect(entry.day_of_week).toBe(1);
  });

  it('upsertMeal replaces existing entry for same slot', () => {
    upsertMeal(db, meal1);
    const updated = upsertMeal(db, { ...meal1, description: 'Pizza' });
    const meals = getMealsByWeek(db, '2026-04-27');
    expect(meals).toHaveLength(1);
    expect(updated.description).toBe('Pizza');
  });

  it('getMealsByWeek returns all meals for the week', () => {
    upsertMeal(db, meal1);
    upsertMeal(db, {
      week_start_date: '2026-04-27',
      day_of_week: 2,
      meal_type: 'lunch',
      description: 'Soup',
    });
    expect(getMealsByWeek(db, '2026-04-27')).toHaveLength(2);
  });

  it('getMealsByWeek does not return meals from other weeks', () => {
    upsertMeal(db, meal1);
    upsertMeal(db, { ...meal1, week_start_date: '2026-05-04' });
    expect(getMealsByWeek(db, '2026-04-27')).toHaveLength(1);
  });

  it('getMealById returns undefined for missing id', () => {
    expect(getMealById(db, 999)).toBeUndefined();
  });

  it('deleteMeal removes the entry and returns true', () => {
    const entry = upsertMeal(db, meal1);
    expect(deleteMeal(db, entry.id)).toBe(true);
    expect(getMealById(db, entry.id)).toBeUndefined();
  });

  it('deleteMeal returns false for missing id', () => {
    expect(deleteMeal(db, 999)).toBe(false);
  });

  it('clearWeek removes all meals for the week and returns count', () => {
    upsertMeal(db, meal1);
    upsertMeal(db, {
      week_start_date: '2026-04-27',
      day_of_week: 2,
      meal_type: 'lunch',
      description: 'Soup',
    });
    const count = clearWeek(db, '2026-04-27');
    expect(count).toBe(2);
    expect(getMealsByWeek(db, '2026-04-27')).toHaveLength(0);
  });
});
