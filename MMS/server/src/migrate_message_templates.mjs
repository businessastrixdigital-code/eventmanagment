import { createClient } from '@libsql/client';

const c = createClient({ url: 'file:local.db' });

const cols = ['contentEn', 'contentHi', 'contentGu', 'name'];

for (const col of cols) {
  try {
    await c.execute(`ALTER TABLE MessageTemplates ADD COLUMN ${col} TEXT DEFAULT ''`);
    console.log(`✅ Added column: ${col}`);
  } catch (e) {
    console.log(`ℹ️  ${col}: ${e.message}`);
  }
}

c.close();
console.log('Migration done.');
