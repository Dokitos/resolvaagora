import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutoAssignUseCase } from '../application/use-cases/auto-assign.use-case';

/**
 * Liga AutoAssignUseCase.retryPendingDistributions() a um cron periódico,
 * para reprocessar automaticamente pedidos presos em IN_DISTRIBUTION (ver
 * comentário do método em auto-assign.use-case.ts).
 */
@Injectable()
export class RedistributionScheduler {
  private readonly logger = new Logger(RedistributionScheduler.name);

  constructor(private readonly autoAssign: AutoAssignUseCase) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async retry() {
    try {
      await this.autoAssign.retryPendingDistributions();
    } catch (err) {
      this.logger.error('Falha ao reprocessar distribuições pendentes', err as Error);
    }
  }
}
