import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/shared/errors.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { recordAudit } from '../audit/audit-service.js';

export async function listClients(query: { status?: string; planId?: string; search?: string; limit: number; offset: number }) {
  const isUuid = query.search !== undefined && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(query.search);
  const where: Prisma.ClientWhereInput = {
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.search ? {
      OR: [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { clientNumber: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        ...(isUuid ? [{ id: { equals: query.search } }] : []),
      ],
    } : {}),
    ...(query.planId ? { subscriptions: { some: { status: 'ACTIVE', planVersions: { some: { planId: query.planId } } } } } : {}),
  };
  return prisma.client.findMany({ where, orderBy: { fullName: 'asc' }, take: query.limit, skip: query.offset });
}

export async function getClient(clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new NotFoundError('Client not found');
  return client;
}

type ClientEditableFields = {
  fullName?: string | undefined;
  gender?: string | undefined;
  birthDate?: string | undefined;
  taxId?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  cardNumber?: string | undefined;
  devicePin?: string | undefined;
  unitId?: string | undefined;
  accessLimit?: number | undefined;
  accessTolerance?: number | undefined;
};

function clientData(input: ClientEditableFields & { actorUserId?: string; createdById?: string }) {
  return {
    ...(input.fullName === undefined ? {} : { fullName: input.fullName }),
    ...(input.gender === undefined ? {} : { gender: input.gender }),
    ...(input.birthDate === undefined ? {} : { birthDate: new Date(`${input.birthDate}T00:00:00.000Z`) }),
    ...(input.taxId === undefined ? {} : { taxId: input.taxId }),
    ...(input.phone === undefined ? {} : { phone: input.phone }),
    ...(input.email === undefined ? {} : { email: input.email }),
    ...(input.cardNumber === undefined ? {} : { cardNumber: input.cardNumber }),
    ...(input.devicePin === undefined ? {} : { devicePin: input.devicePin }),
    ...(input.unitId === undefined ? {} : { unitId: input.unitId }),
    ...(input.accessLimit === undefined ? {} : { accessLimit: input.accessLimit }),
    ...(input.accessTolerance === undefined ? {} : { accessTolerance: input.accessTolerance }),
    ...(input.actorUserId === undefined ? {} : { createdById: input.actorUserId }),
  };
}

export async function createClient(input: ClientEditableFields & { clientNumber?: string; actorUserId?: string }) {
  if (!input.fullName || input.fullName.trim().length < 2) throw new ValidationError('fullName is required');
  if (input.accessLimit !== undefined && input.accessLimit < -1) throw new ValidationError('accessLimit must be >= -1');
  if (input.accessTolerance !== undefined && input.accessTolerance < 0) throw new ValidationError('accessTolerance must be >= 0');
  return prisma.$transaction(async (tx) => {
    const clientNumber = await nextClientNumber(tx);
    try {
      const client = await tx.client.create({ data: { clientNumber, ...clientData(input) } as Prisma.ClientUncheckedCreateInput });
      await recordAudit({ ...(input.actorUserId === undefined ? {} : { actorUserId: input.actorUserId }), action: 'CLIENT_CREATED', entityType: 'Client', entityId: client.id, afterData: { clientNumber, fullName: input.fullName, ...(input.accessLimit === undefined ? {} : { accessLimit: input.accessLimit }) } }, tx);
      return client;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictError('Duplicate value for a unique client field (e.g. taxId, devicePin, cardNumber, email)');
      throw error;
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateClient(clientId: string, input: ClientEditableFields, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.client.findUnique({ where: { id: clientId } });
    if (!current) throw new NotFoundError('Client not found');
    const updated = await tx.client.update({ where: { id: clientId }, data: { ...clientData(input), updatedById: actorUserId } });
    await recordAudit({ actorUserId, action: 'CLIENT_UPDATED', entityType: 'Client', entityId: clientId, beforeData: { status: current.status, fullName: current.fullName }, afterData: { status: updated.status, fullName: updated.fullName, ...(input.accessLimit === undefined ? {} : { accessLimit: input.accessLimit }) } }, tx);
    return updated;
  });
}

async function nextClientNumber(tx: Prisma.TransactionClient) {
  const last = await tx.client.findFirst({ orderBy: { clientNumber: 'desc' }, select: { clientNumber: true } });
  let next = 1;
  const match = last?.clientNumber.match(/(\d+)\s*$/);
  if (match) next = Number(match[1]) + 1;
  return `CLI-${String(next).padStart(3, '0')}`;
}

export async function deactivateClient(clientId: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.client.findUnique({ where: { id: clientId } });
    if (!current) throw new NotFoundError('Client not found');
    const updated = await tx.client.update({ where: { id: clientId }, data: { status: 'DEACTIVATED', deactivatedAt: new Date(), deactivatedById: actorUserId } });
    await tx.subscription.updateMany({ where: { clientId, status: { in: ['ACTIVE', 'FROZEN'] } }, data: { status: 'DEACTIVATED', endedOn: new Date() } });
    await recordAudit({ actorUserId, action: 'CLIENT_DEACTIVATED', entityType: 'Client', entityId: clientId, beforeData: { status: current.status }, afterData: { status: updated.status } }, tx);
    return updated;
  });
}