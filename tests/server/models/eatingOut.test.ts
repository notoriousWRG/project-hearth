import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema, runMigrations } from '../../../src/server/db/schema.js';
import { setSetting } from '../../../src/server/models/settings.js';
import {
  getEatingOutState,
  subtractEatingOut,
  resetEatingOut,
} from '../../../src/server/models/eatingOut.js';

let db: Database.Database;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

describe('getEatingOutState', () => {
  it('returns 0 remaining and 0 weekly amount when nothing configured', () => {
    const state = getEatingOutState(db);
    expect(state.remaining).toBe(0);
    expect(state.weeklyAmount).toBe(0);
    expect(state.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns configured weekly amount on first call of the week', () => {
    setSetting(db, 'eating_out_weekly_amount', 50);
    const state = getEatingOutState(db);
    expect(state.remaining).toBe(50);
    expect(state.weeklyAmount).toBe(50);
  });

  it('persists remaining across calls in same week', () => {
    const now = new Date('2026-06-18T08:00:00');
    setSetting(db, 'eating_out_weekly_amount', 50);
    getEatingOutState(db, now); // sets week start and remaining = 50
    setSetting(db, 'eating_out_remaining', 30); // simulate a spend
    const state = getEatingOutState(db, now);
    expect(state.remaining).toBe(30);
  });

  it('resets to weekly amount on new week', () => {
    const weekOne = new Date('2026-06-11T08:00:00'); // Monday June 8 week
    setSetting(db, 'eating_out_weekly_amount', 50);
    getEatingOutState(db, weekOne);
    setSetting(db, 'eating_out_remaining', 10);

    const weekTwo = new Date('2026-06-18T08:00:00'); // next Monday week (June 15)
    const state = getEatingOutState(db, weekTwo);
    expect(state.remaining).toBe(50); // reset to full
  });
});

describe('subtractEatingOut', () => {
  it('decrements remaining', () => {
    setSetting(db, 'eating_out_weekly_amount', 60);
    const state = subtractEatingOut(db, 15);
    expect(state.remaining).toBe(45);
  });

  it('allows going negative (overspend)', () => {
    setSetting(db, 'eating_out_weekly_amount', 20);
    const state = subtractEatingOut(db, 30);
    expect(state.remaining).toBe(-10);
  });

  it('decrements cumulatively', () => {
    const now = new Date('2026-06-18T08:00:00');
    setSetting(db, 'eating_out_weekly_amount', 60);
    subtractEatingOut(db, 15, now);
    const state = subtractEatingOut(db, 10, now);
    expect(state.remaining).toBe(35);
  });
});

describe('resetEatingOut', () => {
  it('restores remaining to weekly amount', () => {
    const now = new Date('2026-06-18T08:00:00');
    setSetting(db, 'eating_out_weekly_amount', 40);
    subtractEatingOut(db, 25, now);
    const state = resetEatingOut(db, now);
    expect(state.remaining).toBe(40);
  });
});
