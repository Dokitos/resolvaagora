import { IsString, IsNumber, IsPositive, IsOptional, Min, MaxLength } from 'class-validator';

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
}
