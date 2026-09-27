import { IsEmail, IsString, MinLength, IsOptional, Matches, MaxLength } from 'class-validator';
import { IsPersonName, IsPhone, IsStrictEmail } from '@shared/validation/text.validators';

export class RegisterDto {
  @IsStrictEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  @IsPersonName()
  firstName: string;

  @IsString()
  @IsPersonName()
  lastName: string;

  @IsOptional()
  @IsString()
  @IsPhone()
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Código de indicação inválido.' })
  referralCode?: string;
}
