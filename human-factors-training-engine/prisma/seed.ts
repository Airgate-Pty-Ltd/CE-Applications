/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * Dev seed: ensures dev.db has a MaiContentRevisionProposal in AWAITING_HUMAN_RELEASE
 * so the Intelligence Workspace workbench has a real proposal to display.
 *
 * Safe to run multiple times — idempotent on the proposal (skips if one already exists
 * for the existing lesson).
 */

import { PrismaClient } from '@prisma/client';
import { LessonAutoPreparationService } from '../src/services/LessonAutoPreparationService';

const prisma = new PrismaClient();

const TENANT_ID = 'tenant_001';
const LESSON_ID = 'cmsployr00000j4bdj99s831k';
const AUTHORITY_PROFILE_ID = 'HF-LESSON-AUTO-IMPLEMENT';

async function main() {
  // Idempotency: skip if a proposal already exists for this lesson.
  const existing = await prisma.maiContentRevisionProposal.findFirst({
    where: { tenantId: TENANT_ID, lessonLearnedId: LESSON_ID },
  });
  if (existing) {
    console.log(`Seed skipped: proposal ${existing.id} already exists for lesson ${LESSON_ID} (status=${existing.status}).`);
    return;
  }

  const service = new LessonAutoPreparationService(prisma, TENANT_ID);
  const outcome = await service.prepare(LESSON_ID, AUTHORITY_PROFILE_ID);

  if (outcome.decisionState === 'PREPARE') {
    console.log('Seed complete:');
    console.log(`  proposalId:     ${outcome.proposalId}`);
    console.log(`  decisionId:     ${outcome.decisionId}`);
    console.log(`  interventionId: ${outcome.interventionId}`);
  } else {
    console.error('Seed ESCALATED (no proposal created):');
    console.error(`  reason: ${outcome.reason}`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
