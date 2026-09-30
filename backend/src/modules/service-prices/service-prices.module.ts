import { Module } from '@nestjs/common';
import { ServicePricesController } from './service-prices.controller';
import { CatalogContentController } from './catalog-content.controller';

@Module({
  controllers: [ServicePricesController, CatalogContentController],
})
export class ServicePricesModule {}
