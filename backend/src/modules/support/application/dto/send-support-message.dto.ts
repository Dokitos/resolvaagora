import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendSupportMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @IsOptional()
  @IsUUID()
  serviceRequestId?: string;
}
