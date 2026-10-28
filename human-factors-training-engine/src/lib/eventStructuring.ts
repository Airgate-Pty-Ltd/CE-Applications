/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * distribution, or use of this file, via any medium, is strictly prohibited
 * without prior written permission from Conform-Edge Quality Consulting LLC.
 * See LICENSE and NOTICE at the repository root.
 */

/**
 * Structured HF Event Intake: Phase 3 WP-4 product-core increment.
 *
 * Extracting an event from evidence previously only carried a title and an
 * occurredAt date forward — the structured fields (themes, roles exposed,
 * sites exposed) that drift-watch and traceability need were never populated
 * from the UI, even though the schema and API already supported them. This
 * derives sensible defaults (inherit the evidence's own themes; empty arrays
 * otherwise) while leaving every field QM-editable before submission — never
 * silently invents a theme, role, or site that wasn't entered somewhere.
 */

export interface EvidenceThemeSource {
  themes: string[];
}

export interface EventStructureInput {
  themes?: string[];
  rolesExposed?: string[];
  sitesExposed?: string[];
}

export interface EventStructureResult {
  themes: string[];
  rolesExposed: string[];
  sitesExposed: string[];
}

/**
 * Derive the structured fields for a new HfEvent being extracted from evidence.
 * - themes: QM-supplied override if given (including an explicit empty array),
 *   otherwise inherited from the source evidence's own themes.
 * - rolesExposed / sitesExposed: QM-supplied only — there is no analogous
 *   evidence-level field to inherit from, so an unset value means "not yet
 *   captured", not "none apply".
 */
export function deriveEventStructure(evidence: EvidenceThemeSource, override: EventStructureInput): EventStructureResult {
  return {
    themes: override.themes !== undefined ? sanitizeStringArray(override.themes) : sanitizeStringArray(evidence.themes),
    rolesExposed: sanitizeStringArray(override.rolesExposed),
    sitesExposed: sanitizeStringArray(override.sitesExposed),
  };
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
}
