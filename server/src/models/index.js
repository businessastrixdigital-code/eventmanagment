import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

let sequelize;

if (process.env.USE_SQLITE === 'true') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.SQLITE_PATH || './database.sqlite',
    logging: false,
  });
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Create a free Postgres database (Neon or Supabase) ' +
      'and set DATABASE_URL in your .env before starting the server.'
    );
  }

  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
}

// Models Definition
const SuperAdmin = sequelize.define('SuperAdmin', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const Couple = sequelize.define('Couple', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  brideName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  groomName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mobile: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  brideMobile: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  groomMobile: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  brideUsername: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  groomUsername: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  bridePasswordHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  groomPasswordHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  permissions: {
    type: DataTypes.JSON, // { brideCanEditEvents: boolean, groomCanSendNotifications: boolean, etc. }
    defaultValue: {
      bride: { editEvents: true, sendNotifications: true, manageGuests: true, managePhotos: true },
      groom: { editEvents: true, sendNotifications: true, manageGuests: true, managePhotos: true }
    },
  },
  mustResetPassword: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  weddingDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  coverPhoto: {
    type: DataTypes.STRING, // Cloudinary secure_url
    allowNull: true,
  },
  coverPhotoPublicId: {
    type: DataTypes.STRING, // Cloudinary public_id, needed to delete/replace the asset
    allowNull: true,
  },
  storyBio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  themeConfig: {
    type: DataTypes.JSON, // custom layouts, active sections, section order list
    defaultValue: {
      sections: [
        { id: 'hero', name: 'Welcome Banner', visible: true },
        { id: 'story', name: 'Our Story', visible: true },
        { id: 'timeline', name: 'Events Timeline', visible: true },
        { id: 'gallery', name: 'Photo Gallery', visible: true },
        { id: 'rsvp', name: 'RSVP Form', visible: true },
        { id: 'wishes', name: 'Wishes Wall', visible: true },
      ],
      colors: {
        background: '#F5EFE6',
        primary: '#6B4423',
        heading: '#4A2C17',
        accent: '#C9A66B',
        card: '#FBF7F0'
      },
      activeTemplate: 'classic'
    },
  },
});

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  coupleId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING, // 'Haldi' | 'Sangeet' | 'Mehendi' | 'Engagement' | 'Wedding' | 'Reception' | 'Custom'
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  venue: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mapLink: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dressCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  coverImage: {
    type: DataTypes.STRING, // Cloudinary secure_url
    allowNull: true,
  },
  coverImagePublicId: {
    type: DataTypes.STRING, // Cloudinary public_id, needed to delete/replace the asset
    allowNull: true,
  },
});

const Guest = sequelize.define('Guest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  coupleId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mobile: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  side: {
    type: DataTypes.STRING, // 'Bride' | 'Groom'
    allowNull: false,
    defaultValue: 'Bride',
  },
  group: {
    type: DataTypes.STRING, // 'Family' | 'Friends' | 'VIP' | 'Other'
    allowNull: false,
    defaultValue: 'Other',
  },
  inviteEvents: {
    type: DataTypes.JSON, // Array of eventIds they are invited to: ['id1', 'id2']
    defaultValue: [],
  },
  rsvpStatus: {
    type: DataTypes.JSON, // Map of eventId to rsvp: { 'eventId1': 'Yes', 'eventId2': 'Pending' }
    defaultValue: {},
  },
  customFieldValues: {
    type: DataTypes.JSON, // Map of customFieldId to value: { 'fieldId1': 'Vegetarian', 'fieldId2': '2' }
    defaultValue: {},
  },
});

const CustomField = sequelize.define('CustomField', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  coupleId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING, // 'text' | 'number' | 'dropdown' | 'checkbox' | 'date'
    allowNull: false,
    defaultValue: 'text',
  },
  required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  options: {
    type: DataTypes.JSON, // ['Option 1', 'Option 2'] for dropdown
    defaultValue: [],
  },
});

