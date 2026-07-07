import { Module } from '@nestjs/common';
import { PromoController } from './presentation/promo.controller';
import { ReferralsController } from './presentation/referrals.controller';
import { PromoService } from './application/promo.service';

@Module({
  controllers: [PromoController, ReferralsController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromotionsModule {}
