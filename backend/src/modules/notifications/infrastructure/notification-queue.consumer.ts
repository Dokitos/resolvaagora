import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { FcmService } from './fcm.service';
import { EmailService } from './email.service';
import { NotificationsGateway } from '../presentation/notifications.gateway';

@Injectable()
export class NotificationQueueConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationQueueConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly fcm: FcmService,
    private readonly email: EmailService,
    private readonly gateway: NotificationsGateway,
  ) {}

  onModuleInit() {
    const sub = (exchange: string, queue: string, key: string, handler: (msg: any) => Promise<void>) =>
      this.rabbitmq.subscribe(exchange, queue, key, handler)
        .catch((err) => this.logger.error(`Failed to subscribe to ${queue}`, err));

    sub(this.rabbitmq.exchanges.serviceRequests, 'notifications.service-assigned', 'service-request.assigned',
      async (msg) => {
        const { serviceRequestId, technicianId, clientId } = msg.data as any;
        await this.notifyAssignment(serviceRequestId, technicianId, clientId);
      });

    sub(this.rabbitmq.exchanges.serviceRequests, 'notifications.status-updated', 'service-request.status.updated',
      async (msg) => {
        const { serviceRequestId, newStatus, clientId, technicianId } = msg.data as any;
        await this.notifyStatusUpdate(serviceRequestId, newStatus, clientId, technicianId);
      });

    sub(this.rabbitmq.exchanges.quotes, 'notifications.quote-sent', 'quote.sent',
      async (msg) => {
        const { serviceRequestId, clientId, totalCost, expiresAt } = msg.data as any;
        await this.notifyQuoteSent(serviceRequestId, clientId, totalCost, expiresAt);
      });

    sub(this.rabbitmq.exchanges.serviceRequests, 'notifications.service-completed', 'service-request.completed',
      async (msg) => {
        const { serviceRequestId, clientId } = msg.data as any;
        await this.notifyCompletion(serviceRequestId, clientId);
      });

    sub(this.rabbitmq.exchanges.serviceRequests, 'notifications.new-request-admin', 'service-request.created',
      async (msg) => {
        const { serviceRequestId } = msg.data as any;
        await this.notifyAdminsNewRequest(serviceRequestId);
      });
  }

  private async notifyAdminsNewRequest(serviceRequestId: string) {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: { client: true, address: true },
    });
    if (!sr) return;

    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    const clientName = `${sr.client.firstName} ${sr.client.lastName}`;
    const title = 'Novo pedido de serviço';
    const body = `${sr.specialty} — ${clientName}`;

    for (const admin of admins) {
      await this.saveNotification(admin.id, 'NEW_SERVICE_REQUEST', title, body, { serviceRequestId });
      this.gateway.emitToUser(admin.id, 'new-service-request', {
        serviceRequestId,
        specialty: sr.specialty,
        clientName,
        city: sr.address?.city ?? null,
      });
    }
  }

  private async getUserTokens(userId: string): Promise<string[]> {
    const tokens = await this.prisma.fcmToken.findMany({ where: { userId } });
    return tokens.map((t) => t.token);
  }

  private async saveNotification(userId: string, type: string, title: string, body: string, data?: any) {
    await this.prisma.notification.create({
      data: { userId, type: type as any, title, body, data },
    });
  }

  private async notifyAssignment(serviceRequestId: string, technicianId: string, clientId: string) {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: { technician: true, client: { include: { user: true } } },
    });
    if (!sr) return;

    const techUser = await this.prisma.user.findUnique({ where: { id: sr.technician!.userId } });

    // Notifica técnico
    const techTokens = await this.getUserTokens(techUser!.id);
    await this.fcm.sendToMultiple(techTokens, 'Novo serviço atribuído', sr.description.substring(0, 100));
    await this.saveNotification(techUser!.id, 'SERVICE_ASSIGNED', 'Novo serviço', `Tem um novo serviço atribuído`, { serviceRequestId });

    // Notifica cliente
    const clientTokens = await this.getUserTokens(sr.client.userId);
    const title = 'Técnico atribuído!';
    const body = `O técnico ${sr.technician!.firstName} foi atribuído ao seu serviço.`;
    await this.fcm.sendToMultiple(clientTokens, title, body);
    await this.saveNotification(sr.client.userId, 'SERVICE_ASSIGNED', title, body, { serviceRequestId });

    // WebSocket ao cliente
    this.gateway.emitToUser(sr.client.userId, 'service-status-updated', { serviceRequestId, newStatus: 'ASSIGNED' });
  }

  private async notifyStatusUpdate(serviceRequestId: string, newStatus: string, clientId: string, technicianId?: string) {
    if (newStatus === 'IN_TRANSIT') {
      const sr = await this.prisma.serviceRequest.findUnique({
        where: { id: serviceRequestId },
        include: { client: { include: { user: true } } },
      });
      if (!sr) return;

      const title = 'Técnico a caminho!';
      const body = 'O técnico está em deslocamento para a sua morada.';
      const tokens = await this.getUserTokens(sr.client.userId);
      await this.fcm.sendToMultiple(tokens, title, body);
      await this.saveNotification(sr.client.userId, 'TECHNICIAN_IN_TRANSIT', title, body, { serviceRequestId });
      this.gateway.emitToUser(sr.client.userId, 'service-status-updated', { serviceRequestId, newStatus });
    }
  }

  private async notifyQuoteSent(serviceRequestId: string, clientId: string, totalCost: number, expiresAt: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    });
    if (!client) return;

    const title = 'Orçamento recebido!';
    const body = `Recebeu um orçamento de €${Number(totalCost).toFixed(2)}. Responda em 48h.`;
    const tokens = await this.getUserTokens(client.userId);
    await this.fcm.sendToMultiple(tokens, title, body);
    await this.email.send(client.user.email, title, this.email.quoteReceivedEmail(totalCost, new Date(expiresAt)));
    await this.saveNotification(client.userId, 'QUOTE_RECEIVED', title, body, { serviceRequestId });
    this.gateway.emitToUser(client.userId, 'quote-received', { serviceRequestId });
  }

  private async notifyCompletion(serviceRequestId: string, clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    });
    if (!client) return;

    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: { technician: true },
    });
    if (!sr) return;

    const techName = `${sr.technician!.firstName} ${sr.technician!.lastName}`;
    const title = 'Serviço concluído!';
    const body = 'O seu serviço foi concluído. Por favor, avalie o técnico.';
    const tokens = await this.getUserTokens(client.userId);
    await this.fcm.sendToMultiple(tokens, title, body);
    await this.email.send(client.user.email, title, this.email.serviceCompletedEmail(techName));
    await this.saveNotification(client.userId, 'SERVICE_COMPLETED', title, body, { serviceRequestId });
    this.gateway.emitToUser(client.userId, 'service-status-updated', { serviceRequestId, newStatus: 'COMPLETED' });
  }
}
