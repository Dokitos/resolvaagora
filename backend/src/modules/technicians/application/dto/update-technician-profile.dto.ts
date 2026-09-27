import { IsOptional, IsString } from 'class-validator';
import { IsPersonName, IsPhone, IsStrictEmail } from '@shared/validation/text.validators';

/**
 * Edição do próprio perfil pelo técnico. Antes o endpoint recebia um tipo
 * inline sem validação nenhuma — qualquer texto, emoji incluído, ia direto
 * para a base de dados e aparecia depois aos clientes.
 */
export class UpdateTechnicianProfileDto {
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
  @IsStrictEmail()
  email?: string;
}
