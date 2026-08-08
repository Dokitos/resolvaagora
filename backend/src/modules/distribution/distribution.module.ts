import { Module } from '@nestjs/common';
import { TechnicianSelectorService } from './domain/technician-selector.service';
import { AutoAssignUseCase } from './application/use-cases/auto-assign.use-case';
import { DistributionQueueConsumer } from './infrastructure/distribution-queue.consumer';
import { RedistributionScheduler } from './infrastructure/redistribution.scheduler';

@Module({
  providers: [
    TechnicianSelectorService,
    AutoAssignUseCase,
    DistributionQueueConsumer,
    RedistributionScheduler,
  ],
  exports: [AutoAssignUseCase],
})
export class DistributionModule {}
