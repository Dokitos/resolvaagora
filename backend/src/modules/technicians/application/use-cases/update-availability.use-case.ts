import { Injectable, NotFoundException } from '@nestjs/common';
import { TechnicianStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

export class UpdateAvailabilityDto {
  status: TechnicianStatus;
}

@Injectable()
export class UpdateAvailabilityUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, status: TechnicianStatus) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { technician: true },
    });

    if (!user?.technician) {
      throw new NotFoundException('Technician not found');
    }

    return this.prisma.technician.update({
      where: { id: user.technician.id },
      data: { status },
    });
  }
}
