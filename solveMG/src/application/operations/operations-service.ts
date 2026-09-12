import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/shared/errors.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { recordAudit } from '../audit/audit-service.js';
import { enqueueIntegrationEvent } from '../integrations/outbox-service.js';
import { refreshClientFinancialState } from '../billing/billing-service.js';

export async function freezeSubscription(input: { subscriptionId: string; startsOn: string; endsOn?: string; reason: string; actorUserId: string }) {
  return prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({ where: { id: input.subscriptionId } });
    if (!subscription) throw new NotFoundError('Subscription not found');
    if (subscription.status !== 'ACTIVE') throw new ConflictError('Only active subscriptions can be frozen');
    const freeze = await tx.freeze.create({ data: { clientId: subscription.clientId, subscriptionId: subscription.id, startsOn: new Date(`${input.startsOn}T00:00:00.000Z`), ...(input.endsOn === undefined ? {} : { endsOn: new Date(`${input.endsOn}T00:00:00.000Z`) }), reason: input.reason, createdById: input.actorUserId } });
    await tx.subscription.update({ where: { id: subscription.id }, data: { status: 'FROZEN' } });
    await tx.billingPeriod.updateMany({ where: { subscriptionId: subscription.id, amountOpen: { gt: 0 } }, data: { financialStatus: 'FROZEN' } });
    await recordAudit({ actorUserId: input.actorUserId, action: 'SUBSCRIPTION_FROZEN', entityType: 'Freeze', entityId: freeze.id, afterData: { subscriptionId: subscription.id, startsOn: input.startsOn, endsOn: input.endsOn, reason: input.reason } }, tx);
    await enqueueIntegrationEvent(tx, { eventType: 'subscription.frozen', aggregateType: 'Subscription', aggregateId: subscription.id, target: 'CRM', payload: { subscriptionId: subscription.id, clientId: subscription.clientId }, idempotencyKey: `subscription.frozen:${freeze.id}` });
    return freeze;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function unfreezeSubscription(freezeId: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const freeze = await tx.freeze.findUnique({ where: { id: freezeId } });
    if (!freeze || freeze.status !== 'ACTIVE') throw new NotFoundError('Active freeze not found');
    await tx.freeze.update({ where: { id: freezeId }, data: { status: 'ENDED', endsOn: new Date(), endedById: actorUserId } });
    await tx.subscription.update({ where: { id: freeze.subscriptionId }, data: { status: 'ACTIVE' } });
    await refreshClientFinancialState(tx, freeze.clientId);
    await recordAudit({ actorUserId, action: 'SUBSCRIPTION_UNFROZEN', entityType: 'Freeze', entityId: freezeId, afterData: { status: 'ENDED' } }, tx);
    return { id: freezeId, status: 'ENDED' };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function releasePeriod(input: { periodId: string; reason: string; actorUserId: string }) {
  return prisma.$transaction(async (tx) => {
    const period = await tx.billingPeriod.findUnique({ where: { id: input.periodId } });
    if (!period) throw new NotFoundError('Billing period not found');
    if (period.amountOpen.lessThanOrEqualTo(0)) throw new ConflictError('Billing period has no open amount');
    const existing = await tx.periodRelease.findFirst({ where: { billingPeriodId: input.periodId, status: 'ACTIVE' } });
    if (existing) throw new ConflictError('Billing period is already released');
    const release = await tx.periodRelease.create({ data: { clientId: period.clientId, billingPeriodId: period.id, originalAmount: period.amountOpen, releasedAmount: period.amountOpen, reason: input.reason, releasedAt: new Date(), releasedById: input.actorUserId } });
    await tx.billingPeriod.update({ where: { id: period.id }, data: { amountOpen: 0, releasedAmount: period.amountOpen, financialStatus: 'RELEASED' } });
    await recordAudit({ actorUserId: input.actorUserId, action: 'PERIOD_RELEASED', entityType: 'BillingPeriod', entityId: period.id, afterData: { releaseId: release.id, amount: period.amountOpen.toString(), reason: input.reason } }, tx);
    return release;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listPlans() { return prisma.plan.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }); }

export async function recordAttendance(input: { clientId: string; classId: string; occurredAt: string; status: 'PRESENT' | 'ABSENT' | 'EXCUSED'; source: string; actorUserId: string }) {
  if (new Date(input.occurredAt).getUTCDay() === 0) throw new ValidationError('Sunday is not an operating day');
  const attendance = await prisma.attendance.create({ data: { clientId: input.clientId, classId: input.classId, occurredAt: new Date(input.occurredAt), status: input.status, source: input.source, recordedById: input.actorUserId } });
  await recordAudit({ actorUserId: input.actorUserId, action: 'ATTENDANCE_RECORDED', entityType: 'Attendance', entityId: attendance.id, afterData: { clientId: input.clientId, classId: input.classId, status: input.status } });
  return attendance;
}

export async function getLastAttendance(clientId: string) { return prisma.attendance.findFirst({ where: { clientId, status: 'PRESENT' }, orderBy: { occurredAt: 'desc' } }); }