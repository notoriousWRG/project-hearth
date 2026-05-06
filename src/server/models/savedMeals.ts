import type Database from 'better-sqlite3';
import type { Meal, MealIngredient, NewMeal, NewMealIngredient } from '../../shared/types.js';

type RawMeal = { id: number; name: string; created_at: string };
type RawIngredient = {
  id: number;
  meal_id: number;
  name: string;
  category: string;
  position: number;
};

function mapIngredient(row: RawIngredient): MealIngredient {
  return {
    id: row.id,
    meal_id: row.meal_id,
    name: row.name,
    category: row.category as MealIngredient['category'],
    position: row.position,
  };
}

function getIngredientRows(db: Database.Database, mealId: number): MealIngredient[] {
  const rows = db
    .prepare('SELECT * FROM meal_ingredients WHERE meal_id = ? ORDER BY position')
    .all(mealId) as RawIngredient[];
  return rows.map(mapIngredient);
}

function mapMeal(db: Database.Database, row: RawMeal): Meal {
  return {
    id: row.id,
    name: row.name,
    created_at: row.created_at,
    ingredients: getIngredientRows(db, row.id),
  };
}

export function createMeal(db: Database.Database, data: NewMeal): Meal {
  const row = db
    .prepare(`INSERT INTO meals (name) VALUES (?) RETURNING *`)
    .get(data.name) as RawMeal;
  return mapMeal(db, row);
}

export function getAllMeals(db: Database.Database): Meal[] {
  const rows = db.prepare('SELECT * FROM meals ORDER BY name COLLATE NOCASE').all() as RawMeal[];
  return rows.map((r) => mapMeal(db, r));
}

export function getMealById(db: Database.Database, id: number): Meal | undefined {
  const row = db.prepare('SELECT * FROM meals WHERE id = ?').get(id) as RawMeal | undefined;
  return row ? mapMeal(db, row) : undefined;
}

export function findMealByName(db: Database.Database, name: string): Meal | undefined {
  const row = db.prepare('SELECT * FROM meals WHERE name = ? COLLATE NOCASE').get(name) as
    | RawMeal
    | undefined;
  return row ? mapMeal(db, row) : undefined;
}

export function updateMeal(
  db: Database.Database,
  id: number,
  data: Partial<NewMeal>,
): Meal | undefined {
  if (data.name !== undefined) {
    db.prepare('UPDATE meals SET name = ? WHERE id = ?').run(data.name, id);
  }
  return getMealById(db, id);
}

export function deleteMeal(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM meals WHERE id = ?').run(id);
  return result.changes > 0;
}

export function setIngredients(
  db: Database.Database,
  mealId: number,
  ingredients: NewMealIngredient[],
): void {
  const replace = db.transaction(() => {
    db.prepare('DELETE FROM meal_ingredients WHERE meal_id = ?').run(mealId);
    const insert = db.prepare(
      'INSERT INTO meal_ingredients (meal_id, name, category, position) VALUES (?, ?, ?, ?)',
    );
    for (const ing of ingredients) {
      insert.run(mealId, ing.name, ing.category, ing.position);
    }
  });
  replace();
}
