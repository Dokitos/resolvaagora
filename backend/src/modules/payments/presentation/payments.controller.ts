import {
  Controller,
  Post,
  Param,
  Body,
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
import { CreateOrderPaymentUseCase } from '../application/use-cases/create-order-payment.use-case';
import { HandleStripeWebhookUseCase } from '../application/use-cases/handle-stripe-webhook.use-case';
import { PayQuoteUseCase } from '../application/use-cases/pay-quote.use-case';

@Controller()
export class PaymentsController {
  constructor(
    private readonly createPayment: CreateDisplacementPaymentUseCase,
    private readonly createOrderPayment: CreateOrderPaymentUseCase,
    private readonly handleWebhook: HandleStripeWebhookUseCase,
    private readonly payQuote: PayQuoteUseCase,
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

  /** Pagamento do pedido completo (itens + deslocação sempre incluída). */
  @Post('service-requests/:id/pay')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  payOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('itemsTotal') itemsTotal: number,
  ) {
    return this.createOrderPayment.execute(user.id, id, Number(itemsTotal) || 0);
  }

  /** Pagamento online do orçamento aprovado (ou retry se o Payment Sheet foi fechado). */
  @Post('service-requests/:id/quote/pay')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  payQuoteOnline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.payQuote.execute(user.id, id);
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
