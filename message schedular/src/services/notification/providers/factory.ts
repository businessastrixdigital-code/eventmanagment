import { ProviderType } from '@/models/NotificationJob';
import { INotificationProvider } from './interface';
import { WhatsAppAdapter } from './whatsapp';
import {
  MockSMSProvider,
  MockEmailProvider,
  MockPushProvider,
} from './mock.providers';

class ProviderFactory {
  private providers: Map<ProviderType, INotificationProvider> = new Map();

  constructor() {
    this.registerProvider(new WhatsAppAdapter());
    this.registerProvider(new MockSMSProvider());
    this.registerProvider(new MockEmailProvider());
    this.registerProvider(new MockPushProvider());
  }

  registerProvider(provider: INotificationProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: ProviderType): INotificationProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Notification provider for "${name}" is not registered.`);
    }
    return provider;
  }
}

export const providerFactory = new ProviderFactory();
