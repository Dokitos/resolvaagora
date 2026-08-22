import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CampaignStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { FcmService } from '../infrastructure/fcm.service';
import { NotificationsGateway } from '../presentation/notifications.gateway';
import { AudienceService } from './audience.service';
import {
  AudienceSegmentDto,
  CreateCampaignDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';

/** Estados a partir dos quais ainda se pode editar ou apagar uma campanha. */
const EDITABLE: CampaignStatus[] = ['DRAFT', 'SCHEDULED'];

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audience: AudienceService,
    private readonly fcm: FcmService,
    private readonly gateway: NotificationsGateway,
  ) {}

  list(status?: CampaignStatus) {
    return this.prisma.notificationCampaign.findMany({
      where: status ? { status } : undefined,
      include: { group: { select: { id: true, name: true } } },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async get(id: string) {
    const campaign = await this.prisma.notificationCampaign.findUnique({
      where: { id },
      include: { group: { select: { id: true, name: true } } },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');
    return campaign;
  }

  async create(adminUserId: string, dto: CreateCampaignDto) {
    this.assertAudienceIsUsable(dto.audience, dto.groupId, dto.segment);

    // Uma data no passado só pode ser engano: o scheduler apanhá-la-ia na
    // varredura seguinte e enviaria de imediato, sem o admin perceber porquê.
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (scheduledAt && scheduledAt.getTime() < Date.now()) {
      throw new BadRequestException('A data de agendamento já passou.');
    }

    return this.prisma.notificationCampaign.create({
      data: {
        title: dto.title,
        body: dto.body,
        audience: dto.audience,
        groupId: dto.groupId ?? null,
        segment: (dto.segment ?? null) as Prisma.InputJsonValue,
        scheduledAt,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        createdById: adminUserId,
      },
    });
  }

  async update(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.get(id);
    if (!EDITABLE.includes(campaign.status)) {
      throw new BadRequestException('Só é possível editar rascunhos ou campanhas agendadas.');
    }

    const audience = dto.audience ?? campaign.audience;
    const groupId = dto.groupId !== undefined ? dto.groupId : campaign.groupId;
    const segment = (dto.segment ?? campaign.segment) as AudienceSegmentDto | null;
    this.assertAudienceIsUsable(audience, groupId, segment);

    let scheduledAt = campaign.scheduledAt;
    let status = campaign.status;
    if (dto.scheduledAt !== undefined) {
      scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
      if (scheduledAt && scheduledAt.getTime() < Date.now()) {
        throw new BadRequestException('A data de agendamento já passou.');
      }
      // Retirar a data devolve a campanha a rascunho, senão ficaria marcada
      // como agendada sem ter quando.
      status = scheduledAt ? 'SCHEDULED' : 'DRAFT';
    }

    return this.prisma.notificationCampaign.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        audience,
        groupId: groupId ?? null,
        segment: (segment ?? null) as Prisma.InputJsonValue,
        scheduledAt,
        status,
      },
    });
  }

  async remove(id: string) {
    const campaign = await this.get(id);
    if (!EDITABLE.includes(campaign.status)) {
      // Apagar uma campanha já enviada apagaria o histórico do que foi
      // comunicado, que é precisamente o que se quer preservar.
      throw new BadRequestException('Uma campanha já enviada não pode ser apagada.');
    }
    await this.prisma.notificationCampaign.delete({ where: { id } });
    return { deleted: true };
  }

  async cancel(id: string) {
    const campaign = await this.get(id);
    if (campaign.status !== 'SCHEDULED') {
      throw new BadRequestException('Só campanhas agendadas podem ser canceladas.');
    }
    return this.prisma.notificationCampaign.update({
      where: { id },
      data: { status: 'CANCELLED', scheduledAt: null },
    });
  }

  /** Quantos utilizadores uma audiência atinge, sem gravar nada. */
  async preview(audience: CreateCampaignDto['audience'], groupId?: string, segment?: AudienceSegmentDto) {
    this.assertAudienceIsUsable(audience, groupId, segment);
    const userIds = await this.audience.resolve(audience, groupId, segment);
    return { count: userIds.length };
  }

  /**
   * Envia a campanha: grava a notificação de cada utilizador, emite pelo
   * socket para quem está com a app aberta, e envia a push.
   *
   * O estado passa por `SENDING` antes do trabalho começar para que uma
   * segunda chamada (ou o scheduler a correr em paralelo) não envie a mesma
   * campanha duas vezes.
   */
  async send(id: string) {
    const campaign = await this.get(id);
    if (campaign.status === 'SENDING' || campaign.status === 'SENT') {
      throw new BadRequestException('Esta campanha já foi enviada.');
    }

    await this.prisma.notificationCampaign.update({
      where: { id },
      data: { status: 'SENDING' },
    });

    try {
      const userIds = await this.audience.resolve(
        campaign.audience,
        campaign.groupId,
        campaign.segment as AudienceSegmentDto | null,
      );

      if (userIds.length > 0) {
        await this.prisma.notification.createMany({
          data: userIds.map((userId) => ({
            userId,
            type: 'ANNOUNCEMENT' as const,
            title: campaign.title,
            body: campaign.body,
          })),
        });

        for (const userId of userIds) {
          this.gateway.emitToUser(userId, 'notification', {
            title: campaign.title,
            body: campaign.body,
          });
        }
      }

      const tokens = (
        await this.prisma.fcmToken.findMany({
          where: { userId: { in: userIds } },
          select: { token: true },
        })
      ).map((t) => t.token);

      const push = await this.fcm.sendToMultiple(tokens, campaign.title, campaign.body);

      const sent = await this.prisma.notificationCampaign.update({
        where: { id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          recipientCount: userIds.length,
          deliveredCount: push.success,
          failureReason: null,
        },
      });

      this.logger.log(
        `Campanha "${campaign.title}": ${userIds.length} destinatários, ${push.success}/${push.total} pushes entregues`,
      );
      return sent;
    } catch (err) {
      // Fica em FAILED com o motivo à vista, em vez de presa em SENDING —
      // assim o admin percebe o que aconteceu e pode voltar a tentar.
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao enviar a campanha ${id}: ${reason}`);
      await this.prisma.notificationCampaign.update({
        where: { id },
        data: { status: 'FAILED', failureReason: reason },
      });
      throw err;
    }
  }

  private assertAudienceIsUsable(
    audience: CreateCampaignDto['audience'],
    groupId?: string | null,
    segment?: AudienceSegmentDto | null,
  ) {
    if (audience === 'GROUP' && !groupId) {
      throw new BadRequestException('Escolhe o grupo de destinatários.');
    }
    if (audience === 'SEGMENT' && !segment) {
      throw new BadRequestException('Define os critérios do segmento.');
    }
  }
}
