import { IsString, IsNumber, IsPositive, IsOptional, Min, MaxLength, IsIn } from 'class-validator';
import { DifficultyTier } from '@prisma/client';

export class SendQuoteDto {
  @IsString()
  @MaxLength(2000)
  description: string;

  @IsNumber()
  @IsPositive()
  laborCost: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  materialsCost?: number;

  /// Classificação de dificuldade (GREEN/YELLOW/RED) — usada pelo sistema de
  /// créditos dos planos de assinatura. Opcional para não partir clientes
  /// móveis antigos; se em falta, é inferida a partir do valor do orçamento.
  @IsOptional()
  @IsIn(['GREEN', 'YELLOW', 'RED'])
  difficultyTier?: DifficultyTier;
}
