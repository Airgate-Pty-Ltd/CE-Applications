import { evaluateEligibility, type EligibilityResult } from '../engine/eligibility.ts'
import { evaluatePreSessionControls, type PreSessionControlResult } from '../engine/controls.ts'
import { assessApprovalAvailability, resolveInterruption, type ApprovalAvailability } from '../engine/interruption.ts'
import { scoreDefensibility, type DefensibilityReport } from '../engine/defensibility.ts'
import { MAINTENANCE_CONFORMITY_PACK } from '../content/packs.ts'
import type { Interruption, SessionSnapshot } from '../schema/session.ts'
import {
  INSPECTOR_ID,
  NOW,
  PRESENTER_ID,
  WINDOW_CLOSES,
  WINDOW_OPENS,
  makeArticle,
  makeAttestations,
  makeConfig,
  makeEligibilityInput,
  makeExecutedCheck,
  makeLocationRoster,
  makePersonnelRoster,
  makeProvenance,
  makeRecording,
  makeSession,
  makeToolUsage,
  makeTools,
} from './factory.ts'

/**
 * Fictional end-to-end scenarios.
 *
 * These are the source of truth for test-dashboard panel 1 and are re-used by
 * the unit tests, so a scenario that stops behaving as advertised fails CI
 * rather than quietly misreporting on a dashboard nobody is watching.
 *
 * Each scenario states what it proves. If a scenario cannot say that in one
 * sentence it is not earning its place.
 */

export interface ScenarioOutcome {
  eligibility: EligibilityResult
  preSessionControls: PreSessionControlResult | null
  session: SessionSnapshot
  approval: ApprovalAvailability
  defensibility: DefensibilityReport
}

export interface Scenario {
  id: string
  title: string
  whatItProves: string
  run: () => ScenarioOutcome
}

function outcome(
  eligibility: EligibilityResult,
  session: SessionSnapshot,
  preSessionControls: PreSessionControlResult | null = null,
): ScenarioOutcome {
  return {
    eligibility,
    preSessionControls,
    session,
    approval: assessApprovalAvailability({
      state: session.state,
      interruptions: session.interruptions,
      executedChecks: session.executedChecks,
      recording: session.recording,
    }),
    defensibility: scoreDefensibility(session),
  }
}

function cleanControls(overrides = {}): PreSessionControlResult {
  return evaluatePreSessionControls({
    now: NOW,
    scheduledWindow: { opensAt: WINDOW_OPENS, closesAt: WINDOW_CLOSES },
    attestations: makeAttestations(overrides),
    config: makeConfig(),
  })
}

/** A session that never started, for scenarios blocked before scheduling. */
function unstartedSession(): SessionSnapshot {
  const session = makeSession()
  return {
    ...session,
    state: 'SCHEDULED',
    startedAt: undefined,
    endedAt: undefined,
    executedChecks: [],
    directedManipulations: [],
    documentsReviewed: [],
    toolsUsed: [],
    attestations: undefined,
    recording: { status: 'NOT_STARTED', storageTargetRef: 'customer-store://sessions' },
    approvalGranted: false,
    approvalWithheldReason: 'Session was blocked at the eligibility gate and never started.',
  }
}

