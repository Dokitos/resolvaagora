import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

/** Banners/slides ativos da página inicial (leitura pública, sem login). */
@Controller('banners')
export class BannersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    const now = new Date();
    return this.prisma.homeBanner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
