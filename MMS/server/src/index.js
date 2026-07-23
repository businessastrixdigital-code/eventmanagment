import express from 'express';
import http from 'http';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import db from './models/index.js';
import { initSocket } from './services/socketService.js';
import { initScheduler } from './services/cronService.js';

import authRoutes from './routes/auth.js';
import superadminRoutes from './routes/superadmin.js';
import coupleRoutes from './routes/couple.js';
import guestRoutes from './routes/guest.js';
import publicRoutes from './routes/public.js';
import communicationRoutes from './routes/communication.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: '*', // Adjust to match frontend port in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Note: no local /uploads static route — all photos live on Cloudinary now,
// since the server's local filesystem is ephemeral on free hosting.

// Register REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/couple', coupleRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/communication', communicationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal server error.', details: err.message });
});

// Database Sync and Seeder function
const seedDatabase = async () => {
  try {
    // Sync main languages (English, Hindi, Gujarati)
    await db.Language.destroy({
      where: {
        code: {
          [db.Sequelize.Op.notIn]: ['en', 'hi', 'gu']
        }
      }
    });

    const englishStrings = {
      welcome: "Welcome to our celebration",
      days: "Days",
      hours: "Hours",
      minutes: "Minutes",
      seconds: "Seconds",
      our_story: "Our Story",
      timeline: "Timeline",
      events: "Events",
      rsvp: "RSVP",
      wishes: "Wishes Wall",
      leave_wish: "Leave a Wish",
      gallery: "Photo Gallery",
      request_photos: "Request Photo Access",
      dress_code: "Dress Code",
      venue: "Venue",
      map: "View on Map",
      submit_rsvp: "Submit RSVP",
      rsvp_success: "RSVP Submitted Successfully!",
      registry: "Gift Registry"
    };

    const hindiStrings = {
      welcome: "हमारे उत्सव में आपका स्वागत है",
      days: "दिन",
      hours: "घंटे",
      minutes: "मिनट",
      seconds: "सेकंड",
      our_story: "हमारी कहानी",
      timeline: "समयरेखा",
      events: "कार्यक्रम",
      rsvp: "आरएसवीपी",
      wishes: "शुभकामनाएं वॉल",
      leave_wish: "शुभकामनाएं दें",
      gallery: "फोटो गैलरी",
      request_photos: "फोटो पहुंच का अनुरोध करें",
      dress_code: "पोशाक संहिता",
      venue: "स्थान",
      map: "मानचित्र पर देखें",
      submit_rsvp: "आरएसवीपी जमा करें",
      rsvp_success: "आरएसवीपी सफलतापूर्वक जमा हो गया!",
      registry: "उपहार सूची"
    };

    const gujaratiStrings = {
      welcome: "અમારા ઉત્સવમાં તમારું સ્વાગત છે",
      days: "દિવસો",
      hours: "કલાક",
      minutes: "મિનિટ",
      seconds: "સેકંડ",
      our_story: "અમારી વાર્તા",
      timeline: "સમયરેખા",
      events: "પ્રસંગો",
      rsvp: "આરએસવીપી",
      wishes: "શુભેચ્છા ભીંત",
      leave_wish: "શુભેચ્છા લખો",
      gallery: "ફોટો ગેલેરી",
      request_photos: "ફોટો એક્સેસ માટે વિનંતી કરો",
      dress_code: "ડ્રેસ કોડ",
      venue: "સ્થળ",
      map: "નકશા પર જુઓ",
      submit_rsvp: "આરએસવીપી સબમિટ કરો",
      rsvp_success: "આરએસવીપી સફળતાપૂર્વક સબમિટ થયું!",
      registry: "ભેટ યાદી"
    };

    const syncLanguage = async (code, label, strings) => {
      const existing = await db.Language.findByPk(code);
      if (existing) {
        existing.label = label;
        existing.strings = strings;
        await existing.save();
      } else {
        await db.Language.create({ code, label, strings });
      }
    };

    await syncLanguage('en', 'English', englishStrings);
    await syncLanguage('hi', 'हिन्दी', hindiStrings);
    await syncLanguage('gu', 'ગુજરાતી', gujaratiStrings);
    console.log('[SEEDER] Main translation language packs synced (English, Hindi, Gujarati)');

    const adminCount = await db.SuperAdmin.count();
    if (adminCount === 0) {
      console.log('[SEEDER] Database is empty. Seeding admin credentials and demo wedding...');

      // 1. Seed Super Admin
      const adminPasswordHash = await bcrypt.hash('admin12345', 10);
      await db.SuperAdmin.create({
        email: 'admin@wedding.com',
        passwordHash: adminPasswordHash,
      });
      console.log('[SEEDER] Super Admin account created: email=admin@wedding.com, password=admin12345');

      // 3. Seed Demo Couple
      const couplePasswordHash = await bcrypt.hash('9876543210@Riya', 10);
      const demoCouple = await db.Couple.create({
        brideName: 'Riya',
        groomName: 'Arjun',
        mobile: '9876543210',
        passwordHash: couplePasswordHash,
        slug: 'riya-arjun',
        weddingDate: '2026-11-20',
        storyBio: 'From class partners in college to lifetime adventure partners, our journey has been filled with laughter, travels, and countless plates of pasta. We cannot wait to celebrate the start of our forever with our favorite people.',
        mustResetPassword: false // pre-configured to skip forced password reset for instant testing
      });
      console.log('[SEEDER] Demo couple account created: mobile=9876543210, password=9876543210@Riya, slug=riya-arjun');

      // 4. Seed Demo Events for Couple
      const haldiEvent = await db.Event.create({
        coupleId: demoCouple.id,
        type: 'Haldi',
        title: 'Haldi & Phoolon Ki Holi',
        date: '2026-11-19',
        time: '10:00 AM',
        venue: 'Poolside Lawn, Golden Palms Resort',
        mapLink: 'https://maps.google.com',
        dressCode: 'Bright Yellow / Mustard Traditional',
        description: 'Get ready to be drenched in turmeric paste and flower petals! Join us for a fun-filled morning with dhol, music, and appetizers.'
      });

      const sangeetEvent = await db.Event.create({
        coupleId: demoCouple.id,
        type: 'Sangeet',
        title: 'Sangeet & Dance Night',
        date: '2026-11-19',
        time: '07:00 PM',
        venue: 'Grand Ballroom, Golden Palms Resort',
        mapLink: 'https://maps.google.com',
        dressCode: 'Sleek Indo-Western / Blingy Ethnic',
        description: 'Put on your dancing shoes! An evening of dance performances, cocktails, and dynamic beats.'
      });

      const weddingEvent = await db.Event.create({
        coupleId: demoCouple.id,
        type: 'Wedding',
        title: 'Main Wedding Ceremony',
        date: '2026-11-20',
        time: '04:30 PM',
        venue: 'The Mandap Dome, Golden Palms Resort',
        mapLink: 'https://maps.google.com',
        dressCode: 'Royal Pastel Traditional',
        description: 'The vows, the pheras, and the beginning of forever. High tea will be served at 4:30 PM, followed by the Muhurtham at 5:00 PM.'
      });
      console.log('[SEEDER] Demo events created (Haldi, Sangeet, Wedding)');

      // 5. Seed Custom RSVP Fields
      await db.CustomField.create({
        coupleId: demoCouple.id,
        label: 'Dietary Preferences',
        type: 'dropdown',
        required: true,
        options: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'No Preference']
      });

      await db.CustomField.create({
        coupleId: demoCouple.id,
        label: 'Need Accommodation support? (Resort rooms)',
        type: 'checkbox',
        required: false,
        options: []
      });
      console.log('[SEEDER] Demo custom fields created');

      // 6. Seed Demo Guests
      const guest1 = await db.Guest.create({
        coupleId: demoCouple.id,
        name: 'Karan Sharma',
        mobile: '9999911111',
        email: 'karan@example.com',
        side: 'Groom',
        group: 'Friends',
        inviteEvents: [haldiEvent.id, sangeetEvent.id, weddingEvent.id],
        rsvpStatus: { [haldiEvent.id]: 'Yes', [sangeetEvent.id]: 'Yes', [weddingEvent.id]: 'Yes' },
        customFieldValues: { '1': 'Non-Vegetarian', '2': false }
      });

      const guest2 = await db.Guest.create({
        coupleId: demoCouple.id,
        name: 'Asha Patel',
        mobile: '8888822222',
        email: 'asha@example.com',
        side: 'Bride',
        group: 'Family',
        inviteEvents: [sangeetEvent.id, weddingEvent.id],
        rsvpStatus: { [sangeetEvent.id]: 'Pending', [weddingEvent.id]: 'Pending' },
        customFieldValues: {}
      });
      console.log('[SEEDER] Demo guests Karan and Asha created');

      // 7. Seed Demo Wish
      await db.Wish.create({
        coupleId: demoCouple.id,
        guestName: 'Karan Sharma',
        message: 'Congratulations Riya & Arjun! So excited to dance at the Sangeet and see you guys get married. Wishing you all the love in the universe!',
        approved: true
      });
      console.log('[SEEDER] Demo wish created');
    }
  } catch (err) {
    console.error('[SEEDER ERROR] Failed to seed database:', err);
  }
};

// Start the server
const PORT = process.env.PORT || 5000;
db.sequelize.sync({ force: false }).then(async () => {
  console.log('[DATABASE] Postgres connection established & synced.');
  
  // Seed database
  await seedDatabase();

  // Initialize socket.io connection
  const io = initSocket(server);
  app.set('io', io);

  // Initialize background notification scheduler
  initScheduler(io);

  server.listen(PORT, () => {
    console.log(`[SERVER] Running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('[DATABASE ERROR] Failed to initialize Postgres database:', err);
});

// Graceful shutdown to release port 3000 on nodemon restart/exit
const gracefulShutdown = () => {
  console.log('[SERVER] Shutting down gracefully...');
  server.close(() => {
    console.log('[SERVER] HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.log('[SERVER] Forced exit.');
    process.exit(0);
  }, 500);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);

