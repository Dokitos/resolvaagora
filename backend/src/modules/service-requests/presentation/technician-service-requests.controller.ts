import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { UpdateServiceStatusUseCase } from '../application/use-cases/update-service-status.use-case';
import { UploadProofPhotosUseCase } from '../application/use-cases/upload-proof-photos.use-case';
import { UpdateServiceStatusDto } from '../application/dto/update-status.dto';
import { UploadPhotosDto } from '../application/dto/upload-photos.dto';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

@Controller('technician/service-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TECHNICIAN')
export class TechnicianServiceRequestsController {
  constructor(
    private readonly updateStatus: UpdateServiceStatusUseCase,
    private readonly uploadProofs: UploadProofPhotosUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: string) {
    const techUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { technician: true },
    });

    return this.prisma.serviceRequest.findMany({
      where: {
        technicianId: techUser!.technician!.id,
        ...(status && { status: status as any }),
      },
      include: { client: true, address: true, quote: true, photos: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const techUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { technician: true },
    });

    return this.prisma.serviceRequest.findFirst({
      where: { id, technicianId: techUser!.technician!.id },
      include: {
        client: true,
        address: true,
        quote: true,
        photos: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  @Patch(':id/status')
  updateServiceStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceStatusDto,
  ) {
    return this.updateStatus.execute(user.id, id, dto.status, dto.notes);
  }

  @Post(':id/proofs')
  @HttpCode(HttpStatus.CREATED)
  async uploadProofPhotos(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UploadPhotosDto,
  ) {
    return this.uploadProofs.execute(user.id, id, dto.urls);
  }
}
