import { prisma } from '../database/prisma.js';
import { env } from '../config/env.js';

const targetUrl: Record<'CRM' | 'OVG', string | undefined> = {
  CRM: env.CRM_WEBHOOK_URL || undefined,
  OVG: env.OVG_WEBHOOK_URL || undefined,
};

export async function processIntegrationEvents(batchSize = 50): Promise<void> {
  const events = await prisma.integrationEvent.findMany({
    where: { status: 'PENDING', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });
  for (const event of events) {
    const claimed = await prisma.integrationEvent.updateMany({ where: { id: event.id, status: 'PENDING' }, data: { status: 'PROCESSING', attempts: { increment: 1 } } });
    if (claimed.count !== 1) continue;
    const target = event.target as 'CRM' | 'OVG';
    const url = targetUrl[target];
    try {
      if (!url) throw new Error(`${event.target} integration endpoint is not configured`);
      const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-idempotency-key': event.idempotencyKey }, body: JSON.stringify(event.payload) });
      if (!response.ok) throw new Error(`Integration returned HTTP ${response.status}`);
      await prisma.integrationEvent.update({ where: { id: event.id }, data: { status: 'DELIVERED', lastError: null } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown integration error';
      const retryAt = new Date(Date.now() + Math.min(3_600_000, 2 ** event.attempts * 30_000));
      await prisma.integrationEvent.update({ where: { id: event.id }, data: { status: event.attempts >= 8 ? 'FAILED' : 'PENDING', nextAttemptAt: retryAt, lastError: message } });
    }
  }
}