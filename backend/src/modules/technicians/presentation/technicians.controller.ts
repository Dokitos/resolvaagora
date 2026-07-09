import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  ConflictException,
} from '@nestjs/common';
import { TechnicianStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { GetScheduleUseCase } from '../application/use-cases/get-schedule.use-case';
import { UpdateAvailabilityUseCase } from '../application/use-cases/update-availability.use-case';
import { GetEarningsUseCase } from '../application/use-cases/get-earnings.use-case';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

@Controller('technician')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TECHNICIAN')
export class TechniciansController {
  constructor(
    private readonly getSchedule: GetScheduleUseCase,
    private readonly updateAvailability: UpdateAvailabilityUseCase,
    private readonly getEarnings: GetEarningsUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  async profile(@CurrentUser() user: AuthenticatedUser) {
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { technician: { include: { specialties: true, coverageDistricts: true } } },
    });
    if (!u?.technician) return null;
    // Inclui o email da conta (vive no User) para o ecrã de edição.
    return { ...u.technician, email: u.email };
  }

  /** Editar o próprio perfil: nome, contacto e email. */
  @Patch('me')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { firstName?: string; lastName?: string; phone?: string; email?: string },
  ) {
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { technician: true },
    });
    if (!u?.technician) throw new ConflictException('Technician not found');

    // Se muda o email, garantir que não está em uso por outra conta.
    if (body.email && body.email.toLowerCase().trim() !== u.email) {
      const taken = await this.prisma.user.findUnique({
        where: { email: body.email.toLowerCase().trim() },
      });
      if (taken) throw new ConflictException('Email já está em uso.');
      await this.prisma.user.update({
        where: { id: u.id },
        data: { email: body.email.toLowerCase().trim() },
      });
    }

    const tech = await this.prisma.technician.update({
      where: { id: u.technician.id },
      data: {
        firstName: body.firstName?.trim() || undefined,
        lastName: body.lastName?.trim() || undefined,
        phone: body.phone?.trim() || undefined,
      },
    });
    const email = body.email?.toLowerCase().trim() || u.email;
    return { ...tech, email };
  }

  @Get('schedule')
  schedule(@CurrentUser() user: AuthenticatedUser) {
    return this.getSchedule.execute(user.id);
  }

  @Patch('availability')
  availability(
    @CurrentUser() user: AuthenticatedUser,
    @Body('status') status: TechnicianStatus,
  ) {
    return this.updateAvailability.execute(user.id, status);
  }

  @Get('earnings')
  earnings(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: 'week' | 'month' | 'all',
  ) {
    return this.getEarnings.execute(user.id, period ?? 'month');
  }
}
