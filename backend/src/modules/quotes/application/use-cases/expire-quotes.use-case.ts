import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';

@Injectable()
export class ExpireQuotesUseCase {
  private readonly logger = new Logger(ExpireQuotesUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async execute() {
    const expiredQuotes = await this.prisma.quote.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      include: { serviceRequest: true },
    });

    if (expiredQuotes.length === 0) return;

    this.logger.log(`Expiring ${expiredQuotes.length} quotes`);

    for (const quote of expiredQuotes) {
      await this.prisma.$transaction(async (tx) => {
        await tx.quote.update({
          where: { id: quote.id },
          data: { status: 'EXPIRED' },
        });

        await tx.serviceRequest.update({
          where: { id: quote.serviceRequestId },
          data: {
            status: 'EXPIRED',
            statusHistory: {
              create: {
                oldStatus: quote.serviceRequest.status,
                newStatus: 'EXPIRED',
                notes: 'Quote expired after 48 hours',
              },
            },
          },
        });
      });

      await this.rabbitmq.publish(this.rabbitmq.exchanges.quotes, 'quote.expired', {
        quoteId: quote.id,
        serviceRequestId: quote.serviceRequestId,
        clientId: quote.serviceRequest.clientId,
        technicianId: quote.serviceRequest.technicianId,
      });
    }
  }
}
