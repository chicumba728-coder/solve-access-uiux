import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.client.findFirst({ where: { email: 'joao@demo.ac' } });
  if (demo) {
    console.log('Demo ja existe:', demo.fullName);
    return;
  }

  const client = await prisma.client.create({
    data: {
      clientNumber: 'CLI-001',
      fullName: 'João Silva',
      phone: '+258 84 123 4567',
      email: 'joao@demo.ac',
      gender: 'M',
      birthDate: new Date('1995-04-12'),
      taxId: '100123456',
      status: 'ACTIVE'
    }
  });

  const plan = await prisma.plan.findUnique({ where: { name: 'Livre Trânsito' } });
  if (!plan) throw new Error('Plano Livre Trânsito nao encontrado');

  const subscription = await prisma.subscription.create({
    data: {
      clientId: client.id,
      status: 'ACTIVE',
      startedOn: new Date(),
    }
  });

  const planVersion = await prisma.subscriptionPlanVersion.create({
    data: {
      subscriptionId: subscription.id,
      planId: plan.id,
      price: plan.price,
      lessonsPerPeriod: plan.lessonsPerPeriod,
      validFrom: new Date(),
      changeReason: 'Inscrição inicial'
    }
  });

  const today = new Date();
  const currentMonth = today.getDate() + 1 < 15 ? today : new Date();
  const periodStart = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + 1, 0));

  await prisma.billingPeriod.create({
    data: {
      subscriptionId: subscription.id,
      clientId: client.id,
      planVersionId: planVersion.id,
      periodStart,
      periodEnd,
      calendarYear: periodStart.getUTCFullYear(),
      calendarMonth: periodStart.getUTCMonth() + 1,
      sequenceNo: 1,
      lessonsEntitled: plan.lessonsPerPeriod,
      amountDue: plan.price,
      amountPaid: 0,
      amountOpen: plan.price,
      releasedAmount: 0,
      financialStatus: 'PENDING',
      calculationOrigin: 'PERIOD_CALCULATOR'
    }
  });

  console.log('Demo criada:', client.clientNumber, client.fullName, '| Subscription:', subscription.id, '| Periodo PENDING criado');
}

main().finally(() => prisma.$disconnect());