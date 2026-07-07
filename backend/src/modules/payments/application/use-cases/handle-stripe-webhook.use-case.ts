import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { StripeService } from '../../infrastructure/stripe.service';

@Injectable()
export class HandleStripeWebhookUseCase {
  private readonly logger = new Logger(HandleStripeWebhookUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
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

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: 'COMPLETED', paidAt: new Date() },
      });

      if (type === 'DISPLACEMENT') {
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

  private async handlePaymentFailure(pi: Stripe.PaymentIntent) {
    await this.prisma.payment.updateMany({
      where: { stripePaymentIntentId: pi.id },
      data: { status: 'FAILED' },
    });

    this.logger.warn(`Payment failed for PI ${pi.id}`);
  }
}
