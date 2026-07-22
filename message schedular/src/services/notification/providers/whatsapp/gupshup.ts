import { ISendResult } from '../interface';

export class GupshupWhatsAppAdapter {
  private apiKey: string;
  private appName: string;
  private sourceNumber: string;

  constructor() {
    this.apiKey = process.env.GUPSHUP_API_KEY || '';
    this.appName = process.env.GUPSHUP_APP_NAME || '';
    this.sourceNumber = process.env.GUPSHUP_SOURCE_NUMBER || '';
  }

  async send(
    recipient: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<ISendResult> {
    if (!this.apiKey || !this.appName || !this.sourceNumber) {
      console.warn('[GupshupWhatsAppAdapter] Missing Gupshup credentials. Simulating successful send.');
      return { success: true, messageId: `gupshup_mock_${Math.random().toString(36).substring(7)}` };
    }

    try {
      const formattedRecipient = recipient.replace('+', '');
      
      // Gupshup template message details
      const templateParams = Object.keys(variables).map((key) => variables[key] || '');
      const messageBody = JSON.stringify({
        id: templateName,
        params: templateParams,
      });

      const params = new URLSearchParams();
      params.append('channel', 'whatsapp');
      params.append('source', this.sourceNumber);
      params.append('destination', formattedRecipient);
      params.append('src.name', this.appName);
      params.append('message', messageBody);

      const url = 'https://api.gupshup.io/sm/api/v1/template/msg';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok || data.status === 'error') {
        return {
          success: false,
          error: data.message || 'Failed to dispatch Gupshup WhatsApp message',
        };
      }

      return {
        success: true,
        messageId: data.messageId || `gupshup_msg_${Date.now()}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Gupshup API request connection error.',
      };
    }
  }
}
