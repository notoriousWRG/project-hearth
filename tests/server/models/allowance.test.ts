import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createDb } from '../../../src/server/db/connection.js';
import { runSchema, runMigrations } from '../../../src/server/db/schema.js';
import {
  roundToQuarter,
  recordDailyEarning,
  sumWeeklyEarnings,
  updateBalances,
  getAllowanceConfig,
  setAllowanceConfig,
} from '../../../src/server/models/allowance.js';

let db: Database.Database;
let userId: number;

beforeEach(() => {
  db = createDb(':memory:');
  runSchema(db);
  runMigrations(db);
  const row = db
    .prepare("INSERT INTO users (name, type, icon) VALUES ('Kraft', 'child', '⭐') RETURNING id")
    .get() as { id: number };
  userId = row.id;
  setAllowanceConfig(db, userId, {
    amount: 7,
    streak_threshold: 5,
    reset_day: 0,
    period_start: '2026-01-05',
  });
});

afterEach(() => {
  db.close();
});

describe('roundToQuarter', () => {
  it('rounds to nearest 0.25', () => {
    expect(roundToQuarter(1.0)).toBe(1.0);
    expect(roundToQuarter(1.12)).toBe(1.0);
    expect(roundToQuarter(1.13)).toBe(1.25);
    expect(roundToQuarter(1.37)).toBe(1.25);
    expect(roundToQuarter(1.38)).toBe(1.5);
    expect(roundToQuarter(1.63)).toBe(1.75);
  });
});

describe('recordDailyEarning', () => {
  it('inserts a daily earning', () => {
    recordDailyEarning(db, userId, '2026-05-04', 1.0);
    const total = sumWeeklyEarnings(db, userId, '2026-05-04', '2026-05-04');
    expect(total).toBe(1.0);
  });

  it('rounds amount to nearest quarter on insert', () => {
    recordDailyEarning(db, userId, '2026-05-04', 0.87);
    const total = sumWeeklyEarnings(db, userId, '2026-05-04', '2026-05-04');
    expect(total).toBe(0.75);
  });

  it('replaces existing entry for same date (upsert)', () => {
    recordDailyEarning(db, userId, '2026-05-04', 0.5);
    recordDailyEarning(db, userId, '2026-05-04', 1.0);
    const total = sumWeeklyEarnings(db, userId, '2026-05-04', '2026-05-04');
    expect(total).toBe(1.0);
  });
});

describe('sumWeeklyEarnings', () => {
  it('returns 0 with no earnings', () => {
    expect(sumWeeklyEarnings(db, userId, '2026-04-27', '2026-05-03')).toBe(0);
  });

  it('sums only earnings within the date range', () => {
    recordDailyEarning(db, userId, '2026-04-26', 1.0); // out of range
    recordDailyEarning(db, userId, '2026-04-27', 0.5);
    recordDailyEarning(db, userId, '2026-05-01', 0.75);
    recordDailyEarning(db, userId, '2026-05-03', 1.0);
    recordDailyEarning(db, userId, '2026-05-04', 1.0); // out of range
    expect(sumWeeklyEarnings(db, userId, '2026-04-27', '2026-05-03')).toBe(2.25);
  });
});

describe('updateBalances', () => {
  it('updates all three balances', () => {
    updateBalances(db, userId, {
      savings_balance: 2.0,
      tithe_balance: 1.0,
      checking_balance: 5.0,
    });
    const config = getAllowanceConfig(db, userId)!;
    expect(config.savings_balance).toBe(2.0);
    expect(config.tithe_balance).toBe(1.0);
    expect(config.checking_balance).toBe(5.0);
  });

  it('updates only provided fields', () => {
    updateBalances(db, userId, { savings_balance: 3.0 });
    const config = getAllowanceConfig(db, userId)!;
    expect(config.savings_balance).toBe(3.0);
    expect(config.tithe_balance).toBe(0);
    expect(config.checking_balance).toBe(0);
  });

  it('rounds to nearest quarter', () => {
    updateBalances(db, userId, { checking_balance: 4.13 });
    const config = getAllowanceConfig(db, userId)!;
    expect(config.checking_balance).toBe(4.25);
  });
});
