import { Module } from '@nestjs/common';
import { SubscriptionsController } from './presentation/subscriptions.controller';
import { SubscribeUseCase } from './application/use-cases/subscribe.use-case';
import { PaymentsModule } from '../payments/payments.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PaymentsModule, SettingsModule],
  controllers: [SubscriptionsController],
  providers: [SubscribeUseCase],
})
export class SubscriptionsModule {}
