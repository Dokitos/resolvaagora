import { IsOptional, IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  /**
   * Obrigatória para contas com palavra-passe. Contas criadas por Apple/Google
   * não têm nenhuma, e nesses casos a confirmação é feita no próprio ecrã.
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  password?: string;
}
