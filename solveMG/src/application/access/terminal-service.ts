import { prisma } from '../../infrastructure/database/prisma.js';

export async function registerTerminal(input: { unitId: string; name: string; serialNumber: string; model?: string; ipAddress?: string; port?: number; type: 'ENTRY' | 'EXIT'; communicationKey?: string }) {
  return prisma.accessTerminal.create({ data: { unitId: input.unitId, name: input.name, serialNumber: input.serialNumber, ...(input.model === undefined ? {} : { model: input.model }), ...(input.ipAddress === undefined ? {} : { ipAddress: input.ipAddress }), ...(input.port === undefined ? {} : { port: input.port }), type: input.type, ...(input.communicationKey === undefined ? {} : { communicationKey: input.communicationKey }) } });
}

export async function listTerminals(unitId?: string) { return prisma.accessTerminal.findMany({ ...(unitId ? { where: { unitId } } : {}), orderBy: { name: 'asc' } }); }