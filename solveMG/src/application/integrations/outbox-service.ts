import type { Prisma } from '@prisma/client';

type IntegrationTarget = 'CRM' | 'OVG';

export async function enqueueIntegrationEvent(
  tx: Prisma.TransactionClient,
  input: {
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    target: IntegrationTarget;
    payload: Prisma.InputJsonValue;
    idempotencyKey: string;
  },
): Promise<void> {
  await tx.integrationEvent.create({ data: input });
}