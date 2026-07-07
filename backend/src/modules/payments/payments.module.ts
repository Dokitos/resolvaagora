import { Module } from '@nestjs/common';
import { PaymentsController } from './presentation/payments.controller';
import { StripeService } from './infrastructure/stripe.service';
import { CreateDisplacementPaymentUseCase } from './application/use-cases/create-displacement-payment.use-case';
import { HandleStripeWebhookUseCase } from './application/use-cases/handle-stripe-webhook.use-case';

@Module({
  controllers: [PaymentsController],
  providers: [StripeService, CreateDisplacementPaymentUseCase, HandleStripeWebhookUseCase],
  exports: [StripeService],
})
export class PaymentsModule {}
