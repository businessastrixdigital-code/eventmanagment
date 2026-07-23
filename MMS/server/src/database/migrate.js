import { createClient } from '@libsql/client';
import path from 'path';

const dbPath = path.resolve('local.db');
console.log('Running migration on database:', dbPath);

const client = createClient({
  url: `file:${dbPath}`
});

try {
  // 1. Alter Couples table to add hostGroupAName and hostGroupBName
  try {
    await client.execute("ALTER TABLE Couples ADD COLUMN hostGroupAName TEXT DEFAULT 'Bride Family'");
    console.log('Added hostGroupAName to Couples table.');
  } catch (e) {
    console.log('hostGroupAName might already exist in Couples:', e.message);
  }

  try {
    await client.execute("ALTER TABLE Couples ADD COLUMN hostGroupBName TEXT DEFAULT 'Groom Family'");
    console.log('Added hostGroupBName to Couples table.');
  } catch (e) {
    console.log('hostGroupBName might already exist in Couples:', e.message);
  }

  // 2. Alter Guests table to add hostGroup column
  try {
    await client.execute("ALTER TABLE Guests ADD COLUMN hostGroup TEXT DEFAULT 'HOST_A'");
    console.log('Added hostGroup to Guests table.');
  } catch (e) {
    console.log('hostGroup might already exist in Guests:', e.message);
  }

  // 3. Migrate data from old 'side' column to new 'hostGroup' column
  await client.execute(`
    UPDATE Guests 
    SET hostGroup = CASE 
      WHEN LOWER(side) LIKE 'groom%' THEN 'HOST_B'
      ELSE 'HOST_A'
    END
  `);
  console.log('Migrated side values to hostGroup.');
  console.log('Migration completed successfully.');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  client.close();
}
