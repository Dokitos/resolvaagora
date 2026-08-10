import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { SendQuoteUseCase } from '../application/use-cases/send-quote.use-case';
import { RespondQuoteUseCase } from '../application/use-cases/respond-quote.use-case';
import { SendQuoteDto } from '../application/dto/send-quote.dto';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotesController {
  constructor(
    private readonly sendQuote: SendQuoteUseCase,
    private readonly respondQuote: RespondQuoteUseCase,
    private readonly prisma: PrismaService,
  ) {}

  // Técnico envia orçamento
  @Post('technician/service-requests/:id/quote')
  @HttpCode(HttpStatus.CREATED)
  @Roles('TECHNICIAN')
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendQuoteDto,
  ) {
    return this.sendQuote.execute(user.id, id, dto);
  }

  // Cliente vê orçamento
  @Get('service-requests/:id/quote')
  @Roles('CLIENT')
  async getQuote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { client: true },
    });
    if (!clientUser?.client) throw new ForbiddenException('Client only');

    // Confirma que o pedido de serviço pertence ao cliente autenticado antes
    // de devolver o orçamento (evita IDOR — ver auditoria de segurança).
    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id, clientId: clientUser.client.id },
    });
    if (!sr) throw new NotFoundException('Service request not found');

    const quote = await this.prisma.quote.findUnique({ where: { serviceRequestId: id } });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  // Cliente aprova, escolhendo pagar online ou em dinheiro
  @Post('service-requests/:id/quote/approve')
  @HttpCode(HttpStatus.OK)
  @Roles('CLIENT')
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('paymentMethod') paymentMethod: 'ONLINE' | 'CASH',
  ) {
    return this.respondQuote.approve(user.id, id, paymentMethod);
  }

  // Cliente rejeita
  @Post('service-requests/:id/quote/reject')
  @HttpCode(HttpStatus.OK)
  @Roles('CLIENT')
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.respondQuote.reject(user.id, id, reason);
  }
}
