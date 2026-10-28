import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { evaluateCheckControls } from '../../engine/controls.ts'
import { can } from '../../engine/roles.ts'
import type { Determination } from '../../schema/primitives.ts'
import type { RecoveryPath } from '../../schema/session.ts'
import { StubVideoProvider } from '../../video/stubProvider.ts'
import { useSessionChannel } from '../session/useSessionChannel.ts'
import { makeDemoSessionState } from '../session/demoSession.ts'
import { approvalFor, defensibilityFor, liveSessionReducer } from '../session/reducer.ts'
import { ThemeToggle } from '../theme/ThemeToggle.tsx'
import { makeAttestations } from '../../fixtures/factory.ts'

/**
 * The inspector cockpit.
 *
 * Dense and multi-pane, because the inspector is at a desk and needs the video,
 * the checklist, the evidence log and the approval position visible at once.
 * Every control here is gated by a capability, and every refusal is shown in the
 * inspector's own words rather than silently disabling a button - an inspector
 * who cannot see why a determination is unavailable will work around the tool.
 */

const now = (): string => new Date().toISOString()

const DETERMINATIONS: Array<{ value: Determination; label: string; className: string }> = [
  { value: 'CONFORMS', label: 'Conforms', className: 'border-signal-ok/60 bg-signal-ok/20 hover:bg-signal-ok/30' },
  { value: 'DOES_NOT_CONFORM', label: 'Does not conform', className: 'btn-block' },
  { value: 'NOT_VERIFIED', label: 'Not verified', className: 'border-signal-warn/60 bg-signal-warn/20 hover:bg-signal-warn/30' },
]

const RECOVERY_PATHS: Array<{ value: RecoveryPath; label: string }> = [
  { value: 'RESUME_AND_REVERIFY', label: 'Resume and re-verify the affected checks' },
  { value: 'REPERFORM_SESSION', label: 'Re-perform the session in full' },
  { value: 'ROUTE_FOR_PHYSICAL_INSPECTION', label: 'Route the article for physical inspection' },
  { value: 'DISPATCH_INSPECTOR', label: 'Dispatch a qualified inspector' },
]

