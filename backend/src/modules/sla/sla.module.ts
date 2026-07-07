import { Module } from '@nestjs/common';
import { SlaScheduler } from './infrastructure/sla.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [SlaScheduler],
})
export class SlaModule {}
