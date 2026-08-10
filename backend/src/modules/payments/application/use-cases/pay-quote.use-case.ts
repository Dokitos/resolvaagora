import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { StripeService } from '../../infrastructure/stripe.service';
import { SettingsService } from '../../../settings/settings.service';

@Injectable()
export class PayQuoteUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly settings: SettingsService,
  ) {}

  async execute(userId: string, serviceRequestId: string) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });
    if (!clientUser?.client) throw new NotFoundException('Client not found');

    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id: serviceRequestId, clientId: clientUser.client.id },
      include: { quote: true },
    });
    if (!sr) throw new NotFoundException('Service request not found');
    if (sr.status !== 'QUOTE_APPROVED' || !sr.quote) {
      throw new BadRequestException('Orçamento não está aprovado');
    }
    if (sr.quote.paymentMethod !== 'ONLINE') {
      throw new BadRequestException('Este orçamento não está marcado para pagamento online');
    }

    const alreadyPaid = await this.prisma.payment.findFirst({
      where: { serviceRequestId, type: 'QUOTE', status: 'COMPLETED' },
    });
    if (alreadyPaid) {
      return { alreadyPaid: true, amount: Number(sr.quote.totalCost) };
    }

    const amount = Number(sr.quote.totalCost);
    const settings = await this.settings.get();

    if (settings.paymentsTestMode || !this.stripe.configured) {
      await this.prisma.payment.upsert({
        where: { stripePaymentIntentId: `pi_sim_quote_${serviceRequestId}` },
        create: {
          serviceRequestId,
          type: 'QUOTE',
          amount,
          currency: 'EUR',
          status: 'COMPLETED',
          paidAt: new Date(),
          stripePaymentIntentId: `pi_sim_quote_${serviceRequestId}`,
        },
        update: { status: 'COMPLETED', paidAt: new Date() },
      });
      return { simulated: true, amount };
    }

    const existingPending = await this.prisma.payment.findFirst({
      where: { serviceRequestId, type: 'QUOTE', status: 'PENDING', stripePaymentIntentId: { not: null } },
    });
    if (existingPending?.stripePaymentIntentId) {
      const pi = await this.stripe.retrievePaymentIntent(existingPending.stripePaymentIntentId);
      if (pi.status !== 'canceled') {
        return {
          clientSecret: pi.client_secret,
          paymentIntentId: pi.id,
          amount,
        };
      }
    }

    const paymentIntent = await this.stripe.createPaymentIntent(amount, 'eur', {
      serviceRequestId,
      clientId: clientUser.client.id,
      type: 'QUOTE',
    });

    await this.prisma.payment.create({
      data: {
        serviceRequestId,
        type: 'QUOTE',
        amount,
        currency: 'EUR',
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
    };
  }
}
