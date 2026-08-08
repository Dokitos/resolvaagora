import { Module } from '@nestjs/common';
import { ServicePricesController } from './service-prices.controller';

@Module({
  controllers: [ServicePricesController],
})
export class ServicePricesModule {}
