import { ISendResult } from '../interface';

export class Msg91WhatsAppAdapter {
  private authKey: string;
  private senderNumber: string;

  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY || '';
    this.senderNumber = process.env.MSG91_SENDER_NUMBER || '';
  }

  async send(
    recipient: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<ISendResult> {
    if (!this.authKey || !this.senderNumber) {
      console.warn('[Msg91WhatsAppAdapter] Missing MSG91 credentials. Simulating successful send.');
      return { success: true, messageId: `msg91_mock_${Math.random().toString(36).substring(7)}` };
    }

    try {
      // MSG91 expects number without + prefix
      const formattedRecipient = recipient.replace('+', '');

      const url = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'authkey': this.authKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integratedNumber: this.senderNumber,
          recipient: formattedRecipient,
          templateName,
          languageCode: 'en',
          bodyValues: variables,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        return {
          success: false,
          error: data.message || 'Failed to dispatch MSG91 WhatsApp message',
        };
      }

      return {
        success: true,
        messageId: data.request_id || `msg91_msg_${Date.now()}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'MSG91 API request connection error.',
      };
    }
  }
}
