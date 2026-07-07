import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

@Injectable()
export class UploadProofPhotosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, serviceRequestId: string, photoUrls: string[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { technician: true },
    });

    if (!user?.technician) throw new ForbiddenException('Technician only');

    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id: serviceRequestId, technicianId: user.technician.id },
    });

    if (!sr) throw new NotFoundException('Service request not found');

    await this.prisma.servicePhoto.createMany({
      data: photoUrls.map((url) => ({
        serviceRequestId,
        type: 'PROOF' as const,
        url,
        uploadedByRole: 'TECHNICIAN' as const,
      })),
    });

    return this.prisma.servicePhoto.findMany({
      where: { serviceRequestId, type: 'PROOF' },
    });
  }
}
