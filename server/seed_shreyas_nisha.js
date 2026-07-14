import db from './src/models/index.js';
import bcrypt from 'bcryptjs';

const seedShreyasNisha = async () => {
  try {
    console.log('[SEED] Starting custom seed for Shreyas & Nisha...');

    // 1. Check if couple already exists
    const mobile = '7435813607';
    let couple = await db.Couple.findOne({ where: { mobile } });
    if (couple) {
      console.log(`[SEED] Couple with mobile ${mobile} already exists. Deleting to re-create...`);
      await couple.destroy();
    }

    // 2. Hash Password (we set password to 'shreyas123')
    const passwordHash = await bcrypt.hash('shreyas123', 10);
    const slug = 'shreyas-nisha';

    // 3. Create Couple Admin
    couple = await db.Couple.create({
      brideName: 'Nisha',
      groomName: 'Shreyas',
      mobile: mobile,
      passwordHash,
      slug,
      planType: 'Premium',
      weddingDate: '2026-12-18',
      storyBio: 'Welcome to our wedding! We are excited to celebrate our special day with you. Please use this portal to view events, upload photos, and RSVP.',
      mustResetPassword: false, // Set to false so they can log in instantly with shreyas123
    });
    console.log(`[SEED] Couple Shreyas & Nisha created successfully!`);
    console.log(`[SEED] Login Mobile: ${mobile}`);
    console.log(`[SEED] Password: shreyas123`);
    console.log(`[SEED] Website URL: http://localhost:5173/invite/${slug}`);

    // 4. Create Wedding Event
    const weddingEvent = await db.Event.create({
      coupleId: couple.id,
      type: 'Wedding',
      title: 'Wedding Ceremony of Shreyas & Nisha',
      date: '2026-12-18',
      time: '05:00 PM',
      venue: 'Grand Palace Ballroom, Mumbai',
      mapLink: 'https://maps.google.com',
      dressCode: 'Royal Traditional / Ethnic',
      description: 'Join us as we take our vows and start our forever journey together. High tea starts at 5:00 PM followed by ceremony.'
    });
    console.log(`[SEED] Wedding Event created with ID: ${weddingEvent.id}`);

    // 5. Create Guests
    const guestsData = [
      { name: 'Shreyas', mobile: '7435813607', side: 'Groom', group: 'Family' },
      { name: 'Manthan', mobile: '9510666325', side: 'Groom', group: 'Friends' },
      { name: 'Darmik', mobile: '8511868087', side: 'Groom', group: 'Friends' },
      { name: 'Jainil', mobile: '9714740275', side: 'Groom', group: 'Family' }
    ];

    const guests = [];
    for (const g of guestsData) {
      const guest = await db.Guest.create({
        coupleId: couple.id,
        name: g.name,
        mobile: g.mobile,
        side: g.side,
        group: g.group,
        inviteEvents: [weddingEvent.id],
        rsvpStatus: { [weddingEvent.id]: 'Pending' }
      });
      guests.push(guest);
      console.log(`[SEED] Guest created: ${g.name} (${g.mobile})`);
    }

    // 6. Create WhatsApp Notification queue
    const notification = await db.Notification.create({
      coupleId: couple.id,
      eventId: weddingEvent.id,
      channel: 'WhatsApp',
      template: 'Dear {guestName}, we are overjoyed to invite you to our {eventName} on {date} at {time} at {venue}. Please view our wedding website and RSVP here: http://localhost:5173/invite/shreyas-nisha',
      recipients: guests.map(g => g.id),
      status: 'Pending-Action', // Put it straight into Pending-Action so the couple dashboard shows send buttons!
      scheduledAt: new Date()
    });
    console.log(`[SEED] WhatsApp Notification queued. ID: ${notification.id}`);

    // 7. Print custom pre-filled wa.me links for direct usage
    console.log('\n--- PRE-FILLED WHATSAPP INVITATION LINKS ---');
    for (const g of guests) {
      const msg = `Dear ${g.name}, we are overjoyed to invite you to our Wedding Ceremony of Shreyas & Nisha on 2026-12-18 at 05:00 PM at Grand Palace Ballroom, Mumbai. Please view our wedding website and RSVP here: http://localhost:5173/invite/shreyas-nisha`;
      const encodedMsg = encodeURIComponent(msg);
      const cleanMobile = g.mobile.replace(/[^0-9]/g, '');
      const waUrl = `https://wa.me/${cleanMobile}?text=${encodedMsg}`;
      console.log(`${g.name} (${g.mobile}): ${waUrl}`);
    }
    console.log('--------------------------------------------\n');

    console.log('[SEED] Custom seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[SEED ERROR] Seeding failed:', err);
    process.exit(1);
  }
};

// Establish DB connection first
db.sequelize.sync({ force: false }).then(() => {
  seedShreyasNisha();
});
