import { IsString, IsOptional, IsBoolean, Matches, MaxLength } from 'class-validator';
import { IsNifPT, IsPersonName, IsPhone } from '@shared/validation/text.validators';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsPersonName()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsPersonName()
  lastName?: string;

  @IsOptional()
  @IsString()
  @IsPhone()
  phone?: string;

  @IsOptional()
  @IsString()
  @IsNifPT()
  nif?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}
