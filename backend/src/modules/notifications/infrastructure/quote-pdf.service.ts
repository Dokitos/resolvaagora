import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

export interface QuotePdfData {
  quoteId: string;
  serviceRequestId: string;
  description: string;
  laborCost: number;
  materialsCost: number;
  vatRate: number;
  totalCost: number;
  expiresAt: Date;
  createdAt: Date;
  clientName: string;
  serviceAddress: string;
  technicianName: string;
  technicianSpecialty: string;
}

const BRAND_DARK = '#161616';
const BRAND_ACCENT = '#F5B301';
const GREY_TEXT = '#374151';
const GREY_LIGHT = '#9CA3AF';
const BORDER = '#E5E7EB';

/**
 * Gera o PDF do orçamento enviado ao cliente (anexo do email `quote.sent`).
 * Isolado como serviço próprio (independente do envio de email) para poder
 * ser testado/reutilizado sem depender do EmailService.
 */
@Injectable()
export class QuotePdfService {
  generate(data: QuotePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        this.render(doc, data);
        doc.end();
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  private eur(v: number): string {
    return `${v.toFixed(2)} €`;
  }

  private render(doc: PDFKit.PDFDocument, data: QuotePdfData): void {
    const pageWidth = doc.page.width;
    const marginX = 50;
    const contentWidth = pageWidth - marginX * 2;

    // ── Cabeçalho de marca ────────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, 100).fill(BRAND_DARK);
    doc
      .fillColor(BRAND_ACCENT)
      .font('Helvetica-Bold')
      .fontSize(24)
      .text('ResolvaAgora', marginX, 32);
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica')
      .fontSize(11)
      .text('Orçamento de serviço técnico', marginX, 62);

    doc.fillColor(GREY_TEXT);
    doc.y = 130;

    // ── Identificação do orçamento ──────────────────────────────────────────
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(BRAND_DARK)
      .text('Orçamento', marginX, doc.y);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(GREY_LIGHT)
      .text(
        `Ref. ${data.quoteId.slice(0, 8).toUpperCase()}  ·  Emitido em ${data.createdAt.toLocaleDateString('pt-PT')}`,
        marginX,
        doc.y + 2,
      );

    doc.moveDown(1.5);

    // ── Dados do cliente / serviço / técnico ────────────────────────────────
    const infoTop = doc.y;
    const colWidth = contentWidth / 2;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(GREY_LIGHT).text('CLIENTE', marginX, infoTop);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(GREY_TEXT)
      .text(data.clientName, marginX, infoTop + 14, { width: colWidth - 10 });

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(GREY_LIGHT)
      .text('TÉCNICO', marginX + colWidth, infoTop);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(GREY_TEXT)
      .text(`${data.technicianName} (${data.technicianSpecialty})`, marginX + colWidth, infoTop + 14, {
        width: colWidth - 10,
      });

    const afterFirstRow = doc.y + 8;
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(GREY_LIGHT)
      .text('MORADA DO SERVIÇO', marginX, afterFirstRow);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(GREY_TEXT)
      .text(data.serviceAddress, marginX, afterFirstRow + 14, { width: contentWidth });

    doc.moveDown(2);

    // ── Descrição do trabalho ───────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GREY_LIGHT).text('DESCRIÇÃO DO TRABALHO', marginX, doc.y);
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(GREY_TEXT)
      .text(data.description, marginX, doc.y + 4, { width: contentWidth, lineGap: 2 });

    doc.moveDown(1.5);

    // ── Tabela de valores ────────────────────────────────────────────────────
    const rows: [string, string, boolean][] = [
      ['Mão de obra', this.eur(data.laborCost), false],
      ['Materiais', this.eur(data.materialsCost), false],
      [`IVA (${(data.vatRate * 100).toFixed(0)}%)`, this.eur((data.laborCost + data.materialsCost) * data.vatRate), false],
      ['Total c/ IVA', this.eur(data.totalCost), true],
    ];

    const tableTop = doc.y + 6;
    let rowY = tableTop;
    const rowHeight = 24;

    doc
      .rect(marginX, rowY, contentWidth, rowHeight * rows.length)
      .fillAndStroke('#FAFAFA', BORDER);

    rows.forEach(([label, value, isTotal], i) => {
      const y = rowY + i * rowHeight;
      if (isTotal) {
        doc.rect(marginX, y, contentWidth, rowHeight).fill('#FFF7E0');
      }
      doc
        .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(isTotal ? 12 : 11)
        .fillColor(isTotal ? BRAND_DARK : GREY_TEXT)
        .text(label, marginX + 14, y + 6, { width: contentWidth / 2 })
        .text(value, marginX, y + 6, { width: contentWidth - 14, align: 'right' });
      if (i < rows.length - 1) {
        doc
          .moveTo(marginX, y + rowHeight)
          .lineTo(marginX + contentWidth, y + rowHeight)
          .strokeColor(BORDER)
          .stroke();
      }
    });

    doc.y = rowY + rowHeight * rows.length + 20;

    // ── Prazo de validade ────────────────────────────────────────────────────
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(BRAND_DARK)
      .text(`Válido até ${data.expiresAt.toLocaleDateString('pt-PT')}`, marginX, doc.y);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(GREY_TEXT)
      .text('Após esta data, o orçamento expira e terá de ser solicitado um novo.', marginX, doc.y + 2, {
        width: contentWidth,
      });

    // ── Rodapé ──────────────────────────────────────────────────────────────
    // Posicionado bem acima da margem inferior (e com texto curto o
    // suficiente para caber numa linha) para nunca disparar uma página extra
    // por overflow automático do pdfkit.
    const footerY = doc.page.height - 90;
    doc
      .moveTo(marginX, footerY)
      .lineTo(marginX + contentWidth, footerY)
      .strokeColor(BORDER)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(GREY_LIGHT)
      .text(
        'ResolvaAgora — Serviços técnicos ao domicílio em Portugal.',
        marginX,
        footerY + 10,
        { width: contentWidth },
      );
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(GREY_LIGHT)
      .text(
        'Documento gerado automaticamente, não é fatura. Mais informações em resolvaagora.pt.',
        marginX,
        footerY + 22,
        { width: contentWidth },
      );
  }
}
