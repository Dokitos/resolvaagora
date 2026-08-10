import { Module } from '@nestjs/common';
import { ServiceRequestsController } from './presentation/service-requests.controller';
import { TechnicianServiceRequestsController } from './presentation/technician-service-requests.controller';
import { CreateServiceRequestUseCase } from './application/use-cases/create-service-request.use-case';
import { UpdateServiceStatusUseCase } from './application/use-cases/update-service-status.use-case';
import { UploadProofPhotosUseCase } from './application/use-cases/upload-proof-photos.use-case';
import { DisplacementFeeService } from './application/displacement-fee.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { PaymentsModule } from '../payments/payments.module';
import { CancelServiceRequestUseCase } from './application/use-cases/cancel-service-request.use-case';

@Module({
  imports: [PromotionsModule, NotificationsModule, SettingsModule, PaymentsModule],
  controllers: [ServiceRequestsController, TechnicianServiceRequestsController],
  providers: [
    CreateServiceRequestUseCase,
    UpdateServiceStatusUseCase,
    UploadProofPhotosUseCase,
    DisplacementFeeService,
    CancelServiceRequestUseCase,
  ],
  exports: [CreateServiceRequestUseCase, CancelServiceRequestUseCase],
})
export class ServiceRequestsModule {}
