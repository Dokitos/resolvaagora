import {
  Controller,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
  Headers,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { CreateDisplacementPaymentUseCase } from '../application/use-cases/create-displacement-payment.use-case';
import { HandleStripeWebhookUseCase } from '../application/use-cases/handle-stripe-webhook.use-case';

@Controller()
export class PaymentsController {
  constructor(
    private readonly createPayment: CreateDisplacementPaymentUseCase,
    private readonly handleWebhook: HandleStripeWebhookUseCase,
  ) {}

  @Post('service-requests/:id/pay-displacement')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  payDisplacement(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.createPayment.execute(user.id, id);
  }

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.handleWebhook.execute(req.rawBody!, signature);
  }
}