function interruptionAt(affectedCheckIds: string[]): Interruption {
  return {
    interruptionId: 'INT-0001',
    detectedAt: '2026-07-24T15:30:00.000Z',
    category: 'STREAM_FAILURE',
    reason: 'Video stream lost for 40 seconds during the dimensional check.',
    affectedCheckIds,
  }
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'clean-production-conformity',
    title: 'Clean production conformity session',
    whatItProves:
      'A session with every control satisfied and every check executed produces a full evidence set and approval is available.',
    run: () => outcome(evaluateEligibility(makeEligibilityInput()), makeSession(), cleanControls()),
  },
  {
    id: 'clean-maintenance-conformity',
    title: 'Clean maintenance conformity session',
    whatItProves:
      'The engine is pack-agnostic: a different check pack with different key characteristics scores the same way.',
    run: () => {
      const pack = MAINTENANCE_CONFORMITY_PACK
      const session = makeSession({
        sessionId: 'SESS-0002',
        packId: pack.packId,
        packVersion: pack.version,
        checks: pack.checks,
        executedChecks: pack.checks.map((c) => ({
          ...makeExecutedCheck(c.checkId),
          anglesUsed: c.keyCharacteristic ? ['front', 'oblique'] : [],
          ...(c.keyCharacteristic ? { lightingUsed: 'Task light, oblique' } : {}),
          toolIdsUsed: c.requiresCalibratedTool ? ['TOOL-0001'] : [],
          documentRefsReviewed: c.requiresDocumentOnScreen ? ['DOC-0002'] : [],
        })),
        documentsReviewed: [
          { documentRef: 'DOC-0002', title: 'Maintenance record', reviewedAt: NOW },
        ],
      })
      return outcome(evaluateEligibility(makeEligibilityInput()), session, cleanControls())
    },
  },
  {
    id: 'complete-product-hard-block',
    title: 'Complete type-certificated product - hard block',
    whatItProves:
      'An article classified as a complete product cannot be scheduled, and the rationale recorded asserts nothing about what any regulation permits.',
    run: () =>
      outcome(
        evaluateEligibility(
          makeEligibilityInput({ article: makeArticle({ classification: 'COMPLETE_AIRCRAFT_ENGINE' }) }),
        ),
        unstartedSession(),
      ),
  },
  {
    id: 'unlisted-inspector-block',
    title: 'Inspector absent from the personnel roster - hard block',
    whatItProves: 'Conformity authority is traceable to a roster revision, or the session does not happen.',
    run: () =>
      outcome(
        evaluateEligibility(makeEligibilityInput({ inspectorPersonId: 'PER-9999' })),
        unstartedSession(),
      ),
  },
  {
    id: 'lapsed-training-block',
    title: 'Inspector training currency lapsed - hard block',
    whatItProves: 'Roster membership without current training is not an authorisation.',
    run: () => {
      const roster = makePersonnelRoster()
      const entries = roster.entries.map((e) =>
        e.personId === INSPECTOR_ID ? { ...e, trainingCurrentUntil: '2026-06-30' } : e,
      )
      return outcome(
        evaluateEligibility(makeEligibilityInput({ personnelRoster: { ...roster, entries } })),
        unstartedSession(),
      )
    },
  },
  {
    id: 'unauthorised-location-block',
    title: 'Facility authorisation withdrawn - hard block',
    whatItProves: 'A location whose authorisation has been withdrawn cannot host a session.',
    run: () =>
      outcome(
        evaluateEligibility(makeEligibilityInput({ locationId: 'SITE-B', locationRoster: makeLocationRoster() })),
        unstartedSession(),
      ),
  },
  {
    id: 'critical-article-without-concurrence-block',
    title: 'Critical article with no recorded authority concurrence - hard block',
    whatItProves:
      'The app records whether a concurrence is on file and stops when it is not. It never reads or evaluates the concurrence itself.',
    run: () =>
      outcome(
        evaluateEligibility(makeEligibilityInput({ article: makeArticle({ criticality: 'CRITICAL' }) })),
        unstartedSession(),
      ),
  },
  {
    id: 'out-of-calibration-block',
    title: 'Tool past its calibration due date - hard block',
    whatItProves: 'A measurement taken with an out-of-calibration tool is not evidence, so it is never taken.',
    run: () =>
      outcome(
        evaluateEligibility(
          makeEligibilityInput({ tools: makeTools([{ calibrationDueDate: '2026-05-31' }]) }),
        ),
        unstartedSession(),
      ),
  },
  {
    id: 'sub-720p-block',
    title: 'Measured video below the configured minimum - control gate',
    whatItProves:
      'Resolution is measured from the stream and blocks the session start unless a justification is recorded.',
    run: () =>
      outcome(
        evaluateEligibility(makeEligibilityInput()),
        unstartedSession(),
        cleanControls({ measuredVideoHeightPx: 480 }),
      ),
  },
  {
    id: 'sub-720p-with-recorded-justification',
    title: 'Below minimum resolution with a recorded justification - override',
    whatItProves:
      'An override is possible, is never silent, and lands on the record where a reviewer will see both the override and its stated reason.',
    run: () =>
      outcome(
        evaluateEligibility(makeEligibilityInput()),
        makeSession(),
        cleanControls({
          measuredVideoHeightPx: 480,
          resolutionJustification:
            'Article feature is 200mm across and fills the frame; magnification compensates for stream height. Inspector accepted the limitation for this check pack only.',
        }),
      ),
  },
  {
    id: 'interruption-resume-and-reverify',
    title: 'Interruption, recovery (a) - resume and re-verify',
    whatItProves:
      'Approval is blocked from the moment of interruption and returns only once every affected check has actually been re-verified.',
    run: () => {
      const resolution = resolveInterruption({
        interruption: interruptionAt(['pc-dimensional']),
        path: 'RESUME_AND_REVERIFY',
        rationale: 'Stream restored within two minutes; the dimensional check was re-performed in full.',
        selectedByPersonId: INSPECTOR_ID,
        selectedAt: '2026-07-24T15:33:00.000Z',
      })
      const session = makeSession({
        state: 'COMPLETED',
        interruptions: [resolution.interruption],
        executedChecks: makeSession().executedChecks.map((e) =>
          e.checkId === 'pc-dimensional'
            ? { ...e, invalidatedByInterruptionId: 'INT-0001', reVerifiedAt: '2026-07-24T15:40:00.000Z' }
            : e,
        ),
      })
      return outcome(evaluateEligibility(makeEligibilityInput()), session, cleanControls())
    },
  },
  {
    id: 'interruption-resume-without-reverification',
    title: 'Interruption, resumed but not re-verified',
    whatItProves:
      'Resuming is not enough. An affected check left un-re-verified keeps approval unavailable, which is the failure mode the control exists for.',
    run: () => {
      const resolution = resolveInterruption({
        interruption: interruptionAt(['pc-dimensional']),
        path: 'RESUME_AND_REVERIFY',
        rationale: 'Stream restored; inspector elected to resume.',
        selectedByPersonId: INSPECTOR_ID,
        selectedAt: '2026-07-24T15:33:00.000Z',
      })
      const session = makeSession({
        state: 'COMPLETED',
        interruptions: [resolution.interruption],
        approvalGranted: false,
        approvalWithheldReason: 'Affected check was not re-verified after the interruption.',
      })
      return outcome(evaluateEligibility(makeEligibilityInput()), session, cleanControls())
    },
  },
  {
    id: 'interruption-reperform',
    title: 'Interruption, recovery (b) - re-perform the session in full',
    whatItProves: 'A terminated session is permanently non-approving; no later action can release the article from it.',
    run: () => {
      const resolution = resolveInterruption({
        interruption: interruptionAt(['pc-dimensional', 'pc-workmanship']),
        path: 'REPERFORM_SESSION',
        rationale: 'Connection quality was not recoverable within the scheduled window.',
        selectedByPersonId: INSPECTOR_ID,
        selectedAt: '2026-07-24T15:45:00.000Z',
      })
      const session = makeSession({
        state: resolution.state,
        interruptions: [resolution.interruption],
        approvalGranted: false,
        approvalWithheldReason: 'Session terminated for re-performance after an unrecoverable interruption.',
      })
      return outcome(evaluateEligibility(makeEligibilityInput()), session, cleanControls())
    },
  },
  {
    id: 'interruption-route-physical',
    title: 'Interruption, recovery (c) - route for physical inspection',
    whatItProves: 'The article leaves the remote route entirely, and the record says so.',
    run: () => {
      const resolution = resolveInterruption({
        interruption: interruptionAt(['pc-dimensional']),
        path: 'ROUTE_FOR_PHYSICAL_INSPECTION',
        rationale: 'Article routed to the inspecting organisation for physical inspection.',
        selectedByPersonId: INSPECTOR_ID,
        selectedAt: '2026-07-24T15:45:00.000Z',
      })
      const session = makeSession({
        state: resolution.state,
        interruptions: [resolution.interruption],
        approvalGranted: false,
        approvalWithheldReason: 'Article routed for physical inspection after an unrecoverable interruption.',
      })
      return outcome(evaluateEligibility(makeEligibilityInput()), session, cleanControls())
    },
  },
  {
    id: 'interruption-dispatch-inspector',
    title: 'Interruption, recovery (d) - dispatch a qualified inspector',
    whatItProves: 'The fourth recovery path terminates the session the same way the other two terminal paths do.',
    run: () => {
      const resolution = resolveInterruption({
        interruption: interruptionAt(['pc-dimensional']),
        path: 'DISPATCH_INSPECTOR',
        rationale: 'Qualified inspector dispatched to inspect the article in person.',
        selectedByPersonId: INSPECTOR_ID,
        selectedAt: '2026-07-24T15:45:00.000Z',
      })
      const session = makeSession({
        state: resolution.state,
        interruptions: [resolution.interruption],
        approvalGranted: false,
        approvalWithheldReason: 'Qualified inspector dispatched after an unrecoverable interruption.',
      })
      return outcome(evaluateEligibility(makeEligibilityInput()), session, cleanControls())
    },
  },
  {
    id: 'recording-failure',
    title: 'Recording failure',
    whatItProves:
      'A session whose recording failed cannot stand as the sole conformity record, whatever else it captured.',
    run: () => {
      const session = makeSession({
        state: 'RECORDING_FAILED',
        recording: makeRecording({
          status: 'FAILED',
          contentHash: undefined,
          artefactRef: undefined,
          failureReason: 'Storage target rejected the artefact write at session end.',
        }),
        approvalGranted: false,
        approvalWithheldReason: 'Session recording failed; the session cannot stand as the sole conformity record.',
      })
      return outcome(evaluateEligibility(makeEligibilityInput()), session, cleanControls())
    },
  },
  {
    id: 'nonconformance-raised',
    title: 'Nonconformance raised in session',
    whatItProves:
      'A non-conforming determination with a nonconformance raised against it is a complete evidence element, not a gap.',
    run: () => {
      const base = makeSession()
      const session = makeSession({
        executedChecks: base.executedChecks.map((e) =>
          e.checkId === 'pc-workmanship'
            ? { ...e, determination: 'DOES_NOT_CONFORM', note: 'Surface finish outside the stated limit at the flange.' }
            : e,
        ),
        nonconformances: [
          {
            nonconformanceId: 'NCR-0001',
            sessionId: 'SESS-0001',
            articleId: 'ART-0001',
            checkId: 'pc-workmanship',
            raisedByPersonId: INSPECTOR_ID,
            raisedAt: '2026-07-24T15:50:00.000Z',
            description: 'Surface finish at the flange is outside the limit stated in the configuration document.',
            containment: 'Article held at the facility pending disposition.',
          },
        ],
        approvalGranted: false,
        approvalWithheldReason: 'Nonconformance NCR-0001 open against this article.',
      })
      return outcome(evaluateEligibility(makeEligibilityInput()), session, cleanControls())
    },
  },
  {
    id: 'approval-withheld-unverified',
    title: 'Approval withheld where conformity could not be verified',
    whatItProves:
      'The single cleanest rebuttal to an approval-only characterisation: an approval the organisation declined to give, with the reason on the record.',
    run: () => {
      const base = makeSession()
      const session = makeSession({
        executedChecks: base.executedChecks.map((e) =>
          e.checkId === 'pc-part-marking'
            ? {
                ...e,
                determination: 'NOT_VERIFIED',
                note: 'Marking could not be resolved at any available angle or lighting.',
              }
            : e,
        ),
        approvalGranted: false,
        approvalWithheldReason:
          'Part marking could not be verified remotely. Approval withheld and the article routed for physical verification of the marking.',
      })
      return outcome(evaluateEligibility(makeEligibilityInput()), session, cleanControls())
    },
  },
  {
    id: 'separate-certificate-holder-warning',
    title: 'Separate certificate holder, involvement limited to release - warning path',
    whatItProves:
      'The approval-only exposure is stated plainly before the session, the session proceeds, and the warning is carried onto the record.',
    run: () =>
      outcome(
        evaluateEligibility(
          makeEligibilityInput({
            provenance: makeProvenance({
              performedBySeparateCertificateHolder: true,
              inspectingOrganisationInvolvement: 'RELEASE_ONLY',
            }),
            history: {
              priorCompletedSessionsAtLocation: 0,
              priorCompletedSessionsWithPresenter: 0,
              articleConfigurationVersionAtLastSession: 'CFG-PRIOR',
            },
          }),
        ),
        makeSession({ presenterPersonId: PRESENTER_ID, toolsUsed: [makeToolUsage()] }),
        cleanControls(),
      ),
  },
]

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
