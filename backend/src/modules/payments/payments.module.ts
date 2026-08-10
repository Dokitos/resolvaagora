import { Module } from '@nestjs/common';
import { PaymentsController } from './presentation/payments.controller';
import { StripeService } from './infrastructure/stripe.service';
import { CreateDisplacementPaymentUseCase } from './application/use-cases/create-displacement-payment.use-case';
import { CreateOrderPaymentUseCase } from './application/use-cases/create-order-payment.use-case';
import { HandleStripeWebhookUseCase } from './application/use-cases/handle-stripe-webhook.use-case';
import { PayQuoteUseCase } from './application/use-cases/pay-quote.use-case';
import { SettingsModule } from '../settings/settings.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [SettingsModule, PromotionsModule],
  controllers: [PaymentsController],
  providers: [
    StripeService,
    CreateDisplacementPaymentUseCase,
    CreateOrderPaymentUseCase,
    HandleStripeWebhookUseCase,
    PayQuoteUseCase,
  ],
  exports: [StripeService, PayQuoteUseCase],
})
export class PaymentsModule {}
