import { INotificationProvider, ISendResult } from '../interface';
import { ProviderType } from '@/models/NotificationJob';
import { MetaWhatsAppAdapter } from './meta';
import { InteraktWhatsAppAdapter } from './interakt';
import { GupshupWhatsAppAdapter } from './gupshup';
import { Msg91WhatsAppAdapter } from './msg91';
import { TwilioWhatsAppAdapter } from './twilio';

export class WhatsAppAdapter implements INotificationProvider {
  name: ProviderType = 'whatsapp';

  private getActiveAdapter() {
    const provider = (process.env.WHATSAPP_PROVIDER || 'mock').toLowerCase();

    switch (provider) {
      case 'meta':
        return new MetaWhatsAppAdapter();
      case 'interakt':
        return new InteraktWhatsAppAdapter();
      case 'gupshup':
        return new GupshupWhatsAppAdapter();
      case 'msg91':
        return new Msg91WhatsAppAdapter();
      case 'twilio':
        return new TwilioWhatsAppAdapter();
      default:
        // Mock fallback
        return {
          send: async (recipient: string, templateName: string, variables: Record<string, string>): Promise<ISendResult> => {
            console.log(`[MockWhatsAppAdapter] Sending template "${templateName}" to ${recipient} with variables:`, variables);
            
            // Fail if recipient contains "99" to support Dead Letter Queue tests
            if (recipient.includes('99')) {
              return { success: false, error: 'Connection timeout with Mock WhatsApp API.' };
            }
            return { success: true, messageId: `mock_wa_msg_${Math.random().toString(36).substring(7)}` };
          }
        };
    }
  }

  async send(
    recipient: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<ISendResult> {
    const adapter = this.getActiveAdapter();
    console.log(`[WhatsAppAdapter] Delegating template "${templateName}" to provider "${process.env.WHATSAPP_PROVIDER || 'mock'}"`);
    return adapter.send(recipient, templateName, variables);
  }
}
