// Deterministic source layer — types.
//
// EVERY field on a Finding must be traceable to a value the publishing
// authority actually emitted. Nothing here is inferred, summarised, or
// generated. There is no LLM anywhere in this pipeline.

/**
 * How much of a finding came from the authority itself.
 *
 * - `verified`   — every field below was read from an official structured
 *                  source (an API or feed the authority publishes). Dates and
 *                  document numbers are the publisher's own values.
 * - `unverified` — the source is not structured, so some fields may be absent.
 *                  Never presented to subscribers as authoritative.
 *
 * There is deliberately no middle tier. A field is either the authority's
 * value or it is not present.
 */
export type VerificationLevel = 'verified' | 'unverified';

/** Severity ordering used for sorting; mirrors regulatory_findings.priority. */
export type Priority = 'urgent' | 'high' | 'normal' | 'low';

export interface Finding {
  authority: string;
  category: string;
  priority: Priority;
  title: string;
  summary: string;
  detail: string;
  source_url: string;
  effective_date?: string | null;
  comment_deadline?: string | null;
  document_number?: string | null;

  /** Provenance. Persisted so the UI can distinguish authoritative items. */
  verification: VerificationLevel;
  /** Identifier of the source that produced this finding, e.g. 'federal-register'. */
  source_id: string;
}

/** A configured, pullable source for one authority. */
export interface Source {
  /** Stable id, e.g. 'federal-register'. */
  id: string;
  /** Authority id as stored on findings, e.g. 'FAA'. */
  authority: string;
  /** Human-readable authority name. */
  authorityName: string;
  verification: VerificationLevel;
  /**
   * Pull recent items. Implementations must not infer values: if the
   * publisher does not supply a field, return null for it.
   */
  fetch(sinceDays: number): Promise<Finding[]>;
}

/** Result of pulling one source, including failure detail. */
export interface SourceResult {
  sourceId: string;
  authority: string;
  authorityName: string;
  findings: Finding[];
  ok: boolean;
  error?: string;
}
