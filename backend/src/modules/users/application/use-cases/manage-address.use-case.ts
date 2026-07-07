import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from '../dto/address.dto';

@Injectable()
export class ManageAddressUseCase {
  constructor(private readonly prisma: PrismaService) {}

  private async getClientId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { client: true },
    });
    if (!user?.client) throw new NotFoundException('Client not found');
    return user.client.id;
  }

  async list(userId: string) {
    const clientId = await this.getClientId(userId);
    return this.prisma.address.findMany({
      where: { clientId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    const clientId = await this.getClientId(userId);

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { clientId },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: { ...dto, clientId },
    });
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto) {
    const clientId = await this.getClientId(userId);
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!address || address.clientId !== clientId) {
      throw new ForbiddenException('Address not found');
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { clientId, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({ where: { id: addressId }, data: dto });
  }

  async remove(userId: string, addressId: string) {
    const clientId = await this.getClientId(userId);
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!address || address.clientId !== clientId) {
      throw new ForbiddenException('Address not found');
    }

    await this.prisma.address.delete({ where: { id: addressId } });
  }
}
