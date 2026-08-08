import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

const SITE_URL = 'https://www.resolvaagora.pt';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  // A Resend é usada via API HTTP (porta 443) porque muitos hosts (ex.: Railway)
  // bloqueiam as portas SMTP de saída. Cai para SMTP se não houver chave Resend.
  private readonly resendKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.from = config.get('SMTP_FROM', 'ResolvaAgora <geral@resolvaagora.pt>');
    const smtpPass = config.get<string>('SMTP_PASS') ?? '';
    this.resendKey =
      config.get<string>('RESEND_API_KEY') ?? (smtpPass.startsWith('re_') ? smtpPass : '');
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
    });
  }

  /** True quando há forma de enviar email (Resend API ou SMTP configurado). */
  get configured(): boolean {
    return !!this.resendKey || (!!this.config.get('SMTP_USER') && !!this.config.get('SMTP_PASS'));
  }

  /**
   * Envia o email (Resend ou SMTP) e guarda sempre uma cópia na pasta
   * "Enviados" do admin — inclui os envios automáticos (recibos, códigos,
   * notificações), não só os compostos manualmente no painel.
   */
  async send(to: string, subject: string, html: string): Promise<{ id: string; status: 'enviado' | 'falhou' }> {
    let status: 'enviado' | 'falhou' = 'enviado';
    // Preferir a API HTTP da Resend (não depende de portas SMTP).
    if (this.resendKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: this.from, to, subject, html }),
        });
        if (!res.ok) {
          status = 'falhou';
          this.logger.error(`Resend API falhou (${res.status}) para ${to}: ${await res.text()}`);
        }
      } catch (err) {
        status = 'falhou';
        this.logger.error(`Resend API erro para ${to}`, err as Error);
      }
    } else {
      // Fallback: SMTP (nodemailer).
      try {
        await this.transporter.sendMail({ from: this.from, to, subject, html });
      } catch (err) {
        status = 'falhou';
        this.logger.error(`Email send failed to ${to}`, err);
      }
    }

    const { name: fromName, address: fromEmail } = this.parseFrom(this.from);
    const saved = await this.prisma.email.create({
      data: {
        messageId: `sent-${randomUUID()}`,
        subject,
        fromName,
        fromEmail,
        toEmail: [to],
        bodyHtml: html,
        isRead: true,
        folder: 'sent',
      },
    });
    return { id: saved.id, status };
  }

  private parseFrom(from: string): { name: string | null; address: string } {
    const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    if (m) return { name: m[1] || null, address: m[2].trim() };
    return { name: null, address: from.trim() };
  }

  /**
   * Envolve o conteúdo de qualquer email transacional com a identidade visual
   * da marca (cabeçalho + rodapé) — para que nenhum email automático saia
   * "sem cara", igual ao que os grandes serviços (Google, etc.) fazem.
   */
  private brandedEmail(subtitle: string | null, bodyHtml: string): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
        <div style="background:#161616;color:#F5B301;padding:20px 24px">
          <h2 style="margin:0;letter-spacing:.5px">ResolvaAgora</h2>
          ${subtitle ? `<p style="margin:4px 0 0;color:#fff;opacity:.85">${subtitle}</p>` : ''}
        </div>
        <div style="padding:24px">
          ${bodyHtml}
        </div>
        <div style="padding:16px 24px;border-top:1px solid #E5E7EB;background:#FAFAFA">
          <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6">
            ResolvaAgora — Serviços técnicos ao domicílio em Portugal<br>
            Este é um email automático, por favor não responda diretamente a esta mensagem.
            Para mais informações, visite <a href="${SITE_URL}" style="color:#9CA3AF">resolvaagora.pt</a>.
          </p>
        </div>
      </div>
    `;
  }

  quoteReceivedEmail(totalCost: number, expiresAt: Date): string {
    return this.brandedEmail(
      'Orçamento recebido',
      `
      <p style="margin:0 0 12px;font-size:15px;color:#374151">Recebeu um orçamento de <strong>€${totalCost.toFixed(2)}</strong>.</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151">Tem até <strong>${expiresAt.toLocaleDateString('pt-PT')}</strong> para aceitar ou rejeitar.</p>
      <p style="margin:0;font-size:15px;color:#374151">Aceda à plataforma para ver os detalhes e responder.</p>
      `,
    );
  }

  serviceCompletedEmail(technicianName: string): string {
    return this.brandedEmail(
      'Serviço concluído',
      `
      <p style="margin:0 0 12px;font-size:15px;color:#374151">O seu serviço foi concluído pelo técnico <strong>${technicianName}</strong>.</p>
      <p style="margin:0;font-size:15px;color:#374151">Por favor, avalie o serviço na plataforma.</p>
      `,
    );
  }

  receiptEmail(data: {
    requestId: string;
    serviceLabel: string;
    date: string;
    clientName: string;
    nif?: string | null;
    billingAddress?: string | null;
    technicianName?: string | null;
    lines: { label: string; value: string }[];
    total: string;
  }): string {
    const rows = data.lines
      .map(
        (l) =>
          `<tr><td style="padding:6px 0;color:#374151">${l.label}</td><td style="padding:6px 0;text-align:right">${l.value}</td></tr>`,
      )
      .join('');
    return this.brandedEmail(
      'Recibo de serviço',
      `
      <p style="margin:0 0 4px"><strong>${data.serviceLabel}</strong></p>
      <p style="margin:0;color:#6B7280;font-size:13px">Pedido #${data.requestId.slice(0, 8).toUpperCase()} · ${data.date}</p>
      <p style="margin:12px 0 0;font-size:14px">Cliente: ${data.clientName}${data.nif ? ` · NIF ${data.nif}` : ''}</p>
      ${data.billingAddress ? `<p style="margin:2px 0 0;font-size:14px;color:#374151">Morada de faturação: ${data.billingAddress}</p>` : ''}
      ${data.technicianName ? `<p style="margin:2px 0 0;font-size:14px">Técnico: ${data.technicianName}</p>` : ''}
      <table style="width:100%;margin-top:16px;border-top:1px solid #E5E7EB;font-size:14px">
        ${rows}
        <tr><td style="padding:10px 0 0;border-top:1px solid #E5E7EB;font-weight:bold">Total</td><td style="padding:10px 0 0;border-top:1px solid #E5E7EB;text-align:right;font-weight:bold;color:#161616">${data.total}</td></tr>
      </table>
      <p style="margin:20px 0 0;color:#9CA3AF;font-size:12px">Obrigado por escolher a ResolvaAgora. Documento não fiscal.</p>
      `,
    );
  }

  verifyEmailHtml(link: string): string {
    return this.brandedEmail(
      'Confirma o teu email',
      `
      <p style="margin:0 0 12px;font-size:15px;color:#374151">Obrigado por te registares na ResolvaAgora! Confirma o teu email para garantires o acesso a todas as funcionalidades.</p>
      <p style="text-align:center;margin:26px 0">
        <a href="${link}" style="background:#F5B301;color:#161616;text-decoration:none;font-weight:bold;padding:13px 30px;border-radius:26px;display:inline-block">Confirmar email</a>
      </p>
      <p style="margin:0;color:#6B7280;font-size:13px">Se não te registaste na ResolvaAgora, ignora este email.</p>
      `,
    );
  }

  /** Email genérico de notificação (atualizações de pedidos, etc.). */
  genericEmail(title: string, body: string): string {
    return this.brandedEmail(
      null,
      `
      <h3 style="margin:0 0 10px;color:#161616">${title}</h3>
      <p style="margin:0;color:#374151;font-size:15px;line-height:1.6">${body}</p>
      <p style="margin:16px 0 0;color:#9CA3AF;font-size:12px">Podes acompanhar tudo na app ResolvaAgora.</p>
      `,
    );
  }

  /** Email de boas-vindas ao técnico com as credenciais de acesso. */
  technicianWelcomeEmail(name: string, email: string, password: string): string {
    return this.brandedEmail(
      'Bem-vindo à equipa de técnicos',
      `
      <p style="margin:0 0 12px;font-size:15px;color:#374151">Olá ${name},</p>
      <p style="margin:0 0 12px;font-size:15px;color:#374151">Foi criada uma conta de técnico para ti na ResolvaAgora. Podes entrar na aplicação com estas credenciais:</p>
      <div style="background:#FFF7E0;border:1px solid #F5B301;border-radius:10px;padding:16px 18px;margin:18px 0">
        <p style="margin:0 0 6px"><strong>Email:</strong> ${email}</p>
        <p style="margin:0"><strong>Palavra-passe:</strong> ${password}</p>
      </div>
      <p style="margin:0;color:#6B7280;font-size:13px">Por segurança, recomendamos que alteres a palavra-passe após o primeiro acesso.</p>
      `,
    );
  }

  passwordResetEmail(code: string): string {
    return this.brandedEmail(
      'Recuperação de palavra-passe',
      `
      <p style="margin:0 0 12px;font-size:15px;color:#374151">Recebemos um pedido para redefinir a sua palavra-passe na ResolvaAgora.</p>
      <p style="margin:0 0 8px;font-size:15px;color:#374151">Use este código na aplicação:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#161616;margin:0 0 12px">${code}</p>
      <p style="margin:0;color:#6B7280;font-size:13px">O código expira em 15 minutos. Se não foi você, ignore este email.</p>
      `,
    );
  }
}
