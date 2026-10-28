import { evaluateCheckControls, evaluatePreSessionControls, type PreSessionControlResult } from '../../engine/controls.ts'
import { assessApprovalAvailability, recordInterruption, recordRecordingFailure, resolveInterruption } from '../../engine/interruption.ts'
import { scoreDefensibility, type DefensibilityReport } from '../../engine/defensibility.ts'
import type { EligibilityResult } from '../../engine/eligibility.ts'
import type { CustomerConfig } from '../../schema/config.ts'
import type { Determination } from '../../schema/primitives.ts'
import type {
  ControlAttestations,
  Interruption,
  RecoveryPath,
  SessionSnapshot,
} from '../../schema/session.ts'
import type { RecordingArtefact } from '../../video/provider.ts'

/**
 * The live-session reducer.
 *
 * Every transition is a pure function of the previous state and an action, and
 * every rule it applies comes from src/engine. The UI holds no rule of its own -
 * if a control lives here rather than in the engine, a second surface could
 * disagree with the first, and in an evidence engine two surfaces disagreeing
 * about whether approval is available is the whole problem.
 *
 * Note the absence of any action that grants approval directly. Approval is
 * derived: it is available when the engine says it is, and the inspector's
 * action is to *take* an available approval or to withhold it with a reason.
 */

export interface LiveSessionState {
  config: CustomerConfig
  session: SessionSnapshot
  eligibility: EligibilityResult
  preSessionControls: PreSessionControlResult | null
  /** Obstacles surfaced against the check the inspector is currently on. */
  activeCheckId: string | null
  lastRefusal: string | null
}

export type LiveSessionAction =
  | { type: 'ATTEST'; attestations: ControlAttestations; now: string }
  | { type: 'START'; now: string }
  | { type: 'SELECT_CHECK'; checkId: string }
  | { type: 'DIRECT_MANIPULATION'; instruction: string; checkId?: string; now: string; manipulationId: string }
  | { type: 'RECORD_DOCUMENT'; documentRef: string; title: string; now: string; captureHash?: string }
  | {
      type: 'DETERMINE'
      checkId: string
      determination: Determination
      anglesUsed: string[]
      lightingUsed?: string
      toolIdsUsed: string[]
      documentRefsReviewed: string[]
      note?: string
      now: string
    }
  | { type: 'RAISE_NONCONFORMANCE'; nonconformanceId: string; checkId?: string; description: string; containment?: string; now: string }
  | { type: 'INTERRUPT'; interruption: Interruption }
  | { type: 'RESOLVE_INTERRUPTION'; interruptionId: string; path: RecoveryPath; rationale: string; now: string }
  | { type: 'RECORDING_FAILED'; reason: string }
  | { type: 'RECORDING_RETAINED'; artefact: RecordingArtefact }
  | { type: 'END'; now: string }
  | { type: 'WITHHOLD_APPROVAL'; reason: string }
  | { type: 'TAKE_APPROVAL' }

export function approvalFor(session: SessionSnapshot) {
  return assessApprovalAvailability({
    state: session.state,
    interruptions: session.interruptions,
    executedChecks: session.executedChecks,
    recording: session.recording,
  })
}

export function defensibilityFor(session: SessionSnapshot): DefensibilityReport {
  return scoreDefensibility(session)
}

const refuse = (state: LiveSessionState, reason: string): LiveSessionState => ({
  ...state,
  lastRefusal: reason,
})

