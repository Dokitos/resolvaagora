import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { StripeService } from '../../../payments/infrastructure/stripe.service';

@Injectable()
export class SubscribeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
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

    const paymentIntent = await this.stripe.createPaymentIntent(
      Number(plan.yearlyPrice),
      'eur',
      { type: 'SUBSCRIPTION', planId, clientId: clientUser.client.id },
    );

    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const subscription = await this.prisma.subscription.create({
      data: {
        clientId: clientUser.client.id,
        planId,
        startsAt,
        expiresAt,
      },
      include: { plan: true },
    });

    return {
      subscription,
      payment: {
        clientSecret: paymentIntent.client_secret,
        amount: Number(plan.yearlyPrice),
      },
    };
  }
}
