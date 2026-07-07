import { IsString, IsEmail, IsArray, IsEnum, IsOptional, IsInt, Min, Max, MinLength } from 'class-validator';
import { Specialty } from '@prisma/client';

export class CreateTechnicianDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  nif?: string;

  @IsArray()
  @IsEnum(Specialty, { each: true })
  specialties: Specialty[];

  @IsArray()
  @IsString({ each: true })
  districts: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  dailyServiceLimit?: number;
}
