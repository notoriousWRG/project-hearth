import Database from 'better-sqlite3';

export function createDb(filename: string = 'hearth.db'): Database.Database {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
