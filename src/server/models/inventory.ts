import type Database from 'better-sqlite3';
import type { InventoryItem, InventoryLocation, NewInventoryItem } from '../../shared/types.js';

type RawInventoryItem = {
  id: number;
  name: string;
  category: string;
  location: string;
  notes: string;
};

function mapItem(row: RawInventoryItem): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as InventoryItem['category'],
    location: row.location as InventoryLocation,
    notes: row.notes,
  };
}

export function createInventoryItem(db: Database.Database, data: NewInventoryItem): InventoryItem {
  const row = db
    .prepare(
      `INSERT INTO inventory_items (name, category, location, notes) VALUES (?, ?, ?, ?) RETURNING *`,
    )
    .get(data.name, data.category, data.location, data.notes) as RawInventoryItem;
  return mapItem(row);
}

export function getInventoryItems(
  db: Database.Database,
  location?: InventoryLocation,
): InventoryItem[] {
  const rows = location
    ? (db
        .prepare('SELECT * FROM inventory_items WHERE location = ? ORDER BY name COLLATE NOCASE')
        .all(location) as RawInventoryItem[])
    : (db
        .prepare('SELECT * FROM inventory_items ORDER BY name COLLATE NOCASE')
        .all() as RawInventoryItem[]);
  return rows.map(mapItem);
}

export function findByName(
  db: Database.Database,
  name: string,
  location?: InventoryLocation,
): InventoryItem | undefined {
  const row = location
    ? (db
        .prepare('SELECT * FROM inventory_items WHERE LOWER(name) = LOWER(?) AND location = ?')
        .get(name, location) as RawInventoryItem | undefined)
    : (db.prepare('SELECT * FROM inventory_items WHERE LOWER(name) = LOWER(?)').get(name) as
        | RawInventoryItem
        | undefined);
  return row ? mapItem(row) : undefined;
}

export function updateInventoryItem(
  db: Database.Database,
  id: number,
  data: Partial<Pick<InventoryItem, 'category' | 'notes'>>,
): InventoryItem | undefined {
  const current = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id) as
    | RawInventoryItem
    | undefined;
  if (!current) return undefined;
  const category = data.category ?? current.category;
  const notes = data.notes ?? current.notes;
  db.prepare('UPDATE inventory_items SET category = ?, notes = ? WHERE id = ?').run(
    category,
    notes,
    id,
  );
  return mapItem({ ...current, category, notes });
}

export function deleteInventoryItem(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM inventory_items WHERE id = ?').run(id);
  return result.changes > 0;
}
