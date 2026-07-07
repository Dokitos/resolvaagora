import { IsString, IsEnum, IsUUID, IsOptional, IsDateString, IsBoolean, MaxLength } from 'class-validator';
import { Specialty } from '@prisma/client';

export class CreateServiceRequestDto {
  @IsUUID()
  addressId: string;

  @IsEnum(Specialty)
  specialty: Specialty;

  @IsString()
  description: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsBoolean()
  useFreeVisit?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  promoCode?: string;
}
