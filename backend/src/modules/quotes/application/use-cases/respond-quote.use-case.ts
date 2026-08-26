import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { PayQuoteUseCase } from '../../../payments/application/use-cases/pay-quote.use-case';
import { DifficultyTier, Subscription, SubscriptionPlan } from '@prisma/client';

// Ordem de dificuldade (para comparar com o maxTier do plano) e nº de
// créditos que cada nível consome — únicas constantes fonte-da-verdade,
// espelhadas nos frontends (web/app) só para efeitos de label/UI.
const TIER_RANK: Record<DifficultyTier, number> = { GREEN: 0, YELLOW: 1, RED: 2 };
const TIER_CREDIT_COST: Record<DifficultyTier, number> = { GREEN: 1, YELLOW: 2, RED: 3 };

@Injectable()
export class RespondQuoteUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly payQuote: PayQuoteUseCase,
  ) {}

  async approve(userId: string, serviceRequestId: string, paymentMethod: 'ONLINE' | 'CASH' | 'CREDITS') {
    if (paymentMethod !== 'ONLINE' && paymentMethod !== 'CASH' && paymentMethod !== 'CREDITS') {
      throw new BadRequestException('paymentMethod deve ser ONLINE, CASH ou CREDITS');
    }
    return this.respond(userId, serviceRequestId, 'APPROVED', undefined, paymentMethod);
  }

  async reject(userId: string, serviceRequestId: string, reason?: string) {
    return this.respond(userId, serviceRequestId, 'REJECTED', reason);
  }

  /**
   * Cliente escolheu pagar online, não concluiu o pagamento (fechou o Payment
   * Sheet, cartão recusado, etc.) e quer mudar para pagar em dinheiro no fim
   * do serviço em vez de ficar preso a tentar o cartão outra vez.
   */
  async switchToCash(userId: string, serviceRequestId: string) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });
    if (!clientUser?.client) throw new ForbiddenException('Client only');

    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id: serviceRequestId, clientId: clientUser.client.id },
      include: { quote: true, payments: true },
    });
    if (!sr || !sr.quote) throw new NotFoundException('Quote not found');
    if (sr.status !== 'QUOTE_APPROVED' || sr.quote.paymentMethod !== 'ONLINE') {
      throw new BadRequestException('Este orçamento não está à espera de pagamento online');
    }
    const alreadyPaid = sr.payments.some((p) => p.type === 'QUOTE' && p.status === 'COMPLETED');
    if (alreadyPaid) {
      throw new BadRequestException('O pagamento online já foi confirmado — não é possível mudar para dinheiro');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id: sr.quote!.id },
        data: { paymentMethod: 'CASH' },
      });
      // Qualquer tentativa de pagamento online por cartão que tenha ficado
      // pendente fica sem efeito — a cobrança passa a ser feita em dinheiro.
      await tx.payment.updateMany({
        where: { serviceRequestId, type: 'QUOTE', status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      await tx.payment.create({
        data: {
          serviceRequestId,
          type: 'QUOTE',
          amount: sr.quote!.totalCost,
          currency: 'EUR',
          status: 'PENDING',
        },
      });
    });

    return { success: true, paymentMethod: 'CASH' as const };
  }

  private async respond(
    userId: string,
    serviceRequestId: string,
    action: 'APPROVED' | 'REJECTED',
    reason?: string,
    paymentMethod?: 'ONLINE' | 'CASH' | 'CREDITS',
  ) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });

    if (!clientUser?.client) throw new ForbiddenException('Client only');

    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id: serviceRequestId, clientId: clientUser.client.id },
      include: { quote: true },
    });

    if (!sr || !sr.quote) throw new NotFoundException('Quote not found');
    if (sr.quote.status !== 'PENDING') {
      throw new BadRequestException('Quote already responded');
    }

    if (sr.quote.expiresAt < new Date()) {
      throw new BadRequestException('Quote has expired');
    }

    // Pagar com créditos exige validar, ANTES de comitar nada, que o cliente
    // tem um plano ativo cujo maxTier cobre a dificuldade deste orçamento e
    // que ainda tem créditos suficientes — evita descontar créditos a mais
    // ou aceitar um orçamento sem cobertura real.
    let activeSubscription: (Subscription & { plan: SubscriptionPlan }) | null = null;
    let creditsCost = 0;
    if (action === 'APPROVED' && paymentMethod === 'CREDITS') {
      const tier = sr.quote.difficultyTier;
      if (!tier) {
        throw new BadRequestException('Este orçamento ainda não tem uma classificação de dificuldade');
      }
      activeSubscription = await this.findActiveSubscription(clientUser.client.id);
      if (!activeSubscription) {
        throw new BadRequestException('Não tem um plano de assinatura ativo');
      }
      if (TIER_RANK[tier] > TIER_RANK[activeSubscription.plan.maxTier]) {
        throw new BadRequestException('O seu plano não cobre este nível de dificuldade');
      }
      creditsCost = TIER_CREDIT_COST[tier];
      if (activeSubscription.creditsUsed + creditsCost > activeSubscription.plan.creditsPerYear) {
        throw new BadRequestException('Não tem créditos suficientes no seu plano para este orçamento');
      }
    }

    const newServiceStatus = action === 'APPROVED' ? 'QUOTE_APPROVED' : 'QUOTE_REJECTED';

    await this.prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id: sr.quote!.id },
        data: {
          status: action,
          respondedAt: new Date(),
          rejectionReason: reason,
          paymentMethod: action === 'APPROVED' ? paymentMethod : undefined,
        },
      });

      await tx.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          status: newServiceStatus,
          statusHistory: {
            create: {
              oldStatus: sr.status,
              newStatus: newServiceStatus,
              changedByUserId: userId,
            },
          },
        },
      });

      if (action === 'APPROVED' && paymentMethod === 'CASH') {
        await tx.payment.create({
          data: {
            serviceRequestId,
            type: 'QUOTE',
            amount: sr.quote!.totalCost,
            currency: 'EUR',
            status: 'PENDING',
          },
        });
      }

      if (action === 'APPROVED' && paymentMethod === 'CREDITS' && activeSubscription) {
        // Créditos são um recurso já pago (a assinatura anual) — ao contrário
        // do dinheiro (só cobrado no fim) ou do cartão (pode falhar), a
        // cobertura é garantida agora, por isso o Payment já nasce COMPLETED
        // e sem stripePaymentIntentId (não há cobrança real).
        await tx.payment.create({
          data: {
            serviceRequestId,
            type: 'QUOTE',
            amount: sr.quote!.totalCost,
            currency: 'EUR',
            status: 'COMPLETED',
            paidAt: new Date(),
          },
        });
        await tx.subscription.update({
          where: { id: activeSubscription.id },
          data: { creditsUsed: { increment: creditsCost } },
        });
      }
    });

    const event = action === 'APPROVED' ? 'quote.approved' : 'quote.rejected';
    await this.rabbitmq.publish(this.rabbitmq.exchanges.quotes, event, {
      quoteId: sr.quote.id,
      serviceRequestId,
      clientId: clientUser.client.id,
      technicianId: sr.technicianId,
    });

    if (action === 'APPROVED' && paymentMethod === 'ONLINE') {
      const payment = await this.payQuote.execute(userId, serviceRequestId);
      return { success: true, action, paymentMethod, ...payment };
    }

    return { success: true, action, paymentMethod };
  }

  private async findActiveSubscription(clientId: string) {
    return this.prisma.subscription.findFirst({
      where: { clientId, status: 'ACTIVE' },
      include: { plan: true },
    });
  }
}
