import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';

/** Taxa de deslocação (mantida em sincronia com create-service-request). */
export const DISPLACEMENT_FEE = 25.0;

/** Public, unauthenticated read of the app-wide flags (read on app startup). */
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
  ) {}

  @Get('public')
  async public() {
    const s = await this.settings.get();
    const pk = this.config.get<string>('STRIPE_PUBLISHABLE_KEY') ?? '';
    return {
      maintenanceMode: s.maintenanceMode,
      maintenanceMessage: s.maintenanceMessage,
      registrationEnabled: s.registrationEnabled,
      paymentsEnabled: s.paymentsEnabled,
      paymentsTestMode: s.paymentsTestMode,
      smsVerificationEnabled: s.smsVerificationEnabled,
      // A app usa isto para iniciar a Stripe e mostrar o total com deslocação.
      displacementFee: DISPLACEMENT_FEE,
      stripePublishableKey: pk.includes('placeholder') ? '' : pk,
    };
  }
}
