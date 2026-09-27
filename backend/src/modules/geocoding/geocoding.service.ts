import { Injectable, Logger } from '@nestjs/common';
import { districtFromIso, normalizeDistrict } from './districts';

// Throttle a nível de módulo (~1 req/s) para respeitar a política de uso do
// Nominatim (OpenStreetMap). Guarda o timestamp da última chamada.
let lastCallAt = 0;

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly userAgent =
    process.env.NOMINATIM_USER_AGENT ?? 'ResolvaAgora/1.0 (geral@resolvaagora.pt)';

  /**
   * Geocodifica uma morada em coordenadas (lat/lng) via Nominatim.
   * Nunca lança: devolve null em caso de erro/timeout/sem resultado.
   */
  async geocode(query: string): Promise<{ lat: number; lng: number } | null> {
    if (!query || !query.trim()) return null;
    try {
      // Throttle ~1 req/s.
      const wait = 1000 - (Date.now() - lastCallAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastCallAt = Date.now();

      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        query.trim(),
      )}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`Nominatim respondeu ${res.status} para "${query}"`);
        return null;
      }
      const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
      const first = Array.isArray(data) ? data[0] : null;
      if (!first?.lat || !first?.lon) return null;
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    } catch (err) {
      this.logger.warn(`Geocode falhou para "${query}": ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Centro aproximado de um código postal, com localidade e concelho.
   * Usado como recurso quando o geoapi.pt não responde: o OpenStreetMap não
   * tem os nomes das ruas por código postal e as coordenadas podem ficar a
   * centenas de metros, mas dá para situar o mapa na zona certa.
   */
  async geocodePostalCode(
    code: string,
  ): Promise<{
    lat: number;
    lng: number;
    locality: string | null;
    municipality: string | null;
    district: string | null;
  } | null> {
    try {
      const wait = 1000 - (Date.now() - lastCallAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastCallAt = Date.now();

      const url =
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1` +
        `&countrycodes=pt&postalcode=${encodeURIComponent(code)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as Array<{ lat?: string; lon?: string; address?: Record<string, string> }>;
      const first = data?.[0];
      const lat = Number(first?.lat);
      const lng = Number(first?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const a = first?.address ?? {};
      return {
        lat,
        lng,
        locality: a.village ?? a.town ?? a.city ?? null,
        municipality: a.municipality ?? a.city ?? a.town ?? null,
        // O código ISO é a fonte fiável; o "county" é o recurso.
        district: districtFromIso(a['ISO3166-2-lvl6']) ?? normalizeDistrict(a.county),
      };
    } catch (err) {
      this.logger.warn(`Geocode de código postal falhou para ${code}: ${(err as Error).message}`);
      return null;
    }
  }
}
