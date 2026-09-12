import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}