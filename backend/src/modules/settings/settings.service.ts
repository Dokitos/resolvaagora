import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the singleton settings row, creating it with defaults if missing. */
  async get() {
    const existing = await this.prisma.appSetting.findUnique({ where: { id: 'app' } });
    if (existing) return existing;
    return this.prisma.appSetting.create({ data: { id: 'app' } });
  }

  async update(data: {
    maintenanceMode?: boolean;
    maintenanceMessage?: string | null;
    registrationEnabled?: boolean;
    paymentsEnabled?: boolean;
    paymentsTestMode?: boolean;
    smsVerificationEnabled?: boolean;
    displacementOriginLat?: number | null;
    displacementOriginLng?: number | null;
    displacementPerKm?: number;
    displacementBaseFee?: number;
    displacementMinFee?: number;
  }) {
    return this.prisma.appSetting.upsert({
      where: { id: 'app' },
      create: { id: 'app', ...data },
      update: data,
    });
  }
}
