import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { IsAddressText, IsPostalCodePT } from '@shared/validation/text.validators';

export class CreateAddressDto {
  @IsString()
  @IsAddressText(50)
  label: string;

  @IsString()
  @IsAddressText(200)
  street: string;

  @IsString()
  @IsAddressText(20)
  number: string;

  @IsOptional()
  @IsString()
  @IsAddressText(20)
  floor?: string;

  @IsString()
  @IsPostalCodePT()
  postalCode: string;

  @IsString()
  @IsAddressText(100)
  city: string;

  @IsString()
  @IsAddressText(100)
  district: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
