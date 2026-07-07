import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { EmailService } from '../../../notifications/infrastructure/email.service';

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Gera um código de 6 dígitos, guarda-o no Redis (15 min) e envia por email.
   * Responde sempre de forma genérica para não revelar se o email existe.
   * Em ambiente de desenvolvimento devolve o código para facilitar testes.
   */
  async execute(rawEmail: string): Promise<{ message: string; devCode?: string }> {
    const email = rawEmail.toLowerCase().trim();
    const generic = { message: 'Se existir uma conta com este email, enviámos um código de recuperação.' };

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return generic;

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.redis.set(`pwreset:${code}`, user.id, 15 * 60);
    await this.email.send(email, 'Código de recuperação — ResolvaAgora', this.email.passwordResetEmail(code));

    const isDev = this.config.get('NODE_ENV', 'development') !== 'production';
    return isDev ? { ...generic, devCode: code } : generic;
  }
}
