import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import {
  getAllGroceryItems,
  getGroceryItemById,
  createGroceryItem,
  updateGroceryItem,
  deleteGroceryItem,
  checkItem,
  clearCheckedItems,
  getItemsBySource,
  getItemsByMealPlan,
} from '../../../src/server/models/grocery.js';
import { upsertMeal } from '../../../src/server/models/meals.js';

let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
});

afterEach(() => {
  db.close();
});

const baseItem = {
  name: 'Apples',
  category: 'produce' as const,
  checked: false,
  source: 'manual' as const,
  meal_plan_id: null,
};

describe('grocery model', () => {
  it('getAllGroceryItems returns empty initially', () => {
    expect(getAllGroceryItems(db)).toEqual([]);
  });

  it('createGroceryItem returns item with id and boolean fields', () => {
    const item = createGroceryItem(db, baseItem);
    expect(item.id).toBeTypeOf('number');
    expect(item.checked).toBe(false);
    expect(item.meal_plan_id).toBeNull();
  });

  it('getGroceryItemById returns undefined for missing id', () => {
    expect(getGroceryItemById(db, 999)).toBeUndefined();
  });

  it('updateGroceryItem modifies fields', () => {
    const item = createGroceryItem(db, baseItem);
    const updated = updateGroceryItem(db, item.id, { name: 'Bananas' });
    expect(updated?.name).toBe('Bananas');
  });

  it('updateGroceryItem returns undefined for missing id', () => {
    expect(updateGroceryItem(db, 999, { name: 'X' })).toBeUndefined();
  });

  it('deleteGroceryItem removes item and returns true', () => {
    const item = createGroceryItem(db, baseItem);
    expect(deleteGroceryItem(db, item.id)).toBe(true);
    expect(getGroceryItemById(db, item.id)).toBeUndefined();
  });

  it('deleteGroceryItem returns false for missing id', () => {
    expect(deleteGroceryItem(db, 999)).toBe(false);
  });

  it('checkItem sets checked=true', () => {
    const item = createGroceryItem(db, baseItem);
    const checked = checkItem(db, item.id, true);
    expect(checked?.checked).toBe(true);
  });

  it('checkItem sets checked=false', () => {
    const item = createGroceryItem(db, { ...baseItem, checked: true });
    const unchecked = checkItem(db, item.id, false);
    expect(unchecked?.checked).toBe(false);
  });

  it('clearCheckedItems removes all checked items and returns count', () => {
    createGroceryItem(db, { ...baseItem, checked: true });
    createGroceryItem(db, { ...baseItem, checked: true, name: 'Milk' });
    createGroceryItem(db, { ...baseItem, name: 'Bread' });
    const count = clearCheckedItems(db);
    expect(count).toBe(2);
    expect(getAllGroceryItems(db)).toHaveLength(1);
  });

  it('getItemsBySource filters by manual', () => {
    createGroceryItem(db, { ...baseItem, source: 'manual' });
    createGroceryItem(db, { ...baseItem, source: 'meal_plan', name: 'Flour' });
    expect(getItemsBySource(db, 'manual')).toHaveLength(1);
    expect(getItemsBySource(db, 'meal_plan')).toHaveLength(1);
  });

  it('getItemsByMealPlan filters by meal_plan_id', () => {
    const m1 = upsertMeal(db, {
      week_start_date: '2026-04-27',
      day_of_week: 1,
      meal_type: 'dinner',
      description: 'Pasta',
    });
    const m2 = upsertMeal(db, {
      week_start_date: '2026-04-27',
      day_of_week: 2,
      meal_type: 'lunch',
      description: 'Soup',
    });
    createGroceryItem(db, { ...baseItem, source: 'meal_plan', meal_plan_id: m1.id });
    createGroceryItem(db, { ...baseItem, source: 'meal_plan', meal_plan_id: m2.id });
    createGroceryItem(db, baseItem);
    expect(getItemsByMealPlan(db, m1.id)).toHaveLength(1);
    expect(getItemsByMealPlan(db, m2.id)).toHaveLength(1);
  });
});
