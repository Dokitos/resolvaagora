import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

@Controller('referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
export class ReferralsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Generates a unique referral code for a client (idempotent). */
  static async ensureCode(prisma: PrismaService, clientId: string, firstName: string): Promise<string> {
    const existing = await prisma.client.findUnique({ where: { id: clientId }, select: { referralCode: true } });
    if (existing?.referralCode) return existing.referralCode;

    const base = (firstName || 'MOURA').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'MOURA';
    for (let i = 0; i < 5; i++) {
      const code = base + Math.random().toString(36).slice(2, 6).toUpperCase();
      const clash = await prisma.client.findUnique({ where: { referralCode: code } });
      if (!clash) {
        await prisma.client.update({ where: { id: clientId }, data: { referralCode: code } });
        return code;
      }
    }
    // Fallback to a longer random code
    const code = 'MOURA' + Math.random().toString(36).slice(2, 8).toUpperCase();
    await prisma.client.update({ where: { id: clientId }, data: { referralCode: code } });
    return code;
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const config = await this.prisma.referralConfig.findUnique({ where: { id: 'default' } });
    const rewardAmount = Number(config?.rewardAmount ?? 10);
    const active = config?.isActive ?? true;

    const client = await this.prisma.client.findFirst({ where: { userId: user.id } });
    if (!client) {
      return { code: null, referredCount: 0, rewardTotal: 0, rewardAmount, active, shareMessage: '', referrals: [] };
    }

    const code = await ReferralsController.ensureCode(this.prisma, client.id, client.firstName);

    const referrals = await this.prisma.referral.findMany({
      where: { referrerClientId: client.id },
      include: { referred: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rewardTotal = referrals.reduce((sum, r) => sum + Number(r.rewardAmount ?? 0), 0);

    const rawMsg =
      config?.shareMessage ??
      'Junta-te à ResolvaAgora com o meu código {code} e poupamos os dois! https://resolvaagora.pt';
    const shareMessage = rawMsg.replace(/\{code\}/g, code ?? '');

    return {
      code,
      referredCount: referrals.length,
      rewardTotal,
      rewardAmount,
      active,
      shareMessage,
      referrals: referrals.map((r) => ({
        name: r.referred ? `${r.referred.firstName} ${r.referred.lastName}` : 'Convidado',
        status: r.status,
        reward: Number(r.rewardAmount ?? 0),
        createdAt: r.createdAt,
      })),
    };
  }
}
