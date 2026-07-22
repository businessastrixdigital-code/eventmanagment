import mongoose, { Schema, Document, Model } from 'mongoose';

export type DeliveryStatus = 'pending' | 'queued' | 'processing' | 'sent' | 'delivered' | 'viewed' | 'failed' | 'cancelled';
export type MessageType = 'invitation' | 'reminder' | 'album_ready' | 'general_announcement' | 'custom';
export type ProviderType = 'whatsapp' | 'sms' | 'email' | 'push';

export interface IDeliveryAttempt {
  attemptedAt: Date;
  status: 'sent' | 'failed';
  error?: string;
  providerUsed: ProviderType;
}

export interface INotificationJob extends Document {
  marriageId: mongoose.Types.ObjectId | string;
  guestId?: mongoose.Types.ObjectId | string;
  recipient: string; // Contact mobile, email, or token
  type: MessageType;
  provider: ProviderType;
  templateName: string;
  variables: Record<string, string>;
  status: DeliveryStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  nextAttemptAt: Date;
  error?: string;
  messageId?: string;
  attemptsLog: IDeliveryAttempt[];
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy?: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryAttemptSchema = new Schema({
  attemptedAt: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['sent', 'failed'], required: true },
  error: { type: String },
  providerUsed: { type: String, enum: ['whatsapp', 'sms', 'email', 'push'], required: true },
});

const NotificationJobSchema: Schema<INotificationJob> = new Schema(
  {
    marriageId: {
      type: Schema.Types.ObjectId,
      ref: 'Marriage',
      required: true,
      index: true,
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: 'Guest',
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['invitation', 'reminder', 'album_ready', 'general_announcement', 'custom'],
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['whatsapp', 'sms', 'email', 'push'],
      required: true,
      default: 'whatsapp',
      index: true,
    },
    templateName: {
      type: String,
      required: true,
      trim: true,
    },
    variables: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'queued', 'processing', 'sent', 'delivered', 'viewed', 'failed', 'cancelled'],
      default: 'pending',
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      required: true,
    },
    maxAttempts: {
      type: Number,
      default: 5,
      required: true,
    },
    lastAttemptAt: {
      type: Date,
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    error: {
      type: String,
      trim: true,
    },
    messageId: {
      type: String,
      index: true,
    },
    attemptsLog: {
      type: [DeliveryAttemptSchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.Mixed,
      required: true,
    },
    updatedBy: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Compound index to optimize queue scheduler picking
NotificationJobSchema.index({ status: 1, nextAttemptAt: 1 });

// Prevent duplicate jobs for same guest, wedding, and message type (e.g. Invitation type)
NotificationJobSchema.index({ marriageId: 1, guestId: 1, type: 1 }, { unique: true, sparse: true });

const NotificationJob: Model<INotificationJob> =
  mongoose.models.NotificationJob || mongoose.model<INotificationJob>('NotificationJob', NotificationJobSchema);

export default NotificationJob;
