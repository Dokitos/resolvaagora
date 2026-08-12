import { IsString, IsEmail, IsArray, IsEnum, IsOptional, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';
import { Specialty } from '@prisma/client';

export class CreateTechnicianDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nif?: string;

  @IsArray()
  @IsEnum(Specialty, { each: true })
  specialties: Specialty[];

  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  coverageDistricts: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  dailyServiceLimit?: number;
}
