import { Module } from '@nestjs/common';
import { AdminController } from './presentation/admin.controller';
import { DistributionModule } from '../distribution/distribution.module';
import { TechniciansModule } from '../technicians/technicians.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';

@Module({
  imports: [DistributionModule, TechniciansModule, NotificationsModule, SettingsModule, ServiceRequestsModule],
  controllers: [AdminController],
})
export class AdminModule {}
