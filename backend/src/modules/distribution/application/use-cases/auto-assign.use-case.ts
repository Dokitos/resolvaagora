import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { TechnicianSelectorService } from '../../domain/technician-selector.service';

@Injectable()
export class AutoAssignUseCase {
  private readonly logger = new Logger(AutoAssignUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly selector: TechnicianSelectorService,
  ) {}

  async execute(serviceRequestId: string): Promise<void> {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: { address: true },
    });

    if (!sr || sr.status !== 'PAID') {
      this.logger.warn(`SR ${serviceRequestId} not eligible for auto-assign`);
      return;
    }

    await this.prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: {
        status: 'IN_DISTRIBUTION',
        statusHistory: {
          create: { oldStatus: 'PAID', newStatus: 'IN_DISTRIBUTION' },
        },
      },
    });

    const confirmedDate = sr.scheduledDate ?? new Date();

    const result = await this.selector.select(
      sr.specialty,
      sr.address.district,
      confirmedDate,
      sr.isPriority,
    );

    if (!result.technicianId) {
      this.logger.warn(`No technician found for SR ${serviceRequestId}: ${result.reason}`);
      // Admin receives SLA alert via SLA module
      return;
    }

    const date = new Date(confirmedDate);
    date.setHours(0, 0, 0, 0);

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          technicianId: result.technicianId!,
          assignedAt: new Date(),
          confirmedDate,
          status: 'ASSIGNED',
          statusHistory: {
            create: {
              oldStatus: 'IN_DISTRIBUTION',
              newStatus: 'ASSIGNED',
            },
          },
        },
      });

      // Incrementa contador diário do técnico
      await tx.technicianDailySchedule.upsert({
        where: {
          technicianId_date: {
            technicianId: result.technicianId!,
            date,
          },
        },
        create: {
          technicianId: result.technicianId!,
          date,
          serviceCount: 1,
        },
        update: {
          serviceCount: { increment: 1 },
        },
      });
    });

    await this.rabbitmq.publish(
      this.rabbitmq.exchanges.serviceRequests,
      'service-request.assigned',
      {
        serviceRequestId,
        technicianId: result.technicianId,
        clientId: sr.clientId,
      },
    );

    this.logger.log(`SR ${serviceRequestId} assigned to technician ${result.technicianId}`);
  }
}
