import { ISendResult } from '../interface';

export class InteraktWhatsAppAdapter {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.INTERAKT_API_KEY || '';
  }

  async send(
    recipient: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<ISendResult> {
    if (!this.apiKey) {
      console.warn('[InteraktWhatsAppAdapter] Missing Interakt API key. Simulating successful send.');
      return { success: true, messageId: `interakt_mock_${Math.random().toString(36).substring(7)}` };
    }

    try {
      // Interakt uses countryCode and phoneNumber separately, or we parse from recipient
      let countryCode = '+91';
      let phoneNumber = recipient;
      if (recipient.startsWith('+')) {
        countryCode = recipient.substring(0, 3);
        phoneNumber = recipient.substring(3);
      }

      const bodyValues = Object.keys(variables).map((key) => variables[key] || '');

      const url = 'https://api.interakt.ai/v1/public/message/';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countryCode,
          phoneNumber,
          type: 'Template',
          template: {
            name: templateName,
            languageCode: 'en',
            bodyValues,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to dispatch Interakt WhatsApp message',
        };
      }

      return {
        success: true,
        messageId: data.id || `interakt_msg_${Date.now()}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Interakt API request connection error.',
      };
    }
  }
}
