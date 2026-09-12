import { Prisma, type FinancialStatus, type PaymentMethod } from '@prisma/client';
import { generateBillingPeriods } from '../../domain/billing/period-calculator.js';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/shared/errors.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { recordAudit } from '../audit/audit-service.js';
import { enqueueIntegrationEvent } from '../integrations/outbox-service.js';

type SubscriptionInput = {
  clientId: string;
  planId: string;
  startedOn: string;
  months: number;
  actorUserId: string;
  changeReason?: string;
};

export async function createSubscription(input: SubscriptionInput) {
  if (input.months < 1 || input.months > 120) throw new ValidationError('months must be between 1 and 120');
  return prisma.$transaction(async (tx) => {
    const client = await tx.client.findUnique({ where: { id: input.clientId } });
    if (!client) throw new NotFoundError('Client not found');
    const plan = await tx.plan.findUnique({ where: { id: input.planId } });
    if (!plan || !plan.isActive) throw new NotFoundError('Active plan not found');
    const current = await tx.subscription.findFirst({ where: { clientId: input.clientId, status: 'ACTIVE' } });
    if (current) throw new ConflictError('Client already has an active subscription');
    const subscription = await tx.subscription.create({ data: { clientId: input.clientId, startedOn: new Date(`${input.startedOn}T00:00:00.000Z`), createdById: input.actorUserId } });
    const version = await tx.subscriptionPlanVersion.create({ data: { subscriptionId: subscription.id, planId: plan.id, price: plan.price, lessonsPerPeriod: plan.lessonsPerPeriod, validFrom: new Date(`${input.startedOn}T00:00:00.000Z`), changeReason: input.changeReason ?? 'Initial subscription', changedById: input.actorUserId } });
    const drafts = generateBillingPeriods(input.startedOn, input.months, { id: plan.id, name: plan.name, price: Number(plan.price), lessonsPerPeriod: plan.lessonsPerPeriod, isUnlimited: plan.isUnlimited });
    await tx.billingPeriod.createMany({
      data: drafts.map((period) => ({
        subscriptionId: subscription.id,
        clientId: input.clientId,
        planVersionId: version.id,
        periodStart: new Date(`${period.start}T00:00:00.000Z`),
        periodEnd: new Date(`${period.end}T00:00:00.000Z`),
        calendarYear: period.year,
        calendarMonth: period.month,
        sequenceNo: period.sequence,
        lessonsEntitled: period.lessonsEntitled,
        amountDue: new Prisma.Decimal(period.amountDue),
        amountOpen: new Prisma.Decimal(period.amountDue),
        calculationOrigin: period.calculationOrigin,
      })),
    });
    await recordAudit({ actorUserId: input.actorUserId, action: 'SUBSCRIPTION_CREATED', entityType: 'Subscription', entityId: subscription.id, afterData: { clientId: input.clientId, planId: input.planId, startedOn: input.startedOn, months: input.months } }, tx);
    await enqueueIntegrationEvent(tx, { eventType: 'subscription.created', aggregateType: 'Subscription', aggregateId: subscription.id, target: 'CRM', payload: { subscriptionId: subscription.id, clientId: input.clientId }, idempotencyKey: `subscription.created:${subscription.id}` });
    return subscription;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listPayments(input: { clientId?: string; from?: string; to?: string; includeHistoric?: boolean; limit: number; offset: number }) {
  return prisma.payment.findMany({
    where: {
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.includeHistoric ? {} : { isHistoric: false }),
      ...(input.from || input.to ? { paidAt: { ...(input.from ? { gte: new Date(input.from) } : {}), ...(input.to ? { lte: new Date(input.to) } : {}) } } : {}),
    },
    orderBy: { paidAt: 'desc' },
    take: input.limit,
    skip: input.offset,
    include: { client: { select: { id: true, fullName: true, clientNumber: true, email: true, phone: true } } },
  });
}

export async function getClientSubscription(clientId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { clientId, status: { in: ['ACTIVE', 'FROZEN'] } },
    orderBy: { startedOn: 'desc' },
    include: {
      planVersions: { orderBy: { validFrom: 'desc' }, take: 1, include: { plan: { select: { id: true, name: true, price: true, lessonsPerPeriod: true, isUnlimited: true, validityMonths: true } } } },
      periods: { orderBy: { periodStart: 'desc' }, take: 3, select: { id: true, periodStart: true, periodEnd: true, amountDue: true, amountPaid: true, amountOpen: true, financialStatus: true } },
    },
  });
  if (!subscription) return null;
  const version = subscription.planVersions[0];
  return {
    id: subscription.id,
    status: subscription.status,
    startedOn: subscription.startedOn,
    endedOn: subscription.endedOn,
    plan: version ? { id: version.plan.id, name: version.plan.name, price: Number(version.plan.price), lessonsPerPeriod: version.plan.lessonsPerPeriod, isUnlimited: version.plan.isUnlimited, validityMonths: version.plan.validityMonths } : null,
    periods: subscription.periods.map((period) => ({ ...period, amountDue: Number(period.amountDue), amountPaid: Number(period.amountPaid), amountOpen: Number(period.amountOpen) })),
  };
}

