import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema, runMigrations } from '../../../src/server/db/schema.js';
import {
  createMeal,
  getAllMeals,
  getMealById,
  updateMeal,
  deleteMeal,
  findMealByName,
  setIngredients,
} from '../../../src/server/models/savedMeals.js';

let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

describe('savedMeals model', () => {
  describe('createMeal', () => {
    it('returns a Meal with empty ingredients', () => {
      const meal = createMeal(db, { name: 'Pasta' });
      expect(meal.id).toBeTypeOf('number');
      expect(meal.name).toBe('Pasta');
      expect(meal.created_at).toBeTypeOf('string');
      expect(meal.ingredients).toEqual([]);
    });

    it('throws on duplicate name (case-insensitive)', () => {
      createMeal(db, { name: 'Pasta' });
      expect(() => createMeal(db, { name: 'pasta' })).toThrow();
    });
  });

  describe('getAllMeals', () => {
    it('returns empty array when no meals exist', () => {
      expect(getAllMeals(db)).toEqual([]);
    });

    it('returns all meals alphabetically', () => {
      createMeal(db, { name: 'Tacos' });
      createMeal(db, { name: 'Pasta' });
      createMeal(db, { name: 'Soup' });
      const meals = getAllMeals(db);
      expect(meals.map((m) => m.name)).toEqual(['Pasta', 'Soup', 'Tacos']);
    });

    it('returns meals with empty ingredients arrays', () => {
      createMeal(db, { name: 'Pasta' });
      const meals = getAllMeals(db);
      expect(meals[0].ingredients).toEqual([]);
    });
  });

  describe('getMealById', () => {
    it('returns undefined for missing id', () => {
      expect(getMealById(db, 999)).toBeUndefined();
    });

    it('returns meal with hydrated ingredients', () => {
      const created = createMeal(db, { name: 'Tacos' });
      setIngredients(db, created.id, [
        { name: 'Ground beef', category: 'protein', position: 0 },
        { name: 'Tortillas', category: 'pantry', position: 1 },
      ]);
      const meal = getMealById(db, created.id);
      expect(meal).toBeDefined();
      expect(meal!.ingredients).toHaveLength(2);
      expect(meal!.ingredients[0].name).toBe('Ground beef');
      expect(meal!.ingredients[1].name).toBe('Tortillas');
    });
  });

  describe('updateMeal', () => {
    it('changes the name', () => {
      const meal = createMeal(db, { name: 'Pasta' });
      const updated = updateMeal(db, meal.id, { name: 'Spaghetti' });
      expect(updated?.name).toBe('Spaghetti');
    });

    it('returns undefined for missing id', () => {
      expect(updateMeal(db, 999, { name: 'X' })).toBeUndefined();
    });
  });

  describe('deleteMeal', () => {
    it('removes the meal and returns true', () => {
      const meal = createMeal(db, { name: 'Pasta' });
      expect(deleteMeal(db, meal.id)).toBe(true);
      expect(getMealById(db, meal.id)).toBeUndefined();
    });

    it('cascades to ingredients', () => {
      const meal = createMeal(db, { name: 'Tacos' });
      setIngredients(db, meal.id, [{ name: 'Beef', category: 'protein', position: 0 }]);
      deleteMeal(db, meal.id);
      const rows = db.prepare('SELECT * FROM meal_ingredients WHERE meal_id = ?').all(meal.id);
      expect(rows).toHaveLength(0);
    });

    it('returns false for missing id', () => {
      expect(deleteMeal(db, 999)).toBe(false);
    });
  });

  describe('findMealByName', () => {
    it('finds a meal by exact name', () => {
      createMeal(db, { name: 'Pasta' });
      expect(findMealByName(db, 'Pasta')).toBeDefined();
    });

    it('is case-insensitive', () => {
      createMeal(db, { name: 'Pasta' });
      expect(findMealByName(db, 'PASTA')).toBeDefined();
      expect(findMealByName(db, 'pasta')).toBeDefined();
    });

    it('returns undefined when not found', () => {
      expect(findMealByName(db, 'Noodles')).toBeUndefined();
    });
  });
});

describe('setIngredients', () => {
  it('stores ingredients ordered by position', () => {
    const meal = createMeal(db, { name: 'Pasta' });
    setIngredients(db, meal.id, [
      { name: 'Noodles', category: 'pantry', position: 1 },
      { name: 'Tomato sauce', category: 'pantry', position: 0 },
    ]);
    const fetched = getMealById(db, meal.id);
    expect(fetched!.ingredients[0].name).toBe('Tomato sauce');
    expect(fetched!.ingredients[1].name).toBe('Noodles');
  });

  it('replaces all existing ingredients on second call', () => {
    const meal = createMeal(db, { name: 'Pasta' });
    setIngredients(db, meal.id, [{ name: 'Noodles', category: 'pantry', position: 0 }]);
    setIngredients(db, meal.id, [{ name: 'Rice', category: 'pantry', position: 0 }]);
    const fetched = getMealById(db, meal.id);
    expect(fetched!.ingredients).toHaveLength(1);
    expect(fetched!.ingredients[0].name).toBe('Rice');
  });

  it('clears all ingredients when called with empty array', () => {
    const meal = createMeal(db, { name: 'Pasta' });
    setIngredients(db, meal.id, [{ name: 'Noodles', category: 'pantry', position: 0 }]);
    setIngredients(db, meal.id, []);
    const fetched = getMealById(db, meal.id);
    expect(fetched!.ingredients).toHaveLength(0);
  });
});
