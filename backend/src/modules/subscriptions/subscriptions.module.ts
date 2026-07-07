import { Module } from '@nestjs/common';
import { SubscriptionsController } from './presentation/subscriptions.controller';
import { SubscribeUseCase } from './application/use-cases/subscribe.use-case';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [SubscriptionsController],
  providers: [SubscribeUseCase],
})
export class SubscriptionsModule {}
