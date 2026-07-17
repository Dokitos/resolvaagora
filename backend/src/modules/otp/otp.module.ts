import { Global, Module } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { SmsService } from './sms.service';

@Global()
@Module({
  controllers: [OtpController],
  providers: [SmsService],
  exports: [SmsService],
})
export class OtpModule {}
