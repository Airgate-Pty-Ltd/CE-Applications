import type { SessionSnapshot } from '../schema/session.ts'

/**
 * The defensibility scorer - the differentiator.
 *
 * It computes, from what the session actually captured, which evidence elements
 * are present. It is **descriptive and never a verdict**. It says "this session
 * captured 6 of 8 applicable evidence elements; not captured: X, Y" and stops
 * there. It does not grade the session, does not call any score adequate, and
 * does not imply that a threshold carries regulatory meaning.
 *
 * The value is in the aggregate: a customer preparing for an audit pulls every
 * completed session below their own threshold and remediates. That is the
 * renewal driver, and it only works if the measure is honest at the element
 * level rather than rolled into a number that flatters.
 */

export type ElementStatus = 'PRESENT' | 'ABSENT' | 'NOT_APPLICABLE'

export interface EvidenceElement {
  elementId: string
  title: string
  status: ElementStatus
  /** What was found. Counts and lists, not adjectives. */
  detail: string
}

export interface DefensibilityReport {
  elements: EvidenceElement[]
  applicableCount: number
  presentCount: number
  absentElementIds: string[]
  /** One line, safe to render anywhere, carrying no conclusion. */
  statement: string
  /** Printed alongside the statement wherever the report is shown or exported. */
  disclaimer: string
}

const DISCLAIMER =
  'This is a description of what the session recorded. It is not an assessment of adequacy, it is not a score against any standard, and it carries no regulatory meaning.'

