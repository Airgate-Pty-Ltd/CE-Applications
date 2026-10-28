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
 * Emergency Interim Content Manager: Phase 2 governance increment
 *
 * High-risk findings may need immediate interim training before full content development.
 * Interim content: auto-expires, forces re-design. Immutable once assigned: an item's
 * expiration cannot be silently changed; only an approved renewal can extend it.
 *
 * Updated 2026-08-06 (WP-2 §4, PHASE-3-RUN-DIRECTIVE.md, directive v3 §8.4): duration is now
 * configurable at creation from a configurable default — no longer a single fixed 30-day
 * constant applied to every item (that decision, D-014 context and OPEN-QUESTIONS.md D-001,
 * is superseded by this entry, not silently changed — see DECISIONS.md D-028). Expiration is
 * mandatory: every EMERGENCY_INTERIM atom MUST have a finite emergencyExpiresAt; there is no
 * code path that creates one without an expiration. Renewal (extending an existing item's
 * expiration) requires a linked, APPROVED MaiApproval — it is not self-service.
 */
export const DEFAULT_EMERGENCY_DURATION_DAYS = 30; // configurable default, not a fixed ceiling

export interface EmergencyContent {
  atomId: string;
  title: string;
  content: string;
  isEmergency: true;
  expiresAt: Date;
  mandatoryReviewDate: Date;
}

