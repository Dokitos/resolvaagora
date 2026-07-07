import { Injectable } from '@nestjs/common';
import type { Prisma, PromoCode } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

export interface PromoValidation {
  valid: boolean;
  message?: string;
  code?: string;
  discountType?: string;
  discountValue?: number;
  discount?: number;
  finalAmount?: number;
}

@Injectable()
export class PromoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Desconto (em €) que um promo aplica a um dado montante, sem passar do próprio montante. */
  private computeDiscount(promo: PromoCode, amount: number): number {
    const value = Number(promo.discountValue);
    const raw = promo.discountType === 'PERCENT' ? (amount * value) / 100 : value;
    return Math.min(Math.max(0, raw), amount);
  }

  /** Valida um código contra um montante. Não altera estado. */
  async validate(rawCode: string, amount: number): Promise<PromoValidation> {
    const code = (rawCode ?? '').trim().toUpperCase();
    if (!code) return { valid: false, message: 'Indica um código.' };

    const promo = await this.prisma.promoCode.findFirst({ where: { code, isActive: true } });
    if (!promo) return { valid: false, message: 'Código inválido.' };
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return { valid: false, message: 'Código expirado.' };
    }
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
      return { valid: false, message: 'Código esgotado.' };
    }

    const order = Number(amount ?? 0);
    if (promo.minOrderValue != null && order < Number(promo.minOrderValue)) {
      return {
        valid: false,
        message: `Válido para pedidos a partir de ${Number(promo.minOrderValue).toFixed(2)}€.`,
      };
    }

    const discount = this.computeDiscount(promo, order);
    return {
      valid: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: Number(promo.discountValue),
      discount: Number(discount.toFixed(2)),
      finalAmount: Number(Math.max(0, order - discount).toFixed(2)),
    };
  }

  /**
   * Resgata um código dentro de uma transação: revalida à prova de corridas
   * (incrementa `usedCount` só se ainda houver usos) e devolve o desconto em €.
   * Devolve `null` se o código for inválido/esgotado (o chamador segue sem desconto).
   */
  async redeem(
    tx: Prisma.TransactionClient,
    rawCode: string | undefined | null,
    amount: number,
  ): Promise<{ code: string; discount: number } | null> {
    const code = (rawCode ?? '').trim().toUpperCase();
    if (!code || amount <= 0) return null;

    const promo = await tx.promoCode.findFirst({ where: { code, isActive: true } });
    if (!promo) return null;
    if (promo.expiresAt && promo.expiresAt < new Date()) return null;
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return null;
    if (promo.minOrderValue != null && amount < Number(promo.minOrderValue)) return null;

    const discount = this.computeDiscount(promo, amount);
    if (discount <= 0) return null;

    // Incremento condicional: se maxUses definido, só conta quando ainda há folga.
    if (promo.maxUses != null) {
      const updated = await tx.promoCode.updateMany({
        where: { id: promo.id, usedCount: { lt: promo.maxUses } },
        data: { usedCount: { increment: 1 } },
      });
      if (updated.count === 0) return null; // corrida perdida: esgotou entretanto
    } else {
      await tx.promoCode.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    return { code: promo.code, discount: Number(discount.toFixed(2)) };
  }
}
