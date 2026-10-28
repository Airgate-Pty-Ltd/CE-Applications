/**
 * CI-side view of the scrub gate.
 *
 * The patterns themselves live in `src/gates/scrubPatterns.ts` and are
 * re-exported here rather than duplicated, so that the CI gate and the test
 * dashboard's scrub panel can never disagree about what counts as a leak. Only
 * the filesystem-scan concerns — which paths the gate skips — belong to this
 * file, because they have no meaning in the browser.
 */

export {
  SCRUB_PATTERNS,
  ALLOWLIST,
  scanText,
  type ScrubPattern,
  type ScrubHit,
} from '../src/gates/scrubPatterns.ts'

/** Files and directories the scrub gate does not read. */
export const SCRUB_IGNORE: readonly string[] = [
  'node_modules',
  '.git',
  'coverage',
  // These necessarily contain the patterns themselves.
  'scripts/scrub-patterns.ts',
  'src/gates/scrubPatterns.ts',
  // The gate tests contain synthetic values engineered to trip the patterns.
  'tests/gates',
]
