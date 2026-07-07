import { Module } from '@nestjs/common';
import { TechnicianSelectorService } from './domain/technician-selector.service';
import { AutoAssignUseCase } from './application/use-cases/auto-assign.use-case';
import { DistributionQueueConsumer } from './infrastructure/distribution-queue.consumer';

@Module({
  providers: [TechnicianSelectorService, AutoAssignUseCase, DistributionQueueConsumer],
  exports: [AutoAssignUseCase],
})
export class DistributionModule {}
