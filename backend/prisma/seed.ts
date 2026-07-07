import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Admin
  const adminHash = await bcrypt.hash('Admin@1234', 12);
  await prisma.user.upsert({
    where: { email: 'admin@resolvaagora.pt' },
    update: {},
    create: {
      email: 'admin@resolvaagora.pt',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  // Plano de Assinatura
  await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-standard' },
    update: {},
    create: {
      id: 'plan-standard',
      name: 'Plano Anual W+',
      yearlyPrice: 99.90,
      displacementDiscountPct: 50,
      freeVisitsCount: 2,
      priorityScheduling: true,
      isActive: true,
    },
  });

  // Técnico de exemplo
  const techHash = await bcrypt.hash('Tecnico@1234', 12);
  const techUser = await prisma.user.upsert({
    where: { email: 'tecnico@resolvaagora.pt' },
    update: {},
    create: {
      email: 'tecnico@resolvaagora.pt',
      passwordHash: techHash,
      role: 'TECHNICIAN',
      technician: {
        create: {
          firstName: 'João',
          lastName: 'Silva',
          phone: '+351912345678',
          dailyServiceLimit: 8,
          specialties: {
            create: [
              { specialty: 'ELECTRICITY' },
              { specialty: 'APPLIANCES' },
            ],
          },
          coverageDistricts: {
            create: [
              { district: 'Lisboa' },
              { district: 'Setúbal' },
            ],
          },
        },
      },
    },
  });

  // Cliente de exemplo
  const clientHash = await bcrypt.hash('Cliente@1234', 12);
  await prisma.user.upsert({
    where: { email: 'cliente@exemplo.pt' },
    update: {},
    create: {
      email: 'cliente@exemplo.pt',
      passwordHash: clientHash,
      role: 'CLIENT',
      client: {
        create: {
          firstName: 'Maria',
          lastName: 'Santos',
          phone: '+351961234567',
          addresses: {
            create: {
              label: 'Casa',
              street: 'Rua das Flores',
              number: '123',
              postalCode: '1200-001',
              city: 'Lisboa',
              district: 'Lisboa',
              isDefault: true,
              latitude: 38.7169,
              longitude: -9.1395,
            },
          },
        },
      },
    },
  });

  console.log('✅ Seed completed!');
  console.log('Admin: admin@resolvaagora.pt / Admin@1234');
  console.log('Técnico: tecnico@resolvaagora.pt / Tecnico@1234');
  console.log('Cliente: cliente@exemplo.pt / Cliente@1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