export function InspectorCockpit(): JSX.Element {
  const [state, dispatch] = useReducer(liveSessionReducer, undefined, () =>
    makeDemoSessionState({ now: now() }),
  )
  const { session, config } = state

  const provider = useMemo(() => new StubVideoProvider({ now: now() }), [])
  const [presenterFlag, setPresenterFlag] = useState<string | null>(null)
  const [instruction, setInstruction] = useState('')
  const [angles, setAngles] = useState('')
  const [lighting, setLighting] = useState('')
  const [note, setNote] = useState('')
  const [withholdReason, setWithholdReason] = useState('')
  const [recoveryRationale, setRecoveryRationale] = useState('')
  const counters = useRef({ manipulation: 0, document: 0, nonconformance: 0, interruption: 0 })

  const approval = approvalFor(session)
  const defensibility = defensibilityFor(session)
  const activeCheck = session.checks.find((c) => c.checkId === state.activeCheckId) ?? null
  const executedById = new Map(session.executedChecks.map((e) => [e.checkId, e]))
  const openInterruption = session.interruptions.find((i) => !i.resolution) ?? null

  const post = useSessionChannel((message) => {
    if (message.kind === 'presenter-flag') setPresenterFlag(message.at)
  })

  // Keep the presenter's single instruction in step with the cockpit.
  useEffect(() => {
    const index = activeCheck ? session.checks.findIndex((c) => c.checkId === activeCheck.checkId) : -1
    post({
      kind: 'presenter-brief',
      sessionState: session.state,
      instruction: session.state === 'ACTIVE' ? (activeCheck?.instruction ?? null) : null,
      checkTitle: activeCheck?.title ?? null,
      checkNumber: index >= 0 ? index + 1 : null,
      checkCount: session.checks.length,
      awaitingAction: session.state === 'ACTIVE' && !executedById.has(activeCheck?.checkId ?? ''),
    })
  }, [post, activeCheck, session.state, session.checks, executedById])

  const checkControls = activeCheck
    ? evaluateCheckControls({
        check: activeCheck,
        anglesUsed: angles.split(',').map((a) => a.trim()).filter(Boolean),
        ...(lighting.trim() ? { lightingUsed: lighting.trim() } : {}),
        toolIdsUsed: activeCheck.requiresCalibratedTool ? session.toolsUsed.map((t) => t.toolId) : [],
        documentRefsReviewed: activeCheck.requiresDocumentOnScreen
          ? session.documentsReviewed.map((d) => d.documentRef)
          : [],
        toolsUsedInSession: session.toolsUsed,
      })
    : null

  const determine = (determination: Determination): void => {
    if (!activeCheck) return
    dispatch({
      type: 'DETERMINE',
      checkId: activeCheck.checkId,
      determination,
      anglesUsed: angles.split(',').map((a) => a.trim()).filter(Boolean),
      ...(lighting.trim() ? { lightingUsed: lighting.trim() } : {}),
      toolIdsUsed: activeCheck.requiresCalibratedTool ? session.toolsUsed.map((t) => t.toolId) : [],
      documentRefsReviewed: activeCheck.requiresDocumentOnScreen
        ? session.documentsReviewed.map((d) => d.documentRef)
        : [],
      ...(note.trim() ? { note: note.trim() } : {}),
      now: now(),
    })
    setAngles('')
    setLighting('')
    setNote('')
  }

  const endSession = async (): Promise<void> => {
    dispatch({ type: 'END', now: now() })
    try {
      const artefact = await provider.stopRecording()
      dispatch({ type: 'RECORDING_RETAINED', artefact })
    } catch (error) {
      dispatch({ type: 'RECORDING_FAILED', reason: error instanceof Error ? error.message : 'unknown' })
    }
  }

  const startSession = async (): Promise<void> => {
    await provider.join({ sessionId: session.sessionId, personId: session.inspectorPersonId, role: 'INSPECTOR' })
    const measurement = await provider.measureStream()
    dispatch({
      type: 'ATTEST',
      now: now(),
      attestations: makeAttestations({
        attestedByPersonId: session.inspectorPersonId,
        attestedAt: now(),
        measuredVideoHeightPx: measurement.heightPx,
      }),
    })
    await provider.startRecording(config.recordingStorageTargetRef)
    dispatch({ type: 'START', now: now() })
  }

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] gap-2 p-2">
      {/* --- status bar --------------------------------------------------- */}
      <header className="panel flex flex-wrap items-center gap-3 px-3 py-2 text-xs">
        <span className="font-mono text-content-muted">{session.sessionId}</span>
        <StateTag state={session.state} />
        <span className="text-content-faint">
          article <span className="font-mono text-content-secondary">{session.articleId}</span>
        </span>
        <span className="text-content-faint">
          pack <span className="font-mono text-content-secondary">{session.packId}@{session.packVersion}</span>
        </span>
        <span className="text-content-faint">
          recording <span className="font-mono text-content-secondary">{session.recording.status}</span>
        </span>
        <span className="ml-auto text-content-muted">{defensibility.statement}</span>
        <ThemeToggle />
      </header>

      <div className="grid min-h-0 grid-cols-1 gap-2 lg:grid-cols-[1.3fr_1fr_1fr]">
        {/* --- video + direction ----------------------------------------- */}
        <section className="panel flex min-h-0 flex-col">
          <div className="panel-head flex items-center justify-between">
            <span>Live stream — {provider.providerId} provider</span>
            {presenterFlag ? <span className="tag bg-signal-block/30 text-signal-block">presenter flagged a problem</span> : null}
          </div>
          {/* The well stays dark in both themes: a bright surround changes how
              an inspector reads what is on the stream, and the stream is the
              thing being judged. */}
          <div className="flex flex-1 items-center justify-center bg-surface-video text-xs text-slate-500">
            The selected video provider attaches the live stream here. No file can be attached to a session.
          </div>
          <div className="border-t border-edge p-3">
            <label className="mb-1 block text-xs text-content-muted" htmlFor="instruction">
              Direct a physical manipulation
            </label>
            <div className="flex gap-2">
              <input
                id="instruction"
                className="field"
                value={instruction}
                placeholder="Rotate the article 90 degrees clockwise and hold."
                onChange={(e) => setInstruction(e.target.value)}
                disabled={session.state !== 'ACTIVE'}
              />
              <button
                type="button"
                className="btn btn-primary whitespace-nowrap"
                disabled={session.state !== 'ACTIVE' || !instruction.trim() || !can('INSPECTOR', 'DIRECT_MANIPULATION')}
                onClick={() => {
                  counters.current.manipulation += 1
                  dispatch({
                    type: 'DIRECT_MANIPULATION',
                    instruction: instruction.trim(),
                    ...(activeCheck ? { checkId: activeCheck.checkId } : {}),
                    manipulationId: `MAN-${String(counters.current.manipulation).padStart(4, '0')}`,
                    now: now(),
                  })
                  setInstruction('')
                }}
              >
                Direct and log
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn"
                disabled={session.state !== 'ACTIVE'}
                onClick={() => {
                  counters.current.document += 1
                  const ref = `DOC-${String(counters.current.document).padStart(4, '0')}`
                  dispatch({ type: 'RECORD_DOCUMENT', documentRef: ref, title: 'Document shown on screen', now: now() })
                }}
              >
                Capture document on screen
              </button>
              <button
                type="button"
                className="btn btn-block"
                disabled={session.state !== 'ACTIVE'}
                onClick={() => {
                  counters.current.interruption += 1
                  dispatch({
                    type: 'INTERRUPT',
                    interruption: {
                      interruptionId: `INT-${String(counters.current.interruption).padStart(4, '0')}`,
                      detectedAt: now(),
                      category: 'STREAM_FAILURE',
                      reason: 'Stream degraded during the session.',
                      affectedCheckIds: activeCheck ? [activeCheck.checkId] : [],
                    },
                  })
                }}
              >
                Record an interruption
              </button>
            </div>
          </div>
        </section>

        {/* --- checklist -------------------------------------------------- */}
        <section className="panel flex min-h-0 flex-col">
          <div className="panel-head">Checklist</div>
          <ol className="min-h-0 flex-1 overflow-auto">
            {session.checks.map((check, index) => {
              const executed = executedById.get(check.checkId)
              const selected = check.checkId === state.activeCheckId
              return (
                <li key={check.checkId}>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'SELECT_CHECK', checkId: check.checkId })}
                    className={`flex w-full items-start gap-2 border-b border-edge/60 px-3 py-2 text-left text-sm ${
                      selected ? 'bg-surface-inset' : 'hover:bg-surface-inset/50'
                    }`}
                  >
                    <span className="mt-0.5 font-mono text-xs text-content-faint">{index + 1}</span>
                    <span className="flex-1">
                      <span className="block">{check.title}</span>
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {check.keyCharacteristic ? <span className="tag bg-surface-accent text-content-secondary">key characteristic</span> : null}
                        {check.requiresCalibratedTool ? <span className="tag bg-surface-accent text-content-secondary">tool</span> : null}
                        {check.requiresDocumentOnScreen ? <span className="tag bg-surface-accent text-content-secondary">document</span> : null}
                        {executed?.invalidatedByInterruptionId && !executed.reVerifiedAt ? (
                          <span className="tag bg-signal-block/30 text-signal-block">re-verify</span>
                        ) : null}
                      </span>
                    </span>
                    <DeterminationTag determination={executed?.determination} />
                  </button>
                </li>
              )
            })}
          </ol>

          {activeCheck ? (
            <div className="border-t border-edge p-3 text-sm">
              <p className="mb-2 text-xs text-content-muted">{activeCheck.instruction}</p>
              {activeCheck.keyCharacteristic ? (
                <div className="mb-2 grid gap-2">
                  <input
                    className="field"
                    placeholder="Angles used, comma separated"
                    value={angles}
                    onChange={(e) => setAngles(e.target.value)}
                  />
                  <input
                    className="field"
                    placeholder="Supplementary lighting used"
                    value={lighting}
                    onChange={(e) => setLighting(e.target.value)}
                  />
                </div>
              ) : null}
              <input
                className="field mb-2"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              {checkControls && !checkControls.mayRecordDetermination ? (
                <ul className="mb-2 space-y-1 text-xs text-signal-warn">
                  {checkControls.obstacles.map((obstacle) => (
                    <li key={obstacle}>{obstacle}</li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {DETERMINATIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`btn ${option.className}`}
                    disabled={session.state !== 'ACTIVE' || !checkControls?.mayRecordDetermination}
                    onClick={() => determine(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* --- evidence + approval ---------------------------------------- */}
        <section className="panel flex min-h-0 flex-col overflow-auto">
          <div className="panel-head">Evidence captured</div>
          <ul className="space-y-1 px-3 py-2 text-xs">
            {defensibility.elements.map((element) => (
              <li key={element.elementId} className="flex items-start gap-2">
                <ElementTag status={element.status} />
                <span className="flex-1">
                  <span className="block text-content-secondary">{element.title}</span>
                  <span className="block text-content-faint">{element.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-edge px-3 py-2 text-[11px] italic text-content-faint">
            {defensibility.disclaimer}
          </p>

          <div className="panel-head border-t">Directed manipulations ({session.directedManipulations.length})</div>
          <ul className="space-y-1 px-3 py-2 text-xs text-content-muted">
            {session.directedManipulations.map((m) => (
              <li key={m.manipulationId}>
                <span className="font-mono text-content-faint">{m.manipulationId}</span> {m.instruction}
              </li>
            ))}
            {session.directedManipulations.length === 0 ? <li className="text-content-ghost">None yet.</li> : null}
          </ul>
        </section>
      </div>

      {/* --- refusal, interruption recovery, approval --------------------- */}
      <footer className="panel p-3 text-sm">
        {state.lastRefusal ? (
          <p className="mb-3 rounded border border-signal-warn/50 bg-signal-warn/10 px-3 py-2 text-signal-warn">
            {state.lastRefusal}
          </p>
        ) : null}

        {openInterruption ? (
          <div className="mb-3 rounded border border-signal-block/50 bg-signal-block/10 p-3">
            <p className="mb-2 text-signal-block">
              Session interrupted at {openInterruption.detectedAt}. Approval is unavailable. Select a recovery path.
            </p>
            <input
              className="field mb-2"
              placeholder="Rationale for the recovery path (required)"
              value={recoveryRationale}
              onChange={(e) => setRecoveryRationale(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {RECOVERY_PATHS.map((path) => (
                <button
                  key={path.value}
                  type="button"
                  className="btn"
                  disabled={!recoveryRationale.trim()}
                  onClick={() => {
                    dispatch({
                      type: 'RESOLVE_INTERRUPTION',
                      interruptionId: openInterruption.interruptionId,
                      path: path.value,
                      rationale: recoveryRationale.trim(),
                      now: now(),
                    })
                    setRecoveryRationale('')
                  }}
                >
                  {path.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {session.state === 'SCHEDULED' || session.state === 'PRE_SESSION_CHECKS' ? (
            <button type="button" className="btn btn-primary" onClick={() => void startSession()}>
              Run pre-session checks and start
            </button>
          ) : null}

          {session.state === 'ACTIVE' || session.state === 'INTERRUPTED' ? (
            <button type="button" className="btn" onClick={() => void endSession()}>
              End session
            </button>
          ) : null}

          <span className={`text-xs ${approval.approvalAvailable ? 'text-signal-ok' : 'text-signal-warn'}`}>
            {approval.reason}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <input
              className="field w-72"
              placeholder="Reason for withholding approval"
              value={withholdReason}
              onChange={(e) => setWithholdReason(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              disabled={!withholdReason.trim()}
              onClick={() => {
                dispatch({ type: 'WITHHOLD_APPROVAL', reason: withholdReason.trim() })
                setWithholdReason('')
              }}
            >
              Withhold approval
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!approval.approvalAvailable}
              onClick={() => dispatch({ type: 'TAKE_APPROVAL' })}
            >
              Grant approval
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

function StateTag({ state }: { state: string }): JSX.Element {
  const tone =
    state === 'ACTIVE' || state === 'COMPLETED'
      ? 'bg-signal-ok/25 text-signal-ok'
      : state === 'INTERRUPTED' || state.startsWith('TERMINATED') || state === 'RECORDING_FAILED'
        ? 'bg-signal-block/25 text-signal-block'
        : 'bg-surface-accent text-content-secondary'
  return <span className={`tag ${tone}`}>{state}</span>
}

function DeterminationTag({ determination }: { determination?: string }): JSX.Element {
  if (!determination) return <span className="tag bg-surface-accent text-content-faint">open</span>
  const tone =
    determination === 'CONFORMS'
      ? 'bg-signal-ok/25 text-signal-ok'
      : determination === 'DOES_NOT_CONFORM'
        ? 'bg-signal-block/25 text-signal-block'
        : 'bg-signal-warn/25 text-signal-warn'
  return <span className={`tag ${tone}`}>{determination.replace(/_/g, ' ').toLowerCase()}</span>
}

function ElementTag({ status }: { status: string }): JSX.Element {
  const tone =
    status === 'PRESENT'
      ? 'bg-signal-ok/25 text-signal-ok'
      : status === 'ABSENT'
        ? 'bg-signal-block/25 text-signal-block'
        : 'bg-surface-accent text-content-muted'
  const label = status === 'NOT_APPLICABLE' ? 'n/a' : status.toLowerCase()
  return <span className={`tag mt-0.5 w-16 text-center ${tone}`}>{label}</span>
}
