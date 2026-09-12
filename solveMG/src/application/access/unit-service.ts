import { prisma } from '../../infrastructure/database/prisma.js';

export async function createUnit(input: { name: string; code: string; city?: string; province?: string; timezone?: string; currency?: string; createdById?: string }) {
  return prisma.gymUnit.create({ data: { name: input.name, code: input.code, ...(input.city === undefined ? {} : { city: input.city }), ...(input.province === undefined ? {} : { province: input.province }), ...(input.timezone === undefined ? {} : { timezone: input.timezone }), ...(input.currency === undefined ? {} : { currency: input.currency }), ...(input.createdById === undefined ? {} : { createdById: input.createdById }) } });
}

export async function listUnits() { return prisma.gymUnit.findMany({ where: { isActive: true }, orderBy: [{ province: 'asc' }, { name: 'asc' }] }); }