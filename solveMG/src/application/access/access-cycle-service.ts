import { Prisma } from '@prisma/client';
import { renewedAccessLimit } from '../../domain/access/access-policy.js';
import { NotFoundError, ValidationError } from '../../domain/shared/errors.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { recordAudit } from '../audit/audit-service.js';

export async function renewAccessCycle(input: { clientId: string; newLimit: number; actorUserId: string }) {
  if (input.newLimit < -1) throw new ValidationError('newLimit must be -1 or greater');
  return prisma.$transaction(async (tx) => {
    const client = await tx.client.findUnique({ where: { id: input.clientId } });
    if (!client) throw new NotFoundError('Client not found');
    const effectiveLimit = renewedAccessLimit(input.newLimit, client.accessDebt);
    const updated = await tx.client.update({ where: { id: client.id }, data: { accessLimit: effectiveLimit, accessCount: 0, accessDebt: 0, accessBlocked: false, accessCycleStartedAt: new Date() } });
    await recordAudit({ actorUserId: input.actorUserId, action: 'ACCESS_CYCLE_RENEWED', entityType: 'Client', entityId: client.id, beforeData: { accessLimit: client.accessLimit, accessCount: client.accessCount, accessDebt: client.accessDebt }, afterData: { accessLimit: effectiveLimit, accessCount: 0, accessDebt: 0 } }, tx);
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function resetExpiredAccessCycles(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.client.updateMany({ where: { status: 'ACTIVE', accessCycleStartedAt: { lte: cutoff } }, data: { accessCount: 0, accessBlocked: false, accessCycleStartedAt: now } });
  return result.count;
}