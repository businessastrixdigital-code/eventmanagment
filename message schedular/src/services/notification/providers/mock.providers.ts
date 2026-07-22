import { INotificationProvider, ISendResult } from './interface';
import { ProviderType } from '@/models/NotificationJob';

export class MockWhatsAppProvider implements INotificationProvider {
  name: ProviderType = 'whatsapp';

  async send(recipient: string, templateName: string, variables: Record<string, string>): Promise<ISendResult> {
    console.log(`[MockWhatsAppProvider] Sending template "${templateName}" to ${recipient} with variables:`, variables);

    // Simulate failure if recipient contains "99" (helps testing retry and Dead Letter Queue!)
    if (recipient.includes('99')) {
      return { success: false, error: 'Connection timeout with WhatsApp API.' };
    }

    return { success: true, messageId: `wa_msg_${Math.random().toString(36).substring(7)}` };
  }
}

export class MockSMSProvider implements INotificationProvider {
  name: ProviderType = 'sms';

  async send(recipient: string, templateName: string, variables: Record<string, string>): Promise<ISendResult> {
    console.log(`[MockSMSProvider] Sending SMS text from template "${templateName}" to ${recipient} with variables:`, variables);
    return { success: true, messageId: `sms_msg_${Math.random().toString(36).substring(7)}` };
  }
}

export class MockEmailProvider implements INotificationProvider {
  name: ProviderType = 'email';

  async send(recipient: string, templateName: string, variables: Record<string, string>): Promise<ISendResult> {
    console.log(`[MockEmailProvider] Sending Email template "${templateName}" to ${recipient} with variables:`, variables);
    return { success: true, messageId: `email_msg_${Math.random().toString(36).substring(7)}` };
  }
}

export class MockPushProvider implements INotificationProvider {
  name: ProviderType = 'push';

  async send(recipient: string, templateName: string, variables: Record<string, string>): Promise<ISendResult> {
    console.log(`[MockPushProvider] Sending push payload template "${templateName}" to token ${recipient} with variables:`, variables);
    return { success: true, messageId: `push_msg_${Math.random().toString(36).substring(7)}` };
  }
}
