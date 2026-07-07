import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { PromoService } from '../application/promo.service';

@Controller('promo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  validate(@Body('code') rawCode: string, @Body('amount') amount: number) {
    return this.promoService.validate(rawCode, Number(amount ?? 0));
  }
}
