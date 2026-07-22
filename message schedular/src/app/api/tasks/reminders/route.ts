import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import TaskNotificationService from '@/services/task-notification.service';

// POST /api/tasks/reminders — Run reminder scheduler to dispatch task reminders
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role } = session.user;
  const hasAccess = role === 'super_admin' || role === 'owner_admin' || role === 'management';
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const summary = await TaskNotificationService.runReminderScheduler();
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('Error running Task reminder scheduler:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
