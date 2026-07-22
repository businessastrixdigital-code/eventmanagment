import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType = 'invitation' | 'reminder' | 'event_reminder' | 'task_assigned' | 'task_completed' | 'task_reminder';
export type NotificationStatus = 'unread' | 'read';

export interface INotification extends Document {
  title: string;
  message: string;
  recipient: any; // Can be a string ID (like mock accounts) or ObjectId
  type: NotificationType;
  status: NotificationStatus;
  readAt?: Date;
  marriageId?: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    recipient: { type: Schema.Types.Mixed, required: true, index: true },
    type: {
      type: String,
      enum: ['invitation', 'reminder', 'event_reminder', 'task_assigned', 'task_completed', 'task_reminder'],
      required: true,
    },
    status: {
      type: String,
      enum: ['unread', 'read'],
      default: 'unread',
      required: true,
    },
    readAt: { type: Date },
    marriageId: {
      type: Schema.Types.ObjectId,
      ref: 'Marriage',
      index: true,
    },
  },
  { timestamps: true }
);

// Optimize query for fetching recipient's notifications sorted by date
NotificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
