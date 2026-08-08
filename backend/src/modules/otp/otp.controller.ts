import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/infrastructure/jwt.strategy';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { SmsService } from './sms.service';

/** Verificação por SMS (OTP) — usada no percurso de reserva quando ativa. */
@Controller('otp')
@UseGuards(JwtAuthGuard)
export class OtpController {
  constructor(
    private readonly redis: RedisService,
    private readonly sms: SmsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async send(@CurrentUser() user: AuthenticatedUser) {
    // O número vem sempre do perfil do cliente autenticado — nunca do corpo
    // do pedido — para impedir o envio de OTPs para números arbitrários
    // (ver auditoria de segurança).
    const client = await this.prisma.client.findUnique({ where: { userId: user.id } });
    if (!client?.phone) {
      throw new BadRequestException('Não existe número de telefone associado à conta.');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const phone = client.phone;
    await this.redis.set(`otp:${user.id}`, JSON.stringify({ phone, code }), 300); // 5 min
    const to = phone.replace(/\s+/g, '');
    await this.sms.send(to, `ResolvaAgora: o teu código de confirmação é ${code}`);
    return { sent: true, configured: this.sms.configured };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async verify(@CurrentUser() user: AuthenticatedUser, @Body('code') code: string) {
    const raw = await this.redis.get(`otp:${user.id}`);
    if (!raw) return { valid: false };
    const data = JSON.parse(raw) as { phone: string; code: string };
    const valid = data.code === String(code ?? '').trim();
    if (valid) await this.redis.del(`otp:${user.id}`);
    return { valid };
  }
}
