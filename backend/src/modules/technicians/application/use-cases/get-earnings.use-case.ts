import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

@Injectable()
export class GetEarningsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, period: 'week' | 'month' | 'all' = 'month') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { technician: true },
    });

    if (!user?.technician) {
      throw new NotFoundException('Technician not found');
    }

    const from = new Date();
    if (period === 'week') {
      from.setDate(from.getDate() - 7);
    } else if (period === 'month') {
      from.setMonth(from.getMonth() - 1);
    } else {
      from.setFullYear(2000);
    }

    const earnings = await this.prisma.earning.findMany({
      where: {
        technicianId: user.technician.id,
        earnedAt: { gte: from },
      },
      include: {
        serviceRequest: {
          include: { client: true, address: true },
        },
      },
      orderBy: { earnedAt: 'desc' },
    });

    const total = earnings.reduce((sum, e) => sum + Number(e.amount), 0);

    return { earnings, total, period };
  }
}
