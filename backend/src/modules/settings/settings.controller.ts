import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

/** Public, unauthenticated read of the app-wide flags (read on app startup). */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  async public() {
    const s = await this.settings.get();
    return {
      maintenanceMode: s.maintenanceMode,
      maintenanceMessage: s.maintenanceMessage,
      registrationEnabled: s.registrationEnabled,
      paymentsEnabled: s.paymentsEnabled,
      paymentsTestMode: s.paymentsTestMode,
      smsVerificationEnabled: s.smsVerificationEnabled,
    };
  }
}
