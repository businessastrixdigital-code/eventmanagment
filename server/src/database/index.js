import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

let db;
let client;

const dbUrl = process.env.TURSO_DATABASE_URL || '';
const authToken = process.env.TURSO_AUTH_TOKEN || '';

try {
  console.log('[DATABASE] Connecting to Turso database:', dbUrl);
  client = createClient({
    url: dbUrl,
    authToken: authToken,
  });
  db = drizzle(client, { schema });
  // Test connection
  await client.execute('SELECT 1;');
  console.log('[DATABASE] Turso connection established.');
} catch (err) {
  console.error('[DATABASE] Failed to connect to remote Turso database. Falling back to local SQLite...', err.message);
  client = createClient({
    url: 'file:local.db',
  });
  db = drizzle(client, { schema });
}

try {
  console.log('[DATABASE] Running Drizzle migrations...');
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), './src/database/migrations') });
  console.log('[DATABASE] Drizzle migrations applied successfully.');
} catch (err) {
  console.error('[DATABASE] Drizzle migrations failed:', err);
}

// Auto-heal local SQLite/Turso tables by ensuring status and lastTriggeredAt columns exist on MessageReminders
try {
  await client.execute(`ALTER TABLE MessageReminders ADD COLUMN status TEXT DEFAULT 'Active';`);
} catch (e) {
  // Column already exists, safe to ignore
}
try {
  await client.execute(`ALTER TABLE MessageReminders ADD COLUMN lastTriggeredAt TEXT;`);
} catch (e) {
  // Column already exists, safe to ignore
}

export { db };
export default db;
