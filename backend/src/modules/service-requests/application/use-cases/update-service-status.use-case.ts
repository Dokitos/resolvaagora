import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ServiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { SettingsService } from '../../../settings/settings.service';

// Valid transitions per role
const TECHNICIAN_TRANSITIONS: Partial<Record<ServiceStatus, ServiceStatus[]>> = {
  ASSIGNED: ['IN_TRANSIT'],
  IN_TRANSIT: ['ARRIVED'],
  ARRIVED: ['IN_DIAGNOSIS'],
  IN_DIAGNOSIS: ['QUOTE_SENT'],
  QUOTE_APPROVED: ['IN_EXECUTION'],
  IN_EXECUTION: ['COMPLETED'],
};

@Injectable()
export class UpdateServiceStatusUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly settings: SettingsService,
  ) {}

  async execute(
    userId: string,
    serviceRequestId: string,
    newStatus: ServiceStatus,
    notes?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { technician: true },
    });

    if (!user?.technician) throw new ForbiddenException('Technician only');

    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id: serviceRequestId, technicianId: user.technician.id },
    });

    if (!sr) throw new NotFoundException('Service request not found');

    const allowed = TECHNICIAN_TRANSITIONS[sr.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${sr.status} to ${newStatus}`,
      );
    }

    if (newStatus === 'COMPLETED') {
      const proofPhotos = await this.prisma.servicePhoto.count({
        where: { serviceRequestId, type: 'PROOF' },
      });
      if (proofPhotos < 2) {
        throw new BadRequestException('At least 2 proof photos required');
      }
    }

    if (newStatus === 'IN_EXECUTION') {
      const quote = await this.prisma.quote.findUnique({ where: { serviceRequestId } });
      if (quote?.paymentMethod === 'ONLINE') {
        const paid = await this.prisma.payment.findFirst({
          where: { serviceRequestId, type: 'QUOTE', status: 'COMPLETED' },
        });
        if (!paid) {
          throw new BadRequestException(
            'O cliente ainda não confirmou o pagamento online do orçamento. Aguarda a confirmação antes de iniciar o trabalho.',
          );
        }
      }
    }

    // A transição de status e a criação dos earnings (quando o serviço fica
    // COMPLETED) têm de ser atómicas: se a criação dos earnings falhasse fora
    // desta transação, o pedido ficava COMPLETED sem earnings e sem forma de
    // tentar de novo (não há transição válida a partir de COMPLETED).
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          status: newStatus,
          completedAt: newStatus === 'COMPLETED' ? new Date() : undefined,
          statusHistory: {
            create: {
              oldStatus: sr.status,
              newStatus,
              changedByUserId: userId,
              notes,
            },
          },
        },
        include: { client: true, technician: true, address: true },
      });

      if (newStatus === 'COMPLETED') {
        await this.createEarnings(tx, result);
      }

      return result;
    });

    // Eventos só são publicados depois do commit da transação ter sucesso —
    // nunca antes, para não notificar consumidores (distribuição, faturação,
    // etc.) de um estado que ainda pode ser revertido por uma falha na BD.
    await this.rabbitmq.publish(
      this.rabbitmq.exchanges.serviceRequests,
      'service-request.status.updated',
      {
        serviceRequestId,
        oldStatus: sr.status,
        newStatus,
        clientId: updated.clientId,
        technicianId: updated.technicianId,
      },
    );

    if (newStatus === 'COMPLETED') {
      // Nota: a visita grátis é descontada na CONFIRMAÇÃO do pagamento
      // (create-order-payment), não aqui, para refletir logo na conta do cliente.
      await this.rabbitmq.publish(
        this.rabbitmq.exchanges.serviceRequests,
        'service-request.completed',
        { serviceRequestId: updated.id, clientId: updated.clientId, technicianId: updated.technicianId },
      );
    }

    return updated;
  }

  private async createEarnings(tx: Prisma.TransactionClient, sr: any) {
    const quote = await tx.quote.findUnique({
      where: { serviceRequestId: sr.id },
    });

    if (quote) {
      // Pagamento em dinheiro do orçamento fica PENDING desde a aprovação
      // (para aparecer no financeiro como "a receber") e só é dado como
      // COMPLETED aqui, quando o técnico confirma que o serviço terminou.
      if (quote.paymentMethod === 'CASH') {
        await tx.payment.updateMany({
          where: { serviceRequestId: sr.id, type: 'QUOTE', status: 'PENDING' },
          data: { status: 'COMPLETED', paidAt: new Date() },
        });
      }

      const { commissionRate } = await this.settings.get();
      const serviceAmount = Number(quote.totalCost) * (1 - commissionRate);
      const displacementAmount = Number(sr.displacementFee);

      await tx.earning.createMany({
        data: [
          {
            technicianId: sr.technicianId,
            serviceRequestId: sr.id,
            type: 'DISPLACEMENT',
            amount: displacementAmount,
          },
          {
            technicianId: sr.technicianId,
            serviceRequestId: sr.id,
            type: 'SERVICE',
            amount: serviceAmount,
          },
        ],
      });
    }
  }
}
