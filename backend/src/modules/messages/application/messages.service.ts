import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ServiceStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { NotificationsGateway } from '../../notifications/presentation/notifications.gateway';
import { FcmService } from '../../notifications/infrastructure/fcm.service';

/**
 * Estados em que a conversa aceita mensagens novas.
 *
 * A regra de negócio é falar só no contexto de um trabalho a decorrer: antes de
 * haver técnico atribuído não há com quem falar, e depois de concluído ou
 * cancelado a conversa fecha — o que evita que a plataforma sirva de ponto de
 * contacto para combinar serviços por fora.
 *
 * Ler o histórico continua permitido depois de fechar: é prova do que foi
 * combinado, e é isso que permite arbitrar uma disputa.
 */
const OPEN_STATUSES: ServiceStatus[] = [
  'ASSIGNED',
  'IN_TRANSIT',
  'ARRIVED',
  'IN_DIAGNOSIS',
  'QUOTE_SENT',
  'QUOTE_APPROVED',
  'IN_EXECUTION',
];

interface Participants {
  clientUserId: string;
  technicianUserId: string | null;
  status: ServiceStatus;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly fcm: FcmService,
  ) {}

  async list(serviceRequestId: string, userId: string, isAdmin: boolean) {
    const participants = await this.participants(serviceRequestId);
    this.assertCanRead(participants, userId, isAdmin);

    const messages = await this.prisma.serviceMessage.findMany({
      where: { serviceRequestId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            client: { select: { firstName: true, lastName: true } },
            technician: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return {
      canSend: this.canSend(participants, userId, isAdmin),
      closedReason: this.closedReason(participants, userId, isAdmin),
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        senderId: m.senderId,
        senderName: this.displayName(m.sender),
        senderRole: m.sender.role,
        readAt: m.readAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async send(serviceRequestId: string, userId: string, body: string) {
    const participants = await this.participants(serviceRequestId);

    // O admin lê para moderar, mas não escreve: uma mensagem da plataforma no
    // meio da conversa confundiria quem está a falar com quem.
    if (userId !== participants.clientUserId && userId !== participants.technicianUserId) {
      throw new ForbiddenException('Não faz parte desta conversa.');
    }
    if (!participants.technicianUserId) {
      throw new BadRequestException('Ainda não há técnico atribuído a este pedido.');
    }
    if (!OPEN_STATUSES.includes(participants.status)) {
      throw new BadRequestException('Esta conversa está fechada.');
    }

    const message = await this.prisma.serviceMessage.create({
      data: { serviceRequestId, senderId: userId, body },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            client: { select: { firstName: true, lastName: true } },
            technician: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const recipientId =
      userId === participants.clientUserId
        ? participants.technicianUserId
        : participants.clientUserId;

    const payload = {
      id: message.id,
      serviceRequestId,
      body: message.body,
      senderId: message.senderId,
      senderName: this.displayName(message.sender),
      createdAt: message.createdAt.toISOString(),
    };

    this.gateway.emitToUser(recipientId, 'service-message', payload);
    await this.pushToRecipient(recipientId, this.displayName(message.sender), body, serviceRequestId);

    return payload;
  }

  async markRead(serviceRequestId: string, userId: string) {
    const participants = await this.participants(serviceRequestId);
    this.assertCanRead(participants, userId, false);

    // Só as do outro lado: marcar as próprias como lidas não significa nada e
    // estragaria o indicador de "entregue" do interlocutor.
    const result = await this.prisma.serviceMessage.updateMany({
      where: { serviceRequestId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
    return { read: result.count };
  }

  /**
   * Conversas do utilizador, com a última mensagem e quantas estão por ler.
   * Serve tanto o técnico como o cliente — muda só o lado por onde se filtra.
   */
  async conversations(userId: string, role: 'CLIENT' | 'TECHNICIAN') {
    const where =
      role === 'CLIENT'
        ? { client: { userId } }
        : { technician: { userId } };

    const requests = await this.prisma.serviceRequest.findMany({
      where: { ...where, messages: { some: {} } },
      select: {
        id: true,
        specialty: true,
        status: true,
        client: { select: { firstName: true, lastName: true } },
        technician: { select: { firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderId: true },
        },
        _count: {
          select: { messages: { where: { senderId: { not: userId }, readAt: null } } },
        },
      },
    });

    return requests
      .map((r) => ({
        serviceRequestId: r.id,
        specialty: r.specialty,
        status: r.status,
        open: OPEN_STATUSES.includes(r.status),
        // O nome mostrado é sempre o do outro lado da conversa.
        counterpart:
          role === 'CLIENT'
            ? this.fullName(r.technician)
            : this.fullName(r.client),
        lastMessage: r.messages[0]?.body ?? '',
        lastMessageAt: r.messages[0]?.createdAt.toISOString() ?? null,
        unread: r._count.messages,
      }))
      .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
  }

  // ─── Auxiliares ────────────────────────────────────────────────────────────

  private async participants(serviceRequestId: string): Promise<Participants> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      select: {
        status: true,
        client: { select: { userId: true } },
        technician: { select: { userId: true } },
      },
    });
    if (!request) throw new NotFoundException('Pedido não encontrado.');

    return {
      clientUserId: request.client.userId,
      technicianUserId: request.technician?.userId ?? null,
      status: request.status,
    };
  }

  private assertCanRead(p: Participants, userId: string, isAdmin: boolean) {
    if (isAdmin) return;
    if (userId !== p.clientUserId && userId !== p.technicianUserId) {
      throw new ForbiddenException('Não faz parte desta conversa.');
    }
  }

  private canSend(p: Participants, userId: string, isAdmin: boolean): boolean {
    if (isAdmin) return false;
    if (userId !== p.clientUserId && userId !== p.technicianUserId) return false;
    return p.technicianUserId !== null && OPEN_STATUSES.includes(p.status);
  }

  private closedReason(p: Participants, userId: string, isAdmin: boolean): string | null {
    if (this.canSend(p, userId, isAdmin)) return null;
    if (isAdmin) return 'Vista de moderação: leitura apenas.';
    if (!p.technicianUserId) return 'A conversa abre quando um técnico for atribuído.';
    if (!OPEN_STATUSES.includes(p.status)) {
      return 'O serviço terminou. O histórico fica disponível, mas já não é possível enviar mensagens.';
    }
    return null;
  }

  private async pushToRecipient(
    userId: string,
    senderName: string,
    body: string,
    serviceRequestId: string,
  ) {
    const tokens = (
      await this.prisma.fcmToken.findMany({ where: { userId }, select: { token: true } })
    ).map((t) => t.token);
    if (tokens.length === 0) return;

    // O corpo é cortado porque a notificação não é o sítio para ler a
    // mensagem inteira — serve para saber que chegou e abrir a conversa.
    const preview = body.length > 120 ? `${body.slice(0, 117)}…` : body;
    await this.fcm.sendToMultiple(tokens, senderName, preview, { serviceRequestId });
  }

  private displayName(sender: {
    role: string;
    client: { firstName: string; lastName: string } | null;
    technician: { firstName: string; lastName: string } | null;
  }): string {
    if (sender.client) return this.fullName(sender.client);
    if (sender.technician) return this.fullName(sender.technician);
    return 'ResolvaAgora';
  }

  private fullName(p: { firstName: string; lastName: string } | null): string {
    return p ? `${p.firstName} ${p.lastName}`.trim() : '';
  }
}
