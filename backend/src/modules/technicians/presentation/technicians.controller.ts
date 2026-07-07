import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
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
    return u?.technician ?? null;
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
