import { Prisma, type AccessType } from '@prisma/client';
import { decideAccess } from '../../domain/access/access-policy.js';
import { NotFoundError } from '../../domain/shared/errors.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { recordAudit } from '../audit/audit-service.js';
import { enqueueIntegrationEvent } from '../integrations/outbox-service.js';
import { refreshClientFinancialState } from '../billing/billing-service.js';

type AccessInput = {
  clientId?: string;
  devicePin?: string;
  cardNumber?: string;
  terminalId?: string;
  externalEventId?: string;
  occurredAt: string;
  type: AccessType;
  source: 'ADMS' | 'SDK' | 'API';
  rawPayload?: Prisma.InputJsonValue;
};

function eventData(input: AccessInput, terminalId: string | undefined, extra: { clientId?: string; result: 'AUTHORIZED' | 'DENIED' | 'UNKNOWN_CLIENT'; reason: string }) {
  return {
    ...(extra.clientId === undefined ? {} : { clientId: extra.clientId }),
    ...(terminalId === undefined ? {} : { terminalId }),
    ...(input.externalEventId === undefined ? {} : { externalEventId: input.externalEventId }),
    ...(input.devicePin === undefined ? {} : { devicePin: input.devicePin }),
    occurredAt: new Date(input.occurredAt),
    type: input.type,
    result: extra.result,
    reason: extra.reason,
    source: input.source,
    ...(input.rawPayload === undefined ? {} : { rawPayload: input.rawPayload }),
  };
}

function clientLookup(input: AccessInput) {
  if (input.clientId) return { id: input.clientId };
  return { OR: [...(input.cardNumber === undefined ? [] : [{ cardNumber: input.cardNumber }]), ...(input.devicePin === undefined ? [] : [{ devicePin: input.devicePin }])] };
}

export async function processAccess(input: AccessInput) {
  return prisma.$transaction(async (tx) => {
    if (input.externalEventId) {
      const existing = await tx.accessEvent.findUnique({ where: { externalEventId: input.externalEventId } });
      if (existing) return existing;
    }
    const client = input.clientId
      ? await tx.client.findUnique({ where: { id: input.clientId } })
      : await tx.client.findFirst({ where: clientLookup(input) });
    const terminal = input.terminalId ? await tx.accessTerminal.findUnique({ where: { id: input.terminalId } }) : null;
    if (!client) {
      return tx.accessEvent.create({ data: eventData(input, terminal?.id, { result: 'UNKNOWN_CLIENT', reason: 'Cliente não encontrado pelo PIN/cartão' }) });
    }
    const decision = decideAccess({ clientActive: client.status === 'ACTIVE', blocked: client.accessBlocked, accessLimit: client.accessLimit, accessCount: client.accessCount, tolerance: client.accessTolerance, accessType: input.type });
    const event = await tx.accessEvent.create({ data: eventData(input, terminal?.id, { clientId: client.id, result: decision.result, reason: decision.reason }) });
    await tx.client.update({ where: { id: client.id }, data: { accessCount: input.type === 'ENTRY' && decision.authorized ? decision.nextAccessCount : client.accessCount, accessDebt: input.type === 'ENTRY' && decision.authorized && decision.extra ? { decrement: 1 } : client.accessDebt, accessBlocked: decision.blocked, online: input.type === 'ENTRY' && decision.authorized ? true : input.type === 'EXIT' && decision.authorized ? false : client.online } });
    await recordAudit({ action: decision.authorized ? 'ACCESS_AUTHORIZED' : 'ACCESS_DENIED', entityType: 'AccessEvent', entityId: event.id, afterData: { clientId: client.id, type: input.type, result: decision.result, extra: decision.extra } }, tx);
    if (decision.authorized && client.ovgCustomerNumber) {
      await enqueueIntegrationEvent(tx, { eventType: 'access.recorded', aggregateType: 'AccessEvent', aggregateId: event.id, target: 'OVG', payload: { customer_number: client.ovgCustomerNumber, entry_type: input.type === 'EXIT' ? 'exit' : 'entry', entry_date: input.occurredAt }, idempotencyKey: `access.recorded:${event.id}` });
    }
    if (input.type === 'ENTRY' && decision.authorized) {
      await refreshClientFinancialState(tx, client.id);
    }
    return event;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listAccessEvents(input: { clientId?: string; unitId?: string; from?: string; to?: string; limit: number; offset: number }) {
  return prisma.accessEvent.findMany({ where: { ...(input.clientId ? { clientId: input.clientId } : {}), ...(input.unitId ? { terminal: { unitId: input.unitId } } : {}), ...(input.from || input.to ? { occurredAt: { ...(input.from ? { gte: new Date(input.from) } : {}), ...(input.to ? { lte: new Date(input.to) } : {}) } } : {}) }, orderBy: { occurredAt: 'desc' }, take: input.limit, skip: input.offset, include: { client: true, terminal: true } });
}