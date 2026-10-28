/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { APPROVED_KERNEL_RULES, provisionApprovedKernelManifest } from '../kernelRuleManifest';
import { LESSON_AUTHORITY_PROFILE_ID, provisionLessonAuthorityProfile } from '../authorityProfile';

describe('fresh-organization governance provisioning', () => {
  const prisma = new PrismaClient();
  const tenantId = `provision-${crypto.randomUUID()}`;

  afterAll(async () => {
    await prisma.maiRuleManifest.deleteMany({ where: { tenantId } });
    await prisma.$disconnect();
  });

  test('is idempotent and installs the approved rule manifest plus active authority profile', async () => {
    const first = await provisionApprovedKernelManifest(prisma, tenantId);
    const second = await provisionApprovedKernelManifest(prisma, tenantId);
    const profile = await provisionLessonAuthorityProfile(prisma);

    expect(second.id).toBe(first.id);
    expect(JSON.parse(second.rules)).toHaveLength(APPROVED_KERNEL_RULES.length);
    expect(second.status).toBe('PUBLISHED');
    expect(profile.authorityProfileId).toBe(LESSON_AUTHORITY_PROFILE_ID);
    expect(profile.status).toBe('ACTIVE');
    expect(profile.profileHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
