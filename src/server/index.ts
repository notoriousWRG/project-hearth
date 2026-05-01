import { createDb } from './db/connection.js';
import { runSchema } from './db/schema.js';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT ?? 3001);
const DB_PATH = process.env.DB_PATH ?? 'hearth.db';

const db = createDb(DB_PATH);
runSchema(db); // Ensure schema exists (idempotent)

const app = createApp(db);

app.listen(PORT, () => {
  console.log(`Hearth server running on http://localhost:${PORT}`);
});
