import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ServiceStatus } from '@prisma/client';

export class UpdateServiceStatusDto {
  @IsEnum(ServiceStatus)
  status: ServiceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
