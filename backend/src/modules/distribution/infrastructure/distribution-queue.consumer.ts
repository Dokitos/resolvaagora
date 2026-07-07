import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { AutoAssignUseCase } from '../application/use-cases/auto-assign.use-case';

@Injectable()
export class DistributionQueueConsumer implements OnModuleInit {
  private readonly logger = new Logger(DistributionQueueConsumer.name);

  constructor(
    private readonly rabbitmq: RabbitMQService,
    private readonly autoAssign: AutoAssignUseCase,
  ) {}

  onModuleInit() {
    this.rabbitmq.subscribe(
      this.rabbitmq.exchanges.payments,
      'distribution.payment-confirmed',
      'payment.displacement.confirmed',
      async (msg) => {
        const { serviceRequestId } = msg.data as { serviceRequestId: string };
        this.logger.log(`Processing distribution for SR ${serviceRequestId}`);
        await this.autoAssign.execute(serviceRequestId);
      },
    ).catch((err) => this.logger.error('Distribution consumer failed to subscribe', err));
  }
}
