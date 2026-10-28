import { describe, expect, it } from 'vitest'
import { evaluateCheckControls, evaluatePreSessionControls } from '../../src/engine/controls.ts'
import { PRODUCTION_CONFORMITY_PACK } from '../../src/content/packs.ts'
import {
  NOW,
  WINDOW_CLOSES,
  WINDOW_OPENS,
  makeAttestations,
  makeConfig,
  makeToolUsage,
} from '../../src/fixtures/factory.ts'

const window = { opensAt: WINDOW_OPENS, closesAt: WINDOW_CLOSES }
const pre = (attestationOverrides = {}, now = NOW) =>
  evaluatePreSessionControls({
    now,
    scheduledWindow: window,
    attestations: makeAttestations(attestationOverrides),
    config: makeConfig(),
  })

const statusOf = (result: ReturnType<typeof pre>, controlId: string) =>
  result.controls.find((c) => c.controlId === controlId)?.status

describe('pre-session controls', () => {
  it('lets a fully satisfied session start', () => {
    const result = pre()
    expect(result.mayStart).toBe(true)
    expect(result.blockingControlIds).toEqual([])
    expect(result.overriddenControlIds).toEqual([])
  })

  it('reports live-only and sole-authority as structural, with nothing to evaluate', () => {
    const result = pre()
    for (const controlId of ['live-only', 'inspector-sole-conformity-authority']) {
      const control = result.controls.find((c) => c.controlId === controlId)
      expect(control?.enforcement).toBe('STRUCTURAL')
      expect(control?.status).toBe('SATISFIED')
    }
  })

  it('blocks a start outside the scheduled window', () => {
    const result = pre({}, '2026-07-24T19:00:00.000Z')
    expect(statusOf(result, 'scheduled-timeframe')).toBe('NOT_SATISFIED')
    expect(result.mayStart).toBe(false)
  })

  it('allows a start outside the window with a recorded reason, and records the override', () => {
    const result = pre({ scheduleOverrideReason: 'Presenter shift moved; inspector available.' }, '2026-07-24T19:00:00.000Z')
    expect(statusOf(result, 'scheduled-timeframe')).toBe('OVERRIDDEN')
    expect(result.mayStart).toBe(true)
    expect(result.overriddenControlIds).toEqual(['scheduled-timeframe'])
    expect(result.controls.find((c) => c.controlId === 'scheduled-timeframe')?.overrideReason).toContain(
      'Presenter shift',
    )
  })

  it('treats whitespace as no reason at all', () => {
    const result = pre({ scheduleOverrideReason: '   ' }, '2026-07-24T19:00:00.000Z')
    expect(statusOf(result, 'scheduled-timeframe')).toBe('NOT_SATISFIED')
  })

  it('accepts a start exactly on the window boundaries', () => {
    expect(pre({}, WINDOW_OPENS).mayStart).toBe(true)
    expect(pre({}, WINDOW_CLOSES).mayStart).toBe(true)
  })

  it('blocks measured video below the configured minimum', () => {
    const result = pre({ measuredVideoHeightPx: 480 })
    expect(statusOf(result, 'minimum-video-resolution')).toBe('NOT_SATISFIED')
    expect(result.mayStart).toBe(false)
  })

  it('accepts measured video exactly at the minimum', () => {
    expect(pre({ measuredVideoHeightPx: 720 }).mayStart).toBe(true)
  })

  it('allows sub-minimum video with a documented justification', () => {
    const result = pre({ measuredVideoHeightPx: 480, resolutionJustification: 'Feature fills the frame.' })
    expect(statusOf(result, 'minimum-video-resolution')).toBe('OVERRIDDEN')
    expect(result.mayStart).toBe(true)
  })

  it('does not record an override when the control was satisfied anyway', () => {
    const result = pre({ measuredVideoHeightPx: 1080, resolutionJustification: 'Unnecessary.' })
    expect(statusOf(result, 'minimum-video-resolution')).toBe('SATISFIED')
    expect(result.controls.find((c) => c.controlId === 'minimum-video-resolution')?.overrideReason).toBeUndefined()
  })

  it('blocks on an unconfirmed audio or environment attestation, with no override path', () => {
    const noAudio = pre({ audioHeadsetConfirmed: false })
    expect(noAudio.mayStart).toBe(false)
    expect(noAudio.blockingControlIds).toEqual(['audio-headset'])

    const noEnvironment = pre({ environmentControlledConfirmed: false })
    expect(noEnvironment.mayStart).toBe(false)
    expect(noEnvironment.blockingControlIds).toEqual(['controlled-environment'])
  })

  it('reports every blocking control, not only the first', () => {
    const result = pre({ audioHeadsetConfirmed: false, environmentControlledConfirmed: false, measuredVideoHeightPx: 240 })
    expect(result.blockingControlIds.sort()).toEqual([
      'audio-headset',
      'controlled-environment',
      'minimum-video-resolution',
    ])
  })
})

