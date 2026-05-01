import type Database from 'better-sqlite3';
import type { AllowanceConfig, AllowanceTier } from '../../shared/types.js';

type RawConfig = {
  id: number;
  user_id: number;
  amount: number;
  streak_threshold: number;
  reset_day: number;
  period_start: string;
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

export function setAllowanceConfig(
  db: Database.Database,
  userId: number,
  data: Omit<AllowanceConfig, 'id' | 'user_id'>,
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

export function calculateEarned(
  amount: number,
  tiers: AllowanceTier[],
  percentComplete: number,
): number {
  const matching = tiers
    .filter((t) => t.percent_complete <= percentComplete)
    .sort((a, b) => b.percent_complete - a.percent_complete);
  if (matching.length === 0) return 0;
  return amount * (matching[0].percent_payout / 100);
}
