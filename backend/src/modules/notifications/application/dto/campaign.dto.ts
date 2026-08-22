import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CampaignAudience } from '@prisma/client';

/**
 * Critérios de segmentação. Todos opcionais e combinados com E lógico — sem
 * nenhum, o segmento é "todos os utilizadores ativos".
 */
export class AudienceSegmentDto {
  @IsOptional()
  @IsIn(['CLIENT', 'TECHNICIAN'])
  role?: 'CLIENT' | 'TECHNICIAN';

  /** Registados nos últimos N dias ("membros novos"). */
  @IsOptional()
  @IsInt()
  @Min(1)
  registeredWithinDays?: number;

  /** Registados há mais de N dias — o complemento do anterior. */
  @IsOptional()
  @IsInt()
  @Min(1)
  registeredMoreThanDays?: number;

  /** Serviços concluídos, para separar quem já usou de quem nunca usou. */
  @IsOptional()
  @IsInt()
  @Min(0)
  minCompletedServices?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxCompletedServices?: number;

  /** Distrito do técnico. Não se aplica a clientes, que não têm distrito. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  district?: string;
}

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  body: string;

  @IsEnum(CampaignAudience)
  audience: CampaignAudience;

  /** Obrigatório quando `audience = GROUP`. */
  @IsOptional()
  @IsUUID()
  groupId?: string;

  /** Obrigatório quando `audience = SEGMENT`. */
  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceSegmentDto)
  segment?: AudienceSegmentDto;

  /**
   * Data/hora do envio, em ISO. Presente cria uma campanha agendada; ausente
   * guarda um rascunho. O envio imediato é feito pelo endpoint `/send`, para
   * que disparar não seja um efeito secundário de gravar.
   */
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  body?: string;

  @IsOptional()
  @IsEnum(CampaignAudience)
  audience?: CampaignAudience;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceSegmentDto)
  segment?: AudienceSegmentDto;

  /** `null` remove o agendamento e devolve a campanha a rascunho. */
  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;
}

/** Contagem de destinatários antes de gravar seja o que for. */
export class PreviewAudienceDto {
  @IsEnum(CampaignAudience)
  audience: CampaignAudience;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceSegmentDto)
  segment?: AudienceSegmentDto;
}

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class GroupMembersDto {
  @IsArray()
  @ArrayMaxSize(5000)
  @IsUUID('4', { each: true })
  userIds: string[];
}
