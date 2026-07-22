import { z } from 'zod';

export const notificationCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150, 'Title cannot exceed 150 characters'),
  message: z.string().min(1, 'Message is required'),
  recipient: z.union([z.string().min(1), z.any()]), // supports string IDs, emails, or objectIds
  type: z.enum(['invitation', 'reminder', 'event_reminder', 'task_assigned', 'task_completed', 'task_reminder']),
  marriageId: z.string().optional(),
});

export const notificationUpdateSchema = z.object({
  status: z.enum(['unread', 'read']),
});

export type NotificationCreateInput = z.infer<typeof notificationCreateSchema>;
export type NotificationUpdateInput = z.infer<typeof notificationUpdateSchema>;
