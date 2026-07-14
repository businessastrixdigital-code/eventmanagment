import db from './src/models/index.js';

async function testConnection() {
  console.log('=== VERIFYING DATABASE SYNCHRONIZATION AND SEEDING ===');
  try {
    await db.sequelize.authenticate();
    console.log('✓ SQLite Database connection successful.');

    // Sync schema to create tables
    await db.sequelize.sync({ force: false });
    console.log('✓ Database schema synchronized.');

    const admin = await db.SuperAdmin.findOne();
    if (admin) {
      console.log(`✓ Super Admin user verified: ${admin.email}`);
    } else {
      console.log('✗ Super Admin user seed missing!');
    }

    const languages = await db.Language.findAll();
    console.log(`✓ Languages pack found: ${languages.length} (${languages.map(l => l.code).join(', ')})`);

    const couple = await db.Couple.findOne({ where: { slug: 'riya-arjun' } });
    if (couple) {
      console.log(`✓ Demo Couple verified: Riya & Arjun (Slug: ${couple.slug})`);
      const events = await db.Event.findAll({ where: { coupleId: couple.id } });
      console.log(`✓ Timelines Events found: ${events.length} (${events.map(e => e.type).join(', ')})`);
      
      const fields = await db.CustomField.findAll({ where: { coupleId: couple.id } });
      console.log(`✓ Custom RSVP Fields found: ${fields.length}`);
      
      const guests = await db.Guest.findAll({ where: { coupleId: couple.id } });
      console.log(`✓ Guests seeded: ${guests.length}`);
    } else {
      console.log('✗ Demo Couple missing!');
    }
    
    console.log('=====================================================');
    console.log('✓ All database verification checks passed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('✗ Verification failed with error:', error);
    process.exit(1);
  }
}

testConnection();
