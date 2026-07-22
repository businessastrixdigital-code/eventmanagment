import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import NotificationService from '@/services/notification/notification.service';
import Task, { ITask } from '@/models/Task';
import User from '@/models/User';

export class TaskNotificationService {
  /**
   * Send a notification to the assigned staff member when a task is assigned.
   */
  static async sendTaskAssignedNotification(task: ITask): Promise<void> {
    await dbConnect();

    // 1. Fetch Assignee Details
    const assignee = await User.findById(task.assignedTo);
    if (!assignee) {
      console.warn(`Assignee user (ID: ${task.assignedTo}) not found. Skipping assignment notification.`);
      return;
    }

    const dueDateString = new Date(task.dueDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    // 2. Create In-App Notification
    try {
      await Notification.create({
        title: 'New Task Assigned',
        message: `You have been assigned a new checklist task: "${task.title}". Target due date: ${dueDateString}.`,
        recipient: task.assignedTo.toString(),
        type: 'task_assigned',
        marriageId: task.marriageId,
        status: 'unread',
      });
    } catch (err: any) {
      console.error('Failed to create in-app notification for task assignment:', err.message);
    }

    // 3. Queue WhatsApp Notification via Generalized Notification Engine
    if (assignee.mobile) {
      try {
        await NotificationService.enqueueJob({
          marriageId: task.marriageId.toString(),
          recipient: assignee.mobile,
          type: 'reminder',
          provider: 'whatsapp',
          templateName: 'task_assigned',
          variables: {
            staffName: assignee.name,
            taskTitle: task.title,
            dueDate: dueDateString,
            link: `http://localhost:3000/staff`,
          },
          creatorId: task.assignedBy.toString(),
        });
      } catch (err: any) {
        console.error('Failed to queue WhatsApp notification for task assignment:', err.message);
      }
    } else {
      console.warn(`Assignee ${assignee.name} has no mobile number registered. Skipping WhatsApp dispatch.`);
    }
  }

  /**
   * Send a notification to the task creator (Super Admin) when a task is completed.
   */
  static async sendTaskCompletedNotification(task: ITask): Promise<void> {
    await dbConnect();

    // 1. Fetch Creator and Assignee Details
    const creator = await User.findById(task.assignedBy);
    const assignee = await User.findById(task.assignedTo);

    if (!creator) {
      console.warn(`Creator user (ID: ${task.assignedBy}) not found. Skipping completion notification.`);
      return;
    }

    const completionDateString = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // 2. Create In-App Notification
    try {
      await Notification.create({
        title: 'Task Completed',
        message: `Checklist task "${task.title}" assigned to ${assignee?.name || 'Staff'} has been marked as completed.`,
        recipient: task.assignedBy.toString(),
        type: 'task_completed',
        marriageId: task.marriageId,
        status: 'unread',
      });
    } catch (err: any) {
      console.error('Failed to create in-app notification for task completion:', err.message);
    }

    // 3. Queue WhatsApp Notification via Generalized Notification Engine
    if (creator.mobile) {
      try {
        await NotificationService.enqueueJob({
          marriageId: task.marriageId.toString(),
          recipient: creator.mobile,
          type: 'reminder',
          provider: 'whatsapp',
          templateName: 'task_completed',
          variables: {
            adminName: creator.name,
            taskTitle: task.title,
            staffName: assignee?.name || 'Staff',
            completionDate: completionDateString,
          },
          creatorId: task.assignedBy.toString(),
        });
      } catch (err: any) {
        console.error('Failed to queue WhatsApp notification for task completion:', err.message);
      }
    } else {
      console.warn(`Creator ${creator.name} has no mobile number registered. Skipping WhatsApp completion dispatch.`);
    }
  }

  /**
   * Run the reminder scheduler: find tasks due soon and send alerts.
   */
  static async runReminderScheduler(): Promise<{ processedCount: number; tasksAlerted: string[] }> {
    await dbConnect();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1); // 24 hours from now

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Query pending/in_progress tasks due within 24 hours, where a reminder was not sent today
    const tasksDue = await Task.find({
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $lte: tomorrow },
      $or: [
        { lastReminderSentAt: { $exists: false } },
        { lastReminderSentAt: null },
        { lastReminderSentAt: { $lt: todayStart } },
      ],
    });

    const alertedTitles: string[] = [];

    for (const task of tasksDue) {
      const assignee = await User.findById(task.assignedTo);
      if (!assignee) continue;

      const dueDateString = new Date(task.dueDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      // 1. In-App Notification
      try {
        await Notification.create({
          title: 'Task Due Reminder',
          message: `Reminder: Task "${task.title}" is due soon (Target date: ${dueDateString}).`,
          recipient: task.assignedTo.toString(),
          type: 'task_reminder',
          marriageId: task.marriageId,
          status: 'unread',
        });
      } catch (err: any) {
        console.error(`Failed to create in-app reminder for task ${task._id}:`, err.message);
      }

      // 2. WhatsApp Notification via Generalized Notification Engine
      if (assignee.mobile) {
        try {
          await NotificationService.enqueueJob({
            marriageId: task.marriageId.toString(),
            recipient: assignee.mobile,
            type: 'reminder',
            provider: 'whatsapp',
            templateName: 'task_reminder',
            variables: {
              staffName: assignee.name,
              taskTitle: task.title,
              dueDate: dueDateString,
            },
            creatorId: task.assignedBy.toString(),
          });
        } catch (err: any) {
          console.error(`Failed to enqueue WhatsApp reminder for task ${task._id}:`, err.message);
        }
      }

      // 3. Mark lastReminderSentAt to prevent duplication today
      task.lastReminderSentAt = new Date();
      await task.save();

      alertedTitles.push(task.title);
    }

    return {
      processedCount: tasksDue.length,
      tasksAlerted: alertedTitles,
    };
  }
}

export default TaskNotificationService;
