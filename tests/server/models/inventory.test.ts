import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema, runMigrations } from '../../../src/server/db/schema.js';
import {
  createInventoryItem,
  getInventoryItems,
  findByName,
  updateInventoryItem,
  deleteInventoryItem,
} from '../../../src/server/models/inventory.js';

let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

const milkPantry = {
  name: 'Milk',
  category: 'dairy' as const,
  location: 'pantry' as const,
  notes: '',
};
const cheeseIcebox = {
  name: 'Cheese',
  category: 'dairy' as const,
  location: 'icebox' as const,
  notes: '',
};

describe('inventory model', () => {
  describe('createInventoryItem', () => {
    it('returns the created item with an id', () => {
      const item = createInventoryItem(db, milkPantry);
      expect(item.id).toBeTypeOf('number');
      expect(item.name).toBe('Milk');
      expect(item.location).toBe('pantry');
      expect(item.notes).toBe('');
    });

    it('throws on duplicate (name, location)', () => {
      createInventoryItem(db, milkPantry);
      expect(() => createInventoryItem(db, milkPantry)).toThrow();
    });

    it('allows same name in different locations', () => {
      createInventoryItem(db, milkPantry);
      expect(() => createInventoryItem(db, { ...milkPantry, location: 'icebox' })).not.toThrow();
    });
  });

  describe('getInventoryItems', () => {
    it('returns empty array when nothing exists', () => {
      expect(getInventoryItems(db)).toEqual([]);
    });

    it('returns all items when no location filter given', () => {
      createInventoryItem(db, milkPantry);
      createInventoryItem(db, cheeseIcebox);
      expect(getInventoryItems(db)).toHaveLength(2);
    });

    it('filters by pantry location', () => {
      createInventoryItem(db, milkPantry);
      createInventoryItem(db, cheeseIcebox);
      const items = getInventoryItems(db, 'pantry');
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Milk');
    });

    it('filters by icebox location', () => {
      createInventoryItem(db, milkPantry);
      createInventoryItem(db, cheeseIcebox);
      const items = getInventoryItems(db, 'icebox');
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Cheese');
    });
  });

  describe('findByName', () => {
    it('returns undefined when not found', () => {
      expect(findByName(db, 'Milk')).toBeUndefined();
    });

    it('finds across all locations when no location given', () => {
      createInventoryItem(db, milkPantry);
      expect(findByName(db, 'Milk')).toBeDefined();
    });

    it('is case-insensitive', () => {
      createInventoryItem(db, milkPantry);
      expect(findByName(db, 'milk')).toBeDefined();
      expect(findByName(db, 'MILK')).toBeDefined();
    });

    it('filters by location', () => {
      createInventoryItem(db, milkPantry);
      expect(findByName(db, 'Milk', 'icebox')).toBeUndefined();
      expect(findByName(db, 'Milk', 'pantry')).toBeDefined();
    });
  });

  describe('updateInventoryItem', () => {
    it('updates notes and category', () => {
      const item = createInventoryItem(db, milkPantry);
      const updated = updateInventoryItem(db, item.id, { notes: 'organic', category: 'other' });
      expect(updated?.notes).toBe('organic');
      expect(updated?.category).toBe('other');
    });

    it('returns undefined for missing id', () => {
      expect(updateInventoryItem(db, 999, { notes: 'x' })).toBeUndefined();
    });
  });

  describe('deleteInventoryItem', () => {
    it('removes the item and returns true', () => {
      const item = createInventoryItem(db, milkPantry);
      expect(deleteInventoryItem(db, item.id)).toBe(true);
      expect(getInventoryItems(db)).toHaveLength(0);
    });

    it('returns false for missing id', () => {
      expect(deleteInventoryItem(db, 999)).toBe(false);
    });
  });
});
