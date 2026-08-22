import { Module } from '@nestjs/common';
import { TechniciansController } from './presentation/technicians.controller';
import { CreateTechnicianUseCase } from './application/use-cases/create-technician.use-case';
import { UpdateAvailabilityUseCase } from './application/use-cases/update-availability.use-case';
import { GetScheduleUseCase } from './application/use-cases/get-schedule.use-case';
import { GetEarningsUseCase } from './application/use-cases/get-earnings.use-case';
import { GetCommunicationsUseCase } from './application/use-cases/get-communications.use-case';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TechniciansController],
  providers: [
    CreateTechnicianUseCase,
    UpdateAvailabilityUseCase,
    GetScheduleUseCase,
    GetEarningsUseCase,
    GetCommunicationsUseCase,
  ],
  exports: [CreateTechnicianUseCase],
})
export class TechniciansModule {}
