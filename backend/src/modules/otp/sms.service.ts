import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Envio de SMS via API REST da Twilio. Em modo stub (sem credenciais) regista
 * o código no log em vez de enviar — o código fica pronto e ativa-se ao colar
 * as credenciais Twilio no ambiente.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly sid: string;
  private readonly token: string;
  private readonly from: string;
  private readonly stub: boolean;

  constructor(private readonly config: ConfigService) {
    this.sid = config.get<string>('TWILIO_ACCOUNT_SID') ?? '';
    this.token = config.get<string>('TWILIO_AUTH_TOKEN') ?? '';
    this.from = config.get<string>('TWILIO_FROM') ?? '';
    this.stub = !this.sid || !this.token || !this.from || this.sid.includes('placeholder');
    if (this.stub) this.logger.warn('SMS (Twilio) em modo STUB — mensagens não são enviadas');
  }

  /** True quando a Twilio está configurada com credenciais reais. */
  get configured(): boolean {
    return !this.stub;
  }

  async send(to: string, body: string): Promise<void> {
    if (this.stub) {
      this.logger.warn(`SMS stub → ${to}: ${body}`);
      return;
    }
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`;
    const auth = Buffer.from(`${this.sid}:${this.token}`).toString('base64');
    const params = new URLSearchParams({ To: to, From: this.from, Body: body });
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (!res.ok) {
        this.logger.error(`Twilio SMS falhou (${res.status}) para ${to}: ${await res.text()}`);
      }
    } catch (err) {
      this.logger.error(`Twilio SMS erro para ${to}`, err as Error);
    }
  }
}
