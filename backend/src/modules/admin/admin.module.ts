import { Module } from '@nestjs/common';
import { AdminController } from './presentation/admin.controller';
import { DistributionModule } from '../distribution/distribution.module';
import { TechniciansModule } from '../technicians/technicians.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [DistributionModule, TechniciansModule, NotificationsModule, SettingsModule],
  controllers: [AdminController],
})
export class AdminModule {}
