import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const prices = {
    '2 aulas': process.env.PLAN_2_PRICE,
    '3 aulas': process.env.PLAN_3_PRICE,
    '5 aulas': process.env.PLAN_5_PRICE,
    'Livre Trânsito': process.env.PLAN_UNLIMITED_PRICE,
  };
  for (const [name, value] of Object.entries(prices)) {
    if (!value || !/^\d+(\.\d{1,2})?$/.test(value)) throw new Error(`DECISÃO NECESSÁRIA: configure ${name} price through its PLAN_*_PRICE environment variable`);
  }
  const roleDefinitions = [
    ['ADMIN', ['clients.read', 'clients.write', 'plans.manage', 'billing.manage', 'audit.read', 'reports.read']],
    ['MANAGER', ['clients.read', 'clients.write', 'billing.manage', 'reports.read']],
    ['RECEPTION', ['clients.read', 'clients.write', 'billing.manage']],
  ] as const;
  for (const [roleName, permissionNames] of roleDefinitions) {
    const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });
    for (const permissionName of permissionNames) {
      const permission = await prisma.permission.upsert({ where: { name: permissionName }, update: {}, create: { name: permissionName } });
      await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } });
    }
  }
  const plans = [
    { name: '2 aulas', lessonsPerPeriod: 2, isUnlimited: false },
    { name: '3 aulas', lessonsPerPeriod: 3, isUnlimited: false },
    { name: '5 aulas', lessonsPerPeriod: 5, isUnlimited: false },
    { name: 'Livre Trânsito', lessonsPerPeriod: null, isUnlimited: true },
  ];
  for (const plan of plans) {
    const price = prices[plan.name as keyof typeof prices] as string;
    await prisma.plan.upsert({ where: { name: plan.name }, update: { lessonsPerPeriod: plan.lessonsPerPeriod, isUnlimited: plan.isUnlimited, price }, create: { ...plan, price, validityMonths: 1, usageRules: { operatingWeekdays: [1, 2, 3, 4, 5, 6] }, isActive: true } });
  }
  await prisma.globalParameter.upsert({ where: { key: 'calendar.operating_weekdays' }, update: {}, create: { key: 'calendar.operating_weekdays', value: [1, 2, 3, 4, 5, 6], description: 'ISO weekdays in which SamoraFit operates' } });
  await prisma.globalParameter.upsert({ where: { key: 'locale.country' }, update: {}, create: { key: 'locale.country', value: 'Angola', description: 'País operacional do SOLVE ACESS' } });
  await prisma.globalParameter.upsert({ where: { key: 'locale.currency' }, update: {}, create: { key: 'locale.currency', value: 'AOA', description: 'Moeda operacional: Kwanza angolano' } });
  await prisma.globalParameter.upsert({ where: { key: 'locale.timezone' }, update: {}, create: { key: 'locale.timezone', value: 'Africa/Luanda', description: 'Fuso horário oficial da operação' } });
  await prisma.globalParameter.upsert({ where: { key: 'absence.minimum_plan_id' }, update: {}, create: { key: 'absence.minimum_plan_id', value: Prisma.JsonNull, description: 'DECISÃO NECESSÁRIA: configure o plano mínimo aplicável a ausências sem congelamento' } });
}

main().finally(() => prisma.$disconnect());