import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { SettingsService } from '../../../settings/settings.service';
import { StripeService } from '../../infrastructure/stripe.service';

/**
 * Pagamento do pedido COMPLETO: itens + taxa de deslocação (esta é sempre
 * incluída no total). Em modo de teste (AppSetting.paymentsTestMode) simula o
 * pagamento; caso contrário cria um PaymentIntent real na Stripe para o total.
 */
@Injectable()
export class CreateOrderPaymentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly settings: SettingsService,
    private readonly rabbitmq: RabbitMQService,
    private readonly config: ConfigService,
  ) {}

  async execute(userId: string, serviceRequestId: string, itemsTotal: number) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });
    if (!clientUser?.client) throw new NotFoundException('Client not found');

    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id: serviceRequestId, clientId: clientUser.client.id },
    });
    if (!sr) throw new NotFoundException('Service request not found');
    if (sr.status !== 'DRAFT') {
      throw new BadRequestException('Service request not in draft status');
    }

    // Total a cobrar = itens + deslocação (a deslocação já traz descontos de
    // subscrição/promo aplicados na criação do pedido). Nunca negativo.
    const items = Math.max(0, Number(itemsTotal) || 0);
    const displacement = Number(sr.displacementFee);
    const total = Math.max(0, Number((items + displacement).toFixed(2)));

    // Visita gratuita (subscrição) → sem cobrança.
    if (sr.isFreeVisit && items === 0) {
      await this.markPaid(serviceRequestId, userId, total, null, 'Free visit');
      return { simulated: true, freeVisit: true, total };
    }

    const settings = await this.settings.get();
    const publishableKey = this.config.get<string>('STRIPE_PUBLISHABLE_KEY') ?? '';

    // ── Modo de teste: simula (marca PAID sem cobrar) ──────────────────────
    if (settings.paymentsTestMode) {
      await this.markPaid(serviceRequestId, userId, total, `pi_sim_${Date.now()}`, 'Simulated payment (test mode)');
      return { simulated: true, total };
    }

    // ── Modo real: PaymentIntent na Stripe ─────────────────────────────────
    const paymentIntent = await this.stripe.createPaymentIntent(total, 'eur', {
      serviceRequestId,
      clientId: clientUser.client.id,
      type: 'ORDER',
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          serviceRequestId,
          type: 'SERVICE',
          amount: total,
          currency: 'EUR',
          stripePaymentIntentId: paymentIntent.id,
        },
      });
      await tx.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          status: 'AWAITING_PAYMENT',
          displacementPaymentIntentId: paymentIntent.id,
          statusHistory: {
            create: { oldStatus: 'DRAFT', newStatus: 'AWAITING_PAYMENT', changedByUserId: userId },
          },
        },
      });
    });

    return {
      simulated: false,
      total,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      publishableKey,
    };
  }

  /** Marca o pedido como pago e regista o pagamento (usado em teste/visita grátis). */
  private async markPaid(
    serviceRequestId: string,
    userId: string,
    total: number,
    intentId: string | null,
    note: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          serviceRequestId,
          type: 'SERVICE',
          amount: total,
          currency: 'EUR',
          status: 'COMPLETED',
          paidAt: new Date(),
          stripePaymentIntentId: intentId,
        },
      });
      await tx.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          status: 'PAID',
          isDisplacementFeePaid: true,
          statusHistory: {
            create: { oldStatus: 'DRAFT', newStatus: 'PAID', changedByUserId: userId, notes: note },
          },
        },
      });
    });

    // Dispara a distribuição ao técnico (mesmo evento do pagamento confirmado).
    await this.rabbitmq.publish(
      this.rabbitmq.exchanges.payments,
      'payment.displacement.confirmed',
      { serviceRequestId },
    );
  }
}
