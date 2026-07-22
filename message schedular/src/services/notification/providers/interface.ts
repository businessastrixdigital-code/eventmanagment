import { ProviderType } from '@/models/NotificationJob';

export interface ISendResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export interface INotificationProvider {
  name: ProviderType;
  send(
    recipient: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<ISendResult>;
}
