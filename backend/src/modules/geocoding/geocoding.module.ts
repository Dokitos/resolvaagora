import { Module } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';
import { PostalCodeService } from './postal-code.service';
import { GeoController } from './geo.controller';

@Module({
  controllers: [GeoController],
  providers: [GeocodingService, PostalCodeService],
  exports: [GeocodingService, PostalCodeService],
})
export class GeocodingModule {}
