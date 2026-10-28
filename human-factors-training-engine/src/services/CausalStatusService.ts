/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

import { PrismaClient, MaiCausalStatus } from '@prisma/client';

/**
 * Causal-Status Control: human-only promotion (PHASE-1-SPECIFICATION.md §2 step 2, C-004).
 *
 * The kernel may SUGGEST a candidate cause (advisory, via MaiSystemCondition) but only a
 * named human actor can promote causal_status. This service enforces:
 *   - a valid forward transition path (no skipping straight to VERIFIED, no going backward
 *     without an explicit re-open),
 *   - every promotion requires a named `promotedBy` actor and is timestamped,
 *   - no code path in this service promotes status without an explicit call — there is no
 *     scheduled job, no event listener, no auto-promotion trigger anywhere in this class.
 *
 * History (added 2026-08-06, DECISIONS.md D-024): `MaiCausalStatus` is `@@unique([tenantId,
 * eventId])` — one row per event, overwritten in place on every promotion. There is no
 * dedicated history table, so the row alone cannot answer "what was the promotion sequence
 * for this event" — only "what is it now, and who did the most recent step." PHASE-3's
 * Defense Dossier requires real causal-status HISTORY per cited event (WP-1 §6). Rather than
 * add a new table (a schema migration for a single read-path), each promotion now also
 * appends an AuditLog row (`action: 'causal_status_promoted'`) — AuditLog is already
 * append-only and already used this way elsewhere (D-017, D-019, D-021). The dossier reads
 * the ordered AuditLog rows for the event to reconstruct the full chain; MaiCausalStatus
 * remains the current-state row for everything else that only needs "what is it now."
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  REPORTED: ['SUSPECTED', 'UNSUPPORTED_ASSERTION'],
  SUSPECTED: ['UNDER_INVESTIGATION', 'UNSUPPORTED_ASSERTION'],
  UNDER_INVESTIGATION: ['VERIFIED', 'ROOT_CAUSE', 'LATENT_CONDITION', 'UNSUPPORTED_ASSERTION', 'DISPUTED_CONCLUSION'],
  VERIFIED: ['ROOT_CAUSE', 'LATENT_CONDITION', 'DISPUTED_CONCLUSION'],
  ROOT_CAUSE: ['DISPUTED_CONCLUSION'],
  LATENT_CONDITION: ['DISPUTED_CONCLUSION'],
  UNSUPPORTED_ASSERTION: ['SUSPECTED', 'UNDER_INVESTIGATION'], // re-opened by a human
  DISPUTED_CONCLUSION: ['UNDER_INVESTIGATION'], // re-opened by a human
};

export class CausalStatusService {
  constructor(private prisma: PrismaClient) {}

  /** Current status, defaulting to REPORTED (the schema default) if no row exists yet. */
  async getStatus(eventId: string): Promise<MaiCausalStatus | null> {
    return this.prisma.maiCausalStatus.findUnique({ where: { eventId } });
  }

  /**
   * Human-driven promotion. Throws on an invalid transition or a missing actor —
   * there is no default actor and no way to call this without naming who decided.
   */
  async promote(params: {
    tenantId: string;
    eventId: string;
    toStatus: string;
    promotedBy: string;
    notes?: string;
    verifiedRootCause?: string;
  }): Promise<MaiCausalStatus> {
    if (!params.promotedBy || params.promotedBy.trim() === '') {
      throw new Error('Causal-status promotion requires a named human actor (promotedBy)');
    }

    const existing = await this.prisma.maiCausalStatus.findUnique({
      where: { eventId: params.eventId },
    });
    const fromStatus = existing?.status ?? 'REPORTED';

    const allowed = VALID_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(params.toStatus)) {
      throw new Error(
        `Invalid causal-status transition: ${fromStatus} -> ${params.toStatus}. Allowed: ${allowed.join(', ') || '(none)'}`
      );
    }

    const result = existing
      ? await this.prisma.maiCausalStatus.update({
          where: { eventId: params.eventId },
          data: {
            status: params.toStatus,
            investigationNotes: params.notes ?? existing.investigationNotes,
            verifiedRootCause: params.verifiedRootCause ?? existing.verifiedRootCause,
            promotedBy: params.promotedBy,
            promotedAt: new Date(),
          },
        })
      : await this.prisma.maiCausalStatus.create({
          data: {
            tenantId: params.tenantId,
            eventId: params.eventId,
            status: params.toStatus,
            investigationNotes: params.notes,
            verifiedRootCause: params.verifiedRootCause,
            promotedBy: params.promotedBy,
            promotedAt: new Date(),
          },
        });

    // History entry (D-024) — the row above is overwritten on the next promotion; this
    // AuditLog entry is the only durable record of THIS specific transition.
    await this.prisma.auditLog.create({
      data: {
        organizationId: params.tenantId,
        actor: null,
        action: 'causal_status_promoted',
        object: 'HfEvent',
        objectId: params.eventId,
        details: JSON.stringify({
          fromStatus,
          toStatus: params.toStatus,
          promotedBy: params.promotedBy,
          notes: params.notes ?? null,
          verifiedRootCause: params.verifiedRootCause ?? null,
        }),
      },
    });

    return result;
  }

  /**
   * Full promotion history for an event, oldest first — reconstructed from AuditLog since
   * MaiCausalStatus itself only holds current state. Used by the Defense Dossier (WP-1 §6).
   */
  async getHistory(eventId: string, tenantId?: string): Promise<
    Array<{
      fromStatus: string;
      toStatus: string;
      promotedBy: string;
      notes: string | null;
      verifiedRootCause: string | null;
      promotedAt: Date;
    }>
  > {
    const logs = await this.prisma.auditLog.findMany({
      where: { action: 'causal_status_promoted', objectId: eventId, ...(tenantId ? { organizationId: tenantId } : {}) },
      orderBy: { timestamp: 'asc' },
    });

    return logs.map((log) => {
      const details = JSON.parse(log.details || '{}');
      return {
        fromStatus: details.fromStatus,
        toStatus: details.toStatus,
        promotedBy: details.promotedBy,
        notes: details.notes ?? null,
        verifiedRootCause: details.verifiedRootCause ?? null,
        promotedAt: log.timestamp,
      };
    });
  }
}

export const causalStatusServiceSingleton = (prisma: PrismaClient) =>
  new CausalStatusService(prisma);
