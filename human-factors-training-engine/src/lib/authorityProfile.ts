/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import crypto from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';

type AuthorityClient = PrismaClient | Prisma.TransactionClient;

export const LESSON_AUTHORITY_PROFILE_ID = 'HF-LESSON-AUTO-IMPLEMENT';
export const LESSON_AUTHORITY_PROFILE_VERSION = 1;

export async function provisionLessonAuthorityProfile(client: AuthorityClient) {
  const effectiveDate = new Date('2026-08-12');
  const approvedBy = 'Brian R. Olea';
  const trustedSourceClasses = ['TRUSTED_CONFIRMED', 'VALIDATED_INTERNAL'];
  const permittedBehaviors = ['PROCEED', 'PROCEED_AND_NOTIFY', 'ESCALATE'];
  const constraints = ['SOURCE_PROVENANCE_VALID', 'TARGET_CONCEPT_MATCH', 'NO_HIGHER_AUTHORITY_CONTRADICTION', 'TENANT_SCOPE_VALID'];
  const escalateWhen = ['SOURCE_CONFIDENCE_INSUFFICIENT', 'CONFLICTING_LESSONS', 'TARGET_OUTSIDE_SCOPE', 'CURRICULUM_CHANGE_EXCEEDS_AUTHORITY', 'REGULATORY_CONTRADICTION'];
  const canonical = {
    authorityProfileId: LESSON_AUTHORITY_PROFILE_ID,
    version: LESSON_AUTHORITY_PROFILE_VERSION,
    effectiveDate: effectiveDate.toISOString(),
    approvedBy,
    trustedSourceClasses,
    permittedBehaviors,
    humanApprovalPerInstance: false,
    constraints,
    escalateWhen,
  };
  const profileHash = crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  const data = {
    authorityProfileId: LESSON_AUTHORITY_PROFILE_ID,
    version: LESSON_AUTHORITY_PROFILE_VERSION,
    effectiveDate,
    approvedBy,
    trustedSourceClasses: JSON.stringify(trustedSourceClasses),
    permittedBehaviors: JSON.stringify(permittedBehaviors),
    humanApprovalPerInstance: false,
    constraints: JSON.stringify(constraints),
    escalateWhen: JSON.stringify(escalateWhen),
    status: 'ACTIVE',
    profileHash,
  };
  return client.maiAuthorityProfile.upsert({
    where: { authorityProfileId_version: { authorityProfileId: LESSON_AUTHORITY_PROFILE_ID, version: LESSON_AUTHORITY_PROFILE_VERSION } },
    update: data,
    create: data,
  });
}
