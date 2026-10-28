import { useEffect, useMemo, useState } from 'react'
import type { AppState } from '../state/useAppState.ts'
import { determine } from '../engine/determine.ts'
import { SCENARIOS, type Scenario } from '../fixtures/scenarios.ts'
import { checkConformance, extractDocumentText } from '../documents/acConformance.ts'
import { gapReportToBlob, planToBase64, planToBlob } from '../documents/render.ts'
import { scanText, SCRUB_PATTERNS, ALLOWLIST } from '../gates/scrubPatterns.ts'
import { GapList } from '../ui/ReviewPanel.tsx'

/**
 * The test dashboard.
 *
 * Its job is to let Brian confirm the application is correct without reading
 * code. Every panel therefore states plainly WHAT IT PROVES, and a green panel
 * has to be trustworthy on exactly that claim and no more — a panel that
 * overstates its scope is worse than no panel, because it converts an unchecked
 * area into a checked-looking one.
 *
 * Excluded from production builds by the flag in App.tsx.
 */
export function TestDashboard({ state }: { state: AppState }) {
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0]?.id ?? '')
  const scenario = useMemo(() => SCENARIOS.find((s) => s.id === scenarioId), [scenarioId])
  const determination = state.determination

  return (
    <div className="space-y-8">
      <header className="rounded border border-slate-300 bg-slate-50 p-4">
        <h1 className="text-lg font-semibold text-slate-900">Test dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Development and staging only. Each panel states what it proves; a green panel is trustworthy on that
          claim and nothing wider.
        </p>
      </header>

      <ScenarioRunner state={state} scenarioId={scenarioId} onSelect={setScenarioId} />
      <RulesInspector state={state} />
      <DeterminismPanel state={state} />
      <DocumentPanel state={state} />
      <ConformancePanel state={state} />
      <ScrubPanel state={state} />
      <ValidationMatrix state={state} />

      <Panel
        title="8. Gap report"
        proves="What the customer sees: every gap in blocking, warning, informational order, exactly as the engine produced it."
      >
        <GapList title="Blocking" tone="red" gaps={determination.gaps.blocking} empty="No blocking gaps." />
        <div className="h-4" />
        <GapList title="Warnings" tone="amber" gaps={determination.gaps.warnings} empty="No warnings." />
        <div className="h-4" />
        <GapList title="Informational" tone="slate" gaps={determination.gaps.info} empty="Nothing to note." />
      </Panel>

      {scenario !== undefined && <ExpectationCheck scenario={scenario} state={state} />}
    </div>
  )
}

