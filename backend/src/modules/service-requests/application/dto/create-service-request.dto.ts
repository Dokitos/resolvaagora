import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  IsNumber,
  ArrayMaxSize,
  Matches,
  MaxLength,
} from 'class-validator';
import { Specialty } from '@prisma/client';

// Apenas URLs http(s) (fotos alojadas no R2 via POST /uploads/image).
const SAFE_PHOTO_URL = /^https?:\/\//i;

export class CreateServiceRequestDto {
  @IsUUID()
  addressId: string;

  @IsEnum(Specialty)
  specialty: Specialty;

  @IsString()
  description: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsBoolean()
  useFreeVisit?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  promoCode?: string;

  // Fotos do problema tiradas pelo cliente (URLs R2 já carregados).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(SAFE_PHOTO_URL, { each: true, message: 'URL de foto inválida' })
  photoUrls?: string[];

  // Itens escolhidos pelo cliente no catálogo (estruturados) — persistidos
  // para que o pagamento confirme o total no servidor em vez de confiar no
  // valor enviado pelo cliente em POST /pay (ver create-order-payment.use-case).
  @IsOptional()
  @IsArray()
  items?: { categoryId: string; subcategoryId: string; itemId: string; name: string; qty: number; unitPrice: number }[];

  @IsOptional()
  @IsNumber()
  itemsTotal?: number;
}
