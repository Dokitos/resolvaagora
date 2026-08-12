import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { AutoAssignUseCase } from '../../distribution/application/use-cases/auto-assign.use-case';
import { CreateTechnicianUseCase } from '../../technicians/application/use-cases/create-technician.use-case';
import { CreateTechnicianDto } from '../../technicians/application/dto/create-technician.dto';
import { SendSupportMessageDto } from '../../support/application/dto/send-support-message.dto';
import { BroadcastNotificationDto } from '../application/dto/broadcast-notification.dto';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { NotificationsGateway } from '../../notifications/presentation/notifications.gateway';
import { FcmService } from '../../notifications/infrastructure/fcm.service';
import { SettingsService } from '../../settings/settings.service';
import { CancelServiceRequestUseCase } from '../../service-requests/application/use-cases/cancel-service-request.use-case';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly autoAssign: AutoAssignUseCase,
    private readonly createTechnician: CreateTechnicianUseCase,
    private readonly gateway: NotificationsGateway,
    private readonly fcm: FcmService,
    private readonly settings: SettingsService,
    private readonly cancelServiceRequestUseCase: CancelServiceRequestUseCase,
  ) {}

  // ─── DASHBOARD ────────────────────────────────────────────────────────────

  @Get('dashboard')
  async dashboard() {
    const [
      totalToday,
      byStatus,
      activeTechnicians,
      activeAlerts,
      revenueToday,
    ] = await Promise.all([
      this.prisma.serviceRequest.count({
        where: { createdAt: { gte: this.startOfDay() } },
      }),
      this.prisma.serviceRequest.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { status: { notIn: ['DRAFT', 'AWAITING_PAYMENT'] } },
      }),
      this.prisma.technician.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.slaAlert.count({ where: { resolvedAt: null } }),
      this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          paidAt: { gte: this.startOfDay() },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      today: {
        totalRequests: totalToday,
        revenue: Number(revenueToday._sum.amount ?? 0),
      },
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.status })),
      activeTechnicians,
      activeAlerts,
    };
  }

  // ─── PEDIDOS ──────────────────────────────────────────────────────────────

  @Get('service-requests')
  listServiceRequests(
    @Query('status') status?: string,
    @Query('technicianId') technicianId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.prisma.serviceRequest.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(technicianId && { technicianId }),
      },
      include: {
        client: true,
        technician: true,
        address: true,
        quote: true,
        photos: true,
        slaAlerts: { where: { resolvedAt: null } },
      },
      orderBy: [{ isPriority: 'desc' }, { createdAt: 'desc' }],
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
  }

  @Get('service-requests/:id')
  getServiceRequest(@Param('id') id: string) {
    return this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        client: true,
        technician: true,
        address: true,
        quote: true,
        photos: true,
        payments: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        slaAlerts: true,
        review: true,
      },
    });
  }

  @Patch('service-requests/:id/reassign')
  async reassign(
    @Param('id') id: string,
    @Body('technicianId') technicianId: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    const sr = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!sr) return;

    const date = new Date();
    date.setHours(0, 0, 0, 0);

    await this.prisma.$transaction(async (tx) => {
      // Decrementa carga do técnico anterior
      if (sr.technicianId) {
        await tx.technicianDailySchedule.updateMany({
          where: { technicianId: sr.technicianId, date },
          data: { serviceCount: { decrement: 1 } },
        });
      }

      await tx.serviceRequest.update({
        where: { id },
        data: {
          technicianId,
          assignedAt: new Date(),
          status: 'ASSIGNED',
          statusHistory: {
            create: {
              oldStatus: sr.status,
              newStatus: 'ASSIGNED',
              changedByUserId: admin.id,
              notes: 'Manual reassignment by admin',
            },
          },
        },
      });

      // Incrementa carga do novo técnico
      await tx.technicianDailySchedule.upsert({
        where: { technicianId_date: { technicianId, date } },
        create: { technicianId, date, serviceCount: 1 },
        update: { serviceCount: { increment: 1 } },
      });
    });

    // Sem isto, a atribuição manual/reatribuição pelo admin gravava o técnico
    // na BD mas NUNCA avisava ninguém — nem o técnico (novo trabalho) nem o
    // cliente (técnico atribuído) recebiam push/email/notificação in-app,
    // porque toda a entrega (NotificationQueueConsumer.notifyAssignment) só
    // corre a partir deste evento. O fluxo automático (AutoAssignUseCase) já
    // publicava este evento corretamente — só faltava aqui, no caminho manual.
    await this.rabbitmq.publish(
      this.rabbitmq.exchanges.serviceRequests,
      'service-request.assigned',
      { serviceRequestId: id, technicianId, clientId: sr.clientId },
    );

    return { success: true };
  }

  // ─── MODERAÇÃO DE PEDIDOS ──────────────────────────────────────────────────

  @Patch('service-requests/:id')
  async editServiceRequest(
    @Param('id') id: string,
    @Body() body: { status?: string; scheduledDate?: string | null; description?: string; displacementFee?: number },
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    const sr = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!sr) throw new NotFoundException('Pedido não encontrado');

    const data: any = {};
    if (body.description !== undefined) data.description = body.description;
    if (body.scheduledDate !== undefined) {
      data.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
    }
    if (body.displacementFee !== undefined) data.displacementFee = body.displacementFee;
    if (body.status !== undefined && body.status !== sr.status) {
      data.status = body.status as any;
      data.statusHistory = {
        create: {
          oldStatus: sr.status,
          newStatus: body.status as any,
          changedByUserId: admin.id,
          notes: 'Editado pelo admin',
        },
      };
    }

    return this.prisma.serviceRequest.update({ where: { id }, data });
  }

  @Post('service-requests/:id/cancel')
  async cancelServiceRequest(
    @Param('id') id: string,
    @Body('reason') reason: string | undefined,
    @Body('force') force: boolean | undefined,
    @Body('refundAmount') refundAmount: number | undefined,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    const result = await this.cancelServiceRequestUseCase.execute({
      serviceRequestId: id,
      actorUserId: admin.id,
      actorRole: 'ADMIN',
      reason,
      forceOverride: force === true,
      refundAmount: refundAmount != null ? Number(refundAmount) : undefined,
    });

    const sr = await this.prisma.serviceRequest.findUnique({ where: { id }, include: { client: true } });
    if (sr) {
      this.gateway.emitToUser(sr.client.userId, 'service-status-updated', {
        serviceRequestId: id,
        newStatus: 'CANCELLED',
      });
    }
    return result;
  }

  @Delete('service-requests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteServiceRequest(@Param('id') id: string) {
    // Hard delete: remove dependent rows without cascade first, then the request
    // (quote/photos/statusHistory/slaAlerts cascade automatically).
    await this.prisma.$transaction([
      this.prisma.earning.deleteMany({ where: { serviceRequestId: id } }),
      this.prisma.review.deleteMany({ where: { serviceRequestId: id } }),
      this.prisma.payment.deleteMany({ where: { serviceRequestId: id } }),
      this.prisma.serviceRequest.delete({ where: { id } }),
    ]);
  }

  // ─── CLIENTES & CHAT DE SUPORTE ────────────────────────────────────────────

  @Get('clients')
  listClients(@Query('search') search?: string) {
    return this.prisma.client.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      include: {
        user: { select: { id: true, email: true, status: true, createdAt: true } },
        _count: { select: { serviceRequests: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Get('clients/:clientUserId/messages')
  async clientMessages(@Param('clientUserId') clientUserId: string) {
    const messages = await this.prisma.supportMessage.findMany({
      where: { clientUserId },
      orderBy: { createdAt: 'asc' },
    });
    await this.prisma.supportMessage.updateMany({
      where: { clientUserId, senderRole: 'CLIENT', readAt: null },
      data: { readAt: new Date() },
    });
    return messages;
  }

  @Post('clients/:clientUserId/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendClientMessage(
    @Param('clientUserId') clientUserId: string,
    @Body() dto: SendSupportMessageDto,
  ) {
    const msg = await this.prisma.supportMessage.create({
      data: {
        clientUserId,
        serviceRequestId: dto.serviceRequestId ?? null,
        senderRole: 'ADMIN',
        body: dto.body,
      },
    });
    this.gateway.emitToUser(clientUserId, 'support-message', msg);
    return msg;
  }

  // ─── TÉCNICOS ─────────────────────────────────────────────────────────────

  @Get('technicians')
  listTechnicians(@Query('status') status?: string) {
    return this.prisma.technician.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        user: { select: { email: true, status: true } },
        specialties: true,
        coverageDistricts: true,
        _count: { select: { serviceRequests: true, reviews: true } },
      },
    });
  }

  @Post('technicians')
  @HttpCode(HttpStatus.CREATED)
  createTechnicianAdmin(@Body() dto: CreateTechnicianDto) {
    return this.createTechnician.execute(dto);
  }

  @Patch('technicians/:id')
  async updateTechnician(@Param('id') id: string, @Body() data: any) {
    const scalars = this.technicianScalarFields(data);

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(scalars).length > 0) {
        await tx.technician.update({ where: { id }, data: scalars });
      }

      // specialties / coverageDistricts são RELAÇÕES → recriar em vez de gravar
      // diretamente no update (evita o erro "Erro ao guardar técnico").
      if (Array.isArray(data.specialties)) {
        await tx.technicianSpecialty.deleteMany({ where: { technicianId: id } });
        if (data.specialties.length > 0) {
          await tx.technicianSpecialty.createMany({
            data: data.specialties.map((s: any) => ({ technicianId: id, specialty: s })),
            skipDuplicates: true,
          });
        }
      }

      if (Array.isArray(data.coverageDistricts)) {
        await tx.technicianDistrict.deleteMany({ where: { technicianId: id } });
        if (data.coverageDistricts.length > 0) {
          await tx.technicianDistrict.createMany({
            data: data.coverageDistricts.map((d: any) => ({ technicianId: id, district: String(d) })),
            skipDuplicates: true,
          });
        }
      }
    });

    return this.prisma.technician.findUnique({
      where: { id },
      include: { specialties: true, coverageDistricts: true },
    });
  }

  /** Apenas os campos escalares editáveis do técnico (evita mass-assignment de relações). */
  private technicianScalarFields(d: any) {
    const out: any = {};
    if (d.firstName !== undefined) out.firstName = String(d.firstName);
    if (d.lastName !== undefined) out.lastName = String(d.lastName);
    if (d.phone !== undefined) out.phone = String(d.phone);
    if (d.dailyServiceLimit !== undefined) out.dailyServiceLimit = Math.trunc(Number(d.dailyServiceLimit));
    return out;
  }

  @Patch('technicians/:id/daily-limit')
  updateDailyLimit(@Param('id') id: string, @Body('limit') limit: number) {
    return this.prisma.technician.update({
      where: { id },
      data: { dailyServiceLimit: limit },
    });
  }

  @Delete('technicians/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableTechnician(@Param('id') id: string) {
    const tech = await this.prisma.technician.findUnique({ where: { id } });
    if (tech) {
      await this.prisma.user.update({
        where: { id: tech.userId },
        data: { status: 'INACTIVE' },
      });
    }
  }

  // ─── SLA ALERTS ───────────────────────────────────────────────────────────

  @Get('sla-alerts')
  getSlaAlerts(@Query('resolved') resolved?: string) {
    const showResolved = resolved === 'true';
    return this.prisma.slaAlert.findMany({
      where: showResolved ? { resolvedAt: { not: null } } : { resolvedAt: null },
      include: {
        serviceRequest: { include: { client: true, technician: true, address: true } },
      },
      orderBy: showResolved ? [{ resolvedAt: 'desc' }] : [{ level: 'desc' }, { triggeredAt: 'asc' }],
      take: showResolved ? 100 : undefined,
    });
  }

  @Get('sla-alerts/summary')
  async getSlaAlertsSummary() {
    const active = await this.prisma.slaAlert.findMany({
      where: { resolvedAt: null },
      select: { metric: true, level: true },
    });
    const byMetric = new Map<string, { warning: number; critical: number }>();
    for (const a of active) {
      const b = byMetric.get(a.metric) ?? { warning: 0, critical: 0 };
      if (a.level === 'CRITICAL') b.critical += 1;
      else b.warning += 1;
      byMetric.set(a.metric, b);
    }
    return Array.from(byMetric.entries()).map(([metric, counts]) => ({ metric, ...counts }));
  }

  @Patch('sla-alerts/:id/acknowledge')
  acknowledgeAlert(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.prisma.slaAlert.update({
      where: { id },
      data: { resolvedAt: new Date(), acknowledgedById: admin.id },
    });
  }

  // ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────

  @Get('subscriptions')
  listSubscriptions(@Query('status') status?: string) {
    return this.prisma.subscription.findMany({
      where: status ? { status: status as any } : undefined,
      include: { client: true, plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── FINANCIALS ───────────────────────────────────────────────────────────

  @Get('financials')
  async financials(@Query('from') from?: string, @Query('to') to?: string) {
    const dateFilter = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };

    // O pagamento real do pedido é UM único Payment do tipo SERVICE, com
    // amount = itens + deslocação, ligado ao ServiceRequest (que guarda a
    // displacementFee). A comissão da plataforma é definida em Definições.
    const { commissionRate } = await this.settings.get();
    const [orderPayments, quotePayments, subscriptions, earnings, pendingRequests, pendingCashQuotes] = await Promise.all([
      this.prisma.payment.findMany({
        where: { type: 'SERVICE', status: 'COMPLETED', paidAt: dateFilter },
        include: { serviceRequest: true },
      }),
      // Pagamentos de orçamento (pós-diagnóstico) — pagos online ou já
      // cobrados em dinheiro no fim do serviço. Antes ficavam de fora desta
      // agregação, por isso a comissão/receita destes trabalhos nunca
      // aparecia no financeiro mesmo já tendo sido cobrados/ganhos.
      this.prisma.payment.findMany({
        where: { type: 'QUOTE', status: 'COMPLETED', paidAt: dateFilter },
        include: { serviceRequest: true },
      }),
      this.prisma.subscription.findMany({
        where: { status: 'ACTIVE', startsAt: dateFilter },
        include: { plan: true },
      }),
      this.prisma.earning.findMany({
        where: { earnedAt: dateFilter },
        include: { technician: true },
      }),
      this.prisma.serviceRequest.findMany({
        where: { status: 'AWAITING_PAYMENT', createdAt: dateFilter },
        select: { id: true, displacementFee: true, itemsTotal: true },
      }),
      this.prisma.payment.findMany({
        where: { type: 'QUOTE', status: 'PENDING' },
        select: { amount: true },
      }),
    ]);

    const round = (n: number) => Number(n.toFixed(2));
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const byDay = new Map<string, { displacement: number; commissions: number; subscriptions: number }>();
    const bucket = (day: string) => {
      let b = byDay.get(day);
      if (!b) {
        b = { displacement: 0, commissions: 0, subscriptions: 0 };
        byDay.set(day, b);
      }
      return b;
    };

    let displacementTotal = 0;
    let commissionsTotal = 0;
    let ordersTotal = 0;

    const byCategory = new Map<string, { total: number; count: number }>();

    for (const p of orderPayments) {
      const amount = Number(p.amount);
      const disp = Number(p.serviceRequest?.displacementFee ?? 0);
      const items = amount - disp;
      const commission = items * commissionRate;

      displacementTotal += disp;
      commissionsTotal += commission;
      ordersTotal += amount;

      const b = bucket(dayKey(p.paidAt ?? p.createdAt));
      b.displacement += disp;
      b.commissions += commission;

      const specialty = p.serviceRequest?.specialty ?? 'OUTRO';
      const cat = byCategory.get(specialty) ?? { total: 0, count: 0 };
      cat.total += amount;
      cat.count += 1;
      byCategory.set(specialty, cat);
    }

    // Orçamentos (pós-diagnóstico): o valor todo é "trabalho" — a
    // deslocação já foi cobrada e contabilizada à parte, antes do
    // diagnóstico — por isso a comissão aqui é sobre o valor total pago.
    let quoteCommissionCount = 0;
    for (const p of quotePayments) {
      const amount = Number(p.amount);
      const commission = amount * commissionRate;

      commissionsTotal += commission;
      ordersTotal += amount;
      quoteCommissionCount += 1;

      const b = bucket(dayKey(p.paidAt ?? p.createdAt));
      b.commissions += commission;

      const specialty = p.serviceRequest?.specialty ?? 'OUTRO';
      const cat = byCategory.get(specialty) ?? { total: 0, count: 0 };
      cat.total += amount;
      cat.count += 1;
      byCategory.set(specialty, cat);
    }

    let subscriptionsTotal = 0;
    for (const s of subscriptions) {
      const price = Number(s.plan.yearlyPrice);
      subscriptionsTotal += price;
      bucket(dayKey(s.startsAt ?? s.createdAt)).subscriptions += price;
    }

    const breakdown = Array.from(byDay.entries())
      .map(([date, v]) => ({
        date,
        displacement: round(v.displacement),
        commissions: round(v.commissions),
        subscriptions: round(v.subscriptions),
        total: round(v.displacement + v.commissions + v.subscriptions),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ─── Por técnico (ganhos no período) ──────────────────────────────────
    const byTechnicianMap = new Map<string, { technicianId: string; name: string; total: number; count: number }>();
    let payoutsToTechnicians = 0;
    for (const e of earnings) {
      const amount = Number(e.amount);
      payoutsToTechnicians += amount;
      const entry = byTechnicianMap.get(e.technicianId) ?? {
        technicianId: e.technicianId,
        name: e.technician ? `${e.technician.firstName} ${e.technician.lastName}` : 'Técnico desconhecido',
        total: 0,
        count: 0,
      };
      entry.total += amount;
      entry.count += 1;
      byTechnicianMap.set(e.technicianId, entry);
    }
    const byTechnician = Array.from(byTechnicianMap.values())
      .map((t) => ({ ...t, total: round(t.total) }))
      .sort((a, b) => b.total - a.total);

    // ─── Por especialidade/categoria ──────────────────────────────────────
    const byCategoryList = Array.from(byCategory.entries())
      .map(([specialty, v]) => ({ specialty, total: round(v.total), count: v.count }))
      .sort((a, b) => b.total - a.total);

    // ─── Pagamentos pendentes (AWAITING_PAYMENT + orçamentos em dinheiro
    // ainda não cobrados, criados na aprovação e só ficam COMPLETED quando
    // o técnico marca o serviço como concluído) ────────────────────────────
    let pendingTotal = 0;
    for (const r of pendingRequests) {
      pendingTotal += Number(r.displacementFee ?? 0) + Number(r.itemsTotal ?? 0);
    }
    for (const p of pendingCashQuotes) {
      pendingTotal += Number(p.amount);
    }

    return {
      commissionRate,
      displacement: { total: round(displacementTotal), count: orderPayments.length },
      commissions: { total: round(commissionsTotal), count: orderPayments.length + quoteCommissionCount },
      subscriptions: { total: round(subscriptionsTotal), count: subscriptions.length },
      totalRevenue: round(ordersTotal + subscriptionsTotal),
      breakdown,
      byTechnician,
      byCategory: byCategoryList,
      pending: { total: round(pendingTotal), count: pendingRequests.length + pendingCashQuotes.length },
      payouts: {
        toTechnicians: round(payoutsToTechnicians),
        platformCommission: round(commissionsTotal),
      },
    };
  }

  /**
   * Lista unificada de todas as transações (pagamentos de pedidos +
   * subscrições), paginada e ordenada da mais recente para a mais antiga.
   * As subscrições não têm registo próprio na tabela Payment (são geridas
   * via Stripe Billing + cache Redis), por isso são combinadas aqui a partir
   * do modelo Subscription para dar uma vista realmente completa.
   */
  @Get('transactions')
  async listTransactions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') pageQ?: string,
  ) {
    const dateFilter = {
      ...(from && { gte: new Date(`${from}T00:00:00`) }),
      ...(to && { lte: new Date(`${to}T23:59:59.999`) }),
    };
    const page = Math.max(1, Number(pageQ) || 1);
    const pageSize = 30;

    const [payments, subscriptions] = await Promise.all([
      this.prisma.payment.findMany({
        where: { createdAt: dateFilter },
        include: {
          serviceRequest: {
            include: { client: true, technician: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscription.findMany({
        where: { startsAt: dateFilter },
        include: { client: true, plan: true },
        orderBy: { startsAt: 'desc' },
      }),
    ]);

    type Transaction = {
      id: string;
      type: 'DISPLACEMENT' | 'SERVICE' | 'QUOTE' | 'SUBSCRIPTION';
      amount: number;
      currency: string;
      status: string;
      clientName: string;
      technicianName: string | null;
      specialty: string | null;
      description: string | null;
      date: Date;
      reference: string | null;
    };

    const items: Transaction[] = [
      ...payments.map((p): Transaction => ({
        id: p.id,
        type: p.type,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        clientName: p.serviceRequest?.client
          ? `${p.serviceRequest.client.firstName} ${p.serviceRequest.client.lastName}`
          : 'Cliente desconhecido',
        technicianName: p.serviceRequest?.technician
          ? `${p.serviceRequest.technician.firstName} ${p.serviceRequest.technician.lastName}`
          : null,
        specialty: p.serviceRequest?.specialty ?? null,
        description: null,
        date: p.paidAt ?? p.createdAt,
        reference: p.stripePaymentIntentId,
      })),
      ...subscriptions.map((s): Transaction => ({
        id: s.id,
        type: 'SUBSCRIPTION',
        amount: Number(s.plan.yearlyPrice),
        currency: 'EUR',
        status: s.status,
        clientName: `${s.client.firstName} ${s.client.lastName}`,
        technicianName: null,
        specialty: null,
        description: s.plan.name,
        date: s.startsAt,
        reference: s.stripeSubscriptionId,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  }

  // ─── ANALYTICS ────────────────────────────────────────────────────────────

  @Get('analytics')
  async analytics(@Query('from') fromQ?: string, @Query('to') toQ?: string) {
    // Sem parâmetros: últimos 30 dias por omissão (mesmo período que já era
    // usado antes de existir seletor). `to` inclui o dia inteiro (23:59:59).
    const to = toQ ? new Date(`${toQ}T23:59:59.999`) : new Date();
    const from = fromQ ? new Date(`${fromQ}T00:00:00`) : new Date(to.getTime() - 30 * 86400000);
    const range = { from, to };

    const [
      requestsBySpecialty,
      avgRating,
      quoteAcceptanceRate,
      completionRate,
      totals,
      growth,
      funnel,
      operational,
      ratingDistribution,
      recentReviews,
      topTechnicians,
      clientRetention,
      byDistrict,
      referrals,
    ] = await Promise.all([
      this.prisma.serviceRequest.groupBy({
        by: ['specialty'],
        where: { createdAt: { gte: from, lte: to } },
        _count: { specialty: true },
      }),
      this.prisma.review.aggregate({ where: { createdAt: { gte: from, lte: to } }, _avg: { rating: true } }),
      this.getQuoteAcceptanceRate(range),
      this.getCompletionRate(range),
      this.getAnalyticsTotals(range),
      this.getGrowth(range),
      this.getFunnel(range),
      this.getOperationalTimings(range),
      this.getRatingDistribution(range),
      this.getRecentReviews(range),
      this.getTopTechnicians(range),
      this.getClientRetention(range),
      this.getRequestsByDistrict(range),
      this.getReferralsSummary(range),
    ]);

    return {
      requestsBySpecialty: requestsBySpecialty.map((r) => ({
        specialty: r.specialty,
        count: r._count.specialty,
      })),
      averageRating: Number(avgRating._avg.rating?.toFixed(2) ?? 0),
      quoteAcceptanceRate,
      completionRate,
      totals,
      growth,
      funnel,
      operational,
      ratingDistribution,
      recentReviews,
      topTechnicians,
      clientRetention,
      byDistrict,
      referrals,
    };
  }

  /** clients/technicians ficam sempre ao total atual (contagem, não um fluxo
   * "no período") — serviceRequests/completedRequests já refletem o período. */
  private async getAnalyticsTotals({ from, to }: { from: Date; to: Date }) {
    const [clients, technicians, serviceRequests, completedRequests] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.technician.count(),
      this.prisma.serviceRequest.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.prisma.serviceRequest.count({ where: { status: 'COMPLETED', createdAt: { gte: from, lte: to } } }),
    ]);
    return { clients, technicians, serviceRequests, completedRequests };
  }

  /** Novos clientes e novos pedidos por dia, dentro do período selecionado. */
  private async getGrowth({ from, to }: { from: Date; to: Date }) {
    // Tudo em UTC (getUTC*/Date.UTC) de propósito — misturar aritmética de
    // data local com chaves toISOString() (sempre UTC) desalinha os buckets
    // consoante o fuso horário do servidor e alguns registos "caem fora" do
    // mapa pré-preenchido.
    const sinceUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    const untilUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    const days = Math.max(0, Math.round((untilUtc - sinceUtc) / 86400000));

    const [clients, requests] = await Promise.all([
      this.prisma.client.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
      this.prisma.serviceRequest.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
    ]);

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const byDay = new Map<string, { newClients: number; newRequests: number }>();
    for (let i = 0; i <= days; i++) {
      byDay.set(dayKey(new Date(sinceUtc + i * 86400000)), { newClients: 0, newRequests: 0 });
    }
    // .get()! seguido de fallback: nunca deve faltar um bucket dado o range
    // acima, mas não vale a pena um 500 por um registo à borda do intervalo.
    const bump = (d: Date, field: 'newClients' | 'newRequests') => {
      const bucket = byDay.get(dayKey(d));
      if (bucket) bucket[field]++;
    };
    for (const c of clients) bump(c.createdAt, 'newClients');
    for (const r of requests) bump(r.createdAt, 'newRequests');

    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }

  /** Agrupa os estados do pedido (criados no período) em 4 fases do funil. */
  private async getFunnel({ from, to }: { from: Date; to: Date }) {
    const draftStatuses = ['DRAFT', 'AWAITING_PAYMENT'] as const;
    const inProgressStatuses = [
      'PAID', 'IN_DISTRIBUTION', 'ASSIGNED', 'IN_TRANSIT', 'ARRIVED',
      'IN_DIAGNOSIS', 'QUOTE_SENT', 'QUOTE_APPROVED', 'IN_EXECUTION',
    ] as const;
    const cancelledStatuses = ['CANCELLED', 'QUOTE_REJECTED', 'EXPIRED'] as const;
    const createdAt = { gte: from, lte: to };

    const [draft, inProgress, completed, cancelled] = await Promise.all([
      this.prisma.serviceRequest.count({ where: { status: { in: [...draftStatuses] }, createdAt } }),
      this.prisma.serviceRequest.count({ where: { status: { in: [...inProgressStatuses] }, createdAt } }),
      this.prisma.serviceRequest.count({ where: { status: 'COMPLETED', createdAt } }),
      this.prisma.serviceRequest.count({ where: { status: { in: [...cancelledStatuses] }, createdAt } }),
    ]);
    return { draft, inProgress, completed, cancelled };
  }

  /**
   * Tempo médio (minutos) entre transições de estado chave, no período
   * selecionado. Calculado a partir do histórico real (service_status_history),
   * não de estimativas — dá visibilidade direta a onde o processo é mais lento.
   */
  private async getOperationalTimings({ from, to }: { from: Date; to: Date }) {
    const history = await this.prisma.serviceStatusHistory.findMany({
      where: { createdAt: { gte: from, lte: to }, newStatus: { in: ['PAID', 'ASSIGNED', 'ARRIVED', 'IN_EXECUTION', 'COMPLETED'] } },
      select: { serviceRequestId: true, newStatus: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const byRequest = new Map<string, Partial<Record<string, Date>>>();
    for (const h of history) {
      const bucket = byRequest.get(h.serviceRequestId) ?? {};
      if (!bucket[h.newStatus]) bucket[h.newStatus] = h.createdAt; // primeira ocorrência
      byRequest.set(h.serviceRequestId, bucket);
    }

    const diffsMinutes = (from: string, to: string): number[] => {
      const out: number[] = [];
      for (const bucket of byRequest.values()) {
        const a = bucket[from];
        const b = bucket[to];
        if (a && b && b > a) out.push((b.getTime() - a.getTime()) / 60000);
      }
      return out;
    };

    const avg = (nums: number[]) => (nums.length > 0 ? Math.round(nums.reduce((s, n) => s + n, 0) / nums.length) : null);

    return {
      avgAssignmentMinutes: avg(diffsMinutes('PAID', 'ASSIGNED')),
      avgArrivalMinutes: avg(diffsMinutes('ASSIGNED', 'ARRIVED')),
      avgExecutionMinutes: avg(diffsMinutes('IN_EXECUTION', 'COMPLETED')),
      avgTotalMinutes: avg(diffsMinutes('PAID', 'COMPLETED')),
    };
  }

  private async getRatingDistribution({ from, to }: { from: Date; to: Date }) {
    const rows = await this.prisma.review.groupBy({ by: ['rating'], where: { createdAt: { gte: from, lte: to } }, _count: true });
    const byRating = new Map(rows.map((r) => [r.rating, r._count]));
    return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: byRating.get(stars) ?? 0 }));
  }

  private async getRecentReviews({ from, to }: { from: Date; to: Date }) {
    const reviews = await this.prisma.review.findMany({
      where: { createdAt: { gte: from, lte: to } },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { firstName: true, lastName: true } },
        technician: { select: { firstName: true, lastName: true } },
      },
    });
    return reviews.map((r) => ({
      id: r.id,
      clientName: `${r.client.firstName} ${r.client.lastName}`,
      technicianName: `${r.technician.firstName} ${r.technician.lastName}`,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));
  }

  /** Top 8 técnicos por serviços concluídos no período, com a avaliação média (geral, não só do período). */
  private async getTopTechnicians({ from, to }: { from: Date; to: Date }) {
    const [completedByTech, ratingByTech] = await Promise.all([
      this.prisma.serviceRequest.groupBy({
        by: ['technicianId'],
        where: { status: 'COMPLETED', technicianId: { not: null }, createdAt: { gte: from, lte: to } },
        _count: true,
      }),
      this.prisma.review.groupBy({ by: ['technicianId'], _avg: { rating: true } }),
    ]);

    const ranked = completedByTech
      .sort((a, b) => b._count - a._count)
      .slice(0, 8);
    if (ranked.length === 0) return [];

    const ids = ranked.map((r) => r.technicianId!).filter(Boolean);
    const technicians = await this.prisma.technician.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
    const nameById = new Map(technicians.map((t) => [t.id, `${t.firstName} ${t.lastName}`]));
    const ratingById = new Map(ratingByTech.map((r) => [r.technicianId, r._avg.rating]));

    return ranked.map((r) => ({
      technicianId: r.technicianId,
      name: nameById.get(r.technicianId!) ?? '—',
      completedCount: r._count,
      avgRating: ratingById.get(r.technicianId!) ? Number(ratingById.get(r.technicianId!)!.toFixed(2)) : null,
    }));
  }

  /** % de clientes com mais de um pedido no período — proxy simples de retenção. */
  private async getClientRetention({ from, to }: { from: Date; to: Date }) {
    const [totalClients, byClient] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.serviceRequest.groupBy({ by: ['clientId'], where: { createdAt: { gte: from, lte: to } }, _count: true }),
    ]);
    const repeatClients = byClient.filter((c) => c._count > 1).length;
    return {
      totalClients,
      repeatClients,
      repeatRate: totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0,
    };
  }

  /** Pedidos por distrito no período (via morada do serviço) — os 8 maiores. */
  private async getRequestsByDistrict({ from, to }: { from: Date; to: Date }) {
    const requests = await this.prisma.serviceRequest.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { address: { select: { district: true } } },
    });
    const byDistrict = new Map<string, number>();
    for (const r of requests) {
      const d = r.address?.district || 'Desconhecido';
      byDistrict.set(d, (byDistrict.get(d) ?? 0) + 1);
    }
    return Array.from(byDistrict.entries())
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  private async getReferralsSummary({ from, to }: { from: Date; to: Date }) {
    const [total, completed] = await Promise.all([
      this.prisma.referral.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.prisma.referral.count({ where: { status: 'COMPLETED', createdAt: { gte: from, lte: to } } }),
    ]);
    return { total, completed };
  }

  // ─── SUBSCRIPTION PLANS ───────────────────────────────────────────────────

  @Get('subscription-plans')
  listPlans() {
    return this.prisma.subscriptionPlan.findMany();
  }

  @Post('subscription-plans')
  @HttpCode(HttpStatus.CREATED)
  createPlan(@Body() data: any) {
    return this.prisma.subscriptionPlan.create({ data: this.planFields(data) });
  }

  @Patch('subscription-plans/:id')
  updatePlan(@Param('id') id: string, @Body() data: any) {
    return this.prisma.subscriptionPlan.update({ where: { id }, data: this.planFields(data) });
  }

  @Delete('subscription-plans/:id')
  async deletePlan(@Param('id') id: string) {
    const inUse = await this.prisma.subscription.count({ where: { planId: id } });
    if (inUse > 0) {
      // Tem subscrições associadas: apagar quebraria a FK / perderia histórico
      // de clientes. Em vez disso, apenas oculta (soft-hide).
      await this.prisma.subscriptionPlan.update({ where: { id }, data: { isActive: false } });
      return { softDeleted: true };
    }
    await this.prisma.subscriptionPlan.delete({ where: { id } });
    return { softDeleted: false };
  }

  /** Apenas os campos editáveis do plano (evita mass-assignment). */
  private planFields(d: any) {
    const out: any = {};
    if (d.name !== undefined) out.name = String(d.name);
    if (d.description !== undefined) out.description = d.description ? String(d.description) : null;
    if (d.imageUrl !== undefined) out.imageUrl = d.imageUrl ? String(d.imageUrl) : null;
    if (d.benefits !== undefined) {
      out.benefits = Array.isArray(d.benefits)
        ? d.benefits.map((b: any) => String(b)).filter((b: string) => b.trim() !== '')
        : [];
    }
    if (d.yearlyPrice !== undefined) out.yearlyPrice = Number(d.yearlyPrice);
    if (d.displacementDiscountPct !== undefined) out.displacementDiscountPct = Number(d.displacementDiscountPct);
    if (d.freeVisitsCount !== undefined) out.freeVisitsCount = Math.trunc(Number(d.freeVisitsCount));
    if (d.quoteExpiryDays !== undefined) {
      out.quoteExpiryDays =
        d.quoteExpiryDays === null || d.quoteExpiryDays === '' || Number.isNaN(Number(d.quoteExpiryDays))
          ? null
          : Math.trunc(Number(d.quoteExpiryDays));
    }
    if (d.priorityScheduling !== undefined) out.priorityScheduling = !!d.priorityScheduling;
    if (d.isActive !== undefined) out.isActive = !!d.isActive;
    return out;
  }

  // ─── HOME BANNERS ─────────────────────────────────────────────────────────

  @Get('banners')
  listBanners() {
    return this.prisma.homeBanner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  @Post('banners')
  @HttpCode(HttpStatus.CREATED)
  createBanner(@Body() data: any) {
    return this.prisma.homeBanner.create({ data: this.bannerFields(data, true) });
  }

  @Patch('banners/:id')
  updateBanner(@Param('id') id: string, @Body() data: any) {
    return this.prisma.homeBanner.update({ where: { id }, data: this.bannerFields(data, false) });
  }

  @Delete('banners/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBanner(@Param('id') id: string) {
    await this.prisma.homeBanner.delete({ where: { id } });
  }

  /** Campos editáveis do banner (evita mass-assignment). */
  private bannerFields(d: any, creating: boolean) {
    const out: any = {};
    if (creating || d.imageUrl !== undefined) out.imageUrl = String(d.imageUrl ?? '');
    if (d.title !== undefined) out.title = d.title ? String(d.title) : null;
    if (d.subtitle !== undefined) out.subtitle = d.subtitle ? String(d.subtitle) : null;
    if (d.actionType !== undefined) out.actionType = d.actionType ? String(d.actionType) : null;
    if (d.actionTarget !== undefined) out.actionTarget = d.actionTarget ? String(d.actionTarget) : null;
    if (d.sortOrder !== undefined) out.sortOrder = Math.trunc(Number(d.sortOrder) || 0);
    if (d.isActive !== undefined) out.isActive = !!d.isActive;
    if (d.startsAt !== undefined) out.startsAt = d.startsAt ? new Date(d.startsAt) : null;
    if (d.endsAt !== undefined) out.endsAt = d.endsAt ? new Date(d.endsAt) : null;
    return out;
  }

  // ─── PREÇOS DO CATÁLOGO DE SERVIÇOS ───────────────────────────────────────
  // A estrutura do catálogo (categorias/subcategorias/itens) vive em código
  // no frontend; aqui só se guardam as edições de preço feitas no admin.

  @Get('service-prices')
  async listServicePrices() {
    const [categories, items] = await Promise.all([
      this.prisma.serviceCategoryPrice.findMany(),
      this.prisma.serviceItemPrice.findMany(),
    ]);
    return {
      categories: Object.fromEntries(
        categories.map((c) => [c.categoryId, { basePrice: Number(c.basePrice), hidden: c.hidden }]),
      ),
      items: Object.fromEntries(
        items.map((i) => [
          `${i.categoryId}:${i.subcategoryId}:${i.itemId}`,
          { price: Number(i.price), hidden: i.hidden, notes: i.notes ?? null },
        ]),
      ),
    };
  }

  @Put('service-prices')
  async saveServicePrices(
    @Body()
    body: {
      categories?: { categoryId: string; basePrice: number; hidden?: boolean }[];
      items?: {
        categoryId: string;
        subcategoryId: string;
        itemId: string;
        price: number;
        hidden?: boolean;
        notes?: string | null;
      }[];
    },
  ) {
    const categories = body.categories ?? [];
    const items = body.items ?? [];

    await this.prisma.$transaction([
      ...categories.map((c) =>
        this.prisma.serviceCategoryPrice.upsert({
          where: { categoryId: c.categoryId },
          create: { categoryId: c.categoryId, basePrice: c.basePrice, hidden: c.hidden ?? false },
          update: { basePrice: c.basePrice, hidden: c.hidden ?? false },
        }),
      ),
      ...items.map((i) =>
        this.prisma.serviceItemPrice.upsert({
          where: {
            categoryId_subcategoryId_itemId: {
              categoryId: i.categoryId,
              subcategoryId: i.subcategoryId,
              itemId: i.itemId,
            },
          },
          create: {
            categoryId: i.categoryId,
            subcategoryId: i.subcategoryId,
            itemId: i.itemId,
            price: i.price,
            hidden: i.hidden ?? false,
            notes: i.notes ?? null,
          },
          update: { price: i.price, hidden: i.hidden ?? false, notes: i.notes ?? null },
        }),
      ),
    ]);

    return this.listServicePrices();
  }

  // ─── PROMO CODES & REFERRALS ──────────────────────────────────────────────

  @Get('promo-codes')
  listPromoCodes() {
    return this.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Post('promo-codes')
  @HttpCode(HttpStatus.CREATED)
  createPromoCode(@Body() data: any) {
    return this.prisma.promoCode.create({
      data: {
        code: String(data.code ?? '').trim().toUpperCase(),
        description: data.description ?? null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderValue: data.minOrderValue ?? null,
        maxUses: data.maxUses ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive ?? true,
      },
    });
  }

  @Patch('promo-codes/:id')
  updatePromoCode(@Param('id') id: string, @Body() data: any) {
    const patch: any = { ...data };
    if (patch.code) patch.code = String(patch.code).trim().toUpperCase();
    if (patch.expiresAt !== undefined) patch.expiresAt = patch.expiresAt ? new Date(patch.expiresAt) : null;
    return this.prisma.promoCode.update({ where: { id }, data: patch });
  }

  @Delete('promo-codes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePromoCode(@Param('id') id: string) {
    await this.prisma.promoCode.delete({ where: { id } });
  }

  @Get('referrals')
  listReferrals() {
    return this.prisma.referral.findMany({
      include: {
        referrer: { select: { firstName: true, lastName: true } },
        referred: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Config do programa "Convida Amigos" (singleton). */
  @Get('referral-config')
  referralConfig() {
    return this.prisma.referralConfig.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
  }

  @Patch('referral-config')
  updateReferralConfig(@Body() data: any) {
    const out: any = {};
    if (data.rewardAmount !== undefined) out.rewardAmount = Math.max(0, Number(data.rewardAmount) || 0);
    if (data.shareMessage !== undefined) out.shareMessage = data.shareMessage ? String(data.shareMessage) : null;
    if (data.isActive !== undefined) out.isActive = !!data.isActive;
    return this.prisma.referralConfig.upsert({
      where: { id: 'default' },
      update: out,
      create: { id: 'default', ...out },
    });
  }

  // ─── APP SETTINGS (feature flags / maintenance) ────────────────────────────

  @Get('settings')
  getSettings() {
    return this.settings.get();
  }

  @Patch('settings')
  updateSettings(@Body() data: any) {
    // Coerção segura de campos numéricos: só encaminha quando presentes e válidos.
    const num = (v: any): number | undefined => {
      if (v === undefined || v === null || v === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    return this.settings.update({
      maintenanceMode: data.maintenanceMode,
      maintenanceMessage: data.maintenanceMessage,
      registrationEnabled: data.registrationEnabled,
      paymentsEnabled: data.paymentsEnabled,
      paymentsTestMode: data.paymentsTestMode,
      smsVerificationEnabled: data.smsVerificationEnabled,
      smsNotificationsEnabled: data.smsNotificationsEnabled,
      displacementOriginLat: num(data.displacementOriginLat),
      displacementOriginLng: num(data.displacementOriginLng),
      displacementPerKm: num(data.displacementPerKm),
      displacementBaseFee: num(data.displacementBaseFee),
      displacementMinFee: num(data.displacementMinFee),
      commissionRate: num(data.commissionRate),
    });
  }

  // ─── CUSTOM NOTIFICATIONS (broadcast) ──────────────────────────────────────

  @Post('notifications/broadcast')
  @HttpCode(HttpStatus.CREATED)
  async broadcast(@Body() body: BroadcastNotificationDto) {
    let userIds: string[];
    if (body.target === 'USER' && body.userId) {
      userIds = [body.userId];
    } else if (body.target === 'ALL_TECHNICIANS') {
      userIds = (await this.prisma.user.findMany({ where: { role: 'TECHNICIAN' }, select: { id: true } })).map((u) => u.id);
    } else {
      userIds = (await this.prisma.user.findMany({ where: { role: 'CLIENT' }, select: { id: true } })).map((u) => u.id);
    }

    if (userIds.length > 0) {
      await this.prisma.notification.createMany({
        data: userIds.map((id) => ({ userId: id, type: 'ANNOUNCEMENT' as any, title: body.title, body: body.body })),
      });
      for (const id of userIds) {
        this.gateway.emitToUser(id, 'notification', { title: body.title, body: body.body });
      }

      // Push (FCM) — auto-desativa sem credenciais Firebase.
      const tokens = (
        await this.prisma.fcmToken.findMany({
          where: { userId: { in: userIds } },
          select: { token: true },
        })
      ).map((t) => t.token);
      const push = await this.fcm.sendToMultiple(tokens, body.title, body.body);
      return { sent: userIds.length, pushTokens: push.total, pushDelivered: push.success };
    }
    return { sent: userIds.length, pushTokens: 0, pushDelivered: 0 };
  }

  /** Diagnóstico das notificações push: FCM ativo + nº de tokens registados. */
  @Get('fcm-status')
  async fcmStatus() {
    return { ready: this.fcm.ready, tokens: await this.prisma.fcmToken.count() };
  }

  // ─── CLIENT ACCOUNT MANAGEMENT ─────────────────────────────────────────────

  @Patch('clients/:clientUserId/status')
  async setClientStatus(
    @Param('clientUserId') clientUserId: string,
    @Body('status') status: string,
  ) {
    return this.prisma.user.update({
      where: { id: clientUserId },
      data: { status: status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' },
    });
  }

  @Delete('clients/:clientUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClient(@Param('clientUserId') clientUserId: string) {
    try {
      await this.prisma.user.delete({ where: { id: clientUserId } });
    } catch {
      throw new NotFoundException(
        'Não foi possível eliminar (cliente com pedidos associados). Bloqueia a conta em vez de eliminar.',
      );
    }
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private startOfDay(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private async getQuoteAcceptanceRate({ from, to }: { from: Date; to: Date }): Promise<number> {
    const createdAt = { gte: from, lte: to };
    const [total, approved] = await Promise.all([
      this.prisma.quote.count({ where: { status: { not: 'PENDING' }, createdAt } }),
      this.prisma.quote.count({ where: { status: 'APPROVED', createdAt } }),
    ]);
    return total > 0 ? Math.round((approved / total) * 100) : 0;
  }

  private async getCompletionRate({ from, to }: { from: Date; to: Date }): Promise<number> {
    const createdAt = { gte: from, lte: to };
    const [total, completed] = await Promise.all([
      this.prisma.serviceRequest.count({ where: { status: { notIn: ['DRAFT', 'AWAITING_PAYMENT'] }, createdAt } }),
      this.prisma.serviceRequest.count({ where: { status: 'COMPLETED', createdAt } }),
    ]);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }
}
