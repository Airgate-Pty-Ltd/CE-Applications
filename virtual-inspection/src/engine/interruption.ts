import type { ExecutedCheck, Interruption, RecordingState, SessionState } from '../schema/session.ts'

/**
 * The degradation state machine.
 *
 * Zero articles may be approved through a degraded session. That is the whole
 * of it, and it is enforced here rather than in the UI, so no surface can route
 * around it.
 *
 * A demonstrable record of *withheld* approvals is direct evidence against an
 * approval-only characterisation, which is why the withheld case is modelled as
 * carefully as the happy one.
 */

/** The three recoveries that end the session without any possibility of approval. */
const TERMINAL_STATE_BY_PATH = {
  REPERFORM_SESSION: 'TERMINATED_REPERFORM',
  ROUTE_FOR_PHYSICAL_INSPECTION: 'TERMINATED_PHYSICAL_INSPECTION',
  DISPATCH_INSPECTOR: 'TERMINATED_INSPECTOR_DISPATCH',
} as const satisfies Record<string, SessionState>

export interface ApprovalAvailability {
  /** Whether this session is capable of releasing the article at all. */
  approvalAvailable: boolean
  /** Written for the record and for the inspector, in that order of priority. */
  reason: string
  /** Checks whose determinations an unresolved interruption has invalidated. */
  outstandingCheckIds: string[]
}

export interface InterruptionAssessmentInput {
  state: SessionState
  interruptions: Interruption[]
  executedChecks: ExecutedCheck[]
  recording: RecordingState
}

/**
 * Whether approval may be granted from this session, and if not, why not.
 *
 * The order of the tests is the order of severity, because the reason string
 * ends up on the record and the most serious cause should be the one recorded.
 */
export function assessApprovalAvailability(input: InterruptionAssessmentInput): ApprovalAvailability {
  const { state, interruptions, executedChecks, recording } = input

  if (state === 'RECORDING_FAILED' || recording.status === 'FAILED') {
    return {
      approvalAvailable: false,
      reason:
        'Session recording failed. This session cannot stand as the sole conformity record for the article. It must be re-performed, or the article escalated for inspection by another route.',
      outstandingCheckIds: [],
    }
  }

  const terminal = (Object.values(TERMINAL_STATE_BY_PATH) as SessionState[]).includes(state)
  if (terminal) {
    return {
      approvalAvailable: false,
      reason: `Session was terminated as non-approving (${state}). The article was routed to another means of inspection and cannot be released from this session.`,
      outstandingCheckIds: [],
    }
  }

  if (state === 'INTERRUPTED') {
    return {
      approvalAvailable: false,
      reason:
        'The session is interrupted. Approval is unavailable until the interruption is resolved and every affected check is re-verified.',
      outstandingCheckIds: outstandingAffectedChecks(interruptions, executedChecks),
    }
  }

  const unresolved = interruptions.filter((i) => !i.resolution)
  if (unresolved.length > 0) {
    return {
      approvalAvailable: false,
      reason: `${unresolved.length} interruption(s) have no recorded recovery path. Approval is unavailable until each is resolved.`,
      outstandingCheckIds: outstandingAffectedChecks(interruptions, executedChecks),
    }
  }

  const outstanding = outstandingAffectedChecks(interruptions, executedChecks)
  if (outstanding.length > 0) {
    return {
      approvalAvailable: false,
      reason: `The session resumed after interruption, but ${outstanding.length} affected check(s) have not been re-verified. Approval is unavailable until they are.`,
      outstandingCheckIds: outstanding,
    }
  }

  if (recording.status !== 'RETAINED') {
    return {
      approvalAvailable: false,
      reason: `Session recording is in state ${recording.status}. Approval is unavailable until a recording artefact is retained and its content hash captured onto the record.`,
      outstandingCheckIds: [],
    }
  }

  return {
    approvalAvailable: true,
    reason: 'No interruption is outstanding and the session recording is retained.',
    outstandingCheckIds: [],
  }
}

/**
 * Checks that an interruption invalidated and that have not since been
 * re-verified. A determination made while the stream was degraded is not a
 * determination; it is a guess made at a bad moment.
 */
export function outstandingAffectedChecks(
  interruptions: Interruption[],
  executedChecks: ExecutedCheck[],
): string[] {
  const affected = new Set<string>()
  for (const interruption of interruptions) {
    for (const checkId of interruption.affectedCheckIds) affected.add(checkId)
  }

  return [...affected]
    .filter((checkId) => {
      const executed = executedChecks.find((c) => c.checkId === checkId)
      if (!executed) return true
      return !executed.reVerifiedAt
    })
    .sort()
}

export interface RecordInterruptionInput {
  state: SessionState
  interruption: Interruption
}

export interface RecordInterruptionResult {
  state: SessionState
  interruption: Interruption
  invalidatedCheckIds: string[]
}

/** Any degradation moves the session to INTERRUPTED and blocks approval at once. */
export function recordInterruption(input: RecordInterruptionInput): RecordInterruptionResult {
  if (input.state === 'RECORDING_FAILED') {
    // Recording failure already ended the session; an interruption on top of it
    // changes nothing and must not appear to soften the more serious state.
    return { state: 'RECORDING_FAILED', interruption: input.interruption, invalidatedCheckIds: [] }
  }
  return {
    state: 'INTERRUPTED',
    interruption: input.interruption,
    invalidatedCheckIds: [...input.interruption.affectedCheckIds].sort(),
  }
}

export interface ResolveInterruptionInput {
  interruption: Interruption
  path: keyof typeof TERMINAL_STATE_BY_PATH | 'RESUME_AND_REVERIFY'
  rationale: string
  selectedByPersonId: string
  selectedAt: string
}

export interface ResolveInterruptionResult {
  state: SessionState
  interruption: Interruption
  /** True only for the resume path, and even then approval waits on re-verification. */
  approvalRecoverable: boolean
  note: string
}

export function resolveInterruption(input: ResolveInterruptionInput): ResolveInterruptionResult {
  const { interruption, path, rationale, selectedByPersonId, selectedAt } = input

  if (!rationale.trim()) {
    throw new Error('a recovery path cannot be recorded without a rationale')
  }

  const resolved: Interruption = {
    ...interruption,
    resolution: { path, rationale, selectedByPersonId, selectedAt },
  }

  if (path === 'RESUME_AND_REVERIFY') {
    return {
      state: 'ACTIVE',
      interruption: resolved,
      approvalRecoverable: true,
      note: `Session resumed. ${interruption.affectedCheckIds.length} affected check(s) must be re-verified before approval becomes available.`,
    }
  }

  return {
    state: TERMINAL_STATE_BY_PATH[path],
    interruption: resolved,
    approvalRecoverable: false,
    note: 'Session terminated as non-approving. The article cannot be released from this session.',
  }
}

/** Recording failure is terminal. Section 1.3. */
export function recordRecordingFailure(recording: RecordingState, reason: string): {
  state: SessionState
  recording: RecordingState
} {
  return {
    state: 'RECORDING_FAILED',
    recording: { ...recording, status: 'FAILED', failureReason: reason },
  }
}
