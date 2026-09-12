import { type Plan, type Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/database/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/shared/errors.js';

export type PlanWithStudents = Plan & { activeStudents: number };

async function activeStudentsByPlan(): Promise<Map<string, number>> {
  const rows = await prisma.subscriptionPlanVersion.groupBy({
    by: ['planId'],
    where: {
      subscription: { status: 'ACTIVE' },
      validTo: null,
    },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.planId, row._count._all]));
}

export async function listPlans(): Promise<PlanWithStudents[]> {
  const [plans, counts] = await Promise.all([prisma.plan.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }), activeStudentsByPlan()]);
  return plans.map((plan) => ({ ...plan, activeStudents: counts.get(plan.id) ?? 0 }));
}

export async function getPlanDetail(id: string): Promise<PlanWithStudents & { history: Array<{
  id: string;
  subscriptionId: string;
  clientId: string;
  clientName: string;
  clientNumber: string;
  price: Prisma.Decimal;
  lessonsPerPeriod: number | null;
  validFrom: Date;
  changeReason: string;
  changedById: string | null;
  changedByName: string | null;
  createdAt: Date;
}> }> {
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) throw new NotFoundError('Plan not found');

  const [counts, versions] = await Promise.all([
    activeStudentsByPlan(),
    prisma.subscriptionPlanVersion.findMany({
      where: { planId: id },
      orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        subscription: { include: { client: { select: { id: true, fullName: true, clientNumber: true } } } },
        changedBy: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return {
    ...plan,
    activeStudents: counts.get(plan.id) ?? 0,
    history: versions.map((version) => ({
      id: version.id,
      subscriptionId: version.subscriptionId,
      clientId: version.subscription.client.id,
      clientName: version.subscription.client.fullName,
      clientNumber: version.subscription.client.clientNumber,
      price: version.price,
      lessonsPerPeriod: version.lessonsPerPeriod,
      validFrom: version.validFrom,
      changeReason: version.changeReason,
      changedById: version.changedById,
      changedByName: version.changedBy?.fullName ?? null,
      createdAt: version.createdAt,
    })),
  };
}

export async function createPlan(input: {
  name: string;
  price: number;
  lessonsPerPeriod?: number;
  validityMonths?: number;
  isUnlimited?: boolean;
  usageRules?: Record<string, unknown>;
}): Promise<PlanWithStudents> {
  const name = input.name.trim();
  if (!name) throw new ValidationError('Plan name is required');

  const isUnlimited = input.isUnlimited ?? false;
  const lessonsPerPeriod = isUnlimited ? null : input.lessonsPerPeriod ?? null;
  if (!isUnlimited && (lessonsPerPeriod === null || lessonsPerPeriod <= 0)) {
    throw new ValidationError('Non-unlimited plans must define lessonsPerPeriod greater than zero');
  }
  if (input.price < 0) throw new ValidationError('Plan price cannot be negative');
  if ((input.validityMonths ?? 1) < 1) throw new ValidationError('Plan validity must be at least 1 month');

  const usageRules = input.usageRules ?? {};

  const existing = await prisma.plan.findUnique({ where: { name } });
  if (existing) throw new ConflictError(`A plan with the name "${name}" already exists`);

  const plan = await prisma.plan.create({
    data: {
      name,
      price: input.price,
      lessonsPerPeriod,
      validityMonths: input.validityMonths ?? 1,
      isUnlimited,
      usageRules: usageRules as Prisma.InputJsonObject,
    },
  });

  return { ...plan, activeStudents: 0 };
}