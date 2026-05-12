import type Database from 'better-sqlite3';
import type { MealPlanEntry, NewMealPlanEntry } from '../../shared/types.js';

type RawMeal = {
  id: number;
  week_start_date: string;
  day_of_week: number;
  meal_type: string;
  description: string;
  meal_id: number | null;
};

function mapMeal(row: RawMeal): MealPlanEntry {
  return {
    id: row.id,
    week_start_date: row.week_start_date,
    day_of_week: row.day_of_week as MealPlanEntry['day_of_week'],
    meal_type: row.meal_type as MealPlanEntry['meal_type'],
    description: row.description,
    meal_id: row.meal_id ?? null,
  };
}

export function getMealsByWeek(db: Database.Database, weekStartDate: string): MealPlanEntry[] {
  const rows = db
    .prepare('SELECT * FROM meal_plan WHERE week_start_date = ? ORDER BY day_of_week, meal_type')
    .all(weekStartDate) as RawMeal[];
  return rows.map(mapMeal);
}

export function getMealById(db: Database.Database, id: number): MealPlanEntry | undefined {
  const row = db.prepare('SELECT * FROM meal_plan WHERE id = ?').get(id) as RawMeal | undefined;
  return row ? mapMeal(row) : undefined;
}

export function upsertMeal(db: Database.Database, data: NewMealPlanEntry): MealPlanEntry {
  db.prepare(
    'DELETE FROM meal_plan WHERE week_start_date = ? AND day_of_week = ? AND meal_type = ?',
  ).run(data.week_start_date, data.day_of_week, data.meal_type);
  const row = db
    .prepare(
      `INSERT INTO meal_plan (week_start_date, day_of_week, meal_type, description, meal_id)
       VALUES (?, ?, ?, ?, ?) RETURNING *`,
    )
    .get(
      data.week_start_date,
      data.day_of_week,
      data.meal_type,
      data.description,
      data.meal_id ?? null,
    ) as RawMeal;
  return mapMeal(row);
}

export function deleteMeal(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM meal_plan WHERE id = ?').run(id);
  return result.changes > 0;
}

export function clearWeek(db: Database.Database, weekStartDate: string): number {
  const result = db.prepare('DELETE FROM meal_plan WHERE week_start_date = ?').run(weekStartDate);
  return result.changes;
}
