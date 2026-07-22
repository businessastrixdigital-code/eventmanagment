import { ISendResult } from '../interface';

export class MetaWhatsAppAdapter {
  private accessToken: string;
  private phoneNumberId: string;

  constructor() {
    this.accessToken = process.env.META_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.META_PHONE_NUMBER_ID || '';
  }

  async send(
    recipient: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<ISendResult> {
    if (!this.accessToken || !this.phoneNumberId) {
      console.warn('[MetaWhatsAppAdapter] Missing Meta API credentials. Simulating successful send.');
      return { success: true, messageId: `meta_mock_${Math.random().toString(36).substring(7)}` };
    }

    try {
      // Format number to remove + prefix if present
      const formattedRecipient = recipient.replace('+', '');

      // Meta template parameters are positional
      const parameters = Object.keys(variables).map((key) => ({
        type: 'text',
        text: variables[key] || '',
      }));

      const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedRecipient,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en_US',
            },
            components: [
              {
                type: 'body',
                parameters,
              },
            ],
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to dispatch Meta WhatsApp message',
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id || `meta_msg_${Date.now()}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Meta API request connection error.',
      };
    }
  }
}
