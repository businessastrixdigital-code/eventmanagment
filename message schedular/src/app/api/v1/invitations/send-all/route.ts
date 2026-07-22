import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import InvitationService from '@/services/invitation.service';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'super_admin' && role !== 'owner_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    let { marriageId } = body;

    if (role === 'owner_admin') {
      marriageId = (session.user as any).assignedFunctionId;
    }

    if (!marriageId) {
      return NextResponse.json({ error: 'marriageId is required.' }, { status: 400 });
    }

    const result = await InvitationService.sendAllInvitations(
      marriageId,
      session.user.id
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error sending all invitations:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
