import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Guest from '@/models/Guest';
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
    const body = await request.json();
    const { guestId } = body;
    let { marriageId } = body;

    if (!guestId) {
      return NextResponse.json({ error: 'guestId is required.' }, { status: 400 });
    }

    if (role === 'owner_admin') {
      marriageId = (session.user as any).assignedFunctionId;
    }

    if (!marriageId) {
      return NextResponse.json({ error: 'marriageId is required.' }, { status: 400 });
    }

    // Explicit ownership check
    const guest = await Guest.findById(guestId);
    if (!guest || guest.isDeleted) {
      return NextResponse.json({ error: 'Guest record not found.' }, { status: 404 });
    }

    if (role === 'owner_admin') {
      if (guest.marriageId.toString() !== marriageId.toString() || guest.createdBy.toString() !== session.user.id.toString()) {
        return NextResponse.json({ error: 'Forbidden: Access denied to this guest record.' }, { status: 403 });
      }
    }

    const invitation = await InvitationService.sendInvitation(
      guestId,
      marriageId,
      session.user.id
    );

    return NextResponse.json({ success: true, data: invitation }, { status: 201 });
  } catch (error: any) {
    console.error('Error sending single invitation:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
