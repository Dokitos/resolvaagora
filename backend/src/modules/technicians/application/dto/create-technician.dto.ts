import { IsString, IsArray, Matches, IsEnum, IsOptional, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';
import { Specialty } from '@prisma/client';
import { IsNifPT, IsPersonName, IsPhone, IsStrictEmail } from '@shared/validation/text.validators';

export class CreateTechnicianDto {
  @IsStrictEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsPersonName()
  firstName: string;

  @IsString()
  @IsPersonName()
  lastName: string;

  @IsString()
  @IsPhone()
  phone: string;

  @IsOptional()
  @IsString()
  @IsNifPT()
  nif?: string;

  @IsArray()
  @IsEnum(Specialty, { each: true })
  specialties: Specialty[];

  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @Matches(/^\p{L}[\p{L}\p{M}' .-]*$/u, { each: true, message: 'Distrito inválido.' })
  coverageDistricts: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  dailyServiceLimit?: number;
}
