import { evaluateEligibility } from '../../engine/eligibility.ts'
import { PRODUCTION_CONFORMITY_PACK } from '../../content/packs.ts'
import {
  INSPECTOR_ID,
  LOCATION_ID,
  PRESENTER_ID,
  makeConfig,
  makeEligibilityInput,
  makeToolUsage,
} from '../../fixtures/factory.ts'
import type { LiveSessionState } from './reducer.ts'

/**
 * A scheduled, unstarted session for the cockpit to open on.
 *
 * Fictional, and seeded from the same fixtures the tests use so the cockpit and
 * the test suite cannot disagree about what a session looks like. A deployment
 * replaces this with a session loaded from storage; nothing else changes.
 */
export function makeDemoSessionState(options: { now: string; window?: { opensAt: string; closesAt: string } }): LiveSessionState {
  const config = makeConfig()
  const opensAt = options.window?.opensAt ?? new Date(Date.parse(options.now) - 60 * 60 * 1000).toISOString()
  const closesAt = options.window?.closesAt ?? new Date(Date.parse(options.now) + 3 * 60 * 60 * 1000).toISOString()

  return {
    config,
    eligibility: evaluateEligibility(makeEligibilityInput({ now: options.now })),
    preSessionControls: null,
    activeCheckId: PRODUCTION_CONFORMITY_PACK.checks[0]?.checkId ?? null,
    lastRefusal: null,
    session: {
      sessionId: 'SESS-DEMO-01',
      state: 'SCHEDULED',
      articleId: 'ART-0001',
      locationId: LOCATION_ID,
      inspectorPersonId: INSPECTOR_ID,
      presenterPersonId: PRESENTER_ID,
      scheduledWindow: { opensAt, closesAt },
      packId: PRODUCTION_CONFORMITY_PACK.packId,
      packVersion: PRODUCTION_CONFORMITY_PACK.version,
      checks: PRODUCTION_CONFORMITY_PACK.checks,
      executedChecks: [],
      directedManipulations: [],
      documentsReviewed: [],
      toolsUsed: [makeToolUsage()],
      interruptions: [],
      nonconformances: [],
      recording: { status: 'NOT_STARTED', storageTargetRef: config.recordingStorageTargetRef },
      approvalGranted: false,
    },
  }
}
