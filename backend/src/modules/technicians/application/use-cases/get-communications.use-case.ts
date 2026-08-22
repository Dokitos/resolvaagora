import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

export type CommunicationKind = 'NOTICE' | 'EMAIL' | 'PAYMENT';

export interface CommunicationItem {
  id: string;
  kind: CommunicationKind;
  title: string;
  body?: string;
  /** Só em PAYMENT: valor ganho, em euros. */
  amount?: number;
  /** Só em NOTICE: permite marcar como lida e abrir o pedido associado. */
  read?: boolean;
  serviceRequestId?: string;
  createdAt: string;
}

const DEFAULT_LIMIT = 30;

/**
 * Feed único da aba "Comunicação" do técnico: avisos da aplicação, emails que
 * lhe foram enviados e pagamentos recebidos, ordenados por data.
 *
 * As três origens vivem em tabelas diferentes e sem relação entre si, por isso
 * a junção é feita aqui: vai-se buscar as mais recentes de cada uma, junta-se,
 * ordena-se e corta-se no limite pedido. Paginar cada tabela isoladamente daria
 * um feed com buracos.
 */
@Injectable()
export class GetCommunicationsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userId: string,
    options: { before?: string; limit?: number } = {},
  ): Promise<{ items: CommunicationItem[]; nextCursor: string | null }> {
    const limit = Math.min(options.limit ?? DEFAULT_LIMIT, 100);

    // O cursor é a data do último item já mostrado: cada origem devolve só o
    // que é anterior a essa data, e a ordenação global mantém-se correta.
    const before = options.before ? new Date(options.before) : undefined;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, technician: { select: { id: true } } },
    });
    if (!user?.technician) throw new NotFoundException('Técnico não encontrado.');

    const [notices, emails, earnings] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, ...(before && { createdAt: { lt: before } }) },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.emailLog.findMany({
        where: { toEmail: user.email, ...(before && { sentAt: { lt: before } }) },
        orderBy: { sentAt: 'desc' },
        take: limit,
        select: { id: true, subject: true, templateType: true, sentAt: true },
      }),
      this.prisma.earning.findMany({
        where: {
          technicianId: user.technician.id,
          ...(before && { earnedAt: { lt: before } }),
        },
        orderBy: { earnedAt: 'desc' },
        take: limit,
        select: { id: true, type: true, amount: true, earnedAt: true, serviceRequestId: true },
      }),
    ]);

    const items: CommunicationItem[] = [
      ...notices.map((n) => ({
        id: n.id,
        kind: 'NOTICE' as const,
        title: n.title,
        body: n.body,
        read: n.readAt !== null,
        serviceRequestId: (n.data as { serviceRequestId?: string } | null)?.serviceRequestId,
        createdAt: n.createdAt.toISOString(),
      })),
      ...emails.map((e) => ({
        id: e.id,
        kind: 'EMAIL' as const,
        title: e.subject,
        body: e.templateType ?? undefined,
        createdAt: e.sentAt.toISOString(),
      })),
      ...earnings.map((e) => ({
        id: e.id,
        kind: 'PAYMENT' as const,
        title: this.earningLabel(e.type),
        amount: Number(e.amount),
        serviceRequestId: e.serviceRequestId,
        createdAt: e.earnedAt.toISOString(),
      })),
    ];

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const page = items.slice(0, limit);

    // Só há próxima página se alguma origem ainda tinha mais para dar; se o
    // total junto não encheu o limite, chegámos ao fim das três.
    const hasMore = items.length > page.length;

    return {
      items: page,
      nextCursor: hasMore && page.length > 0 ? page[page.length - 1].createdAt : null,
    };
  }

  private earningLabel(type: string): string {
    switch (type) {
      case 'DISPLACEMENT':
        return 'Taxa de deslocação';
      case 'SERVICE':
        return 'Pagamento de serviço';
      case 'BONUS':
        return 'Bónus';
      default:
        return 'Pagamento';
    }
  }
}
