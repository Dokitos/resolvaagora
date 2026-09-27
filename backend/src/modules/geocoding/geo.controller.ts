import { BadRequestException, Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PostalCodeService } from './postal-code.service';

/**
 * Pesquisa de código postal para o passo de localização da reserva.
 *
 * Sem login de propósito: a reserva começa antes de o cliente ter conta (as
 * categorias e o fluxo de pedido são públicos). O limite de pedidos por minuto
 * protege o serviço externo de alguém que use isto como proxy gratuito.
 */
@Controller('geo')
export class GeoController {
  constructor(private readonly postalCodes: PostalCodeService) {}

  @Get('postal-code/:code')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async postalCode(@Param('code') raw: string) {
    // Aceita "2890239" (teclado numérico do iOS) além de "2890-239".
    const m = /^(\d{4})(?:[\s-]?(\d{3}))?$/.exec((raw ?? '').trim());
    if (!m) throw new BadRequestException('Código postal inválido (formato 0000-000).');
    const code = m[2] ? `${m[1]}-${m[2]}` : m[1];

    const info = await this.postalCodes.lookup(code);
    if (!info) throw new NotFoundException('Código postal não encontrado.');
    return info;
  }
}
