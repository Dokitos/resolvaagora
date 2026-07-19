import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';
import { StorageService } from '../storage/storage.service';
import { SmsService } from '../otp/sms.service';

/** Taxa de deslocação (mantida em sincronia com create-service-request). */
export const DISPLACEMENT_FEE = 25.0;

/** Public, unauthenticated read of the app-wide flags (read on app startup). */
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly sms: SmsService,
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
      // Builds antigos esperam um número: usa a taxa mínima/base das definições
      // (cai para a constante legada se ambas forem 0/indefinidas).
      displacementFee: s.displacementMinFee || s.displacementBaseFee || DISPLACEMENT_FEE,
      stripePublishableKey: pk.includes('placeholder') ? '' : pk,
      // Indicador de diagnóstico: true se o R2 está configurado (não stub).
      imageUploadsEnabled: this.storage.configured,
      // A app só exige OTP quando a verificação está ligada E a Twilio configurada.
      smsConfigured: this.sms.configured,
      // Diagnóstico: true se o SMTP (Resend) está configurado no backend.
      emailConfigured: !!(this.config.get('SMTP_USER') && this.config.get('SMTP_PASS')),
      // Diagnóstico: true se as credenciais Firebase (FCM) estão no ambiente.
      pushConfigured: !!(
        this.config.get('FIREBASE_PROJECT_ID') && this.config.get('FIREBASE_PRIVATE_KEY')
      ),
    };
  }
}
