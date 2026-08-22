import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { CampaignService } from '../application/campaign.service';

/**
 * Envia as campanhas agendadas cuja hora já passou.
 *
 * Corre ao minuto porque é a granularidade que o admin escolhe na interface —
 * uma varredura mais espaçada faria uma campanha marcada para as 09:00 sair
 * visivelmente atrasada.
 */
@Injectable()
export class CampaignScheduler {
  private readonly logger = new Logger(CampaignScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaigns: CampaignService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchDueCampaigns() {
    const due = await this.prisma.notificationCampaign.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
      select: { id: true, title: true },
    });

    if (due.length === 0) return;

    this.logger.log(`${due.length} campanha(s) agendada(s) a enviar`);

    // Sequencial e não em Promise.all: cada campanha pode atingir milhares de
    // utilizadores, e dispará-las todas ao mesmo tempo sobrecarregaria a base
    // de dados e o FCM sem necessidade — o atraso de alguns segundos entre
    // campanhas é irrelevante para quem as agendou.
    for (const campaign of due) {
      try {
        await this.campaigns.send(campaign.id);
      } catch (err) {
        // `send` já marca a campanha como FAILED com o motivo; aqui só se
        // garante que uma falha não impede as seguintes de sair.
        this.logger.error(`Campanha "${campaign.title}" falhou: ${err}`);
      }
    }
  }
}
