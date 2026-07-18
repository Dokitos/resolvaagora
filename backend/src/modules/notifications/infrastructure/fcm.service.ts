import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  constructor(private readonly config: ConfigService) {}

  private enabled = false;

  /** True quando o Firebase Admin foi inicializado com credenciais válidas. */
  get ready(): boolean {
    return this.enabled;
  }

  onModuleInit() {
    const projectId = this.config.get('FIREBASE_PROJECT_ID');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (!projectId || projectId === 'placeholder' || !privateKey || privateKey.includes('placeholder')) {
      this.logger.warn('Firebase credentials not configured — FCM push notifications disabled');
      return;
    }

    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail: this.config.get('FIREBASE_CLIENT_EMAIL'),
            privateKey,
          }),
        });
      }
      this.enabled = true;
      this.logger.log('Firebase Admin initialized');
    } catch (err) {
      this.logger.error('Firebase Admin init failed — FCM disabled', err);
    }
  }

  async sendToToken(token: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (!this.enabled) return;
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data: data ?? {},
        android: { priority: 'high' },
        apns: { payload: { aps: { contentAvailable: true } } },
      });
    } catch (err) {
      this.logger.error(`FCM send failed for token ${token.substring(0, 20)}...`, err);
    }
  }

  async sendToMultiple(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ success: number; total: number }> {
    if (!this.enabled || tokens.length === 0) return { success: 0, total: tokens.length };
    const messages: admin.messaging.Message[] = tokens.map((token) => ({
      token,
      notification: { title, body },
      data: data ?? {},
      android: { priority: 'high' },
    }));
    const response = await admin.messaging().sendEach(messages);
    this.logger.log(`FCM sent ${response.successCount}/${tokens.length}`);
    return { success: response.successCount, total: tokens.length };
  }
}
