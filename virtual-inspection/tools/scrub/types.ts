/**
 * Shared types for the two CI gates required by BUILD PROMPT 3 sections 1.1 and 1.2.
 *
 * Gate 1 (identifier scrub)  - no real-world identifier may appear in this repository.
 * Gate 2 (opinion language)  - the product may not assert a regulatory conclusion.
 *
 * Both gates are implemented as pure functions over file text so they can be unit
 * tested against synthetic fixtures. The CLI is a thin shell around them.
 */

export type Gate = 'identifier' | 'opinion'

export interface ScrubRule {
  /** Stable id used by allow-markers and by the test dashboard. */
  id: string
  gate: Gate
  /** What this rule exists to stop. Printed with every finding. */
  rationale: string
  pattern: RegExp
  /**
   * Matches that are structurally impossible to be a real identifier
   * (documentation placeholders, example.com, and so on).
   */
  exempt?: (match: string) => boolean
}

export interface Finding {
  ruleId: string
  gate: Gate
  file: string
  line: number
  column: number
  /**
   * The offending text with its identifying characters masked.
   *
   * Findings are printed to CI logs and pasted into tickets. Echoing the raw
   * identifier back would re-publish the very string the gate exists to keep
   * out of the repository, so every finding is redacted at the point of
   * construction and the raw match is never retained.
   */
  redacted: string
  rationale: string
}

export interface ScanInput {
  /** Repository-relative path, POSIX separators. */
  file: string
  text: string
}

export interface ScanOptions {
  /** Extra terms supplied by the owner from outside version control. */
  denylist?: DenylistEntry[]
}

export interface DenylistEntry {
  category: string
  term: string
}
