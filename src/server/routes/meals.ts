import { Router } from 'express';
import type Database from 'better-sqlite3';
import { getMealsByWeek, getMealById, upsertMeal, deleteMeal } from '../models/meals.js';
import { createGroceryItem, getItemsByMealPlan } from '../models/grocery.js';

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
    const { week_start_date, day_of_week, meal_type, description } = req.body as Record<
      string,
      unknown
    >;
    if (week_start_date === undefined || day_of_week === undefined || !meal_type) {
      res.status(400).json({ error: 'week_start_date, day_of_week, and meal_type are required' });
      return;
    }
    const entry = upsertMeal(db, {
      week_start_date: String(week_start_date),
      day_of_week: Number(day_of_week) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      meal_type: meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      description: description ? String(description) : '',
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
    const meals = getMealsByWeek(db, week);
    const created = [];
    for (const meal of meals) {
      if (!meal.description) continue;
      // Skip if grocery items already exist for this meal
      const existing = getItemsByMealPlan(db, meal.id);
      if (existing.length > 0) continue;
      const item = createGroceryItem(db, {
        name: meal.description,
        category: 'other',
        checked: false,
        source: 'meal_plan',
        meal_plan_id: meal.id,
      });
      created.push(item);
    }
    res.json(created);
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
