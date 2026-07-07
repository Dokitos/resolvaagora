import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

@Injectable()
export class GetScheduleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { technician: true },
    });

    if (!user?.technician) {
      throw new NotFoundException('Technician not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const serviceRequests = await this.prisma.serviceRequest.findMany({
      where: {
        technicianId: user.technician.id,
        status: {
          notIn: ['COMPLETED', 'CANCELLED', 'QUOTE_REJECTED', 'EXPIRED'],
        },
        confirmedDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        client: true,
        address: true,
        quote: true,
      },
      orderBy: { confirmedDate: 'asc' },
    });

    return serviceRequests;
  }
}
