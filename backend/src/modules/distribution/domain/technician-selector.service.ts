import { Injectable, Logger } from '@nestjs/common';
import { Specialty } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

export interface SelectionResult {
  technicianId: string | null;
  reason?: string;
}

@Injectable()
export class TechnicianSelectorService {
  private readonly logger = new Logger(TechnicianSelectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async select(
    specialty: Specialty,
    district: string,
    confirmedDate: Date,
    isPriority: boolean,
  ): Promise<SelectionResult> {
    const date = new Date(confirmedDate);
    date.setHours(0, 0, 0, 0);

    // Busca técnicos elegíveis: disponíveis + cobre o distrito + tem a especialidade
    const candidates = await this.prisma.technician.findMany({
      where: {
        status: 'AVAILABLE',
        coverageDistricts: { some: { district } },
        specialties: { some: { specialty } },
      },
      include: {
        dailySchedules: {
          where: { date },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    if (candidates.length === 0) {
      this.logger.warn(`No eligible technicians for ${specialty} in ${district}`);
      return { technicianId: null, reason: 'No eligible technicians' };
    }

    // Filtra técnicos que ainda têm capacidade no dia
    const available = candidates.filter((t) => {
      const schedule = t.dailySchedules[0];
      const currentCount = schedule?.serviceCount ?? 0;
      return currentCount < t.dailyServiceLimit;
    });

    if (available.length === 0) {
      return { technicianId: null, reason: 'All technicians at daily limit' };
    }

    // Ordena: menor carga do dia primeiro; desempate por maior rating médio
    const ranked = available.sort((a, b) => {
      const loadA = a.dailySchedules[0]?.serviceCount ?? 0;
      const loadB = b.dailySchedules[0]?.serviceCount ?? 0;

      if (loadA !== loadB) return loadA - loadB;

      const ratingA = a.reviews.length > 0
        ? a.reviews.reduce((s, r) => s + r.rating, 0) / a.reviews.length
        : 0;
      const ratingB = b.reviews.length > 0
        ? b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length
        : 0;

      return ratingB - ratingA;
    });

    return { technicianId: ranked[0].id };
  }
}
