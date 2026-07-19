import { Injectable, Logger } from '@nestjs/common';

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
}
