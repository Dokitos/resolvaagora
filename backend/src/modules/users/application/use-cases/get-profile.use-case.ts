import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

@Injectable()
export class GetProfileUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        client: {
          include: {
            addresses: { orderBy: { isDefault: 'desc' } },
            subscriptions: {
              where: { status: 'ACTIVE' },
              include: { plan: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!user || !user.client) {
      throw new NotFoundException('Client not found');
    }

    const { id: clientId, ...clientData } = user.client;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      clientId,
      ...clientData,
    };
  }
}
