import { Module } from '@nestjs/common';
import { TechniciansController } from './presentation/technicians.controller';
import { CreateTechnicianUseCase } from './application/use-cases/create-technician.use-case';
import { UpdateAvailabilityUseCase } from './application/use-cases/update-availability.use-case';
import { GetScheduleUseCase } from './application/use-cases/get-schedule.use-case';
import { GetEarningsUseCase } from './application/use-cases/get-earnings.use-case';

@Module({
  controllers: [TechniciansController],
  providers: [
    CreateTechnicianUseCase,
    UpdateAvailabilityUseCase,
    GetScheduleUseCase,
    GetEarningsUseCase,
  ],
  exports: [CreateTechnicianUseCase],
})
export class TechniciansModule {}
