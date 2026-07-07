import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { StripeService } from '../../infrastructure/stripe.service';

@Injectable()
export class CreateDisplacementPaymentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async execute(userId: string, serviceRequestId: string) {
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
    if (sr.isFreeVisit) {
      // Pula pagamento para visitas gratuitas
      await this.prisma.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          status: 'PAID',
          isDisplacementFeePaid: true,
          statusHistory: {
            create: {
              oldStatus: 'DRAFT',
              newStatus: 'PAID',
              changedByUserId: userId,
              notes: 'Free visit - no payment required',
            },
          },
        },
      });
      return { freeVisit: true };
    }

    const paymentIntent = await this.stripe.createPaymentIntent(
      Number(sr.displacementFee),
      'eur',
      {
        serviceRequestId,
        clientId: clientUser.client.id,
        type: 'DISPLACEMENT',
      },
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          serviceRequestId,
          type: 'DISPLACEMENT',
          amount: sr.displacementFee,
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
            create: {
              oldStatus: 'DRAFT',
              newStatus: 'AWAITING_PAYMENT',
              changedByUserId: userId,
            },
          },
        },
      });
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: Number(sr.displacementFee),
    };
  }
}
