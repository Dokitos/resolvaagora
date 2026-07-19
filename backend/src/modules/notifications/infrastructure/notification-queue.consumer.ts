import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { FcmService } from './fcm.service';
import { EmailService } from './email.service';
import { NotificationsGateway } from '../presentation/notifications.gateway';

/**
 * Mensagens para o CLIENTE por cada mudança de estado feita pelo técnico.
 * (ASSIGNED, QUOTE_SENT e COMPLETED têm handlers próprios — não estão aqui.)
 */
const CLIENT_STATUS_MSG: Record<string, { type: string; title: string; body: string }> = {
  IN_TRANSIT: { type: 'TECHNICIAN_IN_TRANSIT', title: 'Técnico a caminho!', body: 'O técnico está a caminho da sua morada.' },
  ARRIVED: { type: 'TECHNICIAN_ARRIVED', title: 'O técnico chegou', body: 'O técnico chegou à sua morada.' },
  IN_DIAGNOSIS: { type: 'ANNOUNCEMENT', title: 'Diagnóstico em curso', body: 'O técnico está a avaliar o serviço para preparar o orçamento.' },
  IN_EXECUTION: { type: 'ANNOUNCEMENT', title: 'Trabalho em execução', body: 'O técnico começou a executar o serviço.' },
};

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

    sub(this.rabbitmq.exchanges.quotes, 'notifications.quote-approved', 'quote.approved',
      async (msg) => {
        const { serviceRequestId, technicianId } = msg.data as any;
        await this.notifyQuoteResponse(serviceRequestId, technicianId, true);
      });

    sub(this.rabbitmq.exchanges.quotes, 'notifications.quote-rejected', 'quote.rejected',
      async (msg) => {
        const { serviceRequestId, technicianId } = msg.data as any;
        await this.notifyQuoteResponse(serviceRequestId, technicianId, false);
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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async getUserTokens(userId: string): Promise<string[]> {
    const tokens = await this.prisma.fcmToken.findMany({ where: { userId } });
    return tokens.map((t) => t.token);
  }

  private async saveNotification(userId: string, type: string, title: string, body: string, data?: any) {
    await this.prisma.notification.create({
      data: { userId, type: type as any, title, body, data },
    });
  }

  /** Entrega uma notificação a um utilizador: push (FCM) + email + in-app + socket. */
  private async deliver(
    userId: string,
    email: string | null,
    type: string,
    title: string,
    body: string,
    serviceRequestId: string,
    socketEvent = 'service-status-updated',
    socketPayload?: any,
  ) {
    try {
      const tokens = await this.getUserTokens(userId);
      if (tokens.length) await this.fcm.sendToMultiple(tokens, title, body);
    } catch (e) {
      this.logger.error(`Falha no push para ${userId}: ${e}`);
    }
    if (email) {
      try {
        await this.email.send(email, title, this.email.genericEmail(title, body));
      } catch (e) {
        this.logger.error(`Falha no email para ${email}: ${e}`);
      }
    }
    try {
      await this.saveNotification(userId, type, title, body, { serviceRequestId });
    } catch (e) {
      this.logger.error(`Falha ao gravar notificação in-app: ${e}`);
    }
    this.gateway.emitToUser(userId, socketEvent, socketPayload ?? { serviceRequestId });
  }

  private async resolveTechnician(technicianId?: string | null) {
    if (!technicianId) return null;
    const t = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      include: { user: true },
    });
    if (!t?.user) return null;
    return { userId: t.user.id, email: t.user.email, firstName: t.firstName };
  }

  private async resolveClient(clientId?: string | null) {
    if (!clientId) return null;
    const c = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    });
    if (!c?.user) return null;
    // Só devolve email se o cliente aceitar notificações por email (definição da app).
    return {
      userId: c.user.id,
      email: c.emailNotifications ? c.user.email : null,
      firstName: c.firstName,
    };
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  private async notifyAdminsNewRequest(serviceRequestId: string) {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: { client: true, address: true },
    });
    if (!sr) return;

    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
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

  /** Novo serviço atribuído → notifica TÉCNICO (push+email) e CLIENTE (push+email). */
  private async notifyAssignment(serviceRequestId: string, _technicianId: string, _clientId: string) {
    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: { technician: { include: { user: true } }, client: { include: { user: true } } },
    });
    if (!sr) return;

    // Técnico — tem um novo trabalho associado.
    if (sr.technician?.user) {
      await this.deliver(
        sr.technician.user.id,
        sr.technician.user.email,
        'SERVICE_ASSIGNED',
        'Novo serviço atribuído',
        `Foi-lhe atribuído um novo serviço (${sr.specialty}): ${sr.description.substring(0, 120)}`,
        serviceRequestId,
        'service-assigned',
        { serviceRequestId },
      );
    }

    // Cliente — já tem técnico.
    if (sr.client?.user) {
      await this.deliver(
        sr.client.user.id,
        sr.client.emailNotifications ? sr.client.user.email : null,
        'SERVICE_ASSIGNED',
        'Técnico atribuído!',
        `O técnico ${sr.technician?.firstName ?? ''} foi atribuído ao seu serviço.`,
        serviceRequestId,
        'service-status-updated',
        { serviceRequestId, newStatus: 'ASSIGNED' },
      );
    }
  }

  /** Mudança de estado feita pelo técnico → notifica o CLIENTE (push+email+in-app). */
  private async notifyStatusUpdate(serviceRequestId: string, newStatus: string, clientId: string, _technicianId?: string) {
    const msg = CLIENT_STATUS_MSG[newStatus];
    if (!msg) return; // estados sem mensagem própria (ou tratados noutro handler)

    const client = await this.resolveClient(clientId);
    if (!client) return;

    await this.deliver(
      client.userId,
      client.email,
      msg.type,
      msg.title,
      msg.body,
      serviceRequestId,
      'service-status-updated',
      { serviceRequestId, newStatus },
    );
  }

  /** Cliente respondeu ao orçamento → notifica o TÉCNICO (push+email+in-app). */
  private async notifyQuoteResponse(serviceRequestId: string, technicianId: string, approved: boolean) {
    const tech = await this.resolveTechnician(technicianId);
    if (!tech) return;

    const title = approved ? 'Orçamento aprovado' : 'Orçamento recusado';
    const body = approved
      ? 'O cliente aprovou o seu orçamento. Pode avançar com o trabalho.'
      : 'O cliente recusou o seu orçamento.';

    await this.deliver(
      tech.userId,
      tech.email,
      approved ? 'QUOTE_APPROVED' : 'QUOTE_REJECTED',
      title,
      body,
      serviceRequestId,
      'quote-response',
      { serviceRequestId, approved },
    );
  }

  private async notifyQuoteSent(serviceRequestId: string, clientId: string, totalCost: number, expiresAt: string) {
    const client = await this.resolveClient(clientId);
    if (!client) return;

    const title = 'Orçamento recebido!';
    const body = `Recebeu um orçamento de €${Number(totalCost).toFixed(2)}. Responda dentro do prazo.`;
    try {
      const tokens = await this.getUserTokens(client.userId);
      if (tokens.length) await this.fcm.sendToMultiple(tokens, title, body);
    } catch (e) {
      this.logger.error(`Falha no push (quote) para ${client.userId}: ${e}`);
    }
    if (client.email) {
      try {
        await this.email.send(client.email, title, this.email.quoteReceivedEmail(totalCost, new Date(expiresAt)));
      } catch (e) {
        this.logger.error(`Falha no email (quote) para ${client.email}: ${e}`);
      }
    }
    await this.saveNotification(client.userId, 'QUOTE_RECEIVED', title, body, { serviceRequestId });
    this.gateway.emitToUser(client.userId, 'quote-received', { serviceRequestId });
  }

  private async notifyCompletion(serviceRequestId: string, clientId: string) {
    const client = await this.resolveClient(clientId);
    if (!client) return;

    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: { technician: true },
    });
    if (!sr) return;

    const techName = `${sr.technician?.firstName ?? ''} ${sr.technician?.lastName ?? ''}`.trim();
    const title = 'Serviço concluído!';
    const body = 'O seu serviço foi concluído. Por favor, avalie o técnico.';
    try {
      const tokens = await this.getUserTokens(client.userId);
      if (tokens.length) await this.fcm.sendToMultiple(tokens, title, body);
    } catch (e) {
      this.logger.error(`Falha no push (completion) para ${client.userId}: ${e}`);
    }
    if (client.email) {
      try {
        await this.email.send(client.email, title, this.email.serviceCompletedEmail(techName));
      } catch (e) {
        this.logger.error(`Falha no email (completion) para ${client.email}: ${e}`);
      }
    }
    await this.saveNotification(client.userId, 'SERVICE_COMPLETED', title, body, { serviceRequestId });
    this.gateway.emitToUser(client.userId, 'service-status-updated', { serviceRequestId, newStatus: 'COMPLETED' });
  }
}
