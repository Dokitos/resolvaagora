import {
  Controller,
  Get,
  Post,
  Patch,
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
import { AutoAssignUseCase } from '../../distribution/application/use-cases/auto-assign.use-case';
import { CreateTechnicianUseCase } from '../../technicians/application/use-cases/create-technician.use-case';
import { CreateTechnicianDto } from '../../technicians/application/dto/create-technician.dto';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { NotificationsGateway } from '../../notifications/presentation/notifications.gateway';
import { SettingsService } from '../../settings/settings.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly autoAssign: AutoAssignUseCase,
    private readonly createTechnician: CreateTechnicianUseCase,
    private readonly gateway: NotificationsGateway,
    private readonly settings: SettingsService,
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
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!sr) throw new NotFoundException('Pedido não encontrado');

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason ?? 'Cancelado pelo administrador',
        statusHistory: {
          create: {
            oldStatus: sr.status,
            newStatus: 'CANCELLED',
            changedByUserId: admin.id,
            notes: reason ?? 'Cancelado pelo administrador',
          },
        },
      },
    });

    this.gateway.emitToUser(sr.client.userId, 'service-status-updated', {
      serviceRequestId: id,
      newStatus: 'CANCELLED',
    });
    return updated;
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
    @Body('body') body: string,
    @Body('serviceRequestId') serviceRequestId?: string,
  ) {
    const msg = await this.prisma.supportMessage.create({
      data: {
        clientUserId,
        serviceRequestId: serviceRequestId ?? null,
        senderRole: 'ADMIN',
        body,
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
  updateTechnician(@Param('id') id: string, @Body() data: any) {
    return this.prisma.technician.update({ where: { id }, data });
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
  getSlaAlerts() {
    return this.prisma.slaAlert.findMany({
      where: { resolvedAt: null },
      include: {
        serviceRequest: { include: { client: true, technician: true, address: true } },
      },
      orderBy: [{ level: 'desc' }, { triggeredAt: 'asc' }],
    });
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

    const [displacementAgg, commissionsAgg, subscriptionsAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { type: 'DISPLACEMENT', status: 'COMPLETED', paidAt: dateFilter },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.earning.aggregate({
        where: { type: 'SERVICE', earnedAt: dateFilter },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { type: 'SERVICE', status: 'COMPLETED', paidAt: dateFilter },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const displacement = {
      total: Number(displacementAgg._sum.amount ?? 0),
      count: displacementAgg._count,
    };
    const commissions = {
      total: Number(commissionsAgg._sum.amount ?? 0),
      count: commissionsAgg._count,
    };
    const subscriptions = {
      total: Number(subscriptionsAgg._sum.amount ?? 0),
      count: subscriptionsAgg._count,
    };

    return {
      displacement,
      commissions,
      subscriptions,
      totalRevenue: displacement.total + commissions.total + subscriptions.total,
      breakdown: [],
    };
  }

  // ─── ANALYTICS ────────────────────────────────────────────────────────────

  @Get('analytics')
  async analytics() {
    const [
      requestsBySpecialty,
      avgRating,
      quoteAcceptanceRate,
      completionRate,
    ] = await Promise.all([
      this.prisma.serviceRequest.groupBy({
        by: ['specialty'],
        _count: { specialty: true },
      }),
      this.prisma.review.aggregate({ _avg: { rating: true } }),
      this.getQuoteAcceptanceRate(),
      this.getCompletionRate(),
    ]);

    return {
      requestsBySpecialty: requestsBySpecialty.map((r) => ({
        specialty: r.specialty,
        count: r._count.specialty,
      })),
      averageRating: Number(avgRating._avg.rating?.toFixed(2) ?? 0),
      quoteAcceptanceRate,
      completionRate,
    };
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
    if (d.priorityScheduling !== undefined) out.priorityScheduling = !!d.priorityScheduling;
    if (d.isActive !== undefined) out.isActive = !!d.isActive;
    return out;
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

  // ─── APP SETTINGS (feature flags / maintenance) ────────────────────────────

  @Get('settings')
  getSettings() {
    return this.settings.get();
  }

  @Patch('settings')
  updateSettings(@Body() data: any) {
    return this.settings.update({
      maintenanceMode: data.maintenanceMode,
      maintenanceMessage: data.maintenanceMessage,
      registrationEnabled: data.registrationEnabled,
      paymentsEnabled: data.paymentsEnabled,
      paymentsTestMode: data.paymentsTestMode,
    });
  }

  // ─── CUSTOM NOTIFICATIONS (broadcast) ──────────────────────────────────────

  @Post('notifications/broadcast')
  @HttpCode(HttpStatus.CREATED)
  async broadcast(
    @Body() body: { target: string; userId?: string; title: string; body: string },
  ) {
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
    }
    return { sent: userIds.length };
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

  private async getQuoteAcceptanceRate(): Promise<number> {
    const [total, approved] = await Promise.all([
      this.prisma.quote.count({ where: { status: { not: 'PENDING' } } }),
      this.prisma.quote.count({ where: { status: 'APPROVED' } }),
    ]);
    return total > 0 ? Math.round((approved / total) * 100) : 0;
  }

  private async getCompletionRate(): Promise<number> {
    const [total, completed] = await Promise.all([
      this.prisma.serviceRequest.count({ where: { status: { notIn: ['DRAFT', 'AWAITING_PAYMENT'] } } }),
      this.prisma.serviceRequest.count({ where: { status: 'COMPLETED' } }),
    ]);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }
}
