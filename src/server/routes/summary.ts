import { Router } from 'express';
import type Database from 'better-sqlite3';
import { getAllUsers } from '../models/users.js';
import { getChoresByUser } from '../models/chores.js';
import { getAllowanceConfig, getTiers, calculateEarned } from '../models/allowance.js';
import { getStreakRecord } from '../models/streaks.js';
import { getRemindersDueOn } from '../models/reminders.js';
import { getMealsByWeek } from '../models/meals.js';
import type { ChildSummary, TodayMeals, SummaryResponse } from '../../shared/types.js';

function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function createSummaryRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const todayDow = now.getDay();

    const allUsers = getAllUsers(db);
    const children = allUsers.filter((u) => u.type === 'child');

    const childSummaries: ChildSummary[] = children.map((child) => {
      const chores = getChoresByUser(db, child.id);
      const total = chores.length;
      const completed = chores.filter((c) => c.completed).length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      const config = getAllowanceConfig(db, child.id);
      let earned = 0;
      if (config) {
        const tiers = getTiers(db, config.id);
        earned = calculateEarned(config.amount, tiers, percent);
      }

      const streak = getStreakRecord(db, child.id)?.current_streak ?? 0;

      return {
        id: child.id,
        name: child.name,
        icon: child.icon,
        total,
        completed,
        percent,
        earned,
        streak,
      };
    });

    const todayReminders = getRemindersDueOn(db, today).filter((r) => !r.dismissed);

    const weekStart = getMondayOfWeek(now);
    const weekMeals = getMealsByWeek(db, weekStart);
    const todayMeals = weekMeals.filter((m) => m.day_of_week === todayDow);
    const meals: TodayMeals = {
      breakfast: todayMeals.find((m) => m.meal_type === 'breakfast')?.description ?? '',
      lunch: todayMeals.find((m) => m.meal_type === 'lunch')?.description ?? '',
      dinner: todayMeals.find((m) => m.meal_type === 'dinner')?.description ?? '',
      snack: todayMeals.find((m) => m.meal_type === 'snack')?.description ?? '',
    };

    const response: SummaryResponse = {
      children: childSummaries,
      reminders: todayReminders,
      meals,
      affirmation: "Green's are good to people",
    };

    res.json(response);
  });

  return router;
}
