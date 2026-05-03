import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema } from '../../../src/server/db/schema.js';
import { evaluateStreakAtReset, ensureStreakRecord } from '../../../src/server/models/streaks.js';

let db: Database.Database;
let userId: number;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  const row = db
    .prepare(
      "INSERT INTO users (name, type, icon, display_order) VALUES ('Kid', 'child', '⭐', 0) RETURNING *",
    )
    .get() as { id: number };
  userId = row.id;
});

afterEach(() => {
  db.close();
});

describe('evaluateStreakAtReset', () => {
  it('advances streak when percent meets threshold', () => {
    const result = evaluateStreakAtReset(db, userId, 100, 100, '2026-05-02');
    expect(result.current_streak).toBe(1);
    expect(result.last_completed_date).toBe('2026-05-02');
  });

  it('breaks streak when percent is below threshold', () => {
    ensureStreakRecord(db, userId);
    db.prepare(
      'UPDATE streak_records SET current_streak = 3, last_completed_date = ? WHERE user_id = ?',
    ).run('2026-05-01', userId);

    const result = evaluateStreakAtReset(db, userId, 50, 100, '2026-05-02');
    expect(result.current_streak).toBe(0);
  });

  it('builds consecutive streak on back-to-back days', () => {
    evaluateStreakAtReset(db, userId, 100, 100, '2026-05-01');
    const result = evaluateStreakAtReset(db, userId, 100, 100, '2026-05-02');
    expect(result.current_streak).toBe(2);
  });

  it('resets streak to 1 after a gap', () => {
    evaluateStreakAtReset(db, userId, 100, 100, '2026-05-01');
    // Skip 2026-05-02
    const result = evaluateStreakAtReset(db, userId, 100, 100, '2026-05-03');
    expect(result.current_streak).toBe(1);
  });

  it('updates longest_streak when current exceeds it', () => {
    evaluateStreakAtReset(db, userId, 100, 100, '2026-05-01');
    evaluateStreakAtReset(db, userId, 100, 100, '2026-05-02');
    const result = evaluateStreakAtReset(db, userId, 100, 100, '2026-05-03');
    expect(result.longest_streak).toBe(3);
  });

  it('does not double-count the same period', () => {
    evaluateStreakAtReset(db, userId, 100, 100, '2026-05-02');
    const result = evaluateStreakAtReset(db, userId, 100, 100, '2026-05-02');
    expect(result.current_streak).toBe(1);
  });

  it('advances streak when threshold is 80 and percent is 80', () => {
    const result = evaluateStreakAtReset(db, userId, 80, 80, '2026-05-02');
    expect(result.current_streak).toBe(1);
  });

  it('breaks streak when percent is 79 and threshold is 80', () => {
    const result = evaluateStreakAtReset(db, userId, 79, 80, '2026-05-02');
    expect(result.current_streak).toBe(0);
  });
});
