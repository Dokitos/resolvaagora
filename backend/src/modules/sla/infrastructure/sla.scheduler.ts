import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { NotificationsGateway } from '../../notifications/presentation/notifications.gateway';

@Injectable()
export class SlaScheduler {
  private readonly logger = new Logger(SlaScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly gateway: NotificationsGateway,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSlaViolations() {
    const now = new Date();

    await Promise.all([
      this.checkFirstResponse(now),
      this.checkArrival(now),
      this.checkResolution(now),
      this.checkQuoteExpiry(now),
    ]);
  }

  private async checkFirstResponse(now: Date) {
    const warningMin = this.config.get<number>('SLA_FIRST_RESPONSE_WARNING', 30);
    const criticalMin = this.config.get<number>('SLA_FIRST_RESPONSE_CRITICAL', 60);

    const activeDistributions = await this.prisma.serviceRequest.findMany({
      where: { status: 'IN_DISTRIBUTION' },
      select: { id: true, updatedAt: true },
    });

    for (const sr of activeDistributions) {
      const minutesElapsed = (now.getTime() - sr.updatedAt.getTime()) / 60000;
      const level = minutesElapsed >= criticalMin ? 'CRITICAL' : minutesElapsed >= warningMin ? 'WARNING' : null;
      if (level) await this.triggerAlert(sr.id, 'FIRST_RESPONSE', level);
    }
  }

  private async checkArrival(now: Date) {
    const warningMin = this.config.get<number>('SLA_ARRIVAL_WARNING', 120);
    const criticalMin = this.config.get<number>('SLA_ARRIVAL_CRITICAL', 240);

    const assigned = await this.prisma.serviceRequest.findMany({
      where: { status: 'ASSIGNED' },
      select: { id: true, assignedAt: true },
    });

    for (const sr of assigned) {
      if (!sr.assignedAt) continue;
      const minutesElapsed = (now.getTime() - sr.assignedAt.getTime()) / 60000;
      const level = minutesElapsed >= criticalMin ? 'CRITICAL' : minutesElapsed >= warningMin ? 'WARNING' : null;
      if (level) await this.triggerAlert(sr.id, 'ARRIVAL', level);
    }
  }

  private async checkResolution(now: Date) {
    const warningMin = this.config.get<number>('SLA_RESOLUTION_WARNING', 4320);
    const criticalMin = this.config.get<number>('SLA_RESOLUTION_CRITICAL', 7200);

    const active = await this.prisma.serviceRequest.findMany({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED', 'EXPIRED', 'QUOTE_REJECTED', 'DRAFT', 'AWAITING_PAYMENT'] },
      },
      select: { id: true, createdAt: true },
    });

    for (const sr of active) {
      const minutesElapsed = (now.getTime() - sr.createdAt.getTime()) / 60000;
      const level = minutesElapsed >= criticalMin ? 'CRITICAL' : minutesElapsed >= warningMin ? 'WARNING' : null;
      if (level) await this.triggerAlert(sr.id, 'RESOLUTION', level);
    }
  }

  private async checkQuoteExpiry(now: Date) {
    const warnBefore8h = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const warnBefore1h = new Date(now.getTime() + 60 * 60 * 1000);

    const pendingQuotes = await this.prisma.quote.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { gt: now, lte: warnBefore8h },
      },
      select: { serviceRequestId: true, expiresAt: true },
    });

    for (const q of pendingQuotes) {
      const level = q.expiresAt <= warnBefore1h ? 'CRITICAL' : 'WARNING';
      await this.triggerAlert(q.serviceRequestId, 'QUOTE_EXPIRY', level);
    }
  }

  private async triggerAlert(serviceRequestId: string, metric: string, level: string) {
    const existing = await this.prisma.slaAlert.findFirst({
      where: {
        serviceRequestId,
        metric: metric as any,
        level: level as any,
        resolvedAt: null,
      },
    });

    if (existing) return; // Já existe alerta ativo

    await this.prisma.slaAlert.create({
      data: { serviceRequestId, metric: metric as any, level: level as any },
    });

    await this.rabbitmq.publish(this.rabbitmq.exchanges.sla, 'sla.alert.triggered', {
      serviceRequestId,
      metric,
      level,
    });

    // Push WebSocket para admins
    this.gateway.emitToAll('sla-alert', { serviceRequestId, metric, level });

    this.logger.warn(`SLA ${level} alert: ${metric} for SR ${serviceRequestId}`);
  }
}
