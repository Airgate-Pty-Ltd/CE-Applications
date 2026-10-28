/**
 * Regulatory output control — forbidden claim patterns.
 *
 * This product drafts a submission to a federal regulator. It is not competent
 * to judge whether that submission will be accepted, and saying otherwise
 * transfers the applicant's regulatory risk onto Conform-Edge. The FAA managing
 * office makes the finding; this software prepares the paperwork.
 *
 * These patterns are enforced against source and against the emitted bundle, so
 * the claim cannot be reintroduced through UI copy, marketing text, a document
 * template, or a help string.
 */

export interface ForbiddenPhrase {
  readonly id: string
  /** Why this claim is not ours to make. */
  readonly why: string
  /** What to say instead. */
  readonly instead: string
  readonly pattern: RegExp
}

export const FORBIDDEN_PHRASES: readonly ForbiddenPhrase[] = [
  {
    id: 'ready-for-submission',
    why: 'Asserts a submission decision that only the applicant and the FAA can make.',
    instead: 'State the banner value and let the gap report speak for completeness.',
    pattern: /\bready\s+(?:for|to)\s+(?:be\s+)?(?:FAA\s+)?submi(?:t|ssion|tted|ttal)\b/gi,
  },
  {
    id: 'submission-ready',
    why: 'Same claim, hyphenated.',
    instead: 'Use "DRAFT — INTERNAL REVIEW ONLY" or "DRAFTED WITH GAPS".',
    pattern: /\bsubmission[-\s]ready\b/gi,
  },
  {
    id: 'cleared-for-submission',
    why: 'Implies a clearance this software has no authority to grant.',
    instead: 'Report which blocking gaps are closed, not that the package is cleared.',
    pattern: /\b(?:cleared|approved|signed[-\s]off)\s+for\s+(?:FAA\s+)?submi(?:t|ssion|ttal)\b/gi,
  },
  {
    id: 'guarantees-approval',
    why: 'Predicts a regulatory outcome.',
    instead: 'Say what the AC requires and whether the field is populated.',
    pattern:
      /\b(?:guarantee|guarantees|guaranteed|ensures?|assures?)\s+(?:\w+\s+){0,3}?(?:FAA\s+)?(?:approval|acceptance|a\s+no\s+undue\s+burden\s+finding)\b/gi,
  },
  {
    id: 'will-be-approved',
    why: 'Predicts a regulatory outcome.',
    instead: 'The FAA managing office makes the final call. Say that instead.',
    pattern:
      /\b(?:will|shall)\s+be\s+(?:approved|accepted)\s+by\s+(?:the\s+)?FAA\b/gi,
  },
  {
    id: 'faa-compliant-package',
    why: 'Claims a compliance finding against AC 21-55 that the FAA has not made.',
    instead: 'Say the document follows the Appendix A format. Format is not compliance.',
    pattern: /\b(?:fully\s+)?(?:FAA[-\s])?complian(?:t|ce)\s+(?:with\s+)?(?:AC\s*)?21[-\s]55\b/gi,
  },
]

/**
 * The only status banner values a generated document may carry.
 *
 * Re-exported from the application source rather than duplicated: two lists of
 * "the allowed banners" would drift, and the drift would not be visible until an
 * FAA reader saw the wrong one. The gate asserts the contents of this single
 * definition.
 */
export { ALLOWED_STATUS_BANNERS, type StatusBanner } from '../src/engine/banner.ts'

export const FORBIDDEN_IGNORE: readonly string[] = [
  'node_modules',
  '.git',
  'coverage',
  // This file necessarily contains the patterns themselves.
  'scripts/forbidden-phrases.ts',
  'tests/gates',
]
