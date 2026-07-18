import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { UploadsController } from './uploads.controller';

@Global()
@Module({
  controllers: [StorageController, UploadsController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
