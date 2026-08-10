import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { NotificationsGateway } from '../../notifications/presentation/notifications.gateway';
import { FcmService } from '../../notifications/infrastructure/fcm.service';

const METRIC_LABELS: Record<string, string> = {
  FIRST_RESPONSE: 'Primeira resposta',
  ARRIVAL: 'Chegada do técnico',
  RESOLUTION: 'Resolução do pedido',
  QUOTE_EXPIRY: 'Expiração de orçamento',
};

@Injectable()
export class SlaScheduler {
  private readonly logger = new Logger(SlaScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly gateway: NotificationsGateway,
    private readonly fcm: FcmService,
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

    // Notificação in-app + push para todos os admins — antes disto, o alerta
    // só era visível para quem estivesse com a página SLA aberta no browser.
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const label = METRIC_LABELS[metric] ?? metric;
    const title = `Alerta SLA (${level === 'CRITICAL' ? 'crítico' : 'aviso'})`;
    const body = `${label} — pedido ${serviceRequestId.slice(0, 8)} ultrapassou o limite.`;
    for (const admin of admins) {
      await this.prisma.notification.create({
        data: { userId: admin.id, type: 'SLA_ALERT', title, body, data: { serviceRequestId, metric, level } },
      });
      try {
        const tokens = await this.prisma.fcmToken.findMany({ where: { userId: admin.id } });
        if (tokens.length) {
          await this.fcm.sendToMultiple(tokens.map((t) => t.token), title, body, { serviceRequestId });
        }
      } catch (e) {
        this.logger.error(`Falha no push (SLA) para ${admin.id}: ${e}`);
      }
    }

    this.logger.warn(`SLA ${level} alert: ${metric} for SR ${serviceRequestId}`);
  }
}
