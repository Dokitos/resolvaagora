import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FcmService } from './infrastructure/fcm.service';
import { EmailService } from './infrastructure/email.service';
import { QuotePdfService } from './infrastructure/quote-pdf.service';
import { NotificationQueueConsumer } from './infrastructure/notification-queue.consumer';
import { NotificationsGateway } from './presentation/notifications.gateway';
import { NotificationsController } from './presentation/notifications.controller';
import { NotificationCampaignsController } from './presentation/notification-campaigns.controller';
import { AudienceService } from './application/audience.service';
import { CampaignService } from './application/campaign.service';
import { CampaignScheduler } from './infrastructure/campaign.scheduler';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
  ],
  controllers: [NotificationsController, NotificationCampaignsController],
  providers: [
    FcmService,
    EmailService,
    QuotePdfService,
    NotificationQueueConsumer,
    NotificationsGateway,
    AudienceService,
    CampaignService,
    CampaignScheduler,
  ],
  exports: [FcmService, EmailService, NotificationsGateway],
})
export class NotificationsModule {}
