import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { StripeService } from '../../../payments/infrastructure/stripe.service';
import { SettingsService } from '../../../settings/settings.service';

/**
 * Subscrição do plano Premium. Só ativa a subscrição quando o pagamento está
 * garantido: em modo de teste (ou Stripe não configurada) ativa já; caso
 * contrário devolve o clientSecret e a subscrição só nasce no webhook Stripe.
 */
@Injectable()
export class SubscribeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly settings: SettingsService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async execute(userId: string, planId: string) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        client: {
          include: {
            subscriptions: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    if (!clientUser?.client) throw new NotFoundException('Client not found');

    if (clientUser.client.subscriptions.length > 0) {
      throw new ConflictException('Already has an active subscription');
    }

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: planId, isActive: true },
    });

    if (!plan) throw new NotFoundException('Plan not found');

    const clientId = clientUser.client.id;
    const amount = Number(plan.yearlyPrice);
    const settings = await this.settings.get();

    // Simula quando modo de teste ligado OU Stripe ainda em placeholder: ativa
    // a subscrição imediatamente (sem cobrança real).
    if (settings.paymentsTestMode || !this.stripe.configured) {
      const subscription = await this.activate(clientId, planId);
      return { simulated: true, subscription };
    }

    // Modo real: cria PaymentIntent e adia a ativação para o webhook.
    const paymentIntent = await this.stripe.createPaymentIntent(amount, 'eur', {
      type: 'SUBSCRIPTION',
      planId,
      clientId,
    });

    await this.redis.set(
      `subpending:${paymentIntent.id}`,
      JSON.stringify({ clientId, planId }),
      3600,
    );

    const publishableKey = this.config.get<string>('STRIPE_PUBLISHABLE_KEY') ?? '';

    return {
      simulated: false,
      clientSecret: paymentIntent.client_secret,
      publishableKey,
      planId,
      amount,
    };
  }

  /** Cria a subscrição ACTIVE (usado em teste/visita simulada e no webhook). */
  private async activate(clientId: string, planId: string) {
    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    return this.prisma.subscription.create({
      data: {
        clientId,
        planId,
        status: 'ACTIVE',
        startsAt,
        expiresAt,
        freeVisitsUsed: 0,
      },
      include: { plan: true },
    });
  }
}
