import { prisma } from '../../infrastructure/database/prisma.js';

type MoneyAgg = { _sum: { amount: bigint | null } };

function money(value: MoneyAgg | null): number {
  return value?._sum?.amount === null || value?._sum?.amount === undefined ? 0 : Number(value._sum.amount);
}

export async function getSystemStats() {
  const [clients, clientsByStatus, plans, plansActive, payments, paymentsHistoric, receivedYear, receivedMonth,
    terminals, terminalsOnline, accessEvents, accessEntries, auditEvents, integrationEvents, integrationByStatus, subscriptionsByStatus] = await Promise.all([
    prisma.client.count(),
    prisma.client.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.plan.count(),
    prisma.plan.count({ where: { isActive: true } }),
    prisma.payment.count({ where: { isHistoric: false } }),
    prisma.payment.count({ where: { isHistoric: true } }),
    prisma.payment.aggregate({ where: { status: 'CONFIRMED', isHistoric: false, paidAt: { gte: new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)) } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: 'CONFIRMED', isHistoric: false, paidAt: { gte: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)) } }, _sum: { amount: true } }),
    prisma.accessTerminal.count(),
    prisma.accessTerminal.count({ where: { isActive: true } }),
    prisma.accessEvent.count(),
    prisma.accessEvent.count({ where: { type: 'ENTRY' } }),
    prisma.auditEvent.count(),
    prisma.integrationEvent.count(),
    prisma.integrationEvent.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  return {
    clients,
    clientsByStatus: clientsByStatus.map((s) => ({ status: s.status, count: s._count._all })),
    plans,
    plansActive,
    payments,
    paymentsHistoric,
    receivedYear: money(receivedYear),
    receivedMonth: money(receivedMonth),
    terminals,
    terminalsOnline,
    accessEvents,
    accessEntries,
    auditEvents,
    integrationEvents,
    integrationByStatus: integrationByStatus.map((s) => ({ status: s.status, count: s._count._all })),
    subscriptionsByStatus: subscriptionsByStatus.map((s) => ({ status: s.status, count: s._count._all })),
  };
}