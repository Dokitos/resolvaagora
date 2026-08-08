import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  // NotificationsModule exporta EmailService, usado pelo SettingsController
  // para reportar `emailConfigured` sem duplicar a lógica de configuração.
  imports: [NotificationsModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
