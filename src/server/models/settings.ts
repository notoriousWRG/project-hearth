import type Database from 'better-sqlite3';

type RawSetting = { key: string; value: string };

export function getSetting<T>(db: Database.Database, key: string): T | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | RawSetting
    | undefined;
  return row ? (JSON.parse(row.value) as T) : undefined;
}

export function setSetting<T>(db: Database.Database, key: string, value: T): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    key,
    JSON.stringify(value),
  );
}

export function getAllSettings(db: Database.Database): Record<string, unknown> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as RawSetting[];
  return Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
}

export function deleteSetting(db: Database.Database, key: string): boolean {
  const result = db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  return result.changes > 0;
}
