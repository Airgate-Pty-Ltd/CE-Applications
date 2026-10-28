import { evaluateEligibility } from '../engine/eligibility.ts'
import { evaluatePreSessionControls } from '../engine/controls.ts'
import { scoreDefensibility } from '../engine/defensibility.ts'
import { retentionPosition } from '../engine/retention.ts'
import { assessApprovalAvailability } from '../engine/interruption.ts'
import { DEFAULT_SIGNATURE_STATEMENT, sealRecord, type SessionConformityRecord, type UnsealedRecord } from '../engine/record.ts'
import type { SessionSnapshot } from '../schema/session.ts'
import type { ScenarioOutcome } from './scenarios.ts'
import {
  INSPECTOR_ID,
  NOW,
  WINDOW_CLOSES,
  WINDOW_OPENS,
  makeAttestations,
  makeConfig,
  makeEligibilityInput,
  makeSession,
} from './factory.ts'

/**
 * Assemble a session conformity record from a session.
 *
 * The same assembly the live app performs, so a fixture record and a real one
 * differ only in their inputs. Anything that would be wrong in production is
 * wrong here too, which is the point of not having a separate fixture shape.
 */
export function buildUnsealedRecord(
  session: SessionSnapshot,
  overrides: Partial<UnsealedRecord> = {},
): UnsealedRecord {
  const config = makeConfig()
  const eligibility = evaluateEligibility(makeEligibilityInput())
  const preSessionControls = evaluatePreSessionControls({
    now: session.startedAt ?? NOW,
    scheduledWindow: { opensAt: WINDOW_OPENS, closesAt: WINDOW_CLOSES },
    attestations: session.attestations ?? makeAttestations(),
    config,
  })
  const approvalAvailability = assessApprovalAvailability({
    state: session.state,
    interruptions: session.interruptions,
    executedChecks: session.executedChecks,
    recording: session.recording,
  })

  return {
    schemaVersion: '1.0',
    recordId: 'REC-0001',
    sessionId: session.sessionId,
    revision: 1,
    supersedes: null,
    supersededReason: null,
    organisationDisplayName: config.organisationDisplayName,
    rosterStamp: { personnelRevision: 3, locationsRevision: 2 },
    session,
    eligibility,
    preSessionControls,
    defensibility: scoreDefensibility(session),
    approval: {
      granted: session.approvalGranted,
      withheldReason: session.approvalGranted
        ? null
        : (session.approvalWithheldReason ?? approvalAvailability.reason),
    },
    retention: retentionPosition(session.endedAt ?? NOW, config.retentionYears),
    signature: {
      personId: INSPECTOR_ID,
      signedAt: session.endedAt ?? NOW,
      statement: DEFAULT_SIGNATURE_STATEMENT,
    },
    ...overrides,
  }
}

export function makeSealedRecord(
  session: SessionSnapshot = makeSession(),
  overrides: Partial<UnsealedRecord> = {},
): SessionConformityRecord {
  return sealRecord(buildUnsealedRecord(session, overrides))
}

/** Seal the record a scenario would produce. Used by the dashboard's export preview. */
export function recordFromScenarioOutcome(
  outcome: ScenarioOutcome,
  recordId: string,
): SessionConformityRecord {
  return sealRecord(
    buildUnsealedRecord(outcome.session, {
      recordId,
      eligibility: outcome.eligibility,
      ...(outcome.preSessionControls ? { preSessionControls: outcome.preSessionControls } : {}),
      defensibility: outcome.defensibility,
      approval: {
        granted: outcome.session.approvalGranted,
        withheldReason: outcome.session.approvalGranted
          ? null
          : (outcome.session.approvalWithheldReason ?? outcome.approval.reason),
      },
    }),
  )
}
