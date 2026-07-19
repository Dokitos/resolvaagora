import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { GeocodingService } from '../../../geocoding/geocoding.service';
import { CreateAddressDto, UpdateAddressDto } from '../dto/address.dto';

@Injectable()
export class ManageAddressUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoding: GeocodingService,
  ) {}

  /** Geocodifica a morada; devolve null se falhar (nunca bloqueia a gravação). */
  private async geocodeCoords(a: {
    street: string;
    number: string;
    postalCode: string;
    city: string;
  }): Promise<{ latitude: number; longitude: number } | null> {
    const query = `${a.street} ${a.number}, ${a.postalCode} ${a.city}, Portugal`;
    const r = await this.geocoding.geocode(query);
    return r ? { latitude: r.lat, longitude: r.lng } : null;
  }

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

    const data: any = { ...dto, clientId };
    // Preenche coordenadas via geocoding quando o cliente não as forneceu.
    if (data.latitude == null || data.longitude == null) {
      const coords = await this.geocodeCoords(dto);
      if (coords) {
        data.latitude = coords.latitude;
        data.longitude = coords.longitude;
      }
    }

    return this.prisma.address.create({ data });
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

    const data: any = { ...dto };
    // Se a morada mudou (e o cliente não enviou coordenadas), re-geocodifica.
    const touchesLocation =
      dto.street != null || dto.number != null || dto.postalCode != null || dto.city != null;
    if (touchesLocation && (dto.latitude == null || dto.longitude == null)) {
      const coords = await this.geocodeCoords({
        street: dto.street ?? address.street,
        number: dto.number ?? address.number,
        postalCode: dto.postalCode ?? address.postalCode,
        city: dto.city ?? address.city,
      });
      if (coords) {
        data.latitude = coords.latitude;
        data.longitude = coords.longitude;
      }
    }

    return this.prisma.address.update({ where: { id: addressId }, data });
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
