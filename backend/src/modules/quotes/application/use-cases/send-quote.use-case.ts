import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { SendQuoteDto } from '../dto/send-quote.dto';

@Injectable()
export class SendQuoteUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly config: ConfigService,
  ) {}

  async execute(userId: string, serviceRequestId: string, dto: SendQuoteDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { technician: true },
    });

    if (!user?.technician) throw new ForbiddenException('Technician only');

    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id: serviceRequestId, technicianId: user.technician.id },
    });

    if (!sr) throw new NotFoundException('Service request not found');
    if (sr.status !== 'IN_DIAGNOSIS') {
      throw new BadRequestException('Service must be in diagnosis to send quote');
    }

    const existing = await this.prisma.quote.findUnique({ where: { serviceRequestId } });
    if (existing) throw new BadRequestException('Quote already sent');

    const VAT_RATE = 0.23;
    const expiryHours = this.config.get<number>('QUOTE_EXPIRY_HOURS', 48);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    const labor = dto.laborCost;
    const materials = dto.materialsCost ?? 0;
    const subtotal = labor + materials;
    const totalCost = subtotal * (1 + VAT_RATE);

    const quote = await this.prisma.$transaction(async (tx) => {
      const q = await tx.quote.create({
        data: {
          serviceRequestId,
          technicianId: user.technician!.id,
          description: dto.description,
          laborCost: labor,
          materialsCost: materials,
          vatRate: VAT_RATE,
          totalCost,
          expiresAt,
        },
      });

      await tx.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          status: 'QUOTE_SENT',
          statusHistory: {
            create: {
              oldStatus: 'IN_DIAGNOSIS',
              newStatus: 'QUOTE_SENT',
              changedByUserId: userId,
            },
          },
        },
      });

      return q;
    });

    await this.rabbitmq.publish(this.rabbitmq.exchanges.quotes, 'quote.sent', {
      quoteId: quote.id,
      serviceRequestId,
      clientId: sr.clientId,
      totalCost,
      expiresAt,
    });

    return quote;
  }
}
