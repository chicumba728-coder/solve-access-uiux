import type { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.js';

type AuditInput = {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: Prisma.InputJsonValue;
  afterData?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

export async function recordAudit(input: AuditInput, tx: Prisma.TransactionClient = prisma): Promise<void> {
  await tx.auditEvent.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ...(input.actorUserId === undefined ? {} : { actorUserId: input.actorUserId }),
      ...(input.beforeData === undefined ? {} : { beforeData: input.beforeData }),
      ...(input.afterData === undefined ? {} : { afterData: input.afterData }),
      ...(input.ipAddress === undefined ? {} : { ipAddress: input.ipAddress }),
      ...(input.userAgent === undefined ? {} : { userAgent: input.userAgent }),
    },
  });
}