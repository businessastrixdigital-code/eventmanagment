import dbConnect from '@/lib/db';
import Guest from '@/models/Guest';
import Marriage from '@/models/Marriage';
import InvitationRepository from '@/repositories/invitation.repository';
import { IInvitation } from '@/models/Invitation';
import crypto from 'crypto';

export class InvitationService {
  /**
   * Send/Provision a single guest invitation.
   */
  static async sendInvitation(
    guestId: string,
    marriageId: string,
    creatorId: string
  ): Promise<IInvitation> {
    await dbConnect();

    // 1. Verify guest exists and isn't soft-deleted
    const guest = await Guest.findOne({ _id: guestId, isDeleted: { $ne: true } });
    if (!guest) throw new Error('Guest record not found.');

    // 2. Verify function exists
    const marriage = await Marriage.findById(marriageId);
    if (!marriage) throw new Error('Marriage workspace not found.');

    // 3. Resolve the invitation PDF template reference based on category
    let pdfUrl = marriage.invitationPdf;
    if (guest.guestType === 'solo') {
      pdfUrl = (marriage as any).soloCardUrl || marriage.invitationPdf;
    } else if (guest.guestType === 'sahjode' || guest.guestType === 'sajode') {
      pdfUrl = (marriage as any).sajodeCardUrl || marriage.invitationPdf;
    } else if (guest.guestType === 'sarve') {
      pdfUrl = (marriage as any).sarveCardUrl || marriage.invitationPdf;
    }

    // 4. Duplicate prevention
    const existing = await InvitationRepository.findByGuestAndEvent(guestId, marriageId);

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

    if (existing) {
      // Exists: update status and tokens (do not duplicate)
      const updatePayload = {
        status: 'sent',
        magicToken: token,
        magicTokenExpires: expires,
        sentAt: new Date(),
        pdfUrl: pdfUrl || '',
        deliveryAttempts: (existing.deliveryAttempts || 0) + 1,
        updatedBy: creatorId,
      };

      const updated = await InvitationRepository.update(existing._id.toString(), updatePayload);
      if (!updated) throw new Error('Failed to update existing invitation.');
      return updated;
    }

    // Create new
    const newInvitationData = {
      marriageId,
      guestId,
      invitedBy: creatorId,
      invitationType: guest.guestType,
      pdfUrl: pdfUrl || '',
      status: 'sent',
      magicToken: token,
      magicTokenExpires: expires,
      sentAt: new Date(),
      deliveryAttempts: 1,
      createdBy: creatorId,
    };

    return InvitationRepository.create(newInvitationData);
  }

  /**
   * Bulk dispatch invitations to all guests on the host admin's list.
   */
  static async sendAllInvitations(
    marriageId: string,
    creatorId: string
  ): Promise<{ successCount: number; failedCount: number; errors: any[] }> {
    await dbConnect();

    // Query guests matching function and createdBy
    const guests = await Guest.find({ marriageId, createdBy: creatorId, isDeleted: { $ne: true } }).lean();

    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (const guest of guests) {
      try {
        await this.sendInvitation(guest._id.toString(), marriageId, creatorId);
        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push({
          guestId: guest._id,
          name: guest.name,
          error: err.message || 'Error occurred.',
        });
      }
    }

    return {
      successCount,
      failedCount,
      errors,
    };
  }

  /**
   * Regenerates magic token for a guest invite.
   */
  static async regenerateMagicLink(
    invitationId: string,
    creatorId: string
  ): Promise<IInvitation> {
    await dbConnect();

    const invitation = await InvitationRepository.findById(invitationId);
    if (!invitation) throw new Error('Invitation record not found.');

    // Enforce ownership check
    if (invitation.invitedBy.toString() !== creatorId.toString()) {
      throw new Error('Forbidden: Access denied to this invitation.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const updated = await InvitationRepository.update(invitationId, {
      magicToken: token,
      magicTokenExpires: expires,
      updatedBy: creatorId,
    });

    if (!updated) throw new Error('Failed to update invitation.');
    return updated;
  }

  /**
   * Validate token expiry and authenticity.
   */
  static async validateMagicToken(token: string): Promise<IInvitation | null> {
    await dbConnect();

    const invitation = await InvitationRepository.findByMagicToken(token);
    if (!invitation) return null;

    if (new Date(invitation.magicTokenExpires) < new Date()) {
      return null; // Expired
    }

    return invitation;
  }
}

export default InvitationService;
