import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@shared/infrastructure/cache/redis.service';
import { GeocodingService } from './geocoding.service';
import { normalizeDistrict } from './districts';

export interface PostalCodeInfo {
  postalCode: string;
  /**
   * `street` quando o código é completo (0000-000) e aponta para uma rua;
   * `zone` quando só se deram os 4 primeiros dígitos, que cobrem um concelho
   * inteiro — a app usa isto para decidir o zoom do mapa e o texto a mostrar.
   * `approximate` quando veio do recurso ao OpenStreetMap: sem nome de rua e
   * com a posição possivelmente a algumas centenas de metros.
   */
  precision: 'street' | 'zone' | 'approximate';
  streets: string[];
  locality: string | null;
  municipality: string | null;
  district: string | null;
  lat: number;
  lng: number;
}

/** Os códigos postais quase não mudam; 30 dias poupa o serviço externo. */
const CACHE_TTL = 30 * 24 * 60 * 60;
/** Um código inexistente também se guarda, mas menos tempo. */
const MISS_TTL = 24 * 60 * 60;

/**
 * Código postal → rua, localidade e coordenadas, via geoapi.pt.
 *
 * O geoapi.pt é um serviço público português construído sobre os dados dos
 * CTT e do INE. Foi escolhido em vez do Nominatim (que o GeocodingService já
 * usa para moradas completas) porque o OpenStreetMap não tem a maioria dos
 * códigos postais de 7 dígitos portugueses, e é exatamente essa precisão que a
 * app precisa para mostrar a rua certa.
 *
 * Nunca lança: se o serviço externo falhar, devolve `null` e a app mantém o
 * comportamento antigo — um problema do lado deles não pode travar reservas.
 */
@Injectable()
export class PostalCodeService {
  private readonly logger = new Logger(PostalCodeService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly geocoding: GeocodingService,
    private readonly config: ConfigService,
  ) {}

  async lookup(code: string): Promise<PostalCodeInfo | null> {
    const key = `geo:cp:${code}`;
    const cached = await this.redis.getJson<PostalCodeInfo | { miss: true }>(key).catch(() => null);
    if (cached) return 'miss' in cached ? null : cached;

    const precise = await this.fromGeoApi(code);
    if (precise === 'not-found') {
      await this.redis.setJson(key, { miss: true }, MISS_TTL).catch(() => undefined);
      return null;
    }
    if (precise) {
      await this.redis.setJson(key, precise, CACHE_TTL).catch(() => undefined);
      return precise;
    }

    // O geoapi.pt não respondeu (sem chave, limite atingido ou em baixo).
    // O resultado aproximado guarda-se só um dia, para que o preciso o
    // substitua assim que o serviço voltar ou a chave for configurada.
    const approx = await this.geocoding.geocodePostalCode(code);
    if (!approx) return null;
    const info: PostalCodeInfo = {
      postalCode: code,
      precision: code.includes('-') ? 'approximate' : 'zone',
      streets: [],
      locality: approx.locality,
      municipality: approx.municipality,
      district: approx.district,
      lat: approx.lat,
      lng: approx.lng,
    };
    await this.redis.setJson(key, info, MISS_TTL).catch(() => undefined);
    return info;
  }

  /**
   * Sem chave, o geoapi.pt dá 5 pedidos por dia por IP — inútil em produção,
   * onde todos os clientes saem do mesmo servidor. Com `GEOAPI_KEY` definida
   * (plano pago, até 10 000/dia) passa a ser a fonte principal; com a cache de
   * 30 dias cada código só é pedido uma vez por mês, o que sobra de longe.
   */
  private async fromGeoApi(code: string): Promise<PostalCodeInfo | 'not-found' | null> {
    const apiKey = this.config.get<string>('GEOAPI_KEY');
    try {
      const res = await fetch(`https://json.geoapi.pt/cp/${encodeURIComponent(code)}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ResolvaAgora/1.0 (geral@resolvaagora.pt)',
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        signal: AbortSignal.timeout(6000),
      });
      if (res.status === 404) return 'not-found';
      if (!res.ok) {
        this.logger.warn(
          `geoapi.pt respondeu ${res.status} para ${code}${apiKey ? '' : ' (sem GEOAPI_KEY: 5 pedidos/dia)'}`,
        );
        return null;
      }
      return this.parse(code, (await res.json()) as Record<string, any>);
    } catch (err) {
      this.logger.warn(`geoapi.pt falhou para ${code}: ${(err as Error).message}`);
      return null;
    }
  }

  private parse(code: string, d: Record<string, any>): PostalCodeInfo | null {
    const centre = Array.isArray(d.centro) ? d.centro : Array.isArray(d.centroide) ? d.centroide : null;
    const lat = Number(centre?.[0]);
    const lng = Number(centre?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const streets: string[] = Array.isArray(d.partes)
      ? [...new Set<string>(d.partes.map((p: any) => p?.['Artéria']).filter(Boolean))]
      : [];

    // Com 4 dígitos, "Localidade" é uma lista com todas as localidades da
    // zona — mostrar uma delas seria enganador, por isso fica o concelho.
    const locality = typeof d.Localidade === 'string' ? d.Localidade : null;

    return {
      postalCode: code,
      precision: code.includes('-') ? 'street' : 'zone',
      streets: code.includes('-') ? streets.slice(0, 5) : [],
      locality,
      municipality: typeof d.Concelho === 'string' ? d.Concelho : null,
      district: normalizeDistrict(typeof d.Distrito === 'string' ? d.Distrito : null),
      lat,
      lng,
    };
  }
}
