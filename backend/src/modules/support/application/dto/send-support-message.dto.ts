import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { IsCleanText } from '@shared/validation/text.validators';

export class SendSupportMessageDto {
  @IsString()
  @MinLength(1)
  @IsCleanText({ max: 2000, allowNewlines: true })
  body: string;

  @IsOptional()
  @IsUUID()
  serviceRequestId?: string;
}
