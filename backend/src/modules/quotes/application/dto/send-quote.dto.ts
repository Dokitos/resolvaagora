import { IsString, IsNumber, IsPositive, IsOptional, Min } from 'class-validator';

export class SendQuoteDto {
  @IsString()
  description: string;

  @IsNumber()
  @IsPositive()
  laborCost: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  materialsCost?: number;
}
