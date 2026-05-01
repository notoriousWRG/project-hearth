import Database from 'better-sqlite3';
import { createDb } from '../src/server/db/connection.js';
import { runSchema } from '../src/server/db/schema.js';

const DB_PATH = 'hearth.db';
const isReset = process.argv.includes('--reset');

if (isReset) {
  try {
    const db = new Database(DB_PATH);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>;
    const drop = db.transaction(() => {
      for (const { name } of tables) {
        db.prepare(`DROP TABLE IF EXISTS ${name}`).run();
      }
    });
    drop();
    db.close();
    console.log('Database reset: all tables dropped.');
  } catch {
    // File may not exist yet — fine
  }
}

const db = createDb(DB_PATH);
runSchema(db);
db.close();
console.log(`Database ${isReset ? 'recreated' : 'initialized'}: ${DB_PATH}`);
