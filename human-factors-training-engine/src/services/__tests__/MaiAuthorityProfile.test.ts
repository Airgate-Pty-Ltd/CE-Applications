/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from "@prisma/client";
import { validateAuthorityProfile, AuthorityProfile } from "@/services/MaiDecisionAdapter";

/**
 * D-067: MaiAuthorityProfile DB row -> reconstructed kernel AuthorityProfile -> validated at
 * read time, same reconstruction LessonAutoImplementationService.toKernelProfile() performs.
 * A good row must pass; a deliberately malformed row must be refused, not silently trusted.
 */
describe("MaiAuthorityProfile round-trip validation (D-067)", () => {
  let prisma: PrismaClient;
  const testTag = `map-test-${Date.now()}`;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.maiAuthorityProfile.deleteMany({ where: { authorityProfileId: { contains: testTag } } });
    await prisma.$disconnect();
  });

  function toKernelProfile(row: { authorityProfileId: string; version: number; effectiveDate: Date; approvedBy: string; trustedSourceClasses: string; permittedBehaviors: string; humanApprovalPerInstance: boolean; constraints: string; escalateWhen: string }): AuthorityProfile {
    return {
      authorityProfileId: row.authorityProfileId,
      version: row.version,
      effectiveDate: row.effectiveDate.toISOString(),
      approvedBy: row.approvedBy,
      trustedSourceClasses: JSON.parse(row.trustedSourceClasses),
      permittedBehaviors: JSON.parse(row.permittedBehaviors),
      humanApprovalPerInstance: row.humanApprovalPerInstance,
      constraints: JSON.parse(row.constraints),
      escalateWhen: JSON.parse(row.escalateWhen),
    };
  }

  test("a well-formed row round-trips to a valid AuthorityProfile", async () => {
    const row = await prisma.maiAuthorityProfile.create({
      data: {
        authorityProfileId: `${testTag}-good`,
        version: 1,
        effectiveDate: new Date(),
        approvedBy: "Test Author",
        trustedSourceClasses: JSON.stringify(["TRUSTED_CONFIRMED"]),
        permittedBehaviors: JSON.stringify(["PROCEED_AND_NOTIFY", "ESCALATE"]),
        humanApprovalPerInstance: false,
        constraints: JSON.stringify(["TENANT_SCOPE_VALID"]),
        escalateWhen: JSON.stringify(["CONFLICTING_LESSONS"]),
        status: "ACTIVE",
        profileHash: "deadbeef",
      },
    });

    const profile = toKernelProfile(row);
    expect(validateAuthorityProfile(profile)).toHaveLength(0);
  });

  test("a deliberately malformed row (empty trustedSourceClasses) fails validation at read time, not silently trusted", async () => {
    const row = await prisma.maiAuthorityProfile.create({
      data: {
        authorityProfileId: `${testTag}-malformed`,
        version: 1,
        effectiveDate: new Date(),
        approvedBy: "Test Author",
        trustedSourceClasses: JSON.stringify([]), // invalid: must be non-empty per validateAuthorityProfile
        permittedBehaviors: JSON.stringify(["PROCEED"]),
        humanApprovalPerInstance: false,
        constraints: JSON.stringify([]),
        escalateWhen: JSON.stringify([]),
        status: "ACTIVE",
        profileHash: "deadbeef",
      },
    });

    const profile = toKernelProfile(row);
    const errors = validateAuthorityProfile(profile);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(";")).toMatch(/trustedSourceClasses/);
  });

  test("humanApprovalPerInstance defaults to true at the schema level (fail-closed)", async () => {
    const row = await prisma.maiAuthorityProfile.create({
      data: {
        authorityProfileId: `${testTag}-default`,
        version: 1,
        effectiveDate: new Date(),
        approvedBy: "Test Author",
        trustedSourceClasses: JSON.stringify(["TRUSTED_CONFIRMED"]),
        permittedBehaviors: JSON.stringify(["PROCEED"]),
        // humanApprovalPerInstance intentionally omitted
        constraints: JSON.stringify([]),
        escalateWhen: JSON.stringify([]),
        status: "DRAFT",
        profileHash: "deadbeef",
      },
    });

    expect(row.humanApprovalPerInstance).toBe(true);
  });
});
