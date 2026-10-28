import type { CustomerConfig } from '../schema/config.ts'
import type { IsoDateTime } from '../schema/primitives.ts'
import type { Check, ControlAttestations, ScheduledWindow, ToolUsage } from '../schema/session.ts'

/**
 * Session controls, enforced rather than advised.
 *
 * The source procedures make these mandatory, so they are gates: a session that
 * has not met a control does not start, and a check whose control is unmet is
 * not recordable. Two of them can be overridden - but only with a recorded
 * reason that lands on the record and in the evidence package, where a reviewer
 * will see both the override and the justification for it.
 *
 * Pure. `now` is an input.
 */

export type ControlEnforcement =
  /** Enforced by the shape of the product. There is nothing to check at runtime. */
  | 'STRUCTURAL'
  /** Measured or compared. Blocks unless satisfied or overridden with a reason. */
  | 'GATE'
  /** Confirmed by a person before the session and recorded. */
  | 'ATTESTATION'

export type ControlStatus = 'SATISFIED' | 'OVERRIDDEN' | 'NOT_SATISFIED'

export interface ControlOutcome {
  controlId: string
  title: string
  enforcement: ControlEnforcement
  status: ControlStatus
  detail: string
  overrideReason?: string
}

export interface PreSessionControlInput {
  now: IsoDateTime
  scheduledWindow: ScheduledWindow
  attestations: ControlAttestations
  config: CustomerConfig
}

export interface PreSessionControlResult {
  mayStart: boolean
  controls: ControlOutcome[]
  blockingControlIds: string[]
  overriddenControlIds: string[]
}

export function evaluatePreSessionControls(input: PreSessionControlInput): PreSessionControlResult {
  const { now, scheduledWindow, attestations, config } = input
  const controls: ControlOutcome[] = []

  // 1. Live only.
  controls.push({
    controlId: 'live-only',
    title: 'Live session only, never pre-recorded',
    enforcement: 'STRUCTURAL',
    status: 'SATISFIED',
    detail:
      'No upload path for conformity evidence exists anywhere in the product. Pre-recorded material cannot become the basis of a determination because there is nowhere to put it.',
  })

  // 2. Scheduled timeframe.
  const insideWindow = now >= scheduledWindow.opensAt && now <= scheduledWindow.closesAt
  const scheduleOverride = attestations.scheduleOverrideReason?.trim()
  controls.push({
    controlId: 'scheduled-timeframe',
    title: 'Session starts within its scheduled window',
    enforcement: 'GATE',
    status: insideWindow ? 'SATISFIED' : scheduleOverride ? 'OVERRIDDEN' : 'NOT_SATISFIED',
    detail: insideWindow
      ? `Start ${now} falls within ${scheduledWindow.opensAt} to ${scheduledWindow.closesAt}.`
      : `Start ${now} falls outside ${scheduledWindow.opensAt} to ${scheduledWindow.closesAt}.`,
    ...(scheduleOverride && !insideWindow ? { overrideReason: scheduleOverride } : {}),
  })

  // 3. Minimum video resolution, measured rather than asked about.
  const meetsResolution = attestations.measuredVideoHeightPx >= config.minimumVideoHeightPx
  const resolutionOverride = attestations.resolutionJustification?.trim()
  controls.push({
    controlId: 'minimum-video-resolution',
    title: `Measured video height of at least ${config.minimumVideoHeightPx}px`,
    enforcement: 'GATE',
    status: meetsResolution ? 'SATISFIED' : resolutionOverride ? 'OVERRIDDEN' : 'NOT_SATISFIED',
    detail: `Provider reported ${attestations.measuredVideoHeightPx}px against a configured minimum of ${config.minimumVideoHeightPx}px.`,
    ...(resolutionOverride && !meetsResolution ? { overrideReason: resolutionOverride } : {}),
  })

  // 4. Audio.
  controls.push({
    controlId: 'audio-headset',
    title: 'Headset in use, background noise controlled',
    enforcement: 'ATTESTATION',
    status: attestations.audioHeadsetConfirmed ? 'SATISFIED' : 'NOT_SATISFIED',
    detail: attestations.audioHeadsetConfirmed
      ? `Confirmed by ${attestations.attestedByPersonId} at ${attestations.attestedAt}.`
      : 'Not confirmed. Direction that cannot be heard cannot be evidenced as directed.',
  })

  // 5. Environment.
  controls.push({
    controlId: 'controlled-environment',
    title: 'Controlled environment, free of distraction',
    enforcement: 'ATTESTATION',
    status: attestations.environmentControlledConfirmed ? 'SATISFIED' : 'NOT_SATISFIED',
    detail: attestations.environmentControlledConfirmed
      ? `Confirmed by ${attestations.attestedByPersonId} at ${attestations.attestedAt}.`
      : 'Not confirmed.',
  })

  // 6. Sole conformity authority.
  controls.push({
    controlId: 'inspector-sole-conformity-authority',
    title: 'Inspector retains sole conformity authority',
    enforcement: 'STRUCTURAL',
    status: 'SATISFIED',
    detail:
      'The presenter role holds no determination capability, so no surface in the product can render a determination control for it. See src/engine/roles.ts.',
  })

  const blockingControlIds = controls.filter((c) => c.status === 'NOT_SATISFIED').map((c) => c.controlId)
  const overriddenControlIds = controls.filter((c) => c.status === 'OVERRIDDEN').map((c) => c.controlId)

  return {
    mayStart: blockingControlIds.length === 0,
    controls,
    blockingControlIds,
    overriddenControlIds,
  }
}

export interface CheckControlInput {
  check: Check
  anglesUsed: string[]
  lightingUsed?: string
  toolIdsUsed: string[]
  documentRefsReviewed: string[]
  /** Calibration position snapshotted at session start. */
  toolsUsedInSession: ToolUsage[]
}

export interface CheckControlResult {
  mayRecordDetermination: boolean
  /** Reasons the determination cannot be recorded, in the words shown to the inspector. */
  obstacles: string[]
}

/**
 * Whether a determination may be recorded against this check.
 *
 * Note what this does not do: it never suggests what the determination should
 * be. It decides only whether the evidence the control set requires is present.
 */
export function evaluateCheckControls(input: CheckControlInput): CheckControlResult {
  const { check, anglesUsed, lightingUsed, toolIdsUsed, documentRefsReviewed, toolsUsedInSession } = input
  const obstacles: string[] = []

  if (check.keyCharacteristic) {
    if (anglesUsed.length === 0) {
      obstacles.push(
        'This check is a key characteristic. Record which camera angles were used before determining conformity.',
      )
    }
    if (!lightingUsed?.trim()) {
      obstacles.push(
        'This check is a key characteristic. Record the supplementary lighting used before determining conformity.',
      )
    }
  }

  if (check.requiresCalibratedTool && toolIdsUsed.length === 0) {
    obstacles.push('This check requires a calibrated tool. Record which tool was used.')
  }

  for (const toolId of toolIdsUsed) {
    const usage = toolsUsedInSession.find((t) => t.toolId === toolId)
    if (!usage) {
      obstacles.push(`Tool ${toolId} is not among the tools registered for this session.`)
      continue
    }
    if (!usage.inCalibrationAtSessionStart) {
      obstacles.push(
        `Tool ${toolId} was past its calibration due date (${usage.calibrationDueDate}) at session start. A measurement taken with it is not evidence.`,
      )
    }
  }

  if (check.requiresDocumentOnScreen && documentRefsReviewed.length === 0) {
    obstacles.push('This check requires a document reviewed on screen. Record which document was shown.')
  }

  return { mayRecordDetermination: obstacles.length === 0, obstacles }
}
