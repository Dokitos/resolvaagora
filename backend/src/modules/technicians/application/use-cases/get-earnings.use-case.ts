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

    // Enriquece cada entrada com a referência do serviço que a gerou (o
    // técnico via só "Serviço concluído" sem saber de qual cliente/morada
    // vinha o valor). Mantém os campos originais e apenas acrescenta.
    const enriched = earnings.map((e) => {
      const sr = e.serviceRequest;
      const clientName = sr?.client
        ? `${sr.client.firstName} ${sr.client.lastName}`.trim()
        : null;
      return {
        id: e.id,
        type: e.type,
        amount: e.amount,
        serviceRequestId: e.serviceRequestId,
        earnedAt: e.earnedAt,
        specialty: sr?.specialty ?? null,
        clientName,
        city: sr?.address?.city ?? null,
      };
    });

    return { earnings: enriched, total, period };
  }
}
