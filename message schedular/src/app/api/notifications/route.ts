import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import NotificationService from '@/services/notification.service';
import { ZodError } from 'zod';

// GET /api/notifications — Retrieve notification history
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: userId, role } = session.user;
  const { searchParams } = new URL(request.url);
  let recipient = searchParams.get('recipient') || undefined;

  try {
    // Non-admins (guests, staff) can only fetch their own notification history
    const isAdmin = role === 'super_admin' || role === 'owner_admin';
    if (!isAdmin) {
      recipient = userId;
    } else {
      // If admin doesn't provide a recipient parameter, default to the admin's own history
      recipient = recipient || userId;
    }

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient is required' }, { status: 400 });
    }

    const history = await NotificationService.getHistory(recipient);
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}

// POST /api/notifications — Create/store a new notification
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role } = session.user;
  // Allow admins and management roles to dispatch/create notifications
  const hasAccess = role === 'super_admin' || role === 'owner_admin' || role === 'management';
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const notification = await NotificationService.createNotification(body);
    return NextResponse.json(notification, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/notifications:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
