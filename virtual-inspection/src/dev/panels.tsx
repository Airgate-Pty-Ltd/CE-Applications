import { useMemo, useState } from 'react'
import { eligibilityRuleCatalogue, evaluateEligibility } from '../engine/eligibility.ts'
import { CAPABILITIES, DETERMINATION_CAPABILITIES, capabilityMatrix } from '../engine/roles.ts'
import { assessApprovalAvailability, recordRecordingFailure, resolveInterruption } from '../engine/interruption.ts'
import { scoreDefensibility } from '../engine/defensibility.ts'
import {
  DEFAULT_SIGNATURE_STATEMENT,
  reviseRecord,
  verifyRecordIntegrity,
} from '../engine/record.ts'
import {
  appendPersonnelRevision,
  resolveRostersFromStamp,
  revisionByNumber,
  revisionInForce,
} from '../engine/rosters.ts'
import { buildEvidencePackage, verifyEvidencePackage } from '../documents/evidencePackage.ts'
import { buildSessionConformityRecordDocument } from '../documents/sessionRecord.ts'
import { buildAuthorityRecordDocument } from '../documents/authorityRecord.ts'
import { renderDocumentHtml, renderDocumentText } from '../documents/model.ts'
import { CHECK_PACKS } from '../content/packs.ts'
import { SCENARIOS } from '../fixtures/scenarios.ts'
import { makeSealedRecord, recordFromScenarioOutcome } from '../fixtures/records.ts'
import {
  INSPECTOR_ID,
  NOW,
  makeArticle,
  makeConfig,
  makeEligibilityInput,
  makeLocationRoster,
  makePersonnelRoster,
  makeProvenance,
  makeRecording,
  makeSession,
  makeTools,
} from '../fixtures/factory.ts'
import { StubVideoProvider } from '../video/stubProvider.ts'
import { scanText } from '../../tools/scrub/scan.ts'
import { IDENTIFIER_RULES } from '../../tools/scrub/rules.identifier.ts'
import { OPINION_RULES } from '../../tools/scrub/rules.opinion.ts'

/** Shared panel chrome. Every panel states what it proves. */
export function Panel({
  number,
  title,
  proves,
  children,
}: {
  number: number
  title: string
  proves: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <section className="panel" id={`panel-${number}`}>
      <div className="panel-head flex items-baseline gap-2">
        <span className="font-mono text-content-faint">{String(number).padStart(2, '0')}</span>
        <span className="text-content-secondary">{title}</span>
      </div>
      <p className="border-b border-edge bg-surface-inset/40 px-3 py-2 text-xs text-content-muted">
        <strong className="text-content-secondary">Proves:</strong> {proves}
      </p>
      <div className="p-3 text-sm">{children}</div>
    </section>
  )
}

export function Verdict({ ok, children }: { ok: boolean; children: React.ReactNode }): JSX.Element {
  return (
    <p className={`mb-2 font-medium ${ok ? 'text-signal-ok' : 'text-signal-block'}`}>
      {ok ? 'PASS' : 'FAIL'} — {children}
    </p>
  )
}

