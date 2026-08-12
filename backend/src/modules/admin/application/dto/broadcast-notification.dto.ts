import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class BroadcastNotificationDto {
  @IsIn(['USER', 'ALL_CLIENTS', 'ALL_TECHNICIANS'])
  target: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  body: string;
}
