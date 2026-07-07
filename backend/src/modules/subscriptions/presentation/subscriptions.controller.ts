import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { SubscribeUseCase } from '../application/use-cases/subscribe.use-case';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscribeUseCase: SubscribeUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Get('plans')
  plans() {
    return this.prisma.subscriptionPlan.findMany({ where: { isActive: true } });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('CLIENT')
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body('planId') planId: string) {
    return this.subscribeUseCase.execute(user.id, planId);
  }

  @Get('me')
  @Roles('CLIENT')
  async mySubscription(@CurrentUser() user: AuthenticatedUser) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { client: true },
    });

    return this.prisma.subscription.findFirst({
      where: { clientId: clientUser!.client!.id, status: 'ACTIVE' },
      include: { plan: true },
    });
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('CLIENT')
  async cancel(@CurrentUser() user: AuthenticatedUser) {
    const clientUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { client: true },
    });

    await this.prisma.subscription.updateMany({
      where: { clientId: clientUser!.client!.id, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
  }
}
