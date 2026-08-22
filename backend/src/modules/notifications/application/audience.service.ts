import { BadRequestException, Injectable } from '@nestjs/common';
import { CampaignAudience, Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { AudienceSegmentDto } from './dto/campaign.dto';

/**
 * Traduz a audiência de uma campanha na lista concreta de utilizadores que a
 * vão receber.
 *
 * Só devolve utilizadores `ACTIVE`: enviar para contas suspensas ou apagadas
 * seria desperdício e, no caso das suspensas, indesejado.
 */
@Injectable()
export class AudienceService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    audience: CampaignAudience,
    groupId?: string | null,
    segment?: AudienceSegmentDto | null,
  ): Promise<string[]> {
    switch (audience) {
      case 'ALL_USERS':
        return this.byRole();
      case 'ALL_CLIENTS':
        return this.byRole('CLIENT');
      case 'ALL_TECHNICIANS':
        return this.byRole('TECHNICIAN');
      case 'GROUP':
        return this.byGroup(groupId);
      case 'SEGMENT':
        return this.bySegment(segment);
      default:
        throw new BadRequestException(`Audiência desconhecida: ${audience}`);
    }
  }

  private async byRole(role?: 'CLIENT' | 'TECHNICIAN'): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE', ...(role ? { role } : {}) },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private async byGroup(groupId?: string | null): Promise<string[]> {
    if (!groupId) {
      throw new BadRequestException('É preciso indicar o grupo (groupId).');
    }
    const members = await this.prisma.notificationGroupMember.findMany({
      where: { groupId, user: { status: 'ACTIVE' } },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  private async bySegment(segment?: AudienceSegmentDto | null): Promise<string[]> {
    if (!segment) {
      throw new BadRequestException('É preciso indicar os critérios do segmento.');
    }

    const where: Prisma.UserWhereInput = { status: 'ACTIVE' };
    if (segment.role) where.role = segment.role;

    // As duas janelas combinam-se: "entre 3 e 30 dias de registo" é
    // registeredMoreThanDays=3 com registeredWithinDays=30.
    const createdAt: Prisma.DateTimeFilter = {};
    if (segment.registeredWithinDays !== undefined) {
      createdAt.gte = this.daysAgo(segment.registeredWithinDays);
    }
    if (segment.registeredMoreThanDays !== undefined) {
      createdAt.lte = this.daysAgo(segment.registeredMoreThanDays);
    }
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

    // Distrito só faz sentido para técnicos — um cliente não tem cobertura.
    if (segment.district) {
      where.technician = {
        coverageDistricts: { some: { district: segment.district } },
      };
    }

    const users = await this.prisma.user.findMany({ where, select: { id: true } });
    let ids = users.map((u) => u.id);

    const { minCompletedServices: min, maxCompletedServices: max } = segment;
    if (min !== undefined || max !== undefined) {
      ids = await this.filterByCompletedServices(ids, min, max);
    }

    return ids;
  }

  /**
   * Filtra pelos serviços concluídos de cada utilizador, contando o lado certo
   * conforme seja cliente ou técnico.
   *
   * A contagem é feita em duas agregações e cruzada em memória, em vez de um
   * `_count` filtrado por relação, porque um utilizador sem serviços nenhuns
   * não aparece na agregação — e é precisamente esse o caso que interessa
   * apanhar quando se procura quem ainda não usou a plataforma.
   */
  private async filterByCompletedServices(
    userIds: string[],
    min?: number,
    max?: number,
  ): Promise<string[]> {
    if (userIds.length === 0) return [];

    const [clients, technicians] = await Promise.all([
      this.prisma.client.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true },
      }),
      this.prisma.technician.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true },
      }),
    ]);

    const [byClient, byTechnician] = await Promise.all([
      this.prisma.serviceRequest.groupBy({
        by: ['clientId'],
        where: { status: 'COMPLETED', clientId: { in: clients.map((c) => c.id) } },
        _count: { _all: true },
      }),
      this.prisma.serviceRequest.groupBy({
        by: ['technicianId'],
        where: { status: 'COMPLETED', technicianId: { in: technicians.map((t) => t.id) } },
        _count: { _all: true },
      }),
    ]);

    const counts = new Map<string, number>();
    const clientUserId = new Map(clients.map((c) => [c.id, c.userId]));
    const technicianUserId = new Map(technicians.map((t) => [t.id, t.userId]));

    for (const row of byClient) {
      const userId = clientUserId.get(row.clientId);
      if (userId) counts.set(userId, (counts.get(userId) ?? 0) + row._count._all);
    }
    for (const row of byTechnician) {
      const userId = row.technicianId ? technicianUserId.get(row.technicianId) : undefined;
      if (userId) counts.set(userId, (counts.get(userId) ?? 0) + row._count._all);
    }

    return userIds.filter((id) => {
      const n = counts.get(id) ?? 0;
      if (min !== undefined && n < min) return false;
      if (max !== undefined && n > max) return false;
      return true;
    });
  }

  private daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }
}