export class EmergencyContentManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient, private tenantId: string) {
    if (!tenantId) throw new Error('EmergencyContentManager requires a tenantId.');
    this.prisma = prisma;
  }

  /**
   * Create emergency interim content. `durationDays` overrides the configurable default for
   * this specific item — omit to use DEFAULT_EMERGENCY_DURATION_DAYS. Whatever the value,
   * expiration is mandatory: a duration of 0 or less is rejected, not treated as "no expiry".
   */
  async createEmergencyContent(
    title: string,
    content: string,
    justification: string,
    durationDays: number = DEFAULT_EMERGENCY_DURATION_DAYS
  ): Promise<EmergencyContent> {
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      throw new Error(
        `Emergency content requires a positive, finite expiration duration; got ${durationDays}. ` +
          `Mandatory expiration cannot be bypassed.`
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const atom = await this.prisma.learningAtom.create({
      data: {
        tenantId: this.tenantId,
        title: `[EMERGENCY] ${title}`,
        objective: 'Immediate interim response to high-risk finding',
        content,
        classification: 'INTERNAL',
        status: 'APPROVED', // Emergency content auto-approved
        duration: 10,
        revision: 1,
        format: 'EMERGENCY_INTERIM',
        emergencyExpiresAt: expiresAt,
      }
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: this.tenantId,
        actor: null,
        action: 'emergency_content_created',
        object: 'LearningAtom',
        objectId: atom.id,
        details: JSON.stringify({ justification, durationDays, expiresAt: expiresAt.toISOString() }),
      },
    });

    return {
      atomId: atom.id,
      title: atom.title,
      content: atom.content || '',
      isEmergency: true,
      expiresAt,
      mandatoryReviewDate: expiresAt
    };
  }

  /**
   * Renew (extend) an emergency item's expiration. Requires a linked, APPROVED MaiApproval
   * (approvalType: 'EMERGENCY_CONTENT_RENEWAL') — self-service renewal is not permitted, per
   * directive v3 §8.4 "renewal requires approval". The new expiration is computed from NOW
   * (not from the old expiresAt), so a renewal always grants a full fresh window going
   * forward, never silently shortens what was left. Throws if the item is not
   * EMERGENCY_INTERIM, or already has no emergencyExpiresAt (a data-integrity anomaly the
   * mandatory-expiration rule should have prevented — fail loud, don't guess a value).
   */
  async renewEmergencyContent(params: {
    atomId: string;
    newDurationDays: number;
    approvalId: string;
    renewedBy: string;
  }): Promise<{ atomId: string; newExpiresAt: Date }> {
    if (!Number.isFinite(params.newDurationDays) || params.newDurationDays <= 0) {
      throw new Error(`Renewal requires a positive, finite duration; got ${params.newDurationDays}.`);
    }

    const atom = await this.prisma.learningAtom.findFirstOrThrow({
      where: { id: params.atomId, tenantId: this.tenantId },
    });
    if (atom.format !== 'EMERGENCY_INTERIM') {
      throw new Error(`Atom ${params.atomId} is not EMERGENCY_INTERIM content; renewal does not apply.`);
    }
    if (!atom.emergencyExpiresAt) {
      throw new Error(
        `Atom ${params.atomId} has no emergencyExpiresAt set — mandatory-expiration invariant ` +
          `was violated at creation. Refusing to guess a renewal baseline.`
      );
    }

    const approval = await this.prisma.maiApproval.findFirst({
      where: { id: params.approvalId, tenantId: this.tenantId },
    });
    if (!approval || approval.approvalType !== 'EMERGENCY_CONTENT_RENEWAL' || approval.decision !== 'APPROVED') {
      throw new Error(
        `Approval ${params.approvalId} does not authorize an emergency-content renewal ` +
          `(must exist, approvalType='EMERGENCY_CONTENT_RENEWAL', decision='APPROVED').`
      );
    }

    const newExpiresAt = new Date(Date.now() + params.newDurationDays * 24 * 60 * 60 * 1000);
    await this.prisma.learningAtom.update({
      where: { id: params.atomId },
      data: { emergencyExpiresAt: newExpiresAt },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: this.tenantId,
        actor: null,
        action: 'emergency_content_renewed',
        object: 'LearningAtom',
        objectId: params.atomId,
        details: JSON.stringify({
          renewedBy: params.renewedBy,
          approvalId: params.approvalId,
          previousExpiresAt: atom.emergencyExpiresAt.toISOString(),
          newExpiresAt: newExpiresAt.toISOString(),
        }),
      },
    });

    return { atomId: params.atomId, newExpiresAt };
  }

  /**
   * Check if emergency content has expired.
   * Expired content cannot be assigned to new learners.
   * Non-emergency atoms are never "expired" by this manager — they aren't its concern.
   * Fixed 2026-08-06: previously returned `format !== 'EMERGENCY_INTERIM'`, which never
   * checked elapsed time at all — it flagged every ordinary atom as expired and every
   * genuine emergency atom as never-expiring. Caught writing the real expiry test
   * (EmergencyContentManager.test.ts) required by the Phase 2 gate re-verification.
   */
  async isExpired(atomId: string): Promise<boolean> {
    const countdown = await this.getExpirationCountdown(atomId);
    if (!countdown.isEmergency) {
      return false;
    }
    return countdown.isExpired;
  }

  /**
   * Get expiration countdown for emergency content. Reads the persisted, per-item
   * `emergencyExpiresAt` (set at creation, extendable only via renewEmergencyContent()) —
   * no longer recomputed from `createdAt + a single shared constant`, since duration is now
   * configurable per item (WP-2 §4).
   */
  async getExpirationCountdown(atomId: string): Promise<{
    isEmergency: boolean;
    expiresAt?: Date;
    daysRemaining?: number;
    isExpired: boolean;
  }> {
    const atom = await this.prisma.learningAtom.findFirst({
      where: { id: atomId, tenantId: this.tenantId }
    });

    if (!atom || atom.format !== 'EMERGENCY_INTERIM') {
      return { isEmergency: false, isExpired: false };
    }

    if (!atom.emergencyExpiresAt) {
      // Mandatory-expiration invariant violated (shouldn't happen via createEmergencyContent(),
      // which always sets it) — fail loud rather than inventing a fallback duration.
      throw new Error(
        `Atom ${atomId} is EMERGENCY_INTERIM but has no emergencyExpiresAt. ` +
          `This violates the mandatory-expiration invariant.`
      );
    }

    const now = new Date();
    const expiresAt = atom.emergencyExpiresAt;
    const expired = now > expiresAt;
    const daysRemaining = expired
      ? 0
      : Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isEmergency: true,
      expiresAt,
      daysRemaining,
      isExpired: expired
    };
  }

  /**
   * Force replacement: emergency content cannot be renewed;
   * must be replaced with properly designed, non-emergency content.
   */
  async mustReplace(atomId: string): Promise<boolean> {
    const isExpired = await this.isExpired(atomId);
    if (!isExpired) return false;

    // Check if already replaced
    const replacements = await this.prisma.learningAtom.findMany({
      where: { replacedAtomId: atomId, tenantId: this.tenantId }
    });

    return replacements.length === 0;
  }

  /**
   * Prevent assignment of expired emergency content.
   */
  async canAssignAtom(atomId: string): Promise<{
    canAssign: boolean;
    reason?: string;
  }> {
    const expired = await this.isExpired(atomId);

    if (expired) {
      return {
        canAssign: false,
        reason: 'Emergency content has expired and cannot be assigned. Must be replaced with standard content.'
      };
    }

    const countdown = await this.getExpirationCountdown(atomId);
    if (countdown.isEmergency && countdown.daysRemaining !== undefined && countdown.daysRemaining < 7) {
      return {
        canAssign: true,
        reason: `WARNING: Emergency content expires in ${countdown.daysRemaining} days. Plan replacement.`
      };
    }

    return { canAssign: true };
  }
}

export const emergencyContentManagerSingleton = (prisma: PrismaClient, tenantId: string) =>
  new EmergencyContentManager(prisma, tenantId);
