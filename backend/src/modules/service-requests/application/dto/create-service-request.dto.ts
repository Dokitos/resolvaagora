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

  // Obrigatório (não @IsOptional): se ficasse opcional, um pedido direto à
  // API sem este campo cairia no fallback inseguro do pagamento (confia no
  // valor enviado em POST /pay) mesmo sendo um pedido NOVO — o próprio
  // bypass que este campo existe para impedir. Fluxos sem itens (orçamento
  // no local) enviam 0 explicitamente, nunca omitem o campo.
  @IsNumber()
  itemsTotal: number;
}
