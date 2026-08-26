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

    // Filtra técnicos que ainda têm capacidade no dia. NOTA: esta leitura acontece
    // fora de qualquer transação, por isso é apenas um filtro para efeitos de
    // RANKING (escolher o melhor candidato) — não é a verificação autoritativa
    // de limite. Entre esta leitura e o incremento real do contador (feito em
    // AutoAssignUseCase) pode haver corrida com outro pedido concorrente; a
    // verificação final e definitiva é repetida dentro da mesma transação que
    // faz o upsert do TechnicianDailySchedule, imediatamente antes de incrementar.
    const available = candidates.filter((t) => {
      const schedule = t.dailySchedules[0];
      const currentCount = schedule?.serviceCount ?? 0;
      return currentCount < t.dailyServiceLimit;
    });

    if (available.length === 0) {
      return { technicianId: null, reason: 'All technicians at daily limit' };
    }

    const avgRating = (t: (typeof available)[number]) =>
      t.reviews.length > 0 ? t.reviews.reduce((s, r) => s + r.rating, 0) / t.reviews.length : 0;
    const load = (t: (typeof available)[number]) => t.dailySchedules[0]?.serviceCount ?? 0;

    // Ordena por carga do dia + rating — mas a ordem de desempate depende de
    // `isPriority`: pedidos normais preferem o técnico menos ocupado (resposta
    // mais rápida); pedidos prioritários (cliente com plano que inclui
    // "Prioridade Alta/Máxima") preferem o técnico com melhor avaliação, ainda
    // que ligeiramente mais ocupado — era o único sítio onde este campo,
    // definido no plano de assinatura, não tinha qualquer efeito real.
    const ranked = available.sort((a, b) => {
      if (isPriority) {
        const ratingDiff = avgRating(b) - avgRating(a);
        if (ratingDiff !== 0) return ratingDiff;
        return load(a) - load(b);
      }
      const loadDiff = load(a) - load(b);
      if (loadDiff !== 0) return loadDiff;
      return avgRating(b) - avgRating(a);
    });

    return { technicianId: ranked[0].id };
  }
}
