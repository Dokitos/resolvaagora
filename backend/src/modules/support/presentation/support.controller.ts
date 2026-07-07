import {
  Controller,
  Get,
  Post,
  Patch,
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
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { NotificationsGateway } from '../../notifications/presentation/notifications.gateway';

/** Client-facing support chat (one thread per client, with admins). */
@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
export class SupportController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  @Get('messages')
  async messages(@CurrentUser() user: AuthenticatedUser) {
    const messages = await this.prisma.supportMessage.findMany({
      where: { clientUserId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    // Mark admin messages as read now that the client opened the thread.
    await this.prisma.supportMessage.updateMany({
      where: { clientUserId: user.id, senderRole: 'ADMIN', readAt: null },
      data: { readAt: new Date() },
    });
    return messages;
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.prisma.supportMessage.count({
      where: { clientUserId: user.id, senderRole: 'ADMIN', readAt: null },
    });
    return { count };
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async send(
    @CurrentUser() user: AuthenticatedUser,
    @Body('body') body: string,
    @Body('serviceRequestId') serviceRequestId?: string,
  ) {
    const msg = await this.prisma.supportMessage.create({
      data: {
        clientUserId: user.id,
        serviceRequestId: serviceRequestId ?? null,
        senderRole: 'CLIENT',
        body,
      },
    });

    // Notify every admin in real time.
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    for (const admin of admins) {
      this.gateway.emitToUser(admin.id, 'support-message', msg);
    }

    return msg;
  }

  @Patch('messages/read-all')
  @HttpCode(HttpStatus.OK)
  async markRead(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.supportMessage.updateMany({
      where: { clientUserId: user.id, senderRole: 'ADMIN', readAt: null },
      data: { readAt: new Date() },
    });
  }
}
