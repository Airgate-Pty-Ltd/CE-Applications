/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * Confidentiality-classification restrictiveness ordering (C-006, PHASE-3-RUN-DIRECTIVE.md WP-2).
 *
 * The seven classifications are defined in SCHEMA-DELTA.md but no total order between them is
 * specified there — this ranking is an implementation default, not owner-supplied regulatory
 * content, logged per directive §"default-and-log" (DECISIONS.md D-026). Rationale, low to
 * high restrictiveness:
 *   PUBLIC              — explicitly "no restrictions, AI assist allowed"
 *   INTERNAL             — org-only, AI assist allowed
 *   SYSTEM_PROPRIETARY   — internal use only, AI assist allowed — functionally close to
 *                          INTERNAL but named separately in the schema, ranked one step above
 *   ANNEX_QUALITY_IP     — limited distribution (named third-party), no commercial seed
 *   CUSTOMER_CONFIDENTIAL — customer-controlled restriction, tenant-config-gated for AI
 *   EXPORT_CONTROLLED    — government regulatory restriction (ITAR/EAR), tenant-config-gated
 *   BURRANA_PRIVATE      — the schema's own comment: "blocks ALL AI Assist (external or
 *                          internal), no seed data" — the single strongest restriction defined
 *                          in the schema, ranked highest
 * If the owner disagrees with this ordering, it is a one-line change in RANK_ORDER below —
 * nothing elsewhere depends on the specific numeric values, only relative order.
 */
const RANK_ORDER = [
  'PUBLIC',
  'INTERNAL',
  'SYSTEM_PROPRIETARY',
  'ANNEX_QUALITY_IP',
  'CUSTOMER_CONFIDENTIAL',
  'EXPORT_CONTROLLED',
  'BURRANA_PRIVATE',
] as const;

export type Classification = (typeof RANK_ORDER)[number];

export function classificationRank(classification: string): number {
  const idx = RANK_ORDER.indexOf(classification as Classification);
  if (idx === -1) {
    throw new Error(
      `Unknown classification "${classification}". Expected one of: ${RANK_ORDER.join(', ')}`
    );
  }
  return idx;
}

/** Returns the most restrictive (highest-ranked) classification among the given list. */
export function mostRestrictive(classifications: string[]): string {
  if (classifications.length === 0) {
    throw new Error('mostRestrictive() requires at least one classification');
  }
  return classifications.reduce((most, current) =>
    classificationRank(current) > classificationRank(most) ? current : most
  );
}

/** True if `candidate` is strictly less restrictive than `reference`. */
export function isLessRestrictive(candidate: string, reference: string): boolean {
  return classificationRank(candidate) < classificationRank(reference);
}
