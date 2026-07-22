import dbConnect from '@/lib/db';
import NotificationRepository from '@/repositories/notification.repository';
import { INotification } from '@/models/Notification';
import Marriage from '@/models/Marriage';
import {
  notificationCreateSchema,
  NotificationCreateInput,
} from '@/lib/validation/notification';

export class NotificationService {
  /**
   * Create a new notification, optionally validating the marriage reference.
   */
  static async createNotification(input: NotificationCreateInput): Promise<INotification> {
    await dbConnect();

    const validated = notificationCreateSchema.parse(input);

    if (validated.marriageId) {
      const marriageExists = await Marriage.findById(validated.marriageId);
      if (!marriageExists) {
        throw new Error(`Referenced marriage (ID: ${validated.marriageId}) does not exist`);
      }
    }

    return NotificationRepository.create({
      ...validated,
      status: 'unread',
    });
  }

  /**
   * Retrieve a single notification by ID.
   */
  static async getNotificationById(id: string): Promise<INotification | null> {
    await dbConnect();
    return NotificationRepository.findById(id);
  }

  /**
   * Mark a notification as read (updates status and adds readAt timestamp).
   */
  static async markAsRead(id: string): Promise<INotification | null> {
    await dbConnect();

    const exists = await NotificationRepository.findById(id);
    if (!exists) {
      throw new Error(`Notification not found (ID: ${id})`);
    }

    return NotificationRepository.update(id, {
      status: 'read',
      readAt: new Date(),
    });
  }

  /**
   * Retrieve notification history for a recipient, sorted chronologically.
   */
  static async getHistory(recipient: string): Promise<INotification[]> {
    await dbConnect();
    return NotificationRepository.findByRecipient(recipient);
  }
}

export default NotificationService;
