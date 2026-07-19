import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { PromoService } from '../../../promotions/application/promo.service';
import { CreateServiceRequestDto } from '../dto/create-service-request.dto';
import { DisplacementFeeService } from '../displacement-fee.service';

@Injectable()
export class CreateServiceRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly config: ConfigService,
    private readonly promoService: PromoService,
    private readonly displacementFee: DisplacementFeeService,
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

    // Taxa de deslocação calculada por distância a partir das coordenadas da morada.
    const { fee: baseFee } = this.displacementFee.computeFee(settings, {
      latitude: address.latitude,
      longitude: address.longitude,
    });
    let displacementFee = baseFee;

    if (dto.useFreeVisit && activeSubscription) {
      const plan = activeSubscription.plan;
      if (activeSubscription.freeVisitsUsed >= plan.freeVisitsCount) {
        throw new BadRequestException('No free visits remaining');
      }
      isFreeVisit = true;
      subscriptionId = activeSubscription.id;
      displacementFee = 0;
    } else if (activeSubscription) {
      displacementFee = this.displacementFee.applyDiscount(
        baseFee,
        Number(activeSubscription.plan.displacementDiscountPct),
      );
    }

    const serviceRequest = await this.prisma.$transaction(async (tx) => {
      // Guarda apenas o código promocional; o desconto é calculado e o código
      // resgatado no passo de pagamento, onde já se conhece o total dos itens
      // (o backend não conhece o catálogo). Aplica-se ao total (itens+deslocação).
      const promoCode: string | null =
        !isFreeVisit && dto.promoCode ? dto.promoCode.trim().toUpperCase() || null : null;

      const created = await tx.serviceRequest.create({
        data: {
          clientId,
          addressId: dto.addressId,
          specialty: dto.specialty,
          description: dto.description,
          scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
          displacementFee,
          promoCode,
          promoDiscount: null,
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

      // Fotos do problema tiradas pelo cliente na marcação (URLs R2).
      if (dto.photoUrls?.length) {
        await tx.servicePhoto.createMany({
          data: dto.photoUrls.map((url) => ({
            serviceRequestId: created.id,
            type: 'PROBLEM',
            uploadedByRole: 'CLIENT',
            url,
          })),
        });
      }

      return created;
    });

    await this.rabbitmq.publish(
      this.rabbitmq.exchanges.serviceRequests,
      'service-request.created',
      { serviceRequestId: serviceRequest.id, clientId },
    );

    return serviceRequest;
  }
}
