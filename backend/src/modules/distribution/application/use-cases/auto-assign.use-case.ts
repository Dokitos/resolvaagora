import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { TechnicianSelectorService } from '../../domain/technician-selector.service';

type ServiceRequestWithAddress = Prisma.ServiceRequestGetPayload<{ include: { address: true } }>;

/**
 * Erro interno usado apenas para abortar a transação de atribuição quando a
 * reconfirmação de capacidade — feita já dentro da transação, imediatamente
 * antes do upsert — mostra que o técnico deixou de ter vaga entretanto
 * (corrida entre pedidos concorrentes). Ao lançar dentro do $transaction, o
 * Prisma reverte tudo (incluindo a mudança de status para ASSIGNED), e o
 * pedido fica em IN_DISTRIBUTION para ser reprocessado (ver
 * retryPendingDistributions abaixo).
 */
class TechnicianAtCapacityError extends Error {
  constructor(readonly technicianId: string) {
    super(`Technician ${technicianId} reached daily limit before increment`);
  }
}

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

    await this.assign(sr);
  }

  /**
   * Reprocessa pedidos presos em IN_DISTRIBUTION há mais de `staleMinutes`
   * minutos — ou porque nenhum técnico estava disponível na 1ª tentativa, ou
   * porque a transação abortou por corrida de capacidade (ver
   * TechnicianAtCapacityError). Reutiliza a mesma lógica de seleção/atribuição
   * do execute(), sem repetir a transição PAID -> IN_DISTRIBUTION (o pedido já
   * está nesse estado).
   *
   * IMPORTANTE: este método está implementado e pronto a usar, mas
   * DELIBERADAMENTE não está ligado a nenhum scheduler automático. Não tive
   * confiança suficiente para ligar um job destes a correr sozinho em
   * produção sem mais testes (ex.: confirmar que não duplica atribuições sob
   * carga, medir custo de correr sobre muitos pedidos presos, etc.).
   *
   * Para ativar, seguir o padrão já usado em SlaScheduler
   * (backend/src/modules/sla/infrastructure/sla.scheduler.ts):
   *
   *   @Injectable()
   *   export class DistributionRetryScheduler {
   *     constructor(private readonly autoAssign: AutoAssignUseCase) {}
   *
   *     @Cron(CronExpression.EVERY_10_MINUTES)
   *     retry() {
   *       return this.autoAssign.retryPendingDistributions();
   *     }
   *   }
   *
   * e registar `DistributionRetryScheduler` nos providers de
   * `distribution.module.ts` (ficheiro fora do âmbito desta correção — não
   * foi alterado aqui).
   */
  async retryPendingDistributions(staleMinutes = 10): Promise<{ processed: number }> {
    const cutoff = new Date(Date.now() - staleMinutes * 60_000);
    const stuck = await this.prisma.serviceRequest.findMany({
      where: { status: 'IN_DISTRIBUTION', updatedAt: { lte: cutoff } },
      include: { address: true },
    });

    if (stuck.length === 0) return { processed: 0 };

    this.logger.log(
      `retryPendingDistributions: reprocessando ${stuck.length} pedido(s) presos em IN_DISTRIBUTION há mais de ${staleMinutes}min`,
    );

    for (const sr of stuck) {
      try {
        await this.assign(sr);
      } catch (err) {
        this.logger.error(`retryPendingDistributions: falha ao reprocessar SR ${sr.id}`, err as Error);
      }
    }

    return { processed: stuck.length };
  }

  /** Seleciona técnico e, atomicamente, atribui o pedido + incrementa a carga diária. */
  private async assign(sr: ServiceRequestWithAddress): Promise<void> {
    const confirmedDate = sr.scheduledDate ?? new Date();

    const result = await this.selector.select(
      sr.specialty,
      sr.address.district,
      confirmedDate,
      sr.isPriority,
    );

    if (!result.technicianId) {
      this.logger.warn(`No technician found for SR ${sr.id}: ${result.reason}`);
      // Admin receives SLA alert via SLA module
      return;
    }

    const technicianId = result.technicianId;
    const date = new Date(confirmedDate);
    date.setHours(0, 0, 0, 0);

    try {
      await this.prisma.$transaction(
        async (tx) => {
          // Reconfirma a capacidade diária DENTRO da mesma transação que faz o
          // upsert, imediatamente antes de incrementar — reduz drasticamente a
          // janela de corrida entre a seleção (TechnicianSelectorService, fora
          // da transação) e a escrita do contador. Combinado com isolationLevel
          // Serializable, o Postgres deteta e rejeita (P2034) qualquer conflito
          // remanescente entre transações concorrentes sobre a mesma linha.
          const [technician, schedule] = await Promise.all([
            tx.technician.findUnique({
              where: { id: technicianId },
              select: { dailyServiceLimit: true },
            }),
            tx.technicianDailySchedule.findUnique({
              where: { technicianId_date: { technicianId, date } },
              select: { serviceCount: true },
            }),
          ]);

          const currentCount = schedule?.serviceCount ?? 0;
          if (!technician || currentCount >= technician.dailyServiceLimit) {
            throw new TechnicianAtCapacityError(technicianId);
          }

          await tx.serviceRequest.update({
            where: { id: sr.id },
            data: {
              technicianId,
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
              technicianId_date: { technicianId, date },
            },
            create: {
              technicianId,
              date,
              serviceCount: 1,
            },
            update: {
              serviceCount: { increment: 1 },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      const isCapacityRace =
        err instanceof TechnicianAtCapacityError ||
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034');

      if (isCapacityRace) {
        this.logger.warn(
          `SR ${sr.id}: técnico ${technicianId} atingiu o limite diário entretanto (corrida) — pedido continua IN_DISTRIBUTION para retry`,
        );
        return;
      }
      throw err;
    }

    await this.rabbitmq.publish(
      this.rabbitmq.exchanges.serviceRequests,
      'service-request.assigned',
      {
        serviceRequestId: sr.id,
        technicianId,
        clientId: sr.clientId,
      },
    );

    this.logger.log(`SR ${sr.id} assigned to technician ${technicianId}`);
  }
}
