import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@solve.ac';
  const password = 'admin123';
  const fullName = 'Administrador';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Utilizador admin ja existe:', email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, isActive: true }
  });

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  if (adminRole) {
    await prisma.userRole.create({
      data: { userId: user.id, roleId: adminRole.id }
    });
  }

  console.log('Admin criado:', email, '| Password:', password);
}

main().finally(() => prisma.$disconnect());