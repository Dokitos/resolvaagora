import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { PromoService } from '../../../promotions/application/promo.service';
import { CreateServiceRequestDto } from '../dto/create-service-request.dto';

const DISPLACEMENT_FEE = 25.00; // configurável futuramente

@Injectable()
export class CreateServiceRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly config: ConfigService,
    private readonly promoService: PromoService,
  ) {}

  async execute(userId: string, dto: CreateServiceRequestDto) {
    const settings = await this.prisma.appSetting.findUnique({ where: { id: 'app' } });
    if (settings?.maintenanceMode) {
      throw new ServiceUnavailableException(
        settings.maintenanceMessage || 'Serviço temporariamente em manutenção. Tenta novamente mais tarde.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        client: {
          include: {
            subscriptions: {
              where: { status: 'ACTIVE' },
              include: { plan: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!user?.client) {
      throw new NotFoundException('Client not found');
    }
    const clientId = user.client.id;

    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, clientId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    const activeSubscription = user.client.subscriptions[0] ?? null;
    const isPriority = !!activeSubscription?.plan.priorityScheduling;

    let isFreeVisit = false;
    let subscriptionId: string | undefined;
    let displacementFee = DISPLACEMENT_FEE;

    if (dto.useFreeVisit && activeSubscription) {
      const plan = activeSubscription.plan;
      if (activeSubscription.freeVisitsUsed >= plan.freeVisitsCount) {
        throw new BadRequestException('No free visits remaining');
      }
      isFreeVisit = true;
      subscriptionId = activeSubscription.id;
      displacementFee = 0;
    } else if (activeSubscription) {
      const discount = Number(activeSubscription.plan.displacementDiscountPct) / 100;
      displacementFee = DISPLACEMENT_FEE * (1 - discount);
    }

    const serviceRequest = await this.prisma.$transaction(async (tx) => {
      // Código promocional: aplicado ao valor a cobrar (deslocação) e resgatado
      // de forma atómica dentro da mesma transação (impede reutilização acima do limite).
      let promoCode: string | null = null;
      let promoDiscount: number | null = null;
      if (!isFreeVisit && displacementFee > 0 && dto.promoCode) {
        const redeemed = await this.promoService.redeem(tx, dto.promoCode, displacementFee);
        if (redeemed) {
          promoCode = redeemed.code;
          promoDiscount = redeemed.discount;
          displacementFee = Math.max(0, Number((displacementFee - redeemed.discount).toFixed(2)));
        }
      }

      return tx.serviceRequest.create({
        data: {
          clientId,
          addressId: dto.addressId,
          specialty: dto.specialty,
          description: dto.description,
          scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
          displacementFee,
          promoCode,
          promoDiscount,
          isPriority,
          isFreeVisit,
          subscriptionId,
          status: 'DRAFT',
          statusHistory: {
            create: {
              newStatus: 'DRAFT',
              changedByUserId: userId,
            },
          },
        },
        include: { address: true, client: true },
      });
    });

    await this.rabbitmq.publish(
      this.rabbitmq.exchanges.serviceRequests,
      'service-request.created',
      { serviceRequestId: serviceRequest.id, clientId },
    );

    return serviceRequest;
  }
}