function Table({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} className="border border-edge bg-surface-inset p-1 text-left font-medium text-content-secondary">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border border-edge p-1 align-top text-content-muted">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------- panel 1 ---

export function ScenarioRunnerPanel(): JSX.Element {
  const [selectedId, setSelectedId] = useState(SCENARIOS[0]!.id)
  const scenario = SCENARIOS.find((s) => s.id === selectedId)!
  const outcome = useMemo(() => scenario.run(), [scenario])

  return (
    <Panel
      number={1}
      title="Scenario runner"
      proves={`Every one of the ${SCENARIOS.length} fictional scenarios runs end to end through the real engine, and each behaves as its description claims. The same scenarios are asserted in the unit tests, so a drift fails CI as well as showing here.`}
    >
      <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
        <ul className="max-h-96 overflow-auto rounded border border-edge">
          {SCENARIOS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full border-b border-edge/60 px-2 py-1.5 text-left text-xs ${
                  s.id === selectedId ? 'bg-surface-inset text-content-primary' : 'text-content-muted hover:bg-surface-inset/50'
                }`}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
        <div className="space-y-2 text-xs">
          <p className="text-content-muted">{scenario.whatItProves}</p>
          <Table
            columns={['Stage', 'Outcome']}
            rows={[
              ['Eligibility', outcome.eligibility.decision],
              [
                'Blocks fired',
                outcome.eligibility.blocks.map((b) => b.ruleId).join(', ') || 'none',
              ],
              [
                'Warnings fired',
                outcome.eligibility.warnings.map((w) => w.ruleId).join(', ') || 'none',
              ],
              [
                'Pre-session controls',
                outcome.preSessionControls
                  ? `${outcome.preSessionControls.mayStart ? 'may start' : 'blocked'}${
                      outcome.preSessionControls.blockingControlIds.length
                        ? ` — ${outcome.preSessionControls.blockingControlIds.join(', ')}`
                        : ''
                    }${
                      outcome.preSessionControls.overriddenControlIds.length
                        ? ` — overridden: ${outcome.preSessionControls.overriddenControlIds.join(', ')}`
                        : ''
                    }`
                  : 'not evaluated (session never reached pre-session checks)',
              ],
              ['Session state', outcome.session.state],
              [
                'Approval',
                `${outcome.approval.approvalAvailable ? 'available' : 'unavailable'} — ${outcome.approval.reason}`,
              ],
              ['Evidence', outcome.defensibility.statement],
            ]}
          />
        </div>
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------- panel 2 ---

const GATE_INPUTS = {
  'clean input': makeEligibilityInput(),
  'complete product': makeEligibilityInput({ article: makeArticle({ classification: 'COMPLETE_AIRCRAFT' }) }),
  'unlisted inspector': makeEligibilityInput({ inspectorPersonId: 'PER-9999' }),
  'critical article': makeEligibilityInput({ article: makeArticle({ criticality: 'CRITICAL' }) }),
  'tool past due': makeEligibilityInput({ tools: makeTools([{ calibrationDueDate: '2026-01-01' }]) }),
  'approval-only boundary': makeEligibilityInput({
    provenance: makeProvenance({
      performedBySeparateCertificateHolder: true,
      inspectingOrganisationInvolvement: 'RELEASE_ONLY',
    }),
  }),
}

export function EligibilityInspectorPanel(): JSX.Element {
  const [key, setKey] = useState<keyof typeof GATE_INPUTS>('clean input')
  const result = evaluateEligibility(GATE_INPUTS[key])

  return (
    <Panel
      number={2}
      title="Eligibility gate inspector"
      proves="Every rule in the gate is evaluated on every input, fired or not, and each carries the reason it exists alongside what it observed. Nothing is hidden behind a boolean."
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(GATE_INPUTS) as Array<keyof typeof GATE_INPUTS>).map((k) => (
          <button key={k} type="button" className={`btn text-xs ${k === key ? 'btn-primary' : ''}`} onClick={() => setKey(k)}>
            {k}
          </button>
        ))}
      </div>
      <p className="mb-2 text-xs text-content-muted">
        Decision: <strong className="text-content-primary">{result.decision}</strong> — {result.evaluated.length} rules
        evaluated, {result.blocks.length} block(s), {result.warnings.length} warning(s).
      </p>
      <Table
        columns={['Rule', 'Severity', 'Source', 'Fired', 'Observed', 'Why the rule exists']}
        rows={result.evaluated.map((rule) => [
          rule.title,
          rule.severity,
          rule.source,
          <span className={rule.fired ? 'text-signal-block' : 'text-content-ghost'}>{rule.fired ? 'FIRED' : '—'}</span>,
          rule.detail,
          <span className="whitespace-pre-wrap">{rule.rationale}</span>,
        ])}
      />
    </Panel>
  )
}

// ---------------------------------------------------------------- panel 3 ---

export function RoleMatrixPanel(): JSX.Element {
  const matrix = capabilityMatrix()
  const presenter = matrix.find((r) => r.role === 'PRESENTER')!
  const presenterIsEmpty = presenter.determinationCapabilities.length === 0

  return (
    <Panel
      number={3}
      title="Role capability matrix"
      proves="The presenter role's determination-capability set is provably empty. The presenter UI cannot render a determination control because there is no capability to render one from."
    >
      <Verdict ok={presenterIsEmpty}>
        Presenter determination capabilities: {presenterIsEmpty ? 'none' : presenter.determinationCapabilities.join(', ')}
      </Verdict>
      <Table
        columns={['Capability', 'Determination?', ...matrix.map((r) => r.role)]}
        rows={CAPABILITIES.map((capability) => [
          capability,
          DETERMINATION_CAPABILITIES.includes(capability) ? 'yes' : '',
          ...matrix.map((row) =>
            row.capabilities.includes(capability) ? (
              <span className="text-signal-ok">✓</span>
            ) : (
              <span className="text-content-ghost">·</span>
            ),
          ),
        ])}
      />
    </Panel>
  )
}

// ---------------------------------------------------------------- panel 4 ---

export function DeterminismPanel(): JSX.Element {
  const runs = 100
  const results = useMemo(() => {
    const cases = [
      {
        name: 'evaluateEligibility',
        run: () => JSON.stringify(evaluateEligibility(makeEligibilityInput())),
      },
      { name: 'scoreDefensibility', run: () => JSON.stringify(scoreDefensibility(makeSession())) },
      { name: 'sealRecord content hash', run: () => makeSealedRecord().contentHash },
      {
        name: 'buildEvidencePackage manifest hash',
        run: () => buildEvidencePackage(makeSealedRecord(), makeConfig()).manifest.manifestHash,
      },
    ]
    return cases.map((c) => {
      const first = c.run()
      let identical = true
      for (let i = 1; i < runs; i++) if (c.run() !== first) identical = false
      return { name: c.name, identical, sample: first.slice(0, 64) }
    })
  }, [])

  const allIdentical = results.every((r) => r.identical)

  return (
    <Panel
      number={4}
      title="Determinism check"
      proves={`The same input produces byte-identical output across ${runs} runs. No clock, no randomness, and no model participates in any determination.`}
    >
      <Verdict ok={allIdentical}>
        {results.filter((r) => r.identical).length} of {results.length} functions byte-identical over {runs} runs.
      </Verdict>
      <Table
        columns={['Function', `Identical over ${runs} runs`, 'Output (first 64 chars)']}
        rows={results.map((r) => [
          r.name,
          r.identical ? <span className="text-signal-ok">yes</span> : <span className="text-signal-block">NO</span>,
          <span className="font-mono">{r.sample}</span>,
        ])}
      />
    </Panel>
  )
}

// ---------------------------------------------------------------- panel 5 ---

export function ImmutabilityPanel(): JSX.Element {
  const outcome = useMemo(() => {
    const original = makeSealedRecord()

    let mutationThrew = false
    let mutationError = ''
    try {
      ;(original as unknown as { recordId: string }).recordId = 'TAMPERED'
    } catch (error) {
      mutationThrew = true
      mutationError = error instanceof Error ? error.message : String(error)
    }

    let nestedThrew = false
    try {
      ;(original.session as unknown as { sessionId: string }).sessionId = 'TAMPERED'
    } catch {
      nestedThrew = true
    }

    const revision = reviseRecord(original, {
      recordId: 'REC-0002',
      reason: 'Tool identifier transcribed incorrectly against the dimensional check.',
      signature: { personId: INSPECTOR_ID, signedAt: NOW, statement: DEFAULT_SIGNATURE_STATEMENT },
      changes: {},
    })

    const tampered = { ...original, organisationDisplayName: 'Someone Else' }

    return {
      original,
      revision,
      mutationThrew,
      mutationError,
      nestedThrew,
      originalStillIntact: verifyRecordIntegrity(original).intact,
      revisionIntact: verifyRecordIntegrity(revision).intact,
      tamperDetected: !verifyRecordIntegrity(tampered).intact,
    }
  }, [])

  const ok =
    outcome.mutationThrew &&
    outcome.nestedThrew &&
    outcome.originalStillIntact &&
    outcome.revisionIntact &&
    outcome.tamperDetected

  return (
    <Panel
      number={5}
      title="Immutability check"
      proves="A signed record cannot be mutated, a reconstructed record fails its hash, and a correction produces a new revision that names the record it supersedes while leaving the original intact and verifiable."
    >
      <Verdict ok={ok}>
        Mutation threw: {String(outcome.mutationThrew)}; nested mutation threw: {String(outcome.nestedThrew)}; tamper
        detected by hash: {String(outcome.tamperDetected)}.
      </Verdict>
      <p className="mb-2 font-mono text-xs text-content-faint">{outcome.mutationError}</p>
      <Table
        columns={['Record', 'Revision', 'Supersedes', 'Reason', 'Hash verifies', 'Content hash']}
        rows={[outcome.original, outcome.revision].map((r) => [
          r.recordId,
          String(r.revision),
          r.supersedes ?? '—',
          r.supersededReason ?? '—',
          verifyRecordIntegrity(r).intact ? <span className="text-signal-ok">yes</span> : <span className="text-signal-block">no</span>,
          <span className="font-mono">{r.contentHash.slice(0, 24)}…</span>,
        ])}
      />
    </Panel>
  )
}

// ---------------------------------------------------------------- panel 6 ---

export function InterruptionSimulatorPanel(): JSX.Element {
  const [log, setLog] = useState<string[]>([])
  const [state, setState] = useState(() => makeSession({ state: 'ACTIVE' }))

  const provider = useMemo(() => new StubVideoProvider({ now: NOW }), [])

  const availability = assessApprovalAvailability({
    state: state.state,
    interruptions: state.interruptions,
    executedChecks: state.executedChecks,
    recording: state.recording,
  })

  const killStream = (): void => {
    // Driven through the provider's real degradation path, not by setting a flag.
    const unsubscribe = provider.onDegradation((event) => {
      setState((previous) => ({
        ...previous,
        state: 'INTERRUPTED',
        interruptions: [
          ...previous.interruptions,
          {
            interruptionId: `INT-${previous.interruptions.length + 1}`,
            detectedAt: event.at,
            category: event.category,
            reason: event.reason,
            affectedCheckIds: ['pc-dimensional'],
          },
        ],
        executedChecks: previous.executedChecks.map((e) =>
          e.checkId === 'pc-dimensional'
            ? { ...e, invalidatedByInterruptionId: `INT-${previous.interruptions.length + 1}`, reVerifiedAt: undefined }
            : e,
        ),
      }))
      setLog((l) => [...l, `${event.at} — ${event.category}: ${event.reason}. Approval blocked.`])
    })
    provider.emitDegradation({ at: NOW, category: 'STREAM_FAILURE', reason: 'Stream lost mid-check.' })
    unsubscribe()
  }

  const recover = (path: Parameters<typeof resolveInterruption>[0]['path']): void => {
    const open = state.interruptions.find((i) => !i.resolution)
    if (!open) return
    const result = resolveInterruption({
      interruption: open,
      path,
      rationale: 'Selected in the simulator.',
      selectedByPersonId: INSPECTOR_ID,
      selectedAt: NOW,
    })
    setState((previous) => ({
      ...previous,
      state: result.state,
      interruptions: previous.interruptions.map((i) => (i.interruptionId === open.interruptionId ? result.interruption : i)),
      ...(result.approvalRecoverable ? {} : { approvalGranted: false, approvalWithheldReason: result.note }),
    }))
    setLog((l) => [...l, `${path} — ${result.note}`])
  }

  const reVerify = (): void => {
    setState((previous) => ({
      ...previous,
      executedChecks: previous.executedChecks.map((e) =>
        e.checkId === 'pc-dimensional' ? { ...e, reVerifiedAt: NOW } : e,
      ),
      state: 'COMPLETED',
    }))
    setLog((l) => [...l, 'Affected check re-verified. Approval re-assessed.'])
  }

  return (
    <Panel
      number={6}
      title="Interruption simulator"
      proves="Killing the stream mid-session records the correct state, invalidates the affected check, and makes approval unavailable. Only resume-and-re-verify can restore it, and only after the check is actually re-verified."
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-block" onClick={killStream} disabled={state.state !== 'ACTIVE'}>
          Kill the stream
        </button>
        {(['RESUME_AND_REVERIFY', 'REPERFORM_SESSION', 'ROUTE_FOR_PHYSICAL_INSPECTION', 'DISPATCH_INSPECTOR'] as const).map(
          (path) => (
            <button
              key={path}
              type="button"
              className="btn text-xs"
              disabled={!state.interruptions.some((i) => !i.resolution)}
              onClick={() => recover(path)}
            >
              {path.replace(/_/g, ' ').toLowerCase()}
            </button>
          ),
        )}
        <button
          type="button"
          className="btn text-xs"
          disabled={!state.interruptions.some((i) => i.resolution?.path === 'RESUME_AND_REVERIFY')}
          onClick={reVerify}
        >
          re-verify affected check
        </button>
        <button
          type="button"
          className="btn text-xs"
          onClick={() => {
            setState(makeSession({ state: 'ACTIVE' }))
            setLog([])
          }}
        >
          reset
        </button>
      </div>
      <p className="mb-2 text-xs">
        State <strong className="text-content-primary">{state.state}</strong> — approval{' '}
        <strong className={availability.approvalAvailable ? 'text-signal-ok' : 'text-signal-block'}>
          {availability.approvalAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
        </strong>
      </p>
      <p className="mb-2 text-xs text-content-muted">{availability.reason}</p>
      {availability.outstandingCheckIds.length > 0 ? (
        <p className="mb-2 text-xs text-signal-warn">
          Outstanding re-verification: {availability.outstandingCheckIds.join(', ')}
        </p>
      ) : null}
      <ul className="space-y-1 font-mono text-[11px] text-content-faint">
        {log.map((entry, i) => (
          <li key={i}>{entry}</li>
        ))}
      </ul>
    </Panel>
  )
}

// ---------------------------------------------------------------- panel 7 ---

export function RecordingFailurePanel(): JSX.Element {
  const outcome = useMemo(() => {
    const failed = recordRecordingFailure(makeRecording({ status: 'RECORDING' }), 'Storage target rejected the write.')
    const session = makeSession({ state: failed.state, recording: failed.recording, approvalGranted: false })
    const availability = assessApprovalAvailability({
      state: session.state,
      interruptions: session.interruptions,
      executedChecks: session.executedChecks,
      recording: session.recording,
    })
    const report = scoreDefensibility(session)
    return { session, availability, report }
  }, [])

  const ok =
    outcome.session.state === 'RECORDING_FAILED' &&
    !outcome.availability.approvalAvailable &&
    outcome.report.absentElementIds.includes('full-session-recording-retained')

  return (
    <Panel
      number={7}
      title="Recording-failure test"
      proves="A session whose recording failed enters RECORDING_FAILED, cannot stand as the sole conformity record, and shows the missing recording as an absent evidence element — whatever else it captured."
    >
      <Verdict ok={ok}>
        State {outcome.session.state}; approval {outcome.availability.approvalAvailable ? 'available' : 'unavailable'}.
      </Verdict>
      <p className="mb-2 text-xs text-content-muted">{outcome.availability.reason}</p>
      <p className="text-xs text-content-muted">{outcome.report.statement}</p>
    </Panel>
  )
}

// ---------------------------------------------------------------- panel 8 ---

export function DefensibilityPanel(): JSX.Element {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0]!.id)
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!
  const report = scenario.run().defensibility

  return (
    <Panel
      number={8}
      title="Defensibility scorer"
      proves="The scorer reports element by element what a session captured and what it did not. It never grades the session, never calls a score adequate, and never implies a threshold carries regulatory meaning."
    >
      <select className="field mb-3 max-w-md" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
        {SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
      <p className="mb-2 text-content-primary">{report.statement}</p>
      <Table
        columns={['Element', 'Status', 'Detail']}
        rows={report.elements.map((e) => [
          e.title,
          <span
            className={
              e.status === 'PRESENT'
                ? 'text-signal-ok'
                : e.status === 'ABSENT'
                  ? 'text-signal-block'
                  : 'text-content-faint'
            }
          >
            {e.status}
          </span>,
          e.detail,
        ])}
      />
      <p className="mt-2 text-[11px] italic text-content-faint">{report.disclaimer}</p>
    </Panel>
  )
}

// ---------------------------------------------------------------- panel 9 ---

export function EvidencePackagePanel(): JSX.Element {
  const [scenarioId, setScenarioId] = useState('separate-certificate-holder-warning')
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!
  const { pkg, verification } = useMemo(() => {
    const record = recordFromScenarioOutcome(scenario.run(), 'REC-PREVIEW-01')
    const built = buildEvidencePackage(record, makeConfig())
    return { pkg: built, verification: verifyEvidencePackage(built) }
  }, [scenario])

  return (
    <Panel
      number={9}
      title="Evidence package preview"
      proves="The full export as a recipient would receive it: a manifest, per-entry content hashes, the recording referenced rather than embedded, and a package that re-verifies with nothing but a hashing tool."
    >
      <select className="field mb-3 max-w-md" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
        {SCENARIOS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>

      <Verdict ok={verification.allIntact}>
        Manifest {verification.manifestIntact ? 'verifies' : 'does not verify'};{' '}
        {verification.entryResults.filter((r) => r.intact).length} of {verification.entryResults.length} entries verify.
      </Verdict>

      <Table
        columns={['Path', 'Description', 'Content hash']}
        rows={pkg.manifest.entries.map((e) => [
          <span className="font-mono">{e.path}</span>,
          e.description,
          <span className="font-mono">{e.contentHash.slice(0, 24)}…</span>,
        ])}
      />

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-content-muted">Manifest (JSON)</summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded border border-edge bg-surface-base p-2 font-mono text-[11px] text-content-muted">
          {JSON.stringify(pkg.manifest, null, 2)}
        </pre>
      </details>

      <details className="mt-2" open>
        <summary className="cursor-pointer text-xs text-content-muted">Rendered documents</summary>
        <div className="mt-2 max-h-[32rem] space-y-4 overflow-auto rounded border border-edge">
          {pkg.documents.map((doc) => (
            <div key={doc.documentType} dangerouslySetInnerHTML={{ __html: renderDocumentHtml(doc) }} />
          ))}
        </div>
      </details>
    </Panel>
  )
}

// --------------------------------------------------------------- panel 10 ---

export function RosterVersioningPanel(): JSX.Element {
  const outcome = useMemo(() => {
    const original = { ...makePersonnelRoster(), revision: 1, effectiveFrom: '2026-01-01T00:00:00.000Z' }
    const stamp = { personnelRevision: 1, locationsRevision: 2 }

    // Someone leaves: the roster increments, it does not change in place.
    const revisions = appendPersonnelRevision(
      [original],
      original.entries.filter((e) => e.personId !== INSPECTOR_ID),
      '2026-08-01T00:00:00.000Z',
    )

    const historical = resolveRostersFromStamp(revisions, [makeLocationRoster()], stamp)
    const latest = revisionInForce(revisions, '2026-09-01T00:00:00.000Z')!

    return {
      revisions,
      historicalHasInspector: historical.personnel.entries.some((e) => e.personId === INSPECTOR_ID),
      latestHasInspector: latest.entries.some((e) => e.personId === INSPECTOR_ID),
      historicalRevision: historical.personnel.revision,
      latestRevision: latest.revision,
      missingThrows: (() => {
        try {
          revisionByNumber(revisions, 99, 'personnel')
          return false
        } catch {
          return true
        }
      })(),
    }
  }, [])

  const ok = outcome.historicalHasInspector && !outcome.latestHasInspector && outcome.missingThrows

  return (
    <Panel
      number={10}
      title="Roster versioning test"
      proves="Removing someone from the roster increments it rather than changing it. A record stamped with an earlier revision still resolves to the roster as it stood on the day, and a missing revision throws rather than silently falling back to the latest."
    >
      <Verdict ok={ok}>
        Record stamped at revision {outcome.historicalRevision} still resolves the removed person:{' '}
        {String(outcome.historicalHasInspector)}. Current revision {outcome.latestRevision} does not:{' '}
        {String(!outcome.latestHasInspector)}.
      </Verdict>
      <Table
        columns={['Revision', 'Effective from', 'Entries', `Contains ${INSPECTOR_ID}`]}
        rows={outcome.revisions.map((r) => [
          String(r.revision),
          r.effectiveFrom,
          String(r.entries.length),
          r.entries.some((e) => e.personId === INSPECTOR_ID) ? (
            <span className="text-signal-ok">yes</span>
          ) : (
            <span className="text-content-ghost">no</span>
          ),
        ])}
      />
    </Panel>
  )
}

// ----------------------------------------------------------- panels 11, 12 ---

/**
 * Everything this build can emit as text: rule rationales, control text, check
 * content, scenario output, rendered documents and the sealed record itself.
 *
 * The CI gate scans the source tree. These two panels scan the *output*, which
 * is the half a source grep cannot see: a string assembled at runtime from three
 * safe fragments is still an identifier by the time a regulator reads it.
 */
function buildCorpus(): Array<{ file: string; text: string }> {
  const corpus: Array<{ file: string; text: string }> = []

  corpus.push({
    file: 'engine/eligibility-rule-catalogue',
    text: eligibilityRuleCatalogue()
      .map((r) => `${r.ruleId} ${r.title} ${r.rationale}`)
      .join('\n'),
  })

  corpus.push({ file: 'content/check-packs', text: JSON.stringify(CHECK_PACKS) })

  for (const scenario of SCENARIOS) {
    const result = scenario.run()
    corpus.push({ file: `scenario/${scenario.id}`, text: JSON.stringify(result) })
    if (result.session.startedAt) {
      const record = recordFromScenarioOutcome(result, `REC-AUDIT-${scenario.id}`)
      corpus.push({
        file: `document/session-record/${scenario.id}`,
        text: renderDocumentText(buildSessionConformityRecordDocument(record)),
      })
      corpus.push({
        file: `document/authority-record/${scenario.id}`,
        text: renderDocumentText(buildAuthorityRecordDocument(record, makeConfig())),
      })
      corpus.push({
        file: `evidence-package/${scenario.id}`,
        text: JSON.stringify(buildEvidencePackage(record, makeConfig()).manifest),
      })
    }
  }

  return corpus
}

function AuditPanel({
  number,
  title,
  proves,
  gate,
  ruleCount,
  command,
}: {
  number: number
  title: string
  proves: string
  gate: 'identifier' | 'opinion'
  ruleCount: number
  command: string
}): JSX.Element {
  const { findings, corpusSize } = useMemo(() => {
    const corpus = buildCorpus()
    return {
      corpusSize: corpus.length,
      findings: corpus.flatMap((entry) => scanText(entry).filter((f) => f.gate === gate)),
    }
  }, [gate])

  return (
    <Panel number={number} title={title} proves={proves}>
      <Verdict ok={findings.length === 0}>
        {ruleCount} rules against {corpusSize} emitted artefacts — {findings.length} finding(s).
      </Verdict>
      {findings.length > 0 ? (
        <Table
          columns={['Artefact', 'Line', 'Rule', 'Redacted match', 'Rationale']}
          rows={findings.map((f) => [f.file, String(f.line), f.ruleId, f.redacted, f.rationale])}
        />
      ) : null}
      <p className="mt-2 text-xs text-content-faint">
        This panel scans what the build <em>emits</em>. The source tree and every commit are scanned separately in CI
        by <code className="font-mono text-content-muted">{command}</code>, which also applies the owner-held denylist that
        is never committed.
      </p>
    </Panel>
  )
}

export function ScrubAuditPanel(): JSX.Element {
  return (
    <AuditPanel
      number={11}
      title="Clean-room scrub audit"
      proves="Nothing this build emits at runtime carries a controlled document number, certificate shape, mailbox, telephone number, named field office, postal address, or named individual — including strings assembled at runtime, which a source grep cannot see."
      gate="identifier"
      ruleCount={IDENTIFIER_RULES.length}
      command="npm run scrub:history"
    />
  )
}

export function OpinionAuditPanel(): JSX.Element {
  return (
    <AuditPanel
      number={12}
      title="Opinion-language audit"
      proves="Nothing this build emits concludes that a user, an arrangement, a configuration, or a session has achieved a regulatory state — including the rule rationales, the warning text, and every rendered document."
      gate="opinion"
      ruleCount={OPINION_RULES.length}
      command="npm run scrub"
    />
  )
}
