/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { PrismaClient } from '@prisma/client';
import { APPROVED_KERNEL_RULES, APPROVED_KERNEL_RULE_VERSION, provisionApprovedKernelManifest } from '../src/lib/kernelRuleManifest';

const prisma = new PrismaClient();

async function main() {
  const organizations = await prisma.organization.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  if (organizations.length === 0) throw new Error('No active organizations exist; complete initial setup before seeding kernel manifests.');

  for (const organization of organizations) {
    const manifest = await provisionApprovedKernelManifest(prisma, organization.id);
    console.log(`MaiRuleManifest published: ${organization.name} (${organization.id}) v${APPROVED_KERNEL_RULE_VERSION} (id=${manifest.id}, ${APPROVED_KERNEL_RULES.length} rules)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
