import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// 1. SuperAdmin
export const superAdmins = sqliteTable('SuperAdmins', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// 2. Couple
export const couples = sqliteTable('Couples', {
  id: text('id').primaryKey(),
  brideName: text('brideName').notNull(),
  groomName: text('groomName').notNull(),
  mobile: text('mobile').notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  brideMobile: text('brideMobile'),
  groomMobile: text('groomMobile'),
  brideUsername: text('brideUsername').unique(),
  groomUsername: text('groomUsername').unique(),
  bridePasswordHash: text('bridePasswordHash'),
  groomPasswordHash: text('groomPasswordHash'),
  slug: text('slug').notNull().unique(),
  permissions: text('permissions', { mode: 'json' }),
  mustResetPassword: integer('mustResetPassword', { mode: 'boolean' }).default(true),
  weddingDate: text('weddingDate'),
  coverPhoto: text('coverPhoto'),
  coverPhotoPublicId: text('coverPhotoPublicId'),
  storyBio: text('storyBio'),
  sahjodeCard: text('sahjodeCard'),
  sarvaCard: text('sarvaCard'),
  sahjodeCardUrl: text('sahjodeCardUrl'),
  sahjodeCardPublicId: text('sahjodeCardPublicId'),
  sahjodeCardUploadedBy: text('sahjodeCardUploadedBy'),
  sahjodeCardUploadedAt: text('sahjodeCardUploadedAt'),
  sarvaCardUrl: text('sarvaCardUrl'),
  sarvaCardPublicId: text('sarvaCardPublicId'),
  sarvaCardUploadedBy: text('sarvaCardUploadedBy'),
  sarvaCardUploadedAt: text('sarvaCardUploadedAt'),
  themeConfig: text('themeConfig', { mode: 'json' }),
  hostGroupAName: text('hostGroupAName').default('Bride Family'),
  hostGroupBName: text('hostGroupBName').default('Groom Family'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// 3. Event
export const events = sqliteTable('Events', {
  id: text('id').primaryKey(),
  coupleId: text('coupleId').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  venue: text('venue').notNull(),
  mapLink: text('mapLink'),
  dressCode: text('dressCode'),
  description: text('description'),
  coverImage: text('coverImage'),
  coverImagePublicId: text('coverImagePublicId'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// 4. Guest
export const guests = sqliteTable('Guests', {
  id: text('id').primaryKey(),
  coupleId: text('coupleId').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  mobile: text('mobile').notNull(),
  email: text('email'),
  hostGroup: text('hostGroup').notNull().default('HOST_A'),
  group: text('group').notNull().default('Other'),
  inviteEvents: text('inviteEvents', { mode: 'json' }),
  rsvpStatus: text('rsvpStatus', { mode: 'json' }),
  customFieldValues: text('customFieldValues', { mode: 'json' }),
  invitationType: text('invitationType').notNull().default('Sahjode'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// 5. CustomField
export const customFields = sqliteTable('CustomFields', {
  id: text('id').primaryKey(),
  coupleId: text('coupleId').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  type: text('type').notNull().default('text'),
  required: integer('required', { mode: 'boolean' }).default(false),
  options: text('options', { mode: 'json' }),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// 6. Photo
export const photos = sqliteTable('Photos', {
  id: text('id').primaryKey(),
  coupleId: text('coupleId').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  eventId: text('eventId').references(() => events.id, { onDelete: 'set null' }),
  uploadedBy: text('uploadedBy').notNull().default('Admin'),
  privacy: text('privacy').notNull().default('Public'),
  url: text('url').notNull(),
  publicId: text('publicId'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// 7. PhotoAccessRequest
export const photoAccessRequests = sqliteTable('PhotoAccessRequests', {
  id: text('id').primaryKey(),
  guestId: text('guestId').notNull().references(() => guests.id, { onDelete: 'cascade' }),
  coupleId: text('coupleId').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  status: text('status').default('Pending'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// 8. Wish
export const wishes = sqliteTable('Wishes', {
  id: text('id').primaryKey(),
  coupleId: text('coupleId').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  guestName: text('guestName').notNull(),
  message: text('message').notNull(),
  approved: integer('approved', { mode: 'boolean' }).default(false),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// 9. Notification
export const notifications = sqliteTable('Notifications', {
  id: text('id').primaryKey(),
  coupleId: text('coupleId').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  eventId: text('eventId').references(() => events.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull().default('WhatsApp'),
  template: text('template').notNull(),
  recipients: text('recipients', { mode: 'json' }),
  status: text('status').default('Scheduled'),
  scheduledAt: text('scheduledAt').notNull(),
  reminderMinutesBefore: integer('reminderMinutesBefore'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// 10. Message Template
export const messageTemplates = sqliteTable('MessageTemplates', {
  id: text('id').primaryKey(),
  coupleId: text('coupleId').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  hostGroup: text('hostGroup').notNull().default('HOST_A'),
  templateName: text('templateName').notNull(),
  name: text('name').default(''),
  messageType: text('messageType').notNull(),
  audience: text('audience').notNull().default('all'),
  selectedGuestIds: text('selectedGuestIds', { mode: 'json' }),
  messageContent: text('messageContent').notNull(),
  contentEn: text('contentEn').default(''),
  contentHi: text('contentHi').default(''),
  contentGu: text('contentGu').default(''),
  autoAttachInvitation: integer('autoAttachInvitation', { mode: 'boolean' }).default(false),
  isActive: integer('isActive', { mode: 'boolean' }).default(true),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// 11. Message Reminder
export const messageReminders = sqliteTable('MessageReminders', {
  id: text('id').primaryKey(),
  coupleId: text('coupleId').notNull().references(() => couples.id, { onDelete: 'cascade' }),
  hostGroup: text('hostGroup').notNull().default('HOST_A'),
  templateId: text('templateId').notNull().references(() => messageTemplates.id, { onDelete: 'cascade' }),
  eventId: text('eventId').notNull().references(() => events.id, { onDelete: 'cascade' }),
  timing: text('timing').notNull(),
  customMinutesBefore: integer('customMinutesBefore'),
  isEnabled: integer('isEnabled', { mode: 'boolean' }).default(true),
  status: text('status').default('Active'),
  lastTriggeredAt: text('lastTriggeredAt'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// 12. Language
export const languages = sqliteTable('Languages', {
  code: text('code').primaryKey(),
  label: text('label').notNull(),
  strings: text('strings', { mode: 'json' }).notNull(),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// 13. AuditLog
export const auditLogs = sqliteTable('AuditLogs', {
  id: text('id').primaryKey(),
  actorId: text('actorId').notNull(),
  action: text('action').notNull(),
  targetId: text('targetId'),
  reason: text('reason'),
  timestamp: text('timestamp'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

// Relationships
export const couplesRelations = relations(couples, ({ many }) => ({
  events: many(events),
  guests: many(guests),
  customFields: many(customFields),
  photos: many(photos),
  photoAccessRequests: many(photoAccessRequests),
  wishes: many(wishes),
  notifications: many(notifications),
  messageTemplates: many(messageTemplates),
  messageReminders: many(messageReminders),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  couple: one(couples, { fields: [events.coupleId], references: [couples.id] }),
  photos: many(photos),
  notifications: many(notifications),
  messageReminders: many(messageReminders),
}));

export const guestsRelations = relations(guests, ({ one, many }) => ({
  couple: one(couples, { fields: [guests.coupleId], references: [couples.id] }),
  photoAccessRequests: many(photoAccessRequests),
}));

export const customFieldsRelations = relations(customFields, ({ one }) => ({
  couple: one(couples, { fields: [customFields.coupleId], references: [couples.id] }),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  couple: one(couples, { fields: [photos.coupleId], references: [couples.id] }),
  event: one(events, { fields: [photos.eventId], references: [events.id] }),
}));

export const photoAccessRequestsRelations = relations(photoAccessRequests, ({ one }) => ({
  couple: one(couples, { fields: [photoAccessRequests.coupleId], references: [couples.id] }),
  guest: one(guests, { fields: [photoAccessRequests.guestId], references: [guests.id] }),
}));

export const wishesRelations = relations(wishes, ({ one }) => ({
  couple: one(couples, { fields: [wishes.coupleId], references: [couples.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  couple: one(couples, { fields: [notifications.coupleId], references: [couples.id] }),
  event: one(events, { fields: [notifications.eventId], references: [events.id] }),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one }) => ({
  couple: one(couples, { fields: [messageTemplates.coupleId], references: [couples.id] }),
}));

export const messageRemindersRelations = relations(messageReminders, ({ one }) => ({
  couple: one(couples, { fields: [messageReminders.coupleId], references: [couples.id] }),
  template: one(messageTemplates, { fields: [messageReminders.templateId], references: [messageTemplates.id] }),
  event: one(events, { fields: [messageReminders.eventId], references: [events.id] }),
}));
