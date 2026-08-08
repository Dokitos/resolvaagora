import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

/**
 * Preços do catálogo de serviços editados no admin (leitura pública, sem
 * login) — a estrutura do catálogo vive em código; isto só devolve as
 * edições de preço a sobrepor sobre os valores por omissão.
 */
@Controller('service-prices')
export class ServicePricesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get() {
    const [categories, items] = await Promise.all([
      this.prisma.serviceCategoryPrice.findMany(),
      this.prisma.serviceItemPrice.findMany(),
    ]);

    return {
      categories: Object.fromEntries(categories.map((c) => [c.categoryId, Number(c.basePrice)])),
      items: Object.fromEntries(
        items.map((i) => [`${i.categoryId}:${i.subcategoryId}:${i.itemId}`, Number(i.price)]),
      ),
    };
  }
}
