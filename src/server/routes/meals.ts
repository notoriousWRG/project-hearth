import { Router } from 'express';
import type Database from 'better-sqlite3';
import type { GroceryCategory } from '../../shared/types.js';
import { getMealsByWeek, getMealById, upsertMeal, deleteMeal } from '../models/meals.js';
import { getMealById as getSavedMeal } from '../models/savedMeals.js';
import { getInventoryItems } from '../models/inventory.js';
import { getAllGroceryItems, createGroceryItem } from '../models/grocery.js';

export function createMealsRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const week = String(req.query.week ?? '');
    if (!week) {
      res.status(400).json({ error: 'week query param required (YYYY-MM-DD)' });
      return;
    }
    res.json(getMealsByWeek(db, week));
  });

  router.put('/', (req, res) => {
    const { week_start_date, day_of_week, meal_type, description, meal_id } = req.body as Record<
      string,
      unknown
    >;
    if (week_start_date === undefined || day_of_week === undefined || !meal_type) {
      res.status(400).json({ error: 'week_start_date, day_of_week, and meal_type are required' });
      return;
    }

    let resolvedDescription = description ? String(description) : '';
    const resolvedMealId = meal_id != null ? Number(meal_id) : null;

    if (resolvedMealId != null) {
      const savedMeal = getSavedMeal(db, resolvedMealId);
      if (savedMeal) {
        resolvedDescription = savedMeal.name;
      }
    }

    const entry = upsertMeal(db, {
      week_start_date: String(week_start_date),
      day_of_week: Number(day_of_week) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      meal_type: meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      description: resolvedDescription,
      meal_id: resolvedMealId,
    });
    res.json(entry);
  });

  router.delete('/:id', (req, res) => {
    const deleted = deleteMeal(db, Number(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Meal not found' });
      return;
    }
    res.status(204).send();
  });

  // Must come before /:id to avoid 'generate-grocery' being treated as an id
  router.post('/generate-grocery', (req, res) => {
    const { week } = req.body as { week?: string };
    if (!week) {
      res.status(400).json({ error: 'week is required (YYYY-MM-DD)' });
      return;
    }

    // Step 1: fetch all plan entries for the week
    const planEntries = getMealsByWeek(db, week);

    // Step 2: collect unique ingredients keyed by lowercase name
    const ingredientMap = new Map<string, { name: string; category: GroceryCategory }>();
    for (const entry of planEntries) {
      if (entry.meal_id != null) {
        const savedMeal = getSavedMeal(db, entry.meal_id);
        if (savedMeal) {
          for (const ing of savedMeal.ingredients) {
            const key = ing.name.toLowerCase();
            if (!ingredientMap.has(key)) {
              ingredientMap.set(key, { name: ing.name, category: ing.category });
            }
          }
        }
      } else if (entry.description) {
        // Legacy freetext entry — treat description as a single ingredient
        const key = entry.description.toLowerCase();
        if (!ingredientMap.has(key)) {
          ingredientMap.set(key, { name: entry.description, category: 'other' });
        }
      }
    }

    // Step 3: subtract inventory (any location, case-insensitive)
    const inventoryItems = getInventoryItems(db);
    for (const inv of inventoryItems) {
      ingredientMap.delete(inv.name.toLowerCase());
    }

    // Step 4: skip if an unchecked grocery item already exists with same name
    const existingGrocery = getAllGroceryItems(db);
    const existingUncheckedNames = new Set(
      existingGrocery.filter((i) => !i.checked).map((i) => i.name.toLowerCase()),
    );

    const added = [];
    for (const [key, { name, category }] of ingredientMap) {
      if (existingUncheckedNames.has(key)) continue;
      const item = createGroceryItem(db, {
        name,
        category,
        checked: false,
        source: 'meal_plan',
        meal_plan_id: null,
      });
      added.push(item);
    }

    res.json(added);
  });

  router.get('/:id', (req, res) => {
    const meal = getMealById(db, Number(req.params.id));
    if (!meal) {
      res.status(404).json({ error: 'Meal not found' });
      return;
    }
    res.json(meal);
  });

  return router;
}
