import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ServiceStatus } from '@prisma/client';

export class UpdateServiceStatusDto {
  @IsEnum(ServiceStatus)
  status: ServiceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
