import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { StripeService } from '../../infrastructure/stripe.service';

@Injectable()
export class HandleStripeWebhookUseCase {
  private readonly logger = new Logger(HandleStripeWebhookUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly redis: RedisService,
    private readonly stripe: StripeService,
  ) {}

  async execute(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.constructWebhookEvent(payload, signature);
    } catch (err) {
      this.logger.error('Webhook signature verification failed', err);
      throw err;
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await this.handlePaymentSuccess(paymentIntent);
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await this.handlePaymentFailure(paymentIntent);
    }
  }

  private async handlePaymentSuccess(pi: Stripe.PaymentIntent) {
    const { serviceRequestId, type } = pi.metadata;

    // Subscrição Premium: ativar (ou confirmar) a subscrição do cliente.
    if (type === 'SUBSCRIPTION') {
      await this.activateSubscription(pi);
      this.logger.log(`Subscription payment confirmed for PI ${pi.id}`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: 'COMPLETED', paidAt: new Date() },
      });

      // Tanto o pagamento só da deslocação como o do pedido completo (ORDER)
      // marcam o pedido como pago.
      if (type === 'DISPLACEMENT' || type === 'ORDER') {
        await tx.serviceRequest.update({
          where: { id: serviceRequestId },
          data: {
            status: 'PAID',
            isDisplacementFeePaid: true,
            statusHistory: {
              create: {
                oldStatus: 'AWAITING_PAYMENT',
                newStatus: 'PAID',
                notes: 'Stripe payment confirmed',
              },
            },
          },
        });
      }
    });

    await this.rabbitmq.publish(
      this.rabbitmq.exchanges.payments,
      'payment.displacement.confirmed',
      { serviceRequestId, paymentIntentId: pi.id },
    );

    this.logger.log(`Payment confirmed for SR ${serviceRequestId}`);
  }

  /** Cria/ativa a subscrição do cliente após confirmação do pagamento Stripe. */
  private async activateSubscription(pi: Stripe.PaymentIntent) {
    let planId = pi.metadata.planId;
    let clientId = pi.metadata.clientId;

    // Fallback ao Redis caso a metadata não venha completa.
    if (!planId || !clientId) {
      const cached = await this.redis.get(`subpending:${pi.id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          planId = planId || parsed.planId;
          clientId = clientId || parsed.clientId;
        } catch {
          /* ignore malformed cache */
        }
      }
    }

    if (!planId || !clientId) {
      this.logger.warn(`SUBSCRIPTION intent ${pi.id} without planId/clientId — skipped`);
      return;
    }

    const existing = await this.prisma.subscription.findFirst({
      where: { clientId, status: 'ACTIVE' },
    });

    if (existing) {
      this.logger.log(`Client ${clientId} already has an active subscription — skip create`);
    } else {
      const startsAt = new Date();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await this.prisma.subscription.create({
        data: {
          clientId,
          planId,
          status: 'ACTIVE',
          startsAt,
          expiresAt,
          freeVisitsUsed: 0,
        },
      });
    }

    await this.redis.del(`subpending:${pi.id}`);
  }

  private async handlePaymentFailure(pi: Stripe.PaymentIntent) {
    await this.prisma.payment.updateMany({
      where: { stripePaymentIntentId: pi.id },
      data: { status: 'FAILED' },
    });

    this.logger.warn(`Payment failed for PI ${pi.id}`);
  }
}