function Panel({
  title,
  proves,
  status,
  children,
}: {
  title: string
  proves: string
  status?: { ok: boolean; label: string }
  children: React.ReactNode
}) {
  return (
    <section className="rounded border border-slate-200">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-600">
            <span className="font-medium">Proves: </span>
            {proves}
          </p>
        </div>
        {status !== undefined && (
          <span
            className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${
              status.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {status.label}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function ScenarioRunner({
  state,
  scenarioId,
  onSelect,
}: {
  state: AppState
  scenarioId: string
  onSelect: (id: string) => void
}) {
  return (
    <Panel
      title="1. Scenario runner"
      proves="Eight fictional scenarios load end to end in one click, covering both routing outcomes, all three banner values, and each class of high-risk trigger."
    >
      <div className="space-y-2">
        {SCENARIOS.map((s) => (
          <div
            key={s.id}
            className={`rounded border p-3 ${s.id === scenarioId ? 'border-slate-800' : 'border-slate-200'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{s.title}</p>
                <p className="mt-1 text-xs text-slate-600">{s.proves}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  expects {s.expectedRouting} · {s.expectedBanner}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded bg-slate-900 px-3 py-1.5 text-xs text-white"
                onClick={() => {
                  onSelect(s.id)
                  state.loadScenario(s.profile, s.plan)
                }}
              >
                Load
              </button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function RulesInspector({ state }: { state: AppState }) {
  const trace = state.determination.trace
  const fired = trace.filter((t) => t.fired)

  return (
    <Panel
      title="2. Rules engine inspector"
      proves="Every rule that ran, in order, with its inputs and output — so a high-risk Yes can be traced to the exact indicators that caused it."
    >
      <p className="mb-3 text-xs text-slate-600">
        {trace.length} rules evaluated, {fired.length} fired.
      </p>
      <div className="max-h-96 overflow-auto rounded border border-slate-200">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="text-left">
              <th className="border-b border-slate-200 p-2 font-medium">Rule</th>
              <th className="border-b border-slate-200 p-2 font-medium">Inputs</th>
              <th className="border-b border-slate-200 p-2 font-medium">Output</th>
              <th className="border-b border-slate-200 p-2 font-medium">Citation</th>
            </tr>
          </thead>
          <tbody>
            {trace.map((t, i) => (
              <tr key={`${t.id}-${i}`} className={t.fired ? 'bg-amber-50' : ''}>
                <td className="border-b border-slate-100 p-2 align-top">
                  <div className="font-mono text-[11px]">{t.id}</div>
                  <div className="text-slate-600">{t.description}</div>
                </td>
                <td className="border-b border-slate-100 p-2 align-top font-mono text-[11px] text-slate-600">
                  {JSON.stringify(t.inputs)}
                </td>
                <td className="border-b border-slate-100 p-2 align-top font-mono text-[11px]">
                  {JSON.stringify(t.output)}
                </td>
                <td className="border-b border-slate-100 p-2 align-top text-[11px] text-slate-500">
                  {t.citation ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function DeterminismPanel({ state }: { state: AppState }) {
  const [result, setResult] = useState<{ ok: boolean; runs: number; detail: string } | null>(null)

  const run = () => {
    const first = JSON.stringify(determine(state.plan, state.profile))
    let diverged = -1
    for (let i = 1; i < 100; i++) {
      if (JSON.stringify(determine(state.plan, state.profile)) !== first) {
        diverged = i
        break
      }
    }
    setResult(
      diverged === -1
        ? { ok: true, runs: 100, detail: 'All 100 runs produced byte-identical determination output.' }
        : { ok: false, runs: 100, detail: `Output diverged on run ${diverged}. The engine is not deterministic.` },
    )
  }

  return (
    <Panel
      title="3. Determinism check"
      proves="The engine returns byte-identical output for identical input, across 100 consecutive runs of the currently loaded scenario."
      {...(result === null ? {} : { status: { ok: result.ok, label: result.ok ? 'PASS' : 'FAIL' } })}
    >
      <button type="button" onClick={run} className="rounded bg-slate-900 px-3 py-1.5 text-xs text-white">
        Run 100 times
      </button>
      {result !== null && <p className="mt-3 text-sm text-slate-700">{result.detail}</p>}
    </Panel>
  )
}

/** Shared rendering of the current plan to text, used by three panels. */
function useDocumentText(state: AppState) {
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { plan, profile, determination } = state

  useEffect(() => {
    let cancelled = false
    setText(null)
    setError(null)
    void (async () => {
      try {
        const extracted = await extractDocumentText(await planToBase64({ plan, profile, determination }))
        if (!cancelled) setText(extracted)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [plan, profile, determination])

  return { text, error }
}

function DocumentPanel({ state }: { state: AppState }) {
  const { text, error } = useDocumentText(state)

  const download = async (kind: 'plan' | 'gap-report') => {
    const input = { plan: state.plan, profile: state.profile, determination: state.determination }
    const blob = kind === 'plan' ? await planToBlob(input) : await gapReportToBlob(input)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  return (
    <Panel
      title="4. Document preview"
      proves="The text actually written into the .docx, extracted from the generated file itself — not a re-render of the same data. Layout still needs eyeballing in Word against the AC appendix."
    >
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => void download('plan')}
          disabled={!state.determination.canGenerate}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-40"
        >
          Open plan .docx
        </button>
        <button
          type="button"
          onClick={() => void download('gap-report')}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs"
        >
          Open gap report .docx
        </button>
      </div>
      {error !== null ? (
        <pre className="overflow-x-auto rounded border border-red-300 bg-red-50 p-3 text-xs text-red-900">
          {error}
        </pre>
      ) : text === null ? (
        <p className="text-sm text-slate-500">Rendering…</p>
      ) : (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded border border-slate-200 bg-white p-3 text-xs text-slate-800">
          {text}
        </pre>
      )}
    </Panel>
  )
}

function ConformancePanel({ state }: { state: AppState }) {
  const { text, error } = useDocumentText(state)
  const isFullPlan = state.determination.risk.routing === 'FULL_PROJECT_PLAN'
  const results = text === null ? [] : checkConformance(text, isFullPlan)
  const missing = results.filter((r) => r.required && !r.present)

  return (
    <Panel
      title="5. AC 21-55 Appendix A conformance"
      proves="Every heading and numbered item of the published Appendix A is present in the generated document. Items marked n/a are Sections 3 to 5 on an initial notification, where absence is correct."
      {...(text === null
        ? {}
        : { status: { ok: missing.length === 0, label: missing.length === 0 ? 'PASS' : `${missing.length} MISSING` } })}
    >
      {error !== null ? (
        <p className="text-sm text-red-700">
          Document could not be generated: {error}. Conformance cannot be checked while the plan is blocked.
        </p>
      ) : text === null ? (
        <p className="text-sm text-slate-500">Rendering…</p>
      ) : (
        <div className="grid gap-1 sm:grid-cols-2">
          {results.map((r) => (
            <div key={`${r.item.section}-${r.item.item}`} className="flex items-center gap-2 text-xs">
              <span
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
                  !r.required ? 'bg-slate-300' : r.present ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
              <span className="text-slate-500">{r.item.section}</span>
              <span className="text-slate-800">{r.item.label}</span>
              {!r.required && <span className="text-slate-400">n/a</span>}
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function ScrubPanel({ state }: { state: AppState }) {
  const { text } = useDocumentText(state)
  const scenarioJson = JSON.stringify({ plan: state.plan, profile: state.profile })
  const documentHits = text === null ? [] : scanText(text)
  const scenarioHits = scanText(scenarioJson)
  const hits = [...documentHits, ...scenarioHits]

  return (
    <Panel
      title="6. Scrub audit"
      proves="The generated document and the loaded scenario contain nothing matching the proprietary-content patterns. NOT a substitute for the CI gate — a browser cannot read the source tree or the built bundle, and that scan is the authoritative one."
      status={{ ok: hits.length === 0, label: hits.length === 0 ? 'CLEAN' : `${hits.length} HIT` }}
    >
      <p className="mb-3 text-xs text-slate-600">
        {SCRUB_PATTERNS.length} patterns active, {ALLOWLIST.length} allowlist entries.
      </p>
      {hits.length === 0 ? (
        <p className="text-sm text-emerald-800">No proprietary-shaped values found.</p>
      ) : (
        <ul className="space-y-2">
          {hits.map((h, i) => (
            <li key={i} className="rounded border border-red-200 bg-red-50 p-3 text-xs">
              <p className="font-mono font-semibold text-red-900">
                [{h.ruleId}] {h.match}
              </p>
              <p className="mt-1 text-red-800">{h.describes}</p>
              <p className="mt-1 text-red-700">{h.remedy}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function ValidationMatrix({ state }: { state: AppState }) {
  const checks = state.determination.validation.checks
  const failed = checks.filter((c) => !c.passed)

  return (
    <Panel
      title="7. Validation matrix"
      proves="Every cross-section consistency check, with live pass/fail for the loaded scenario. These catch contradictions, not omissions — omissions are panel 8."
      status={{ ok: failed.length === 0, label: failed.length === 0 ? 'PASS' : `${failed.length} FAIL` }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <tbody>
            {checks.map((c) => (
              <tr key={c.id}>
                <td className="border-b border-slate-100 p-2 align-top">
                  <span
                    className={`rounded px-1.5 py-0.5 font-semibold ${
                      !c.applicable
                        ? 'bg-slate-100 text-slate-500'
                        : c.passed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {!c.applicable ? 'n/a' : c.passed ? 'PASS' : 'FAIL'}
                  </span>
                </td>
                <td className="border-b border-slate-100 p-2 align-top">
                  <div className="text-slate-800">{c.description}</div>
                  <div className="text-[11px] text-slate-400">{c.citation}</div>
                </td>
                <td className="border-b border-slate-100 p-2 align-top text-slate-600">{c.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

/**
 * Cross-check the live engine against what the scenario says it should produce.
 * Catches a fixture and the engine drifting apart — the failure mode where the
 * dashboard looks healthy because the expectation moved with the bug.
 */
function ExpectationCheck({ scenario, state }: { scenario: Scenario; state: AppState }) {
  const routingOk = state.determination.risk.routing === scenario.expectedRouting
  const bannerOk = state.determination.banner === scenario.expectedBanner
  const ok = routingOk && bannerOk

  return (
    <Panel
      title="Scenario expectation cross-check"
      proves="The live engine agrees with what the selected scenario declares it should produce. Load a scenario first — this compares against the last one loaded."
      status={{ ok, label: ok ? 'MATCH' : 'MISMATCH' }}
    >
      <table className="text-xs">
        <tbody>
          <tr>
            <td className="py-1 pr-4 text-slate-600">Routing</td>
            <td className="py-1 pr-4 font-mono">{scenario.expectedRouting}</td>
            <td className={`py-1 font-mono ${routingOk ? 'text-emerald-700' : 'text-red-700'}`}>
              {state.determination.risk.routing}
            </td>
          </tr>
          <tr>
            <td className="py-1 pr-4 text-slate-600">Banner</td>
            <td className="py-1 pr-4 font-mono">{scenario.expectedBanner}</td>
            <td className={`py-1 font-mono ${bannerOk ? 'text-emerald-700' : 'text-red-700'}`}>
              {state.determination.banner}
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>
  )
}