const Photo = sequelize.define('Photo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  coupleId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: true, // Can be associated with an event, or general
  },
  uploadedBy: {
    type: DataTypes.STRING, // 'Admin' only — guest upload is out of scope for this build
    allowNull: false,
    defaultValue: 'Admin',
  },
  privacy: {
    type: DataTypes.STRING, // 'Public' | 'Approved-guests-only' | 'Private'
    allowNull: false,
    defaultValue: 'Public',
  },
  url: {
    type: DataTypes.STRING, // Cloudinary secure_url
    allowNull: false,
  },
  publicId: {
    type: DataTypes.STRING, // Cloudinary public_id, needed to delete the asset later
    allowNull: true,
  },
});

const PhotoAccessRequest = sequelize.define('PhotoAccessRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  guestId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  coupleId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING, // 'Pending' | 'Approved' | 'Denied'
    defaultValue: 'Pending',
  },
});

const Wish = sequelize.define('Wish', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  coupleId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  guestName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false, // Default false for moderation
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  coupleId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  channel: {
    type: DataTypes.STRING, // 'WhatsApp' only — Email/SMS are out of scope for this build
    allowNull: false,
    defaultValue: 'WhatsApp',
  },
  template: {
    type: DataTypes.TEXT, // Message with placeholders like {guestName}, {eventName}, {venue}, {time}
    allowNull: false,
  },
  recipients: {
    type: DataTypes.JSON, // List of guestIds, or 'all', or 'bride-side', or specific tags
    defaultValue: [],
  },
  status: {
    type: DataTypes.STRING, // 'Scheduled' | 'Pending-Approval' | 'Sent' | 'Failed'
    defaultValue: 'Scheduled',
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  reminderMinutesBefore: {
    type: DataTypes.INTEGER, // e.g. 30 or 45, or null for absolute schedule
    allowNull: true,
  },
});

const Language = sequelize.define('Language', {
  code: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  strings: {
    type: DataTypes.JSON, // Translation dictionary { "rsvp": "Responda Por Favor", ... }
    allowNull: false,
  },
});

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  actorId: {
    type: DataTypes.STRING, // User ID or 'SYSTEM'
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING, // 'LOGIN', 'CREATE_COUPLE', 'RESET_PASSWORD', 'PLAN_CHANGE', etc.
    allowNull: false,
  },
  targetId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// Relationships
Couple.hasMany(Event, { foreignKey: 'coupleId', onDelete: 'CASCADE' });
Event.belongsTo(Couple, { foreignKey: 'coupleId' });

Couple.hasMany(Guest, { foreignKey: 'coupleId', onDelete: 'CASCADE' });
Guest.belongsTo(Couple, { foreignKey: 'coupleId' });

Couple.hasMany(CustomField, { foreignKey: 'coupleId', onDelete: 'CASCADE' });
CustomField.belongsTo(Couple, { foreignKey: 'coupleId' });

Couple.hasMany(Photo, { foreignKey: 'coupleId', onDelete: 'CASCADE' });
Photo.belongsTo(Couple, { foreignKey: 'coupleId' });

Event.hasMany(Photo, { foreignKey: 'eventId', onDelete: 'SET NULL' });
Photo.belongsTo(Event, { foreignKey: 'eventId' });

Couple.hasMany(PhotoAccessRequest, { foreignKey: 'coupleId', onDelete: 'CASCADE' });
PhotoAccessRequest.belongsTo(Couple, { foreignKey: 'coupleId' });

Guest.hasMany(PhotoAccessRequest, { foreignKey: 'guestId', onDelete: 'CASCADE' });
PhotoAccessRequest.belongsTo(Guest, { foreignKey: 'guestId' });

Couple.hasMany(Wish, { foreignKey: 'coupleId', onDelete: 'CASCADE' });
Wish.belongsTo(Couple, { foreignKey: 'coupleId' });

Couple.hasMany(Notification, { foreignKey: 'coupleId', onDelete: 'CASCADE' });
Notification.belongsTo(Couple, { foreignKey: 'coupleId' });

Event.hasMany(Notification, { foreignKey: 'eventId', onDelete: 'CASCADE' });
Notification.belongsTo(Event, { foreignKey: 'eventId' });

const db = {
  sequelize,
  Sequelize,
  SuperAdmin,
  Couple,
  Event,
  Guest,
  CustomField,
  Photo,
  PhotoAccessRequest,
  Wish,
  Notification,
  Language,
  AuditLog,
};

export default db;
