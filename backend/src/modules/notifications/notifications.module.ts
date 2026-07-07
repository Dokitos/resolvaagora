import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FcmService } from './infrastructure/fcm.service';
import { EmailService } from './infrastructure/email.service';
import { NotificationQueueConsumer } from './infrastructure/notification-queue.consumer';
import { NotificationsGateway } from './presentation/notifications.gateway';
import { NotificationsController } from './presentation/notifications.controller';

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
  controllers: [NotificationsController],
  providers: [FcmService, EmailService, NotificationQueueConsumer, NotificationsGateway],
  exports: [FcmService, EmailService, NotificationsGateway],
})
export class NotificationsModule {}
