import { prisma } from '../../infrastructure/database/prisma.js';

export async function getDashboard(year: number, month?: number) {
  const periodWhere = { ...(month === undefined ? {} : { calendarMonth: month }), calendarYear: year };
  const [clients, financial, receivedMonth, receivedYear] = await Promise.all([
    prisma.client.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.billingPeriod.groupBy({ by: ['financialStatus'], where: periodWhere, _sum: { amountOpen: true, amountDue: true, amountPaid: true } }),
    prisma.payment.aggregate({ where: { status: 'CONFIRMED', isHistoric: false, paidAt: { gte: new Date(Date.UTC(year, (month ?? 1) - 1, 1)), lt: month === undefined ? new Date(Date.UTC(year + 1, 0, 1)) : new Date(Date.UTC(year, month, 1)) } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: 'CONFIRMED', isHistoric: false, paidAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } }, _sum: { amount: true } }),
  ]);
  return { clients, financial, receivedMonth: receivedMonth._sum?.amount ?? 0, receivedYear: receivedYear._sum?.amount ?? 0 };
}
