import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ServiceStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { StripeService } from '../../../payments/infrastructure/stripe.service';

/**
 * Pedidos que impedem a eliminação: há alguém à espera do outro lado, ou
 * dinheiro em trânsito. O utilizador tem de os concluir ou cancelar primeiro.
 */
const BLOCKING_STATUSES: ServiceStatus[] = [
  'AWAITING_PAYMENT',
  'PAID',
  'IN_DISTRIBUTION',
  'ASSIGNED',
  'IN_TRANSIT',
  'ARRIVED',
  'IN_DIAGNOSIS',
  'QUOTE_SENT',
  'QUOTE_APPROVED',
  'IN_EXECUTION',
];

/**
 * Eliminação da conta pelo próprio (diretriz 5.1.1(v) da App Store).
 *
 * Não é um `DELETE` da linha: os pedidos, pagamentos, recibos e ganhos apontam
 * para o utilizador e a lei portuguesa obriga a guardar registos de faturação
 * durante anos. O que se faz é remover **os dados pessoais** e fechar a conta,
 * deixando os registos financeiros sem nada que identifique a pessoa.
 *
 * Removido de facto: nome, telefone, NIF, fotografia, moradas, tokens de push,
 * contas Apple/Google ligadas, notificações e mensagens de suporte.
 * Anonimizado: o email, substituído por um endereço interno irreversível.
 * Mantido: pedidos, pagamentos, orçamentos e ganhos, já sem identificação.
 */
@Injectable()
export class DeleteAccountUseCase {
  private readonly logger = new Logger(DeleteAccountUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly stripe: StripeService,
  ) {}

  async execute(userId: string, password?: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { client: true, technician: true },
    });
    if (!user || user.status === 'DELETED') {
      throw new UnauthorizedException('Sessão inválida.');
    }

    // Quem entra com password tem de a confirmar; quem entra com Apple/Google
    // não tem password nenhuma para confirmar, e o ecrã pede outra confirmação
    // em vez disso.
    if (user.passwordHash) {
      if (!password) {
        throw new BadRequestException('Confirme a palavra-passe para eliminar a conta.');
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new BadRequestException('Palavra-passe incorreta.');
      }
    }

    await this.assertNoOpenWork(user.client?.id, user.technician?.id);
    await this.cancelSubscriptions(user.client?.id);

    const anonymousEmail = `apagado-${user.id}@removido.resolvaagora.pt`;

    await this.prisma.$transaction(async (tx) => {
      // Dados que existem só para servir a pessoa: saem por inteiro.
      await tx.fcmToken.deleteMany({ where: { userId } });
      await tx.socialAccount.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.notificationGroupMember.deleteMany({ where: { userId } });
      await tx.supportMessage.deleteMany({ where: { clientUserId: userId } });
      // As mensagens trocadas com o técnico ficam: são o registo do que foi
      // combinado num serviço que continua a existir para efeitos de
      // faturação. Já não têm nome associado, porque o perfil foi anonimizado.


      if (user.client) {
        await tx.address.deleteMany({ where: { clientId: user.client.id } });
        await tx.client.update({
          where: { id: user.client.id },
          data: {
            firstName: 'Conta',
            lastName: 'eliminada',
            phone: null,
            nif: null,
            photoUrl: null,
            emailNotifications: false,
            // O código de indicação é único e público; mantê-lo permitiria
            // continuar a associar indicações a uma conta que já não existe.
            referralCode: null,
          },
        });
      }

      if (user.technician) {
        await tx.technician.update({
          where: { id: user.technician.id },
          data: {
            firstName: 'Conta',
            lastName: 'eliminada',
            phone: '',
            nif: null,
            photoUrl: null,
            status: 'UNAVAILABLE',
          },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymousEmail,
          passwordHash: null,
          status: 'DELETED',
          emailVerified: false,
          emailVerifyToken: null,
        },
      });
    });

    // Corta a sessão em curso: sem isto, o token de acesso ainda válido
    // continuaria a funcionar até expirar.
    await this.redis.del(`refresh:${userId}`);

    this.logger.log(`Conta ${userId} eliminada pelo próprio`);
    return { message: 'A sua conta foi eliminada.' };
  }

  private async assertNoOpenWork(clientId?: string, technicianId?: string) {
    const open = await this.prisma.serviceRequest.count({
      where: {
        status: { in: BLOCKING_STATUSES },
        ...(clientId ? { clientId } : {}),
        ...(technicianId ? { technicianId } : {}),
      },
    });

    if (open > 0) {
      throw new BadRequestException(
        technicianId
          ? 'Tem trabalhos por concluir. Termine-os ou fale connosco antes de eliminar a conta.'
          : 'Tem pedidos em curso. Conclua-os ou cancele-os antes de eliminar a conta.',
      );
    }
  }

  private async cancelSubscriptions(clientId?: string) {
    if (!clientId) return;

    const active = await this.prisma.subscription.findMany({
      where: { clientId, status: 'ACTIVE' },
      select: { id: true, stripeSubscriptionId: true },
    });

    for (const subscription of active) {
      if (subscription.stripeSubscriptionId) {
        // Falhar aqui aborta a eliminação de propósito: é preferível o
        // utilizador voltar a tentar do que ficar sem conta e a ser cobrado.
        await this.stripe.cancelSubscription(subscription.stripeSubscriptionId);
      }
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'CANCELLED' },
      });
    }
  }
}
