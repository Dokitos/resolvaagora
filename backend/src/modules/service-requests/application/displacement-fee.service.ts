import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

/** Parâmetros do cálculo da deslocação (subconjunto de AppSetting). */
export interface DisplacementSettings {
  displacementOriginLat: number | null;
  displacementOriginLng: number | null;
  displacementPerKm: number;
  displacementBaseFee: number;
  displacementMinFee: number;
}

/** Coordenadas de uma morada (podem faltar). */
export interface Coords {
  latitude: number | null;
  longitude: number | null;
}

const DEFAULT_ORIGIN_LAT = 38.7169; // Lisboa
const DEFAULT_ORIGIN_LNG = -9.1395;
const DEFAULT_PER_KM = 1.1;

// Rede de segurança apenas para o caso extremo: sem coordenadas (geocoding
// falhou) E baseFee/minFee configurados a 0. Nunca deixa a taxa cair a €0 em
// silêncio como puro efeito colateral de uma falha de geocoding — €0 de
// deslocação deve ser sempre uma decisão deliberada de negócio (definições
// configuradas assim), nunca um acidente. Ver logger.error abaixo.
const ABSOLUTE_MIN_DISPLACEMENT_FEE = 15;

/** Contexto opcional para logging (visibilidade no admin de qual pedido/morada foi afetado). */
export interface FeeContext {
  addressId?: string;
  serviceRequestId?: string;
}

/**
 * Fonte única de verdade para a taxa de deslocação (usada em create-service-request
 * e no endpoint de cotação). Fórmula: raw = base + km*perKm; fee = max(raw, minFee).
 */
@Injectable()
export class DisplacementFeeService {
  private readonly logger = new Logger(DisplacementFeeService.name);

  constructor(private readonly prisma: PrismaService) {}

  private round2(n: number): number {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  /** Distância em km entre dois pontos (fórmula de Haversine). */
  haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // raio da Terra em km
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Calcula `base` (taxa base configurada) e `fee` (taxa final antes de desconto)
   * para uma morada. Se a morada não tiver coordenadas, usa max(base, minFee).
   */
  computeFee(
    settings: DisplacementSettings | null,
    coords: Coords,
    context?: FeeContext,
  ): { base: number; fee: number } {
    const originLat = settings?.displacementOriginLat ?? DEFAULT_ORIGIN_LAT;
    const originLng = settings?.displacementOriginLng ?? DEFAULT_ORIGIN_LNG;
    const perKm = settings?.displacementPerKm ?? DEFAULT_PER_KM;
    const baseFee = settings?.displacementBaseFee ?? 0;
    const minFee = settings?.displacementMinFee ?? 0;

    let fee: number;
    if (
      coords.latitude != null &&
      coords.longitude != null &&
      originLat != null &&
      originLng != null
    ) {
      const km = this.haversineKm(originLat, originLng, coords.latitude, coords.longitude);
      fee = Math.max(baseFee + km * perKm, minFee);
    } else {
      // Sem coordenadas (geocoding falhou ou a morada nunca foi geocodificada):
      // a taxa cai para o fallback configurado. Isto é silencioso por natureza
      // para o cliente, por isso regista-se sempre um aviso para dar
      // visibilidade no admin de qual morada/pedido foi afetado.
      const addr = context?.addressId ?? 'desconhecido';
      const sr = context?.serviceRequestId ?? 'desconhecido';
      this.logger.warn(
        `Taxa de deslocação sem coordenadas — a usar fallback configurado (base/min). addressId=${addr} serviceRequestId=${sr}`,
      );

      const configuredFallback = Math.max(baseFee, minFee);
      if (configuredFallback === 0) {
        // baseFee e minFee estão ambos a 0 nas definições: sem coordenadas,
        // isto faria o cliente pagar €0 de deslocação — nunca deve ser um
        // efeito colateral de falha de geocoding, só uma decisão deliberada
        // de negócio. Aplica-se um mínimo absoluto de segurança e regista-se
        // bem visível para investigação/correção manual.
        this.logger.error(
          `Taxa de deslocação cairia para €0 (baseFee e minFee ambos 0) sem coordenadas — ` +
            `a aplicar mínimo absoluto de segurança de €${ABSOLUTE_MIN_DISPLACEMENT_FEE}. ` +
            `addressId=${addr} serviceRequestId=${sr}`,
        );
        fee = ABSOLUTE_MIN_DISPLACEMENT_FEE;
      } else {
        fee = configuredFallback;
      }
    }
    return { base: this.round2(baseFee), fee: this.round2(fee) };
  }

  /** Aplica o desconto premium (pct) à taxa. */
  applyDiscount(fee: number, discountPct: number): number {
    const pct = Number(discountPct) || 0;
    return this.round2(fee * (1 - pct / 100));
  }

  /**
   * Cotação completa para uma morada, aplicando o desconto premium do cliente
   * (0 se não tiver subscrição). Lê os parâmetros do AppSetting.
   */
  async quoteForAddress(
    coords: Coords,
    discountPct = 0,
    context?: FeeContext,
  ): Promise<{ base: number; fee: number; feeAfterDiscount: number }> {
    const settings = await this.prisma.appSetting.findUnique({ where: { id: 'app' } });
    const { base, fee } = this.computeFee(settings, coords, context);
    return { base, fee, feeAfterDiscount: this.applyDiscount(fee, discountPct) };
  }
}
