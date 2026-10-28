import { describe, expect, it } from 'vitest'
import { SCENARIOS, scenarioById } from '../../src/fixtures/scenarios.ts'

/**
 * Each scenario claims something in `whatItProves`. These tests make the claim
 * enforceable, so a scenario cannot drift into misreporting on a dashboard
 * nobody is watching.
 */

describe('scenario catalogue', () => {
  it('ships at least the twelve scenarios the dashboard requires', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(12)
  })

  it('has unique ids and states what each proves', () => {
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length)
    for (const scenario of SCENARIOS) {
      expect(scenario.whatItProves.length, scenario.id).toBeGreaterThan(30)
    }
  })

  it('runs every scenario without throwing, and each is deterministic', () => {
    for (const scenario of SCENARIOS) {
      const first = JSON.stringify(scenario.run())
      expect(JSON.stringify(scenario.run()), scenario.id).toBe(first)
    }
  })
})

const run = (id: string) => scenarioById(id)!.run()

describe('clean sessions', () => {
  for (const id of ['clean-production-conformity', 'clean-maintenance-conformity']) {
    it(`${id}: clears eligibility, starts, and has approval available with a full evidence set`, () => {
      const outcome = run(id)
      expect(outcome.eligibility.decision).toBe('CLEAR')
      expect(outcome.preSessionControls?.mayStart).toBe(true)
      expect(outcome.approval.approvalAvailable).toBe(true)
      expect(outcome.defensibility.absentElementIds).toEqual([])
    })
  }
})

describe('hard blocks', () => {
  const blocked: Array<[string, string]> = [
    ['complete-product-hard-block', 'article-is-complete-type-certificated-product'],
    ['unlisted-inspector-block', 'inspector-not-on-personnel-roster'],
    ['lapsed-training-block', 'inspector-training-currency-lapsed'],
    ['unauthorised-location-block', 'location-not-on-authorised-locations-roster'],
    ['critical-article-without-concurrence-block', 'critical-article-without-recorded-authority-concurrence'],
    ['out-of-calibration-block', 'calibrated-tool-past-due'],
  ]

  for (const [id, ruleId] of blocked) {
    it(`${id}: blocks on ${ruleId} and no session ever starts`, () => {
      const outcome = run(id)
      expect(outcome.eligibility.decision).toBe('BLOCKED')
      expect(outcome.eligibility.blocks.map((b) => b.ruleId)).toContain(ruleId)
      expect(outcome.session.startedAt).toBeUndefined()
      expect(outcome.approval.approvalAvailable).toBe(false)
    })
  }
})

describe('control gates', () => {
  it('sub-720p-block: the session cannot start', () => {
    const outcome = run('sub-720p-block')
    expect(outcome.eligibility.decision).toBe('CLEAR')
    expect(outcome.preSessionControls?.mayStart).toBe(false)
    expect(outcome.preSessionControls?.blockingControlIds).toEqual(['minimum-video-resolution'])
  })

  it('sub-720p-with-recorded-justification: proceeds, and the override is on the record', () => {
    const outcome = run('sub-720p-with-recorded-justification')
    expect(outcome.preSessionControls?.mayStart).toBe(true)
    expect(outcome.preSessionControls?.overriddenControlIds).toEqual(['minimum-video-resolution'])
    const control = outcome.preSessionControls?.controls.find((c) => c.controlId === 'minimum-video-resolution')
    expect(control?.overrideReason).toBeTruthy()
  })
})

describe('interruption recovery paths', () => {
  it('resume and re-verify: approval returns once the affected check is re-verified', () => {
    const outcome = run('interruption-resume-and-reverify')
    expect(outcome.approval.approvalAvailable).toBe(true)
    expect(outcome.session.interruptions[0]?.resolution?.path).toBe('RESUME_AND_REVERIFY')
  })

  it('resumed without re-verification: approval stays unavailable', () => {
    const outcome = run('interruption-resume-without-reverification')
    expect(outcome.approval.approvalAvailable).toBe(false)
    expect(outcome.approval.outstandingCheckIds).toEqual(['pc-dimensional'])
  })

  const terminal: Array<[string, string]> = [
    ['interruption-reperform', 'TERMINATED_REPERFORM'],
    ['interruption-route-physical', 'TERMINATED_PHYSICAL_INSPECTION'],
    ['interruption-dispatch-inspector', 'TERMINATED_INSPECTOR_DISPATCH'],
  ]

  for (const [id, state] of terminal) {
    it(`${id}: ends in ${state} and can never approve the article`, () => {
      const outcome = run(id)
      expect(outcome.session.state).toBe(state)
      expect(outcome.approval.approvalAvailable).toBe(false)
      expect(outcome.session.approvalGranted).toBe(false)
      expect(outcome.session.approvalWithheldReason).toBeTruthy()
    })
  }
})

describe('recording failure', () => {
  it('cannot stand as the sole conformity record', () => {
    const outcome = run('recording-failure')
    expect(outcome.session.state).toBe('RECORDING_FAILED')
    expect(outcome.approval.approvalAvailable).toBe(false)
    expect(outcome.approval.reason).toContain('sole conformity record')
    expect(outcome.defensibility.absentElementIds).toContain('full-session-recording-retained')
  })
})

describe('the evidence that answers an approval-only characterisation', () => {
  it('nonconformance-raised: the nonconformance element is present, not a gap', () => {
    const outcome = run('nonconformance-raised')
    const element = outcome.defensibility.elements.find(
      (e) => e.elementId === 'nonconformances-raised-where-applicable',
    )
    expect(element?.status).toBe('PRESENT')
    expect(outcome.session.nonconformances).toHaveLength(1)
  })

  it('approval-withheld-unverified: approval was withheld, with the reason on the record', () => {
    const outcome = run('approval-withheld-unverified')
    expect(outcome.session.approvalGranted).toBe(false)
    expect(outcome.session.approvalWithheldReason).toContain('could not be verified')
    expect(
      outcome.defensibility.elements.find((e) => e.elementId === 'approval-withheld-where-conformity-unverified')
        ?.status,
    ).toBe('PRESENT')
  })

  it('separate-certificate-holder-warning: proceeds with the boundary stated, and the warning is carried', () => {
    const outcome = run('separate-certificate-holder-warning')
    expect(outcome.eligibility.decision).toBe('PROCEED_WITH_WARNINGS')
    expect(outcome.eligibility.warnings.map((w) => w.ruleId)).toEqual([
      'approval-only-boundary',
      'first-session-at-this-facility',
      'first-session-with-this-presenter',
      'article-configuration-changed-since-last-session',
    ])
    expect(outcome.preSessionControls?.mayStart).toBe(true)
    expect(outcome.defensibility.absentElementIds).toEqual([])
  })
})
