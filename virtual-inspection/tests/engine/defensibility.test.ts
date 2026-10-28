import { describe, expect, it } from 'vitest'
import { scoreDefensibility } from '../../src/engine/defensibility.ts'
import { INSPECTOR_ID, NOW, makeRecording, makeSession } from '../../src/fixtures/factory.ts'

const statusOf = (session: Parameters<typeof scoreDefensibility>[0], elementId: string) =>
  scoreDefensibility(session).elements.find((e) => e.elementId === elementId)?.status

describe('defensibility report', () => {
  it('captures every applicable element on a clean session', () => {
    const report = scoreDefensibility(makeSession())
    expect(report.absentElementIds).toEqual([])
    expect(report.presentCount).toBe(report.applicableCount)
  })

  it('never grades the session', () => {
    const report = scoreDefensibility(makeSession())
    expect(report.statement).toMatch(/^This session captured \d+ of \d+ applicable evidence elements\./)
    for (const text of [report.statement, report.disclaimer]) {
      expect(text).not.toMatch(/\b(adequate|sufficient|good|strong|weak|poor|acceptable|pass|fail)\b/i)
    }
    expect(report.disclaimer).toContain('carries no regulatory meaning')
  })

  it('names the missing elements rather than only counting them', () => {
    const report = scoreDefensibility(makeSession({ directedManipulations: [] }))
    expect(report.statement).toContain('Not captured: directed-physical-manipulation-logged')
  })

  it('marks live directed inspection absent when the session never started', () => {
    expect(statusOf(makeSession({ startedAt: undefined }), 'live-directed-inspection-recorded')).toBe('ABSENT')
  })

  it('marks live directed inspection absent when nothing was determined', () => {
    expect(statusOf(makeSession({ executedChecks: [] }), 'live-directed-inspection-recorded')).toBe('ABSENT')
  })

  it('counts directed manipulations', () => {
    const report = scoreDefensibility(makeSession())
    const element = report.elements.find((e) => e.elementId === 'directed-physical-manipulation-logged')
    expect(element?.detail).toContain('2 directed manipulation(s)')
  })

  it('treats documents as not applicable when nothing required or reviewed one', () => {
    const session = makeSession({
      checks: makeSession().checks.filter((c) => !c.requiresDocumentOnScreen),
      documentsReviewed: [],
      executedChecks: [],
    })
    expect(statusOf(session, 'documents-reviewed-on-screen')).toBe('NOT_APPLICABLE')
  })

  it('marks documents absent when a check required one and none was reviewed', () => {
    expect(statusOf(makeSession({ documentsReviewed: [] }), 'documents-reviewed-on-screen')).toBe('ABSENT')
  })

  it('marks key characteristics absent when any executed one lacks angles or lighting', () => {
    const base = makeSession()
    const session = makeSession({
      executedChecks: base.executedChecks.map((e) =>
        e.checkId === 'pc-part-marking' ? { ...e, lightingUsed: undefined } : e,
      ),
    })
    expect(statusOf(session, 'key-characteristics-angle-and-lighting')).toBe('ABSENT')
  })

  it('marks key characteristics not applicable when the pack has none', () => {
    const checks = makeSession().checks.map((c) => ({ ...c, keyCharacteristic: false }))
    expect(statusOf(makeSession({ checks }), 'key-characteristics-angle-and-lighting')).toBe('NOT_APPLICABLE')
  })

  it('marks key characteristics absent when none of them was executed at all', () => {
    expect(statusOf(makeSession({ executedChecks: [] }), 'key-characteristics-angle-and-lighting')).toBe('ABSENT')
  })

  it('records the calibration position of each tool, not merely that a tool was used', () => {
    const element = scoreDefensibility(makeSession()).elements.find(
      (e) => e.elementId === 'tools-with-calibration-status',
    )
    expect(element?.detail).toContain('in calibration')
    expect(element?.detail).toContain('2027-03-31')
  })

  it('marks tools absent when a check required one and none was registered', () => {
    expect(statusOf(makeSession({ toolsUsed: [] }), 'tools-with-calibration-status')).toBe('ABSENT')
  })

  it('treats nonconformances as not applicable when everything conformed', () => {
    expect(statusOf(makeSession(), 'nonconformances-raised-where-applicable')).toBe('NOT_APPLICABLE')
  })

  it('marks nonconformances absent when a check did not conform and none was raised', () => {
    const base = makeSession()
    const session = makeSession({
      executedChecks: base.executedChecks.map((e) =>
        e.checkId === 'pc-workmanship' ? { ...e, determination: 'DOES_NOT_CONFORM' as const } : e,
      ),
      approvalGranted: false,
      approvalWithheldReason: 'Non-conforming check.',
    })
    expect(statusOf(session, 'nonconformances-raised-where-applicable')).toBe('ABSENT')
  })

  it('marks nonconformances present when one was raised against a non-conforming check', () => {
    const base = makeSession()
    const session = makeSession({
      executedChecks: base.executedChecks.map((e) =>
        e.checkId === 'pc-workmanship' ? { ...e, determination: 'DOES_NOT_CONFORM' as const } : e,
      ),
      nonconformances: [
        {
          nonconformanceId: 'NCR-0001',
          sessionId: 'SESS-0001',
          articleId: 'ART-0001',
          raisedByPersonId: INSPECTOR_ID,
          raisedAt: NOW,
          description: 'Surface finish outside the stated limit.',
        },
      ],
      approvalGranted: false,
      approvalWithheldReason: 'Nonconformance open.',
    })
    expect(statusOf(session, 'nonconformances-raised-where-applicable')).toBe('PRESENT')
  })

  it('marks withheld approval present when conformity was incomplete and approval was withheld', () => {
    const base = makeSession()
    const session = makeSession({
      executedChecks: base.executedChecks.map((e) =>
        e.checkId === 'pc-part-marking' ? { ...e, determination: 'NOT_VERIFIED' as const } : e,
      ),
      approvalGranted: false,
      approvalWithheldReason: 'Marking not verifiable remotely.',
    })
    expect(statusOf(session, 'approval-withheld-where-conformity-unverified')).toBe('PRESENT')
  })

  it('marks withheld approval ABSENT when conformity was incomplete and approval was granted anyway', () => {
    // The element that matters most: it catches the case the product exists to
    // stop, rather than quietly ignoring it.
    const base = makeSession()
    const session = makeSession({
      executedChecks: base.executedChecks.map((e) =>
        e.checkId === 'pc-part-marking' ? { ...e, determination: 'NOT_VERIFIED' as const } : e,
      ),
      approvalGranted: true,
    })
    expect(statusOf(session, 'approval-withheld-where-conformity-unverified')).toBe('ABSENT')
  })

  it('counts unexecuted checks as incomplete conformity', () => {
    const base = makeSession()
    const session = makeSession({ executedChecks: base.executedChecks.slice(0, 3), approvalGranted: true })
    expect(statusOf(session, 'approval-withheld-where-conformity-unverified')).toBe('ABSENT')
  })

  it('requires a content hash before calling a recording retained', () => {
    expect(statusOf(makeSession({ recording: makeRecording({ contentHash: undefined }) }), 'full-session-recording-retained')).toBe(
      'ABSENT',
    )
    expect(statusOf(makeSession({ recording: makeRecording({ status: 'FAILED' }) }), 'full-session-recording-retained')).toBe(
      'ABSENT',
    )
  })

  it('produces byte-identical output for identical input', () => {
    const session = makeSession()
    const first = JSON.stringify(scoreDefensibility(session))
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(scoreDefensibility(session))).toBe(first)
    }
  })
})
