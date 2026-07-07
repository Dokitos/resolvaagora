import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ServiceStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';

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

    const updated = await this.prisma.serviceRequest.update({
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
      await this.handleCompletion(updated);
    }

    return updated;
  }

  private async handleCompletion(sr: any) {
    const quote = await this.prisma.quote.findUnique({
      where: { serviceRequestId: sr.id },
    });

    if (quote) {
      const commissionRate = 0.15; // 15% — configurável
      const serviceAmount = Number(quote.totalCost) * (1 - commissionRate);
      const displacementAmount = Number(sr.displacementFee);

      await this.prisma.earning.createMany({
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

    if (sr.subscriptionId && sr.isFreeVisit) {
      await this.prisma.subscription.update({
        where: { id: sr.subscriptionId },
        data: { freeVisitsUsed: { increment: 1 } },
      });
    }

    await this.rabbitmq.publish(
      this.rabbitmq.exchanges.serviceRequests,
      'service-request.completed',
      { serviceRequestId: sr.id, clientId: sr.clientId, technicianId: sr.technicianId },
    );
  }
}
