import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Payment, ServiceStatus } from '@prisma/client';
import { PrismaService } from '@shared/infrastructure/database/prisma.service';
import { RabbitMQService } from '@shared/infrastructure/messaging/rabbitmq.service';
import { StripeService } from '../../../payments/infrastructure/stripe.service';

// Antes de o técnico se deslocar — cancelamento grátis, reembolso total.
const FREE_TIER_STATUSES: ServiceStatus[] = ['DRAFT', 'AWAITING_PAYMENT', 'PAID', 'IN_DISTRIBUTION', 'ASSIGNED'];
// Técnico já se deslocou / orçamento já aprovado, trabalho ainda não começou —
// taxa de deslocação fica retida, resto é reembolsado.
const FEE_KEPT_TIER_STATUSES: ServiceStatus[] = ['IN_TRANSIT', 'ARRIVED', 'IN_DIAGNOSIS', 'QUOTE_SENT', 'QUOTE_APPROVED'];
// Trabalho já em curso — bloqueado (exceto escalada de suporte do admin).
const BLOCKED_STATUSES: ServiceStatus[] = ['IN_EXECUTION'];

interface CancelParams {
  serviceRequestId: string;
  actorUserId: string;
  actorRole: 'CLIENT' | 'ADMIN';
  reason?: string;
  forceOverride?: boolean;
  refundAmount?: number;
}

@Injectable()
export class CancelServiceRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
    private readonly stripe: StripeService,
  ) {}

  async execute(params: CancelParams): Promise<{ refunded: number; kept: number }> {
    const { serviceRequestId, actorUserId, actorRole, reason, forceOverride, refundAmount } = params;

    const sr = await this.prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: { payments: true, client: true },
    });
    if (!sr) throw new NotFoundException('Pedido não encontrado');

    if (actorRole === 'CLIENT') {
      const clientUser = await this.prisma.user.findUnique({
        where: { id: actorUserId },
        include: { client: true },
      });
      if (!clientUser?.client || clientUser.client.id !== sr.clientId) {
        throw new ForbiddenException('Este pedido não pertence a este cliente');
      }
    }

    const isFree = FREE_TIER_STATUSES.includes(sr.status);
    const isFeeKept = FEE_KEPT_TIER_STATUSES.includes(sr.status);
    const isBlocked = BLOCKED_STATUSES.includes(sr.status);

    if (!isFree && !isFeeKept && !isBlocked) {
      throw new BadRequestException(`Não é possível cancelar um pedido com estado ${sr.status}`);
    }

    if (isBlocked && !(actorRole === 'ADMIN' && forceOverride)) {
      throw new BadRequestException('Não é possível cancelar um serviço já em execução.');
    }

    if (isBlocked && actorRole === 'ADMIN' && forceOverride && !reason) {
      throw new BadRequestException('É obrigatório indicar um motivo para cancelar um serviço em execução.');
    }

    const completed = sr.payments.filter((p) => p.status === 'COMPLETED');
    const dispPayment = completed.find((p) => p.type === 'DISPLACEMENT');
    const servicePayment = completed.find((p) => p.type === 'SERVICE');
    const quotePayment = completed.find((p) => p.type === 'QUOTE');

    let refundPlan: { payment: Payment; amount: number }[] = [];
    let keptTotal = 0;

    if (isFree) {
      if (dispPayment) refundPlan.push({ payment: dispPayment, amount: Number(dispPayment.amount) });
      if (servicePayment) refundPlan.push({ payment: servicePayment, amount: Number(servicePayment.amount) });
      if (quotePayment) refundPlan.push({ payment: quotePayment, amount: Number(quotePayment.amount) });
    } else {
      // FEE_KEPT, ou BLOCKED com escalada de admin sem valor manual indicado.
      if (dispPayment) keptTotal += Number(dispPayment.amount);
      if (servicePayment) {
        const disp = Number(sr.displacementFee);
        const refundable = Math.max(0, Number(servicePayment.amount) - disp);
        if (refundable > 0) refundPlan.push({ payment: servicePayment, amount: refundable });
        keptTotal += Number(servicePayment.amount) - refundable;
      }
      if (quotePayment) refundPlan.push({ payment: quotePayment, amount: Number(quotePayment.amount) });

      if (isBlocked && actorRole === 'ADMIN' && refundAmount != null) {
        // Escalada de suporte: o admin decide manualmente quanto reembolsar,
        // em vez de aplicar a fórmula acima — o trabalho já começou, não há
        // regra automática correta para este caso.
        const totalPaid = completed.reduce((s, p) => s + Number(p.amount), 0);
        const capped = Math.min(Math.max(0, refundAmount), totalPaid);
        const target = quotePayment ?? servicePayment ?? dispPayment;
        refundPlan = target && capped > 0 ? [{ payment: target, amount: Math.min(capped, Number(target.amount)) }] : [];
        keptTotal = totalPaid - capped;
      }
    }

    // Pagamentos em dinheiro do orçamento ainda pendentes (nunca chegaram a
    // ser cobrados) ficam FAILED — não há nada para reembolsar.
    const pendingQuotePayment = sr.payments.find((p) => p.type === 'QUOTE' && p.status === 'PENDING');

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceRequest.update({
        where: { id: serviceRequestId },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason ?? (actorRole === 'CLIENT' ? 'Cancelado pelo cliente' : 'Cancelado pelo administrador'),
          statusHistory: {
            create: {
              oldStatus: sr.status,
              newStatus: 'CANCELLED',
              changedByUserId: actorUserId,
              notes: reason,
            },
          },
        },
      });

      for (const { payment, amount } of refundPlan) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED', refundedAmount: amount },
        });
      }

      if (pendingQuotePayment) {
        await tx.payment.update({
          where: { id: pendingQuotePayment.id },
          data: { status: 'FAILED' },
        });
      }
    });

    // Chamadas à Stripe fora da transação de BD — nunca antes do commit.
    for (const { payment, amount } of refundPlan) {
      if (!payment.stripePaymentIntentId) continue;
      try {
        await this.stripe.createRefund(payment.stripePaymentIntentId, amount);
      } catch (err) {
        // Não reverte o cancelamento por uma falha no reembolso — fica
        // registado como REFUNDED na BD, a reconciliação é manual/suporte.
      }
    }

    await this.rabbitmq.publish(
      this.rabbitmq.exchanges.serviceRequests,
      'service-request.cancelled',
      { serviceRequestId, clientId: sr.clientId, technicianId: sr.technicianId },
    );

    const refundedTotal = refundPlan.reduce((s, r) => s + r.amount, 0);
    return { refunded: Number(refundedTotal.toFixed(2)), kept: Number(keptTotal.toFixed(2)) };
  }
}