export async function refreshClientFinancialState(tx: Prisma.TransactionClient, clientId: string): Promise<void> {
  const periods = await tx.billingPeriod.findMany({
    where: { clientId, financialStatus: { in: ['PENDING', 'OVERDUE'] } },
    orderBy: [{ periodStart: 'asc' }, { sequenceNo: 'asc' }],
    select: { id: true, amountOpen: true, lessonsEntitled: true, periodStart: true, periodEnd: true },
  });
  const firstPeriod = periods[0];
  if (!firstPeriod) return;
  const firstStart = periods.reduce((min, p) => (p.periodStart < min ? p.periodStart : min), firstPeriod.periodStart);
  const lastEnd = periods.reduce((max, p) => (p.periodEnd > max ? p.periodEnd : max), firstPeriod.periodEnd);
  const endExclusive = new Date(lastEnd.getTime() + 86_400_000);
  const authorizedEntries = await tx.accessEvent.findMany({
    where: { clientId, type: 'ENTRY', result: 'AUTHORIZED', occurredAt: { gte: firstStart, lt: endExclusive } },
    select: { occurredAt: true },
  });
  for (const period of periods) {
    let status: FinancialStatus;
    if (period.amountOpen.lessThanOrEqualTo(0)) {
      status = 'PAID';
    } else if (period.lessonsEntitled !== null) {
      const used = authorizedEntries.filter((entry) => entry.occurredAt >= period.periodStart && entry.occurredAt < new Date(period.periodEnd.getTime() + 86_400_000)).length;
      status = used > period.lessonsEntitled ? 'OVERDUE' : 'PENDING';
    } else {
      status = 'PENDING';
    }
    await tx.billingPeriod.update({ where: { id: period.id }, data: { financialStatus: status } });
  }
}

export async function recordPayment(input: { clientId: string; amount: number; paidAt: string; method: PaymentMethod; reference?: string; idempotencyKey?: string; actorUserId: string }) {
  if (input.amount <= 0) throw new ValidationError('Payment amount must be positive');
  return prisma.$transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existing = await tx.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) return existing;
    }
    const periods = await tx.billingPeriod.findMany({ where: { clientId: input.clientId, amountOpen: { gt: 0 }, financialStatus: { in: ['PENDING', 'OVERDUE'] } }, orderBy: [{ periodStart: 'asc' }, { sequenceNo: 'asc' }], select: { id: true, amountOpen: true } });
    const totalOpen = periods.reduce((sum, period) => sum.plus(period.amountOpen), new Prisma.Decimal(0));
    if (totalOpen.lessThanOrEqualTo(0)) throw new ValidationError('Cliente não tem valores em aberto para receber pagamento');
    if (new Prisma.Decimal(input.amount).greaterThan(totalOpen)) throw new ValidationError(`O valor ${input.amount} excede o total em aberto do cliente (${totalOpen.toString()})`);
    const payment = await tx.payment.create({ data: { clientId: input.clientId, amount: new Prisma.Decimal(input.amount), paidAt: new Date(input.paidAt), method: input.method, ...(input.reference === undefined ? {} : { reference: input.reference }), ...(input.idempotencyKey === undefined ? {} : { idempotencyKey: input.idempotencyKey }), recordedById: input.actorUserId } });
    let remaining = new Prisma.Decimal(input.amount);
    for (const period of periods) {
      if (remaining.lessThanOrEqualTo(0)) break;
      const allocation = Prisma.Decimal.min(remaining, period.amountOpen);
      await tx.paymentAllocation.create({ data: { paymentId: payment.id, billingPeriodId: period.id, amount: allocation } });
      await tx.billingPeriod.update({ where: { id: period.id }, data: { amountPaid: { increment: allocation }, amountOpen: { decrement: allocation } } });
      remaining = remaining.minus(allocation);
    }
    await refreshClientFinancialState(tx, input.clientId);
    await recordAudit({ actorUserId: input.actorUserId, action: 'PAYMENT_CREATED', entityType: 'Payment', entityId: payment.id, afterData: { clientId: input.clientId, amount: input.amount, method: input.method } }, tx);
    await enqueueIntegrationEvent(tx, { eventType: 'payment.confirmed', aggregateType: 'Payment', aggregateId: payment.id, target: 'CRM', payload: { paymentId: payment.id, clientId: input.clientId, amount: input.amount }, idempotencyKey: `payment.confirmed:${payment.id}` });
    return payment;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
