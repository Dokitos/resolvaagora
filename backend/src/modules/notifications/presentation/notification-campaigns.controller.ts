import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/infrastructure/jwt.strategy';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { CampaignService } from '../application/campaign.service';
import {
  CreateCampaignDto,
  CreateGroupDto,
  GroupMembersDto,
  PreviewAudienceDto,
  UpdateCampaignDto,
} from '../application/dto/campaign.dto';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class NotificationCampaignsController {
  constructor(
    private readonly campaigns: CampaignService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Campanhas ─────────────────────────────────────────────────────────────

  @Get('campaigns')
  list(@Query('status') status?: CampaignStatus) {
    return this.campaigns.list(status);
  }

  @Get('campaigns/:id')
  get(@Param('id') id: string) {
    return this.campaigns.get(id);
  }

  @Post('campaigns')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(user.id, dto);
  }

  @Patch('campaigns/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaigns.update(id, dto);
  }

  @Delete('campaigns/:id')
  remove(@Param('id') id: string) {
    return this.campaigns.remove(id);
  }

  /** Envia já, seja um rascunho ou uma campanha agendada. */
  @Post('campaigns/:id/send')
  @HttpCode(HttpStatus.OK)
  send(@Param('id') id: string) {
    return this.campaigns.send(id);
  }

  @Post('campaigns/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string) {
    return this.campaigns.cancel(id);
  }

  /** Quantos utilizadores a audiência atinge, antes de gravar. */
  @Post('audience/preview')
  @HttpCode(HttpStatus.OK)
  preview(@Body() dto: PreviewAudienceDto) {
    return this.campaigns.preview(dto.audience, dto.groupId, dto.segment);
  }

  // ─── Grupos ────────────────────────────────────────────────────────────────

  @Get('groups')
  listGroups() {
    return this.prisma.notificationGroup.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    });
  }

  @Get('groups/:id')
  async group(@Param('id') id: string) {
    return this.prisma.notificationGroup.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                client: { select: { firstName: true, lastName: true } },
                technician: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
  }

  @Post('groups')
  createGroup(@Body() dto: CreateGroupDto) {
    return this.prisma.notificationGroup.create({ data: dto });
  }

  @Patch('groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: CreateGroupDto) {
    return this.prisma.notificationGroup.update({ where: { id }, data: dto });
  }

  @Delete('groups/:id')
  async removeGroup(@Param('id') id: string) {
    await this.prisma.notificationGroup.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Acrescenta membros ao grupo. `skipDuplicates` evita que reenviar a mesma
   * lista rebente na restrição única de (grupo, utilizador).
   */
  @Post('groups/:id/members')
  @HttpCode(HttpStatus.OK)
  async addMembers(@Param('id') id: string, @Body() dto: GroupMembersDto) {
    const result = await this.prisma.notificationGroupMember.createMany({
      data: dto.userIds.map((userId) => ({ groupId: id, userId })),
      skipDuplicates: true,
    });
    return { added: result.count };
  }

  @Delete('groups/:id/members')
  @HttpCode(HttpStatus.OK)
  async removeMembers(@Param('id') id: string, @Body() dto: GroupMembersDto) {
    const result = await this.prisma.notificationGroupMember.deleteMany({
      where: { groupId: id, userId: { in: dto.userIds } },
    });
    return { removed: result.count };
  }
}
