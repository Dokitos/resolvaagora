import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { CreateServiceRequestUseCase } from '../application/use-cases/create-service-request.use-case';
import { CreateServiceRequestDto } from '../application/dto/create-service-request.dto';
import { CreateReviewDto } from '../application/dto/create-review.dto';
import { EmailService } from '../../notifications/infrastructure/email.service';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';

@Controller('service-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
export class ServiceRequestsController {
  constructor(
    private readonly createServiceRequest: CreateServiceRequestUseCase,
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly email: EmailService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceRequestDto) {
    return this.createServiceRequest.execute(user.id, dto);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { client: true },
    });

    return this.prisma.serviceRequest.findMany({
      where: { clientId: clientUser!.client!.id },
      include: {
        address: true,
        quote: true,
        technician: true,
        photos: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { client: true },
    });

    return this.prisma.serviceRequest.findFirst({
      where: { id, clientId: clientUser!.client!.id },
      include: {
        address: true,
        quote: true,
        technician: true,
        photos: true,
        payments: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        review: true,
      },
    });
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.CREATED)
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { client: true },
    });

    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id, clientId: clientUser!.client!.id, status: 'COMPLETED' },
    });

    if (!sr) throw new NotFoundException('Completed service request not found');
    if (!sr.technicianId) throw new BadRequestException('No technician assigned');

    const existing = await this.prisma.review.findUnique({ where: { serviceRequestId: id } });
    if (existing) throw new BadRequestException('Review already submitted');

    return this.prisma.review.create({
      data: {
        serviceRequestId: id,
        clientId: clientUser!.client!.id,
        technicianId: sr.technicianId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  @Post(':id/receipt/email')
  @HttpCode(HttpStatus.OK)
  async emailReceipt(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { client: true },
    });

    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id, clientId: clientUser!.client!.id },
      include: { technician: true, quote: true, payments: true },
    });
    if (!sr) throw new NotFoundException('Service request not found');

    const eur = (v: unknown) => `${Number(v ?? 0).toFixed(2)} €`;
    const lines: { label: string; value: string }[] = [];
    lines.push({ label: 'Taxa de deslocação', value: eur(sr.displacementFee) });
    if (sr.promoDiscount != null && Number(sr.promoDiscount) > 0) {
      lines.push({ label: `Desconto (${sr.promoCode ?? 'promo'})`, value: `- ${eur(sr.promoDiscount)}` });
    }
    if (sr.quote) {
      lines.push({ label: 'Mão de obra', value: eur(sr.quote.laborCost) });
      lines.push({ label: 'Materiais', value: eur(sr.quote.materialsCost) });
    }
    const paid = sr.payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((s, p) => s + Number(p.amount), 0);
    const total = sr.quote ? Number(sr.quote.totalCost) : paid || Number(sr.displacementFee);

    // Morada de faturação (se o cliente indicou uma diferente da do serviço).
    const billing = await this.prisma.address.findFirst({
      where: { clientId: clientUser!.client!.id, label: { contains: 'faturação', mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
    });
    const billingAddress = billing
      ? [billing.street, billing.number, billing.postalCode, billing.city].filter(Boolean).join(', ')
      : null;

    const html = this.email.receiptEmail({
      requestId: sr.id,
      serviceLabel: `Serviço de ${sr.specialty}`,
      date: sr.createdAt.toLocaleDateString('pt-PT'),
      clientName: `${clientUser!.client!.firstName} ${clientUser!.client!.lastName}`,
      nif: clientUser!.client!.nif,
      billingAddress,
      technicianName: sr.technician ? `${sr.technician.firstName} ${sr.technician.lastName}` : null,
      lines,
      total: eur(total),
    });

    await this.email.send(clientUser!.email, 'O teu recibo — ResolvaAgora', html);
    return { sent: true, email: clientUser!.email };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { client: true },
    });

    await this.prisma.serviceRequest.updateMany({
      where: {
        id,
        clientId: clientUser!.client!.id,
        status: { in: ['DRAFT', 'AWAITING_PAYMENT'] },
      },
      data: { status: 'CANCELLED' },
    });

    await this.rabbitmq.publish(
      this.rabbitmq.exchanges.serviceRequests,
      'service-request.cancelled',
      { serviceRequestId: id },
    );
  }
}
