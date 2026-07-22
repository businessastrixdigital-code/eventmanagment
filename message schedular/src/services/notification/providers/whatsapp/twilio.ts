import { ISendResult } from '../interface';

export class TwilioWhatsAppAdapter {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';
  }

  async send(
    recipient: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<ISendResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.warn('[TwilioWhatsAppAdapter] Missing Twilio credentials. Simulating successful send.');
      return { success: true, messageId: `twilio_mock_${Math.random().toString(36).substring(7)}` };
    }

    try {
      const authHeader = `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`;

      // Construct a generic text message using template variables
      // In Twilio Content API, you pass ContentSid and ContentVariables.
      // But standard Twilio Whatsapp API allows sending a formatted text body.
      // Let's format the body nicely for testing/production fallback!
      let bodyText = `Notification: Template: ${templateName}`;
      if (Object.keys(variables).length > 0) {
        bodyText += '\n' + Object.entries(variables).map(([key, val]) => `${key}: ${val}`).join('\n');
      }

      const params = new URLSearchParams();
      params.append('To', `whatsapp:${recipient}`);
      params.append('From', `whatsapp:${this.fromNumber}`);
      params.append('Body', bodyText);

      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Failed to dispatch Twilio WhatsApp message',
        };
      }

      return {
        success: true,
        messageId: data.sid || `twilio_msg_${Date.now()}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Twilio API request connection error.',
      };
    }
  }
}
