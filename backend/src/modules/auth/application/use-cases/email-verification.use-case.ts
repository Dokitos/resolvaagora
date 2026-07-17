import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { EmailService } from '../../../notifications/infrastructure/email.service';

/** Confirmação de email (suave): verifica o token e reenvia o link. */
@Injectable()
export class EmailVerificationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async verify(token: string): Promise<boolean> {
    if (!token) return false;
    const user = await this.prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) return false;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    });
    return true;
  }

  async resend(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.emailVerified) return;
    const token = randomBytes(32).toString('hex');
    await this.prisma.user.update({ where: { id: userId }, data: { emailVerifyToken: token } });
    const apiBase = this.config.get<string>('PUBLIC_API_URL', 'https://api.resolvaagora.pt/api/v1');
    const link = `${apiBase}/auth/verify-email?token=${token}`;
    await this.email.send(user.email, 'Confirma o teu email — ResolvaAgora', this.email.verifyEmailHtml(link));
  }
}
