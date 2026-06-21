import type Database from 'better-sqlite3';
import type { EatingOutState } from '../../shared/types.js';
import { getSetting, setSetting } from './settings.js';

function getMondayISO(date: Date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getEatingOutState(db: Database.Database, now: Date = new Date()): EatingOutState {
  const weeklyAmount = getSetting<number>(db, 'eating_out_weekly_amount') ?? 0;
  const currentMonday = getMondayISO(now);
  const storedWeekStart = getSetting<string>(db, 'eating_out_week_start');

  // Reset to full amount on new week
  if (!storedWeekStart || storedWeekStart !== currentMonday) {
    setSetting(db, 'eating_out_week_start', currentMonday);
    setSetting(db, 'eating_out_remaining', weeklyAmount);
    return { remaining: weeklyAmount, weeklyAmount, weekStart: currentMonday };
  }

  const remaining = getSetting<number>(db, 'eating_out_remaining') ?? weeklyAmount;
  return { remaining, weeklyAmount, weekStart: currentMonday };
}

export function subtractEatingOut(
  db: Database.Database,
  amount: number,
  now: Date = new Date(),
): EatingOutState {
  const state = getEatingOutState(db, now);
  const newRemaining = state.remaining - amount;
  setSetting(db, 'eating_out_remaining', newRemaining);
  return { ...state, remaining: newRemaining };
}

export function resetEatingOut(db: Database.Database, now: Date = new Date()): EatingOutState {
  const weeklyAmount = getSetting<number>(db, 'eating_out_weekly_amount') ?? 0;
  const weekStart = getMondayISO(now);
  setSetting(db, 'eating_out_remaining', weeklyAmount);
  setSetting(db, 'eating_out_week_start', weekStart);
  return { remaining: weeklyAmount, weeklyAmount, weekStart };
}
