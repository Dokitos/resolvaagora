import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { IsCleanText } from '@shared/validation/text.validators';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { Roles } from '../auth/presentation/decorators/roles.decorator';
import { CATALOG_CONTENT_DEFAULTS } from './catalog-content.defaults';

export class UpdateCatalogContentDto {
  /** URL devolvido pelo POST /admin/uploads; null retira a fotografia. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @Matches(/^https:\/\//, { message: 'A fotografia tem de ser um URL https.' })
  imageUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @IsCleanText({ max: 24 })
  badge?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  includes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  excludes?: string[];

  /** true volta aos textos por omissão, descartando os editados. */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  resetText?: boolean;
}

type ContentEntry = {
  imageUrl: string | null;
  badge: string | null;
  includes: string[];
  excludes: string[];
  customized: boolean;
};

/**
 * Conteúdo de apresentação do catálogo (fotografia, selo, "Inclui / Não
 * inclui"), junto do de preços no mesmo módulo porque ambos se sobrepõem ao
 * catálogo que vive no código da app e do site.
 */
@Controller()
export class CatalogContentController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Público, como o catálogo de preços: a app e o site mostram-no a quem ainda
   * não tem conta. Devolve os rascunhos por omissão com as edições do painel
   * por cima.
   *
   * Chaves: `CAT` para a categoria e `CAT:sub` para cada serviço.
   */
  @Get('service-content')
  async all(): Promise<Record<string, ContentEntry>> {
    const rows = await this.prisma.serviceCatalogContent.findMany();
    const out: Record<string, ContentEntry> = {};

    for (const [key, d] of Object.entries(CATALOG_CONTENT_DEFAULTS)) {
      out[key] = { imageUrl: null, badge: null, includes: d.includes, excludes: d.excludes, customized: false };
    }
    for (const r of rows) {
      const key = r.subcategoryId ? `${r.categoryId}:${r.subcategoryId}` : r.categoryId;
      const d = CATALOG_CONTENT_DEFAULTS[key];
      out[key] = {
        imageUrl: r.imageUrl,
        badge: r.badge,
        includes: r.customized ? r.includes : d?.includes ?? [],
        excludes: r.customized ? r.excludes : d?.excludes ?? [],
        customized: r.customized,
      };
    }
    return out;
  }

  @Put('admin/service-content/:categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateCategory(@Param('categoryId') categoryId: string, @Body() dto: UpdateCatalogContentDto) {
    return this.upsert(categoryId, '', dto);
  }

  @Put('admin/service-content/:categoryId/:subcategoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateService(
    @Param('categoryId') categoryId: string,
    @Param('subcategoryId') subcategoryId: string,
    @Body() dto: UpdateCatalogContentDto,
  ) {
    return this.upsert(categoryId, subcategoryId, dto);
  }

  private async upsert(categoryId: string, subcategoryId: string, dto: UpdateCatalogContentDto) {
    // Linhas vazias dos editores de texto do painel não contam como pontos.
    const clean = (list?: string[]) => list?.map((s) => s.trim()).filter(Boolean);
    let includes = clean(dto.includes);
    let excludes = clean(dto.excludes);
    const touchesText = includes !== undefined || excludes !== undefined;

    // Ao passar a "editado", a lista que não veio herda o valor atual — senão
    // editar só o "Inclui" de um serviço nunca editado apagava o rascunho do
    // "Não inclui".
    if (touchesText && !dto.resetText && (includes === undefined || excludes === undefined)) {
      const current = await this.prisma.serviceCatalogContent.findUnique({
        where: { categoryId_subcategoryId: { categoryId, subcategoryId } },
      });
      const key = subcategoryId ? `${categoryId}:${subcategoryId}` : categoryId;
      const d = CATALOG_CONTENT_DEFAULTS[key];
      includes ??= current?.customized ? current.includes : d?.includes ?? [];
      excludes ??= current?.customized ? current.excludes : d?.excludes ?? [];
    }

    const data = {
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      ...(dto.badge !== undefined && { badge: dto.badge?.trim() || null }),
      ...(dto.resetText
        ? { includes: [], excludes: [], customized: false }
        : touchesText
          ? { includes: includes ?? [], excludes: excludes ?? [], customized: true }
          : {}),
    };

    return this.prisma.serviceCatalogContent.upsert({
      where: { categoryId_subcategoryId: { categoryId, subcategoryId } },
      create: { categoryId, subcategoryId, includes: [], excludes: [], ...data },
      update: data,
    });
  }
}
