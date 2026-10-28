/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.MAI_KERNEL_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error('MAI_KERNEL_PASSWORD must be explicitly set to at least 32 characters.');
  }
  if (password.includes('\u0000')) throw new Error('MAI_KERNEL_PASSWORD contains an invalid null character.');
  const quoted = `'${password.replace(/'/g, "''")}'`;
  await prisma.$executeRawUnsafe(`ALTER ROLE mai_kernel LOGIN PASSWORD ${quoted}`);
  console.log('mai_kernel login enabled with the configured deployment secret.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
