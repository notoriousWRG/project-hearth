import express from 'express';
import type { Express } from 'express';
import type Database from 'better-sqlite3';
import { createUsersRouter } from './routes/users.js';
import { createTodosRouter } from './routes/todos.js';
import { createChoresRouter } from './routes/chores.js';
import { createMealsRouter } from './routes/meals.js';
import { createGroceryRouter } from './routes/grocery.js';
import { createRemindersRouter } from './routes/reminders.js';
import { createSettingsRouter } from './routes/settings.js';
import { createStreaksRouter } from './routes/streaks.js';
import { createAllowanceRouter } from './routes/allowance.js';
import { createSummaryRouter } from './routes/summary.js';
import { createSavedMealsRouter } from './routes/savedMeals.js';
import { createInventoryRouter } from './routes/inventory.js';
import { createCleaningRouter } from './routes/cleaning.js';
import { createEatingOutRouter } from './routes/eatingOut.js';
import { createPhoneBookRouter } from './routes/phoneBook.js';

export function createApp(db: Database.Database): Express {
  const app = express();
  app.use(express.json());

  app.use('/api/users', createUsersRouter(db));
  app.use('/api/todos', createTodosRouter(db));
  app.use('/api/chores', createChoresRouter(db));
  app.use('/api/meal-plan', createMealsRouter(db));
  app.use('/api/grocery', createGroceryRouter(db));
  app.use('/api/reminders', createRemindersRouter(db));
  app.use('/api/settings', createSettingsRouter(db));
  app.use('/api/streaks', createStreaksRouter(db));
  app.use('/api/allowance', createAllowanceRouter(db));
  app.use('/api/summary', createSummaryRouter(db));
  app.use('/api/meals', createSavedMealsRouter(db));
  app.use('/api/inventory', createInventoryRouter(db));
  app.use('/api/cleaning', createCleaningRouter(db));
  app.use('/api/eating-out', createEatingOutRouter(db));
  app.use('/api/phone-book', createPhoneBookRouter(db));

  return app;
}
