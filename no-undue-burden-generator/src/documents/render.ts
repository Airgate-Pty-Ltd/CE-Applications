import { Packer, type Document } from 'docx'
import type { Determination } from '../engine/determine.ts'
import type { ProjectPlan } from '../schema/plan.ts'
import type { OrganizationProfile } from '../schema/profile.ts'
import { buildGapReport } from './gapReport.ts'
import { buildProjectInitiationPlan } from './projectInitiationPlan.ts'

/**
 * Rendering entry points.
 *
 * Generation is REFUSED while a blocking gap exists. That refusal lives here
 * rather than in the UI, so that no future caller — a batch export, a CLI, the
 * dashboard — can route around it.
 */

export class BlockedByGapsError extends Error {
  constructor(readonly determination: Determination) {
    const list = determination.gaps.blocking
      .map((g, i) => `  ${i + 1}. ${g.location} — ${g.title}\n     ${g.remedy}`)
      .join('\n')
    super(
      `Generation refused: ${determination.gaps.blocking.length} blocking gap(s) must be resolved first.\n${list}`,
    )
    this.name = 'BlockedByGapsError'
  }
}

export interface RenderInput {
  readonly plan: ProjectPlan
  readonly profile: OrganizationProfile
  readonly determination: Determination
}

function assertGenerable(determination: Determination): void {
  if (!determination.canGenerate) throw new BlockedByGapsError(determination)
}

export function planDocument(input: RenderInput): Document {
  assertGenerable(input.determination)
  return buildProjectInitiationPlan(input)
}

/**
 * The gap report is produced even when the plan is blocked — a user whose plan
 * will not generate is precisely the user who needs to know why.
 */
export function gapReportDocument(input: RenderInput): Document {
  return buildGapReport(input.determination, input.profile, input.plan.planDate)
}

export async function planToBlob(input: RenderInput): Promise<Blob> {
  return Packer.toBlob(planDocument(input))
}

export async function gapReportToBlob(input: RenderInput): Promise<Blob> {
  return Packer.toBlob(gapReportDocument(input))
}

/**
 * Base64 rendering, used by the test dashboard's preview.
 *
 * Blob behaves differently in Node, in a real browser and in jsdom; base64 does
 * not. The preview and conformance panels use this so they exercise the same
 * code path wherever they run.
 */
export async function planToBase64(input: RenderInput): Promise<string> {
  return Packer.toBase64String(planDocument(input))
}

/** Node-side rendering, used by the document tests. */
export async function planToBuffer(input: RenderInput): Promise<Buffer> {
  return Packer.toBuffer(planDocument(input))
}

export async function gapReportToBuffer(input: RenderInput): Promise<Buffer> {
  return Packer.toBuffer(gapReportDocument(input))
}

/** `Northvale_Aerostructures_PAH_Project_Initiation_Plan.docx` */
export function suggestedFilename(profile: OrganizationProfile, kind: 'plan' | 'gap-report'): string {
  const org = profile.pahName.trim().replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '')
  const stem = kind === 'plan' ? 'PAH_Project_Initiation_Plan' : 'Gap_Report'
  return org.length > 0 ? `${org}_${stem}.docx` : `${stem}.docx`
}
