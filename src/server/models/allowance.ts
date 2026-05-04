import type Database from 'better-sqlite3';
import type { AllowanceConfig, AllowanceTier } from '../../shared/types.js';

export function roundToQuarter(n: number): number {
  return Math.round(n * 4) / 4;
}

type RawConfig = {
  id: number;
  user_id: number;
  amount: number;
  streak_threshold: number;
  reset_day: number;
  period_start: string;
  savings_balance: number;
  tithe_balance: number;
  checking_balance: number;
};

type RawTier = {
  id: number;
  config_id: number;
  percent_complete: number;
  percent_payout: number;
};

export function getAllowanceConfig(
  db: Database.Database,
  userId: number,
): AllowanceConfig | undefined {
  const row = db.prepare('SELECT * FROM allowance_config WHERE user_id = ?').get(userId) as
    | RawConfig
    | undefined;
  return row ?? undefined;
}

type AllowanceConfigInput = {
  amount: number;
  streak_threshold: number;
  reset_day: number;
  period_start: string;
};

export function setAllowanceConfig(
  db: Database.Database,
  userId: number,
  data: AllowanceConfigInput,
): AllowanceConfig {
  const existing = getAllowanceConfig(db, userId);
  if (existing) {
    db.prepare(
      'UPDATE allowance_config SET amount = ?, streak_threshold = ?, reset_day = ?, period_start = ? WHERE user_id = ?',
    ).run(data.amount, data.streak_threshold, data.reset_day, data.period_start, userId);
    return getAllowanceConfig(db, userId)!;
  }
  const row = db
    .prepare(
      'INSERT INTO allowance_config (user_id, amount, streak_threshold, reset_day, period_start) VALUES (?, ?, ?, ?, ?) RETURNING *',
    )
    .get(
      userId,
      data.amount,
      data.streak_threshold,
      data.reset_day,
      data.period_start,
    ) as RawConfig;
  return row;
}

export function getTiers(db: Database.Database, configId: number): AllowanceTier[] {
  return db
    .prepare('SELECT * FROM allowance_tiers WHERE config_id = ? ORDER BY percent_complete ASC')
    .all(configId) as RawTier[];
}

export function setTier(
  db: Database.Database,
  configId: number,
  percentComplete: number,
  percentPayout: number,
): AllowanceTier {
  const row = db
    .prepare(
      'INSERT INTO allowance_tiers (config_id, percent_complete, percent_payout) VALUES (?, ?, ?) RETURNING *',
    )
    .get(configId, percentComplete, percentPayout) as RawTier;
  return row;
}

export function deleteAllTiers(db: Database.Database, configId: number): void {
  db.prepare('DELETE FROM allowance_tiers WHERE config_id = ?').run(configId);
}

export function getPayoutFraction(tiers: AllowanceTier[], percentComplete: number): number {
  const matching = tiers
    .filter((t) => t.percent_complete <= percentComplete)
    .sort((a, b) => b.percent_complete - a.percent_complete);
  if (matching.length === 0) return 0;
  return matching[0].percent_payout / 100;
}

export function calculateEarned(
  amount: number,
  tiers: AllowanceTier[],
  percentComplete: number,
): number {
  return roundToQuarter(amount * getPayoutFraction(tiers, percentComplete));
}

export function recordDailyEarning(
  db: Database.Database,
  userId: number,
  date: string,
  amount: number,
): void {
  db.prepare(
    'INSERT OR REPLACE INTO allowance_daily_earnings (user_id, date, amount_earned) VALUES (?, ?, ?)',
  ).run(userId, date, roundToQuarter(amount));
}

export function sumWeeklyEarnings(
  db: Database.Database,
  userId: number,
  weekStart: string,
  weekEnd: string,
): number {
  const row = db
    .prepare(
      'SELECT COALESCE(SUM(amount_earned), 0) as total FROM allowance_daily_earnings WHERE user_id = ? AND date >= ? AND date <= ?',
    )
    .get(userId, weekStart, weekEnd) as { total: number };
  return roundToQuarter(row.total);
}

export function updateBalances(
  db: Database.Database,
  userId: number,
  balances: { savings_balance?: number; tithe_balance?: number; checking_balance?: number },
): void {
  const config = getAllowanceConfig(db, userId);
  if (!config) return;
  const savings =
    balances.savings_balance !== undefined
      ? roundToQuarter(balances.savings_balance)
      : config.savings_balance;
  const tithe =
    balances.tithe_balance !== undefined
      ? roundToQuarter(balances.tithe_balance)
      : config.tithe_balance;
  const checking =
    balances.checking_balance !== undefined
      ? roundToQuarter(balances.checking_balance)
      : config.checking_balance;
  db.prepare(
    'UPDATE allowance_config SET savings_balance = ?, tithe_balance = ?, checking_balance = ? WHERE user_id = ?',
  ).run(savings, tithe, checking, userId);
}
