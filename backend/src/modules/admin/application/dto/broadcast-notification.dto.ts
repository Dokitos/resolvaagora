import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { IsCleanText } from '@shared/validation/text.validators';

export class BroadcastNotificationDto {
  @IsIn(['USER', 'ALL_CLIENTS', 'ALL_TECHNICIANS'])
  target: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  @MinLength(1)
  @IsCleanText({ max: 120 })
  title: string;

  @IsString()
  @MinLength(1)
  @IsCleanText({ max: 500, allowNewlines: true })
  body: string;
}