export function liveSessionReducer(state: LiveSessionState, action: LiveSessionAction): LiveSessionState {
  const { session } = state
  const clear = { lastRefusal: null }

  switch (action.type) {
    case 'ATTEST': {
      const preSessionControls = evaluatePreSessionControls({
        now: action.now,
        scheduledWindow: session.scheduledWindow,
        attestations: action.attestations,
        config: state.config,
      })
      return {
        ...state,
        ...clear,
        preSessionControls,
        session: { ...session, state: 'PRE_SESSION_CHECKS', attestations: action.attestations },
      }
    }

    case 'START': {
      if (state.eligibility.decision === 'BLOCKED') {
        return refuse(state, 'The eligibility gate blocked this session. It cannot be started.')
      }
      if (!state.preSessionControls?.mayStart) {
        return refuse(state, 'Pre-session controls are not satisfied. Complete or override them first.')
      }
      return {
        ...state,
        ...clear,
        session: {
          ...session,
          state: 'ACTIVE',
          startedAt: action.now,
          recording: { ...session.recording, status: 'RECORDING', startedAt: action.now },
        },
      }
    }

    case 'SELECT_CHECK':
      return { ...state, ...clear, activeCheckId: action.checkId }

    case 'DIRECT_MANIPULATION': {
      if (session.state !== 'ACTIVE') return refuse(state, 'The session is not active.')
      return {
        ...state,
        ...clear,
        session: {
          ...session,
          directedManipulations: [
            ...session.directedManipulations,
            {
              manipulationId: action.manipulationId,
              at: action.now,
              directedByPersonId: session.inspectorPersonId,
              performedByPersonId: session.presenterPersonId,
              instruction: action.instruction,
              ...(action.checkId ? { checkId: action.checkId } : {}),
            },
          ],
        },
      }
    }

    case 'RECORD_DOCUMENT': {
      if (session.state !== 'ACTIVE') return refuse(state, 'The session is not active.')
      return {
        ...state,
        ...clear,
        session: {
          ...session,
          documentsReviewed: [
            ...session.documentsReviewed,
            {
              documentRef: action.documentRef,
              title: action.title,
              reviewedAt: action.now,
              ...(action.captureHash ? { captureHash: action.captureHash } : {}),
            },
          ],
        },
      }
    }

    case 'DETERMINE': {
      if (session.state !== 'ACTIVE') {
        return refuse(state, 'A determination can only be recorded while the session is active.')
      }
      const check = session.checks.find((c) => c.checkId === action.checkId)
      if (!check) return refuse(state, `Unknown check ${action.checkId}.`)

      const controls = evaluateCheckControls({
        check,
        anglesUsed: action.anglesUsed,
        ...(action.lightingUsed ? { lightingUsed: action.lightingUsed } : {}),
        toolIdsUsed: action.toolIdsUsed,
        documentRefsReviewed: action.documentRefsReviewed,
        toolsUsedInSession: session.toolsUsed,
      })
      if (!controls.mayRecordDetermination) {
        return refuse(state, controls.obstacles.join(' '))
      }

      const previous = session.executedChecks.find((e) => e.checkId === action.checkId)
      const executed = {
        checkId: action.checkId,
        determination: action.determination,
        determinedByPersonId: session.inspectorPersonId,
        determinedAt: action.now,
        anglesUsed: action.anglesUsed,
        ...(action.lightingUsed ? { lightingUsed: action.lightingUsed } : {}),
        toolIdsUsed: action.toolIdsUsed,
        documentRefsReviewed: action.documentRefsReviewed,
        ...(action.note ? { note: action.note } : {}),
        // Re-determining a check an interruption invalidated is what re-verification is.
        ...(previous?.invalidatedByInterruptionId
          ? { invalidatedByInterruptionId: previous.invalidatedByInterruptionId, reVerifiedAt: action.now }
          : {}),
      }

      return {
        ...state,
        ...clear,
        session: {
          ...session,
          executedChecks: [
            ...session.executedChecks.filter((e) => e.checkId !== action.checkId),
            executed,
          ],
        },
      }
    }

    case 'RAISE_NONCONFORMANCE': {
      return {
        ...state,
        ...clear,
        session: {
          ...session,
          nonconformances: [
            ...session.nonconformances,
            {
              nonconformanceId: action.nonconformanceId,
              sessionId: session.sessionId,
              articleId: session.articleId,
              ...(action.checkId ? { checkId: action.checkId } : {}),
              raisedByPersonId: session.inspectorPersonId,
              raisedAt: action.now,
              description: action.description,
              ...(action.containment ? { containment: action.containment } : {}),
            },
          ],
        },
      }
    }

    case 'INTERRUPT': {
      const result = recordInterruption({ state: session.state, interruption: action.interruption })
      const invalidated = new Set(result.invalidatedCheckIds)
      return {
        ...state,
        ...clear,
        session: {
          ...session,
          state: result.state,
          interruptions: [...session.interruptions, result.interruption],
          executedChecks: session.executedChecks.map((e) =>
            invalidated.has(e.checkId)
              ? { ...e, invalidatedByInterruptionId: action.interruption.interruptionId, reVerifiedAt: undefined }
              : e,
          ),
        },
      }
    }

    case 'RESOLVE_INTERRUPTION': {
      const target = session.interruptions.find((i) => i.interruptionId === action.interruptionId)
      if (!target) return refuse(state, `Unknown interruption ${action.interruptionId}.`)
      const result = resolveInterruption({
        interruption: target,
        path: action.path,
        rationale: action.rationale,
        selectedByPersonId: session.inspectorPersonId,
        selectedAt: action.now,
      })
      return {
        ...state,
        ...clear,
        session: {
          ...session,
          state: result.state,
          interruptions: session.interruptions.map((i) =>
            i.interruptionId === action.interruptionId ? result.interruption : i,
          ),
          ...(result.approvalRecoverable
            ? {}
            : { approvalGranted: false, approvalWithheldReason: result.note }),
        },
      }
    }

    case 'RECORDING_FAILED': {
      const result = recordRecordingFailure(session.recording, action.reason)
      return {
        ...state,
        ...clear,
        session: {
          ...session,
          state: result.state,
          recording: result.recording,
          approvalGranted: false,
          approvalWithheldReason:
            'Session recording failed; the session cannot stand as the sole conformity record.',
        },
      }
    }

    case 'RECORDING_RETAINED':
      return {
        ...state,
        ...clear,
        session: {
          ...session,
          recording: {
            ...session.recording,
            status: 'RETAINED',
            artefactRef: action.artefact.artefactRef,
            contentHash: action.artefact.contentHash,
            startedAt: action.artefact.startedAt,
            endedAt: action.artefact.endedAt,
          },
        },
      }

    case 'END': {
      if (session.state === 'ACTIVE' || session.state === 'INTERRUPTED') {
        return { ...state, ...clear, session: { ...session, state: 'COMPLETED', endedAt: action.now } }
      }
      // Terminal states keep their state; ending only stamps the time.
      return { ...state, ...clear, session: { ...session, endedAt: action.now } }
    }

    case 'WITHHOLD_APPROVAL': {
      if (!action.reason.trim()) {
        return refuse(state, 'Withholding approval requires a recorded reason.')
      }
      return {
        ...state,
        ...clear,
        session: { ...session, approvalGranted: false, approvalWithheldReason: action.reason },
      }
    }

    case 'TAKE_APPROVAL': {
      const availability = approvalFor(session)
      if (!availability.approvalAvailable) return refuse(state, availability.reason)
      const outstanding = session.checks.filter(
        (c) => !session.executedChecks.some((e) => e.checkId === c.checkId),
      )
      if (outstanding.length > 0) {
        return refuse(
          state,
          `${outstanding.length} check(s) have no determination recorded. Approval is unavailable until every check in the pack has been determined.`,
        )
      }
      const unresolved = session.executedChecks.filter((e) => e.determination !== 'CONFORMS')
      if (unresolved.length > 0) {
        return refuse(
          state,
          `${unresolved.length} check(s) were not determined as conforming. Approval cannot be granted while conformity is unverified or a check does not conform.`,
        )
      }
      return {
        ...state,
        ...clear,
        session: { ...session, approvalGranted: true, approvalWithheldReason: undefined },
      }
    }

    default:
      return state
  }
}
