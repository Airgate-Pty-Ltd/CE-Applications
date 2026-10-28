import type { ProjectPlan } from '../schema/plan.ts'
import type { OrganizationProfile } from '../schema/profile.ts'
import { ALLOWED_STATUS_BANNERS, type StatusBanner } from './banner.ts'
import { analyseGaps, type GapReport } from './gaps.ts'
import { determineRisk, type RiskDetermination } from './risk.ts'
import { validate, type ValidationReport } from './validate.ts'
import type { RuleTrace } from './trace.ts'

/**
 * The single entry point to the engine.
 *
 * Pure and deterministic end to end: identical (plan, profile) always yields a
 * byte-identical Determination, including every rationale string and the whole
 * trace. Nothing downstream may re-derive a regulatory conclusion — the document
 * builders and the UI read this object and nothing else.
 */
export interface Determination {
  readonly risk: RiskDetermination
  readonly gaps: GapReport
  readonly validation: ValidationReport
  /**
   * The banner printed on every page of the generated document.
   * Never anything other than one of the three permitted values.
   */
  readonly banner: StatusBanner
  readonly bannerRationale: string
  /** False when a blocking gap exists. The document is not generated. */
  readonly canGenerate: boolean
  readonly trace: readonly RuleTrace[]
}

export function determine(plan: ProjectPlan, profile: OrganizationProfile): Determination {
  const risk = determineRisk(plan)
  const gaps = analyseGaps(plan, profile, risk)
  const validation = validate(plan, profile, risk)

  // Banner selection, in strict precedence order.
  //
  // A failed consistency check is treated as a gap for banner purposes: the plan
  // may be complete, but two of its answers contradict each other, and that is
  // not a clean draft.
  let banner: StatusBanner
  let bannerRationale: string

  if (!gaps.canGenerate) {
    banner = ALLOWED_STATUS_BANNERS[2] // BLOCKED
    bannerRationale =
      `${gaps.blocking.length} blocking gap${gaps.blocking.length === 1 ? '' : 's'} prevent generation. ` +
      'The document is not produced until each is resolved.'
  } else if (gaps.warnings.length > 0 || !validation.passed) {
    banner = ALLOWED_STATUS_BANNERS[1] // DRAFTED WITH GAPS
    const parts: string[] = []
    if (gaps.warnings.length > 0)
      parts.push(`${gaps.warnings.length} warning${gaps.warnings.length === 1 ? '' : 's'}`)
    if (!validation.passed)
      parts.push(`${validation.failed.length} failed consistency check${validation.failed.length === 1 ? '' : 's'}`)
    bannerRationale = `Generated with ${parts.join(' and ')}. Review before use.`
  } else {
    banner = ALLOWED_STATUS_BANNERS[0] // DRAFT — INTERNAL REVIEW ONLY
    bannerRationale =
      'No blocking gaps, no warnings, and all applicable consistency checks pass. This is a complete draft ' +
      'for internal review. Whether the plan satisfies AC 21-55 is a determination for the FAA managing office.'
  }

  return {
    risk,
    gaps,
    validation,
    banner,
    bannerRationale,
    canGenerate: gaps.canGenerate,
    trace: [...risk.trace, ...gaps.trace],
  }
}
