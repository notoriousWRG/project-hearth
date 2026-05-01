import type Database from 'better-sqlite3';
import type { StreakRecord } from '../../shared/types.js';

type RawStreak = {
  id: number;
  user_id: number;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
};

export function getStreakRecord(db: Database.Database, userId: number): StreakRecord | undefined {
  const row = db.prepare('SELECT * FROM streak_records WHERE user_id = ?').get(userId) as
    | RawStreak
    | undefined;
  return row ?? undefined;
}

export function ensureStreakRecord(db: Database.Database, userId: number): StreakRecord {
  const existing = getStreakRecord(db, userId);
  if (existing) return existing;
  const row = db
    .prepare(
      'INSERT INTO streak_records (user_id, current_streak, longest_streak) VALUES (?, 0, 0) RETURNING *',
    )
    .get(userId) as RawStreak;
  return row;
}

export function updateStreakOnCompletion(
  db: Database.Database,
  userId: number,
  todayDate: string,
): StreakRecord {
  const record = ensureStreakRecord(db, userId);
  const { last_completed_date, current_streak, longest_streak } = record;

  if (last_completed_date === todayDate) {
    return record; // Already counted today
  }

  const yesterday = getPreviousDate(todayDate);
  const newStreak = last_completed_date === yesterday ? current_streak + 1 : 1;
  const newLongest = Math.max(longest_streak, newStreak);

  db.prepare(
    'UPDATE streak_records SET current_streak = ?, longest_streak = ?, last_completed_date = ? WHERE user_id = ?',
  ).run(newStreak, newLongest, todayDate, userId);

  return getStreakRecord(db, userId)!;
}

function getPreviousDate(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
