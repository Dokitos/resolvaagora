import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.from = config.get('SMTP_FROM', 'ResolvaAgora <noreply@resolvaagora.pt>');
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

  /** True quando o SMTP está realmente configurado (utilizador + password). */
  get configured(): boolean {
    return !!this.config.get('SMTP_USER') && !!this.config.get('SMTP_PASS');
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(`Email send failed to ${to}`, err);
    }
  }

  quoteReceivedEmail(totalCost: number, expiresAt: Date): string {
    return `
      <h2>Orçamento recebido!</h2>
      <p>Recebeu um orçamento de <strong>€${totalCost.toFixed(2)}</strong>.</p>
      <p>Tem até <strong>${expiresAt.toLocaleDateString('pt-PT')}</strong> para aceitar ou rejeitar.</p>
      <p>Aceda à plataforma para ver os detalhes e responder.</p>
    `;
  }

  serviceCompletedEmail(technicianName: string): string {
    return `
      <h2>Serviço concluído!</h2>
      <p>O seu serviço foi concluído pelo técnico <strong>${technicianName}</strong>.</p>
      <p>Por favor, avalie o serviço na plataforma.</p>
    `;
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
    return `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
        <div style="background:#161616;color:#F5B301;padding:20px 24px">
          <h2 style="margin:0">ResolvaAgora</h2>
          <p style="margin:4px 0 0;color:#fff;opacity:.85">Recibo de serviço</p>
        </div>
        <div style="padding:24px">
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
        </div>
      </div>
    `;
  }

  verifyEmailHtml(link: string): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
        <div style="background:#161616;color:#F5B301;padding:20px 24px">
          <h2 style="margin:0">ResolvaAgora</h2>
          <p style="margin:4px 0 0;color:#fff;opacity:.85">Confirma o teu email</p>
        </div>
        <div style="padding:24px">
          <p>Obrigado por te registares na ResolvaAgora! Confirma o teu email para garantires o acesso a todas as funcionalidades.</p>
          <p style="text-align:center;margin:26px 0">
            <a href="${link}" style="background:#F5B301;color:#161616;text-decoration:none;font-weight:bold;padding:13px 30px;border-radius:26px;display:inline-block">Confirmar email</a>
          </p>
          <p style="color:#6B7280;font-size:13px">Se não te registaste na ResolvaAgora, ignora este email.</p>
        </div>
      </div>
    `;
  }

  passwordResetEmail(code: string): string {
    return `
      <h2>Recuperação de palavra-passe</h2>
      <p>Recebemos um pedido para redefinir a sua palavra-passe na ResolvaAgora.</p>
      <p>Use este código na aplicação:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#CC0000">${code}</p>
      <p>O código expira em 15 minutos. Se não foi você, ignore este email.</p>
    `;
  }
}
