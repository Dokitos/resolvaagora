import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SocialLoginDto {
  /** ID token do Firebase Auth, obtido no cliente após entrar com Apple/Google. */
  @IsString()
  @MinLength(10)
  idToken: string;

  /**
   * Nome recolhido pelo cliente. A Apple só o envia no primeiro início de
   * sessão, e nessa altura o token já não o traz — daí vir à parte.
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
