import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { EmailService } from '../notifications/infrastructure/email.service';

type Folder = 'inbox' | 'sent' | 'trash';

@Injectable()
export class EmailInboxService {
  private readonly logger = new Logger(EmailInboxService.name);
  private readonly pageSize = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ── Caixa de correio ──────────────────────────────────────────────────────
  async list(folder: Folder = 'inbox', page = 1) {
    const where = { folder };
    const [items, total] = await Promise.all([
      this.prisma.email.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: (Math.max(1, page) - 1) * this.pageSize,
        take: this.pageSize,
      }),
      this.prisma.email.count({ where }),
    ]);
    return { items, total };
  }

  async get(id: string) {
    const email = await this.prisma.email.findUnique({ where: { id } });
    if (!email) throw new NotFoundException('Email não encontrado');
    return email;
  }

  async update(
    id: string,
    patch: { isRead?: boolean; isStarred?: boolean; folder?: Folder },
  ) {
    await this.get(id);
    return this.prisma.email.update({
      where: { id },
      data: {
        ...(patch.isRead !== undefined && { isRead: patch.isRead }),
        ...(patch.isStarred !== undefined && { isStarred: patch.isStarred }),
        ...(patch.folder !== undefined && { folder: patch.folder }),
      },
    });
  }

  /** Envia um email manual (Resend) e guarda-o na pasta "Enviados". */
  async send(to: string, subject: string, html: string) {
    let status = 'enviado';
    try {
      await this.email.send(to, subject, html);
    } catch (e) {
      status = 'falhou';
      this.logger.error(`Falha ao enviar email para ${to}: ${e}`);
    }

    await this.prisma.emailLog.create({
      data: { toEmail: to, subject, bodyHtml: html, templateType: 'manual', status },
    });

    const sent = await this.prisma.email.create({
      data: {
        messageId: `sent-${randomUUID()}`,
        subject,
        fromName: 'ResolvaAgora',
        fromEmail: 'geral@resolvaagora.pt',
        toEmail: [to],
        bodyHtml: html,
        isRead: true,
        folder: 'sent',
      },
    });
    return { ...sent, status };
  }

  // ── Templates ─────────────────────────────────────────────────────────────
  listTemplates() {
    return this.prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createTemplate(data: {
    nome: string;
    slug: string;
    assunto: string;
    bodyHtml: string;
    variaveis?: any;
    ativo?: boolean;
  }) {
    return this.prisma.emailTemplate.create({
      data: {
        nome: data.nome,
        slug: data.slug,
        assunto: data.assunto,
        bodyHtml: data.bodyHtml,
        variaveis: data.variaveis ?? undefined,
        ativo: data.ativo ?? true,
      },
    });
  }

  async updateTemplate(id: string, data: any) {
    return this.prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.assunto !== undefined && { assunto: data.assunto }),
        ...(data.bodyHtml !== undefined && { bodyHtml: data.bodyHtml }),
        ...(data.variaveis !== undefined && { variaveis: data.variaveis }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
      },
    });
  }

  deleteTemplate(id: string) {
    return this.prisma.emailTemplate.delete({ where: { id } });
  }

  // ── Receção (webhook Resend inbound) ──────────────────────────────────────
  /** Guarda um email recebido (idempotente por messageId). */
  async ingestInbound(data: any) {
    const messageId =
      data?.headers?.['message-id'] ??
      data?.message_id ??
      data?.email_id ??
      data?.id ??
      randomUUID();

    const fromRaw: string = data?.from ?? data?.sender ?? '';
    const { name, address } = this.parseFrom(fromRaw);
    const to: string[] = Array.isArray(data?.to)
      ? data.to
      : data?.to
        ? [String(data.to)]
        : [];

    await this.prisma.email.upsert({
      where: { messageId },
      update: {},
      create: {
        messageId,
        subject: data?.subject ?? '(sem assunto)',
        fromName: name,
        fromEmail: address || 'desconhecido',
        toEmail: to,
        bodyText: data?.text ?? null,
        bodyHtml: data?.html ?? null,
        folder: 'inbox',
        receivedAt: data?.created_at ? new Date(data.created_at) : new Date(),
      },
    });
  }

  private parseFrom(from: string): { name: string | null; address: string } {
    const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    if (m) return { name: m[1] || null, address: m[2].trim() };
    return { name: null, address: from.trim() };
  }
}
