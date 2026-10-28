/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Frozen-manifest mutation guard (C-013 / HFEFF-003).
 *
 * Enforcement itself is a database trigger (prisma/manual-sql/frozen_manifest_trigger.sql —
 * see DECISIONS.md D-016), not application code: `prevent_frozen_manifest_update` fires
 * `RAISE(ABORT, 'frozen_manifest_immutable_error')` on any UPDATE where the row's status
 * is still ACTIVE. This wrapper attempts the mutation, and on ANY rejection (the exact
 * error shape is driver-dependent — see caveat below) logs the attempt to AuditLog and
 * re-throws, matching HFEFF-003's "surfaced for review" requirement.
 *
 * Known limitation: Prisma's SQLite connector maps SQLite trigger RAISE(ABORT, msg) results
 * to a generic P2003 "foreign key constraint violated" error and does not surface the
 * custom message text. The BLOCK itself is real and verified (the row is provably
 * unchanged after the attempt); only the specific error string differs from what a raw
 * sqlite3 driver or PostgreSQL RAISE EXCEPTION would show. Documented, not hidden.
 */
export class ManifestGuard {
  constructor(private prisma: PrismaClient) {}

  async attemptMutation(params: {
    manifestId: string;
    attemptedBy: string;
    data: Record<string, unknown>;
  }): Promise<never> {
    const manifest = await this.prisma.trainingPackageManifest.findUniqueOrThrow({
      where: { id: params.manifestId },
      select: { tenantId: true },
    });
    let dbError: unknown;
    try {
      await this.prisma.trainingPackageManifest.update({
        where: { id: params.manifestId },
        data: params.data,
      });
    } catch (error) {
      dbError = error;
    }

    if (dbError === undefined) {
      // The write went through — the trigger did NOT block it. This is a governance
      // failure, not a successful block, and must be logged and thrown as distinct
      // from the expected-rejection path below.
      await this.prisma.auditLog.create({
        data: {
          organizationId: manifest.tenantId,
          actor: null,
          action: 'frozen_manifest_modification_attempted',
          object: 'TrainingPackageManifest',
          objectId: params.manifestId,
          details: JSON.stringify({
            attemptedBy: params.attemptedBy,
            attemptedChange: params.data,
            blocked: false,
            integrityFailure: true,
          }),
        },
      });
      throw new Error('INTEGRITY FAILURE: frozen manifest update was not blocked by the DB trigger');
    }

    const message = dbError instanceof Error ? dbError.message : String(dbError);
    await this.prisma.auditLog.create({
      data: {
        organizationId: manifest.tenantId,
        actor: null,
        action: 'frozen_manifest_modification_attempted',
        object: 'TrainingPackageManifest',
        objectId: params.manifestId,
        details: JSON.stringify({
          attemptedBy: params.attemptedBy,
          attemptedChange: params.data,
          blocked: true,
          driverError: message,
        }),
      },
    });
    throw dbError;
  }
}

export const manifestGuardSingleton = (prisma: PrismaClient) => new ManifestGuard(prisma);