describe('per-check controls', () => {
  const check = (checkId: string) => PRODUCTION_CONFORMITY_PACK.checks.find((c) => c.checkId === checkId)!

  it('allows a determination when everything the check requires is present', () => {
    const result = evaluateCheckControls({
      check: check('pc-dimensional'),
      anglesUsed: ['front'],
      lightingUsed: 'Task light',
      toolIdsUsed: ['TOOL-0001'],
      documentRefsReviewed: [],
      toolsUsedInSession: [makeToolUsage()],
    })
    expect(result.mayRecordDetermination).toBe(true)
    expect(result.obstacles).toEqual([])
  })

  it('requires angles and lighting on a key characteristic', () => {
    const result = evaluateCheckControls({
      check: check('pc-part-marking'),
      anglesUsed: [],
      toolIdsUsed: [],
      documentRefsReviewed: [],
      toolsUsedInSession: [],
    })
    expect(result.mayRecordDetermination).toBe(false)
    expect(result.obstacles).toHaveLength(2)
    expect(result.obstacles.join(' ')).toContain('angles')
    expect(result.obstacles.join(' ')).toContain('lighting')
  })

  it('does not ask a non-key-characteristic check for angles', () => {
    const result = evaluateCheckControls({
      check: check('pc-workmanship'),
      anglesUsed: [],
      toolIdsUsed: [],
      documentRefsReviewed: [],
      toolsUsedInSession: [],
    })
    expect(result.mayRecordDetermination).toBe(true)
  })

  it('requires a tool where the check calls for one', () => {
    const result = evaluateCheckControls({
      check: check('pc-dimensional'),
      anglesUsed: ['front'],
      lightingUsed: 'Task light',
      toolIdsUsed: [],
      documentRefsReviewed: [],
      toolsUsedInSession: [],
    })
    expect(result.obstacles.join(' ')).toContain('calibrated tool')
  })

  it('blocks the check when the tool used was past due at session start', () => {
    const result = evaluateCheckControls({
      check: check('pc-dimensional'),
      anglesUsed: ['front'],
      lightingUsed: 'Task light',
      toolIdsUsed: ['TOOL-0001'],
      documentRefsReviewed: [],
      toolsUsedInSession: [makeToolUsage({ inCalibrationAtSessionStart: false, calibrationDueDate: '2026-01-01' })],
    })
    expect(result.mayRecordDetermination).toBe(false)
    expect(result.obstacles.join(' ')).toContain('not evidence')
  })

  it('blocks a tool that was never registered for the session', () => {
    const result = evaluateCheckControls({
      check: check('pc-dimensional'),
      anglesUsed: ['front'],
      lightingUsed: 'Task light',
      toolIdsUsed: ['TOOL-9999'],
      documentRefsReviewed: [],
      toolsUsedInSession: [makeToolUsage()],
    })
    expect(result.obstacles.join(' ')).toContain('not among the tools registered')
  })

  it('requires a document where the check calls for one', () => {
    const result = evaluateCheckControls({
      check: check('pc-configuration-document'),
      anglesUsed: [],
      toolIdsUsed: [],
      documentRefsReviewed: [],
      toolsUsedInSession: [],
    })
    expect(result.obstacles.join(' ')).toContain('document reviewed on screen')
  })

  it('never suggests what the determination should be', () => {
    const result = evaluateCheckControls({
      check: check('pc-dimensional'),
      anglesUsed: [],
      toolIdsUsed: [],
      documentRefsReviewed: [],
      toolsUsedInSession: [],
    })
    for (const obstacle of result.obstacles) {
      expect(obstacle).not.toMatch(/\b(conforms|does not conform|pass|fail)\b/i)
    }
  })
})
