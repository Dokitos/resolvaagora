import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { EmailInboxService } from './email-inbox.service';

/**
 * Recebe emails de entrada via webhook da Resend (evento `email.received`).
 * Verifica a assinatura Svix quando `RESEND_WEBHOOK_SECRET` está definido.
 */
@Controller('webhooks/resend')
export class EmailWebhookController {
  private readonly logger = new Logger(EmailWebhookController.name);

  constructor(
    private readonly emails: EmailInboxService,
    private readonly config: ConfigService,
  ) {}

  @Post('inbound')
  @HttpCode(HttpStatus.OK)
  async inbound(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
    const secret = this.config.get<string>('RESEND_WEBHOOK_SECRET');

    if (secret) {
      const ok = this.verifySvix(secret, svixId, svixTimestamp, svixSignature, raw);
      if (!ok) throw new BadRequestException('Assinatura inválida');
    } else {
      this.logger.warn('RESEND_WEBHOOK_SECRET não definido — webhook aceite sem verificação.');
    }

    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Corpo inválido');
    }

    if (payload?.type === 'email.received' || payload?.data) {
      try {
        await this.emails.ingestInbound(payload.data ?? payload);
      } catch (e) {
        this.logger.error(`Falha ao guardar email recebido: ${e}`);
      }
    }
    return { received: true };
  }

  /** Verificação de assinatura Svix (HMAC-SHA256, base64). */
  private verifySvix(
    secret: string,
    id: string,
    timestamp: string,
    signatureHeader: string,
    body: string,
  ): boolean {
    if (!id || !timestamp || !signatureHeader) return false;
    try {
      const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
      const signed = `${id}.${timestamp}.${body}`;
      const expected = crypto.createHmac('sha256', key).update(signed).digest('base64');
      // O header traz uma lista separada por espaços de "v1,<assinatura>".
      const provided = signatureHeader
        .split(' ')
        .map((p) => p.split(',')[1])
        .filter(Boolean);
      return provided.some((sig) => this.safeEqual(sig, expected));
    } catch {
      return false;
    }
  }

  private safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  }
}