export function scoreDefensibility(session: SessionSnapshot): DefensibilityReport {
  const elements: EvidenceElement[] = []

  const checkById = new Map(session.checks.map((c) => [c.checkId, c]))
  const executed = session.executedChecks
  const determinations = executed.length

  // 1 - live directed inspection recorded
  elements.push({
    elementId: 'live-directed-inspection-recorded',
    title: 'Live directed inspection recorded',
    status: session.startedAt && determinations > 0 ? 'PRESENT' : 'ABSENT',
    detail: session.startedAt
      ? `Session started ${session.startedAt}; ${determinations} determination(s) recorded during it.`
      : 'Session never started.',
  })

  // 2 - physical manipulation directed by the inspector
  const manipulations = session.directedManipulations.length
  elements.push({
    elementId: 'directed-physical-manipulation-logged',
    title: 'Physical manipulation directed by the inspector and logged',
    status: manipulations > 0 ? 'PRESENT' : 'ABSENT',
    detail: `${manipulations} directed manipulation(s) logged.`,
  })

  // 3 - documents reviewed on screen
  const documentChecks = session.checks.filter((c) => c.requiresDocumentOnScreen)
  const documents = session.documentsReviewed
  elements.push({
    elementId: 'documents-reviewed-on-screen',
    title: 'Documents reviewed on screen and captured',
    status:
      documentChecks.length === 0 && documents.length === 0
        ? 'NOT_APPLICABLE'
        : documents.length > 0
          ? 'PRESENT'
          : 'ABSENT',
    detail:
      documents.length > 0
        ? `${documents.length} document(s) reviewed: ${documents.map((d) => d.documentRef).join(', ')}.`
        : documentChecks.length === 0
          ? 'No check in this pack requires a document on screen.'
          : `${documentChecks.length} check(s) require a document on screen; none was recorded as reviewed.`,
  })

  // 4 - key characteristics with angle and lighting
  const keyCharacteristicChecks = session.checks.filter((c) => c.keyCharacteristic)
  const executedKeyCharacteristics = executed.filter((e) => checkById.get(e.checkId)?.keyCharacteristic)
  const fullyEvidencedKc = executedKeyCharacteristics.filter(
    (e) => e.anglesUsed.length > 0 && Boolean(e.lightingUsed?.trim()),
  )
  elements.push({
    elementId: 'key-characteristics-angle-and-lighting',
    title: 'Key characteristics verified with angles and lighting noted',
    status:
      keyCharacteristicChecks.length === 0
        ? 'NOT_APPLICABLE'
        : executedKeyCharacteristics.length > 0 &&
            fullyEvidencedKc.length === executedKeyCharacteristics.length
          ? 'PRESENT'
          : 'ABSENT',
    detail:
      keyCharacteristicChecks.length === 0
        ? 'No check in this pack is flagged as a key characteristic.'
        : `${fullyEvidencedKc.length} of ${executedKeyCharacteristics.length} executed key-characteristic check(s) carry both angles and lighting; ${keyCharacteristicChecks.length} exist in the pack.`,
  })

  // 5 - tools used with calibration status
  const toolChecks = session.checks.filter((c) => c.requiresCalibratedTool)
  const tools = session.toolsUsed
  elements.push({
    elementId: 'tools-with-calibration-status',
    title: 'Tools used, with calibration position captured',
    status:
      toolChecks.length === 0 && tools.length === 0
        ? 'NOT_APPLICABLE'
        : tools.length > 0
          ? 'PRESENT'
          : 'ABSENT',
    detail:
      tools.length > 0
        ? tools
            .map(
              (t) =>
                `${t.toolId} (due ${t.calibrationDueDate}, ${t.inCalibrationAtSessionStart ? 'in calibration' : 'past due'} at session start)`,
            )
            .join('; ')
        : toolChecks.length === 0
          ? 'No check in this pack requires a calibrated tool.'
          : `${toolChecks.length} check(s) require a calibrated tool; no tool was registered.`,
  })

  // 6 - nonconformances raised where applicable
  const nonConforming = executed.filter((e) => e.determination === 'DOES_NOT_CONFORM')
  elements.push({
    elementId: 'nonconformances-raised-where-applicable',
    title: 'Nonconformances raised where a check did not conform',
    status:
      nonConforming.length === 0
        ? 'NOT_APPLICABLE'
        : session.nonconformances.length > 0
          ? 'PRESENT'
          : 'ABSENT',
    detail:
      nonConforming.length === 0
        ? 'No check was determined DOES_NOT_CONFORM.'
        : `${nonConforming.length} check(s) determined DOES_NOT_CONFORM; ${session.nonconformances.length} nonconformance(s) raised.`,
  })

  // 7 - approval withheld where conformity was not verified
  const unverified = executed.filter((e) => e.determination === 'NOT_VERIFIED')
  const unexecuted = session.checks.length - executed.length
  const conformityIncomplete = unverified.length > 0 || unexecuted > 0 || nonConforming.length > 0
  elements.push({
    elementId: 'approval-withheld-where-conformity-unverified',
    title: 'Approval withheld where conformity was not verified',
    status: !conformityIncomplete ? 'NOT_APPLICABLE' : session.approvalGranted ? 'ABSENT' : 'PRESENT',
    detail: !conformityIncomplete
      ? 'Every check in the pack was executed and none was left unverified or non-conforming.'
      : `${unverified.length} check(s) NOT_VERIFIED, ${unexecuted} not executed, ${nonConforming.length} DOES_NOT_CONFORM; approval ${session.approvalGranted ? 'was granted' : 'was withheld'}.`,
  })

  // 8 - full session recording retained
  const recordingRetained = session.recording.status === 'RETAINED' && Boolean(session.recording.contentHash)
  elements.push({
    elementId: 'full-session-recording-retained',
    title: 'Full session recording retained, with content hash',
    status: recordingRetained ? 'PRESENT' : 'ABSENT',
    detail: recordingRetained
      ? `Artefact ${session.recording.artefactRef ?? '(reference not set)'} retained in ${session.recording.storageTargetRef}, hash ${session.recording.contentHash}.`
      : `Recording state is ${session.recording.status}${session.recording.contentHash ? '' : ' with no content hash captured'}.`,
  })

  const applicable = elements.filter((e) => e.status !== 'NOT_APPLICABLE')
  const present = applicable.filter((e) => e.status === 'PRESENT')
  const absentElementIds = applicable.filter((e) => e.status === 'ABSENT').map((e) => e.elementId)

  const statement =
    absentElementIds.length === 0
      ? `This session captured ${present.length} of ${applicable.length} applicable evidence elements.`
      : `This session captured ${present.length} of ${applicable.length} applicable evidence elements. Not captured: ${absentElementIds.join(', ')}.`

  return {
    elements,
    applicableCount: applicable.length,
    presentCount: present.length,
    absentElementIds,
    statement,
    disclaimer: DISCLAIMER,
  }
}
