import type Database from 'better-sqlite3';
import type { GroceryItem, NewGroceryItem, GrocerySource } from '../../shared/types.js';

type RawItem = {
  id: number;
  name: string;
  category: string;
  checked: number;
  source: string;
  meal_plan_id: number | null;
};

function mapItem(row: RawItem): GroceryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as GroceryItem['category'],
    checked: row.checked === 1,
    source: row.source as GroceryItem['source'],
    meal_plan_id: row.meal_plan_id,
  };
}

export function getAllGroceryItems(db: Database.Database): GroceryItem[] {
  const rows = db.prepare('SELECT * FROM grocery_items ORDER BY category, name').all() as RawItem[];
  return rows.map(mapItem);
}

export function getGroceryItemById(db: Database.Database, id: number): GroceryItem | undefined {
  const row = db.prepare('SELECT * FROM grocery_items WHERE id = ?').get(id) as RawItem | undefined;
  return row ? mapItem(row) : undefined;
}

export function createGroceryItem(db: Database.Database, data: NewGroceryItem): GroceryItem {
  const row = db
    .prepare(
      `INSERT INTO grocery_items (name, category, checked, source, meal_plan_id)
       VALUES (?, ?, ?, ?, ?) RETURNING *`,
    )
    .get(data.name, data.category, data.checked ? 1 : 0, data.source, data.meal_plan_id) as RawItem;
  return mapItem(row);
}

export function updateGroceryItem(
  db: Database.Database,
  id: number,
  data: Partial<NewGroceryItem>,
): GroceryItem | undefined {
  const current = getGroceryItemById(db, id);
  if (!current) return undefined;
  const merged = { ...current, ...data };
  db.prepare(
    'UPDATE grocery_items SET name = ?, category = ?, checked = ?, source = ?, meal_plan_id = ? WHERE id = ?',
  ).run(
    merged.name,
    merged.category,
    merged.checked ? 1 : 0,
    merged.source,
    merged.meal_plan_id,
    id,
  );
  return getGroceryItemById(db, id);
}

export function deleteGroceryItem(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM grocery_items WHERE id = ?').run(id);
  return result.changes > 0;
}

export function checkItem(
  db: Database.Database,
  id: number,
  checked: boolean,
): GroceryItem | undefined {
  db.prepare('UPDATE grocery_items SET checked = ? WHERE id = ?').run(checked ? 1 : 0, id);
  return getGroceryItemById(db, id);
}

export function clearCheckedItems(db: Database.Database): number {
  const result = db.prepare('DELETE FROM grocery_items WHERE checked = 1').run();
  return result.changes;
}

export function getItemsBySource(db: Database.Database, source: GrocerySource): GroceryItem[] {
  const rows = db
    .prepare('SELECT * FROM grocery_items WHERE source = ? ORDER BY category, name')
    .all(source) as RawItem[];
  return rows.map(mapItem);
}

export function getItemsByMealPlan(db: Database.Database, mealPlanId: number): GroceryItem[] {
  const rows = db
    .prepare('SELECT * FROM grocery_items WHERE meal_plan_id = ?')
    .all(mealPlanId) as RawItem[];
  return rows.map(mapItem);
}
