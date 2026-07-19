import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailInboxService } from './email-inbox.service';
import { EmailController } from './email.controller';
import { EmailWebhookController } from './email-webhook.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [EmailController, EmailWebhookController],
  providers: [EmailInboxService],
})
export class EmailModule {}
