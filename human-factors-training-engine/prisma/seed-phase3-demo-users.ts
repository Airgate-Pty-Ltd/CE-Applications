/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * Idempotent demo-user seed for WP-3's exit gate: "the full Phase-1 lifecycle is executable
 * entirely through the UI by three demo users (QM, supervisor, learner)". Separate from
 * prisma/seed.ts (the main Phase 1 seed) so it can be re-run safely without touching that data.
 * Run with: npm run db:seed:demo
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertDemoUser(email: string, name: string, role: string, password: string) {
  const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));
  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash, isActive: true },
    create: { email, name, role, passwordHash, isActive: true },
  });
}

async function main() {
  const qm = await upsertDemoUser('qm.demo@example.com', 'Dana QM (Demo)', 'qm', 'DemoPass123');
  const supervisor = await upsertDemoUser('supervisor.demo@example.com', 'Sam Supervisor (Demo)', 'supervisor', 'DemoPass123');
  const learner = await upsertDemoUser('learner.demo@example.com', 'Lee Learner (Demo)', 'learner', 'DemoPass123');

  console.log('Demo users ready:');
  console.log(`  QM:         ${qm.email} / DemoPass123 (id=${qm.id})`);
  console.log(`  Supervisor: ${supervisor.email} / DemoPass123 (id=${supervisor.id})`);
  console.log(`  Learner:    ${learner.email} / DemoPass123 (id=${learner.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
