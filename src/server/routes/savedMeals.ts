import { Router } from 'express';
import type Database from 'better-sqlite3';
import type { NewMealIngredient } from '../../shared/types.js';
import {
  getAllMeals,
  getMealById,
  createMeal,
  updateMeal,
  deleteMeal,
  setIngredients,
} from '../models/savedMeals.js';

export function createSavedMealsRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const meals = getAllMeals(db).map(({ id, name, created_at }) => ({ id, name, created_at }));
    res.json(meals);
  });

  router.get('/:id', (req, res) => {
    const meal = getMealById(db, Number(req.params.id));
    if (!meal) {
      res.status(404).json({ error: 'Meal not found' });
      return;
    }
    res.json(meal);
  });

  router.post('/', (req, res) => {
    const { name, ingredients } = req.body as Record<string, unknown>;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const meal = createMeal(db, { name: String(name) });
    if (Array.isArray(ingredients) && ingredients.length > 0) {
      setIngredients(db, meal.id, ingredients as NewMealIngredient[]);
    }
    res.status(201).json(getMealById(db, meal.id));
  });

  router.put('/:id', (req, res) => {
    const { name, ingredients } = req.body as Record<string, unknown>;
    const id = Number(req.params.id);
    const updated = updateMeal(db, id, name !== undefined ? { name: String(name) } : {});
    if (!updated) {
      res.status(404).json({ error: 'Meal not found' });
      return;
    }
    if (Array.isArray(ingredients)) {
      setIngredients(db, id, ingredients as NewMealIngredient[]);
    }
    res.json(getMealById(db, id));
  });

  router.delete('/:id', (req, res) => {
    const deleted = deleteMeal(db, Number(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Meal not found' });
      return;
    }
    res.status(204).send();
  });

  return router;
}
