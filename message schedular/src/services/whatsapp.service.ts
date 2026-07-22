import fs from 'fs';
import path from 'path';

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  responsePayload: any;
  error?: string;
}

export class WhatsAppService {
  private static getApiConfig() {
    return {
      token: process.env.WHATSAPP_TOKEN || '',
      phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      version: process.env.WHATSAPP_VERSION || 'v21.0',
    };
  }

  /**
   * Translates template variables into WhatsApp API parameter structures.
   */
  private static getTemplateComponents(templateName: string, variables: Record<string, string>) {
    let parameters: { type: string; text: string }[] = [];

    if (templateName === 'guest_invitation') {
      parameters = [
        { type: 'text', text: variables.guestName || 'Guest' },
        { type: 'text', text: variables.brideName || 'Bride' },
        { type: 'text', text: variables.groomName || 'Groom' },
        { type: 'text', text: variables.date || 'the wedding date' },
        { type: 'text', text: variables.link || '' },
      ];
    } else if (templateName === 'marriage_reminder') {
      parameters = [
        { type: 'text', text: variables.guestName || 'Guest' },
        { type: 'text', text: variables.brideName || 'Bride' },
        { type: 'text', text: variables.groomName || 'Groom' },
        { type: 'text', text: variables.date || 'the wedding date' },
        { type: 'text', text: variables.venue || 'Wedding Venue' },
      ];
    } else if (templateName === 'event_reminder') {
      parameters = [
        { type: 'text', text: variables.guestName || 'Guest' },
        { type: 'text', text: variables.eventTitle || 'Event' },
        { type: 'text', text: variables.time || 'scheduled time' },
      ];
    } else {
      // General fallback mapping
      parameters = Object.keys(variables).map((key) => ({
        type: 'text',
        text: variables[key],
      }));
    }

    return [
      {
        type: 'body',
        parameters,
      },
    ];
  }

  /**
   * Dispatch template message via Meta API or local Mock logger.
   */
  static async sendTemplate(
    recipient: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<WhatsAppSendResult> {
    const config = this.getApiConfig();
    const isMockMode =
      !config.token ||
      !config.phoneId ||
      config.token === 'dummy_whatsapp_token' ||
      config.phoneId === 'dummy_phone_number_id';

    const cleanRecipient = recipient.replace('+', ''); // WhatsApp API doesn't use '+' prefix in the payload 'to'

    const payload = {
      messaging_product: 'whatsapp',
      to: cleanRecipient,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en_US',
        },
        components: this.getTemplateComponents(templateName, variables),
      },
    };

    if (isMockMode) {
      return this.sendMock(recipient, templateName, variables, payload);
    }

    try {
      const url = `https://graph.facebook.com/${config.version}/${config.phoneId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `WhatsApp API error: ${response.status}`);
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
        responsePayload: data,
      };
    } catch (error: any) {
      console.error('WhatsApp API sending failed:', error.message);
      return {
        success: false,
        error: error.message || 'Unknown network error',
        responsePayload: null,
      };
    }
  }

  /**
   * Mock sender logs calls to console and stores payload inside local JSON file for inspection.
   */
  private static async sendMock(
    recipient: string,
    templateName: string,
    variables: Record<string, string>,
    payload: any
  ): Promise<WhatsAppSendResult> {
    console.log(`\n--- [MOCK WHATSAPP SEND] ---`);
    console.log(`To: ${recipient}`);
    console.log(`Template: ${templateName}`);
    console.log(`Variables:`, JSON.stringify(variables, null, 2));
    console.log(`Payload:`, JSON.stringify(payload, null, 2));
    console.log(`-----------------------------\n`);

    const mockMessageId = `mock-msg-${Math.random().toString(36).substring(2, 11)}`;
    const mockResponse = {
      messaging_product: 'whatsapp',
      contacts: [{ input: recipient, wa_id: recipient.replace('+', '') }],
      messages: [{ id: mockMessageId }],
    };

    try {
      // Save mock logs to scratch/whatsapp_mock_sent.json inside the workspace
      const scratchDir = path.join(process.cwd(), 'scratch');
      if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
      }

      const filePath = path.join(scratchDir, 'whatsapp_mock_sent.json');
      let currentLogs: any[] = [];
      if (fs.existsSync(filePath)) {
        try {
          currentLogs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (e) {
          currentLogs = [];
        }
      }

      currentLogs.push({
        recipient,
        templateName,
        variables,
        payload,
        messageId: mockMessageId,
        sentAt: new Date().toISOString(),
      });

      fs.writeFileSync(filePath, JSON.stringify(currentLogs, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('Failed to write mock WhatsApp log file:', err.message);
    }

    return {
      success: true,
      messageId: mockMessageId,
      responsePayload: mockResponse,
    };
  }
}

export default WhatsAppService;
