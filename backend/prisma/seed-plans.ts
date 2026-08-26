import { PrismaClient } from '@prisma/client';

/**
 * Cria/atualiza os 3 planos "Serviços Moura Assistência" (Essencial/Conforto/
 * Total) com os valores da proposta V1 do PDF comercial. Idempotente (upsert
 * por nome) — seguro correr mais do que uma vez, seja em dev seja em
 * produção, sem duplicar planos nem tocar noutros dados (contas, técnicos,
 * etc.) como o prisma/seed.ts genérico faz.
 *
 * Correr com: npx ts-node --transpile-only --project prisma/tsconfig.seed.json prisma/seed-plans.ts
 */
const prisma = new PrismaClient();

const PLANS = [
  {
    name: 'Essencial',
    description: 'Para quem quer ter a casa protegida com o mínimo de preocupação.',
    benefits: [
      '3 créditos por ano',
      '3 deslocações incluídas',
      'Serviços Verdes incluídos',
      '1 morada',
      '10% de desconto em serviços adicionais',
    ],
    yearlyPrice: 239,
    displacementDiscountPct: 10,
    freeVisitsCount: 3,
    creditsPerYear: 3,
    maxTier: 'GREEN' as const,
    priorityScheduling: false,
  },
  {
    name: 'Conforto',
    description: 'O plano mais equilibrado — mais créditos e prioridade no atendimento.',
    benefits: [
      '6 créditos por ano',
      '4 deslocações incluídas',
      'Serviços Verdes e Amarelos',
      '1 morada',
      '12,5% de desconto em serviços adicionais',
      'Prioridade alta',
    ],
    yearlyPrice: 379,
    displacementDiscountPct: 12.5,
    freeVisitsCount: 4,
    creditsPerYear: 6,
    maxTier: 'YELLOW' as const,
    priorityScheduling: true,
  },
  {
    name: 'Total',
    description: 'Cobertura completa para quem não quer surpresas — até aos trabalhos mais técnicos.',
    benefits: [
      '9 créditos por ano',
      '5 deslocações incluídas',
      'Serviços Verdes, Amarelos e Vermelhos',
      '2 moradas na mesma zona',
      '15% de desconto em serviços adicionais',
      'Prioridade máxima',
    ],
    yearlyPrice: 599,
    displacementDiscountPct: 15,
    freeVisitsCount: 5,
    creditsPerYear: 9,
    maxTier: 'RED' as const,
    priorityScheduling: true,
  },
];

async function main() {
  console.log('A criar/atualizar planos Serviços Moura Assistência...');
  for (const plan of PLANS) {
    const existing = await prisma.subscriptionPlan.findFirst({ where: { name: plan.name } });
    if (existing) {
      await prisma.subscriptionPlan.update({ where: { id: existing.id }, data: plan });
      console.log(`  Atualizado: ${plan.name}`);
    } else {
      await prisma.subscriptionPlan.create({ data: plan });
      console.log(`  Criado: ${plan.name}`);
    }
  }
  console.log('Concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
