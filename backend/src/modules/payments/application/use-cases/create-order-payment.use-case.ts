import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { SettingsService } from '../../../settings/settings.service';
import { StripeService } from '../../infrastructure/stripe.service';
import { PromoService } from '../../../promotions/application/promo.service';

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
    private readonly promo: PromoService,
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

    // Subtotal = itens + deslocação (a deslocação já traz o desconto de
    // subscrição aplicado na criação do pedido). Nunca negativo.
    const items = Math.max(0, Number(itemsTotal) || 0);
    const displacement = Number(sr.displacementFee);
    const subtotal = Math.max(0, Number((items + displacement).toFixed(2)));

    // Visita gratuita (subscrição) → sem cobrança.
    if (sr.isFreeVisit && items === 0) {
      await this.markPaid(serviceRequestId, userId, subtotal, null, 'Free visit');
      return { simulated: true, freeVisit: true, total: subtotal };
    }

    // Código promocional: resgatado AGORA e aplicado ao TOTAL do pedido
    // (itens + deslocação) — é aqui que se conhece o total dos itens. Acontece
    // uma única vez, pois o pedido sai de DRAFT logo a seguir.
    let promoDiscount = 0;
    if (sr.promoCode && subtotal > 0) {
      promoDiscount = await this.prisma.$transaction(async (tx) => {
        const redeemed = await this.promo.redeem(tx, sr.promoCode, subtotal);
        if (!redeemed) return 0;
        await tx.serviceRequest.update({
          where: { id: serviceRequestId },
          data: { promoDiscount: redeemed.discount },
        });
        return redeemed.discount;
      });
    }
    const total = Math.max(0, Number((subtotal - promoDiscount).toFixed(2)));

    // Promo cobre o valor todo (ou quase) → sem cobrança na Stripe (mínimo ~0,50€).
    if (total < 0.5) {
      await this.markPaid(serviceRequestId, userId, total, null, 'Coberto por promoção');
      return { simulated: true, total, promoDiscount };
    }

    const settings = await this.settings.get();
    const publishableKey = this.config.get<string>('STRIPE_PUBLISHABLE_KEY') ?? '';

    // ── Simula quando: (a) modo de teste ligado, OU (b) a Stripe ainda não
    //    está realmente configurada (chaves placeholder). Isto evita um fluxo
    //    "meio-real" partido quando o toggle é desligado antes de colar as
    //    chaves reais no Railway — passa a cobrar a sério assim que existirem. ─
    if (settings.paymentsTestMode || !this.stripe.configured) {
      const note = settings.paymentsTestMode
        ? 'Simulated payment (test mode)'
        : 'Simulated payment (Stripe not configured)';
      await this.markPaid(serviceRequestId, userId, total, `pi_sim_${Date.now()}`, note);
      return { simulated: true, total, promoDiscount };
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
      promoDiscount,
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
