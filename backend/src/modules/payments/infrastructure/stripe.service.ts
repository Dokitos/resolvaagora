import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);
  private readonly isStub: boolean;

  constructor(private readonly config: ConfigService) {
    const key = config.get<string>('STRIPE_SECRET_KEY') ?? '';
    this.isStub = !key || key.includes('placeholder');
    this.stripe = new Stripe(key || 'sk_test_placeholder', {
      apiVersion: '2023-10-16',
    });
    if (this.isStub) {
      this.logger.warn('Stripe running in STUB mode (placeholder key) — payments are simulated');
    }
  }

  /** True quando há uma chave Stripe real configurada (não placeholder). */
  get configured(): boolean {
    return !this.isStub;
  }

  async createPaymentIntent(amount: number, currency = 'eur', metadata: Record<string, string> = {}) {
    if (this.isStub) {
      const id = `pi_stub_${Date.now()}`;
      return {
        id,
        client_secret: `${id}_secret`,
        amount: Math.round(amount * 100),
        currency,
        status: 'requires_payment_method',
        metadata,
      } as unknown as Stripe.PaymentIntent;
    }
    return this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')!;
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
