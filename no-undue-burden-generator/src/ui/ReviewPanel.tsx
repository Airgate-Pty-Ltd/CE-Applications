import { useState } from 'react'
import type { AppState } from '../state/useAppState.ts'
import type { Gap, Severity } from '../engine/gaps.ts'
import { gapReportToBlob, planToBlob, suggestedFilename } from '../documents/render.ts'

/**
 * Review and generate.
 *
 * The banner, the gap list and the consistency checks are shown BEFORE the
 * download button, and the download button is disabled while a blocking gap
 * exists. The refusal is enforced in render.ts as well — this is the visible
 * half of it, not the mechanism.
 */
export function ReviewPanel({ state }: { state: AppState }) {
  const { determination, plan, profile } = state
  const [error, setError] = useState<string | null>(null)

  const download = async (kind: 'plan' | 'gap-report') => {
    setError(null)
    try {
      const input = { plan, profile, determination }
      const blob = kind === 'plan' ? await planToBlob(input) : await gapReportToBlob(input)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = suggestedFilename(profile, kind)
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-8">
      <StatusBanner state={state} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!determination.canGenerate}
          onClick={() => void download('plan')}
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Download Project Initiation Plan (.docx)
        </button>
        <button
          type="button"
          onClick={() => void download('gap-report')}
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-800"
        >
          Download Gap Report (.docx)
        </button>
      </div>
      {!determination.canGenerate && (
        <p className="text-xs text-slate-600">
          The plan cannot be generated while a blocking gap remains. The gap report is still available — it
          explains exactly what is required.
        </p>
      )}
      {error !== null && (
        <pre className="overflow-x-auto rounded border border-red-300 bg-red-50 p-3 text-xs text-red-900">{error}</pre>
      )}

      <GapList title="Blocking" tone="red" gaps={determination.gaps.blocking} empty="No blocking gaps." />
      <GapList title="Warnings" tone="amber" gaps={determination.gaps.warnings} empty="No warnings." />
      <GapList title="Informational" tone="slate" gaps={determination.gaps.info} empty="Nothing to note." />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Consistency checks</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-2 pr-3 font-medium">Result</th>
                <th className="py-2 pr-3 font-medium">Check</th>
                <th className="py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {determination.validation.checks.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
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
                  <td className="py-2 pr-3">
                    <div>{c.description}</div>
                    <div className="text-[11px] text-slate-400">{c.citation}</div>
                  </td>
                  <td className="py-2 text-slate-600">{c.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export function StatusBanner({ state }: { state: AppState }) {
  const { determination } = state
  const tone: Record<string, string> = {
    'DRAFT — INTERNAL REVIEW ONLY': 'border-emerald-300 bg-emerald-50 text-emerald-900',
    'DRAFTED WITH GAPS': 'border-amber-300 bg-amber-50 text-amber-900',
    BLOCKED: 'border-red-300 bg-red-50 text-red-900',
  }
  return (
    <div className={`rounded border p-4 ${tone[determination.banner] ?? ''}`} role="status">
      <p className="text-sm font-semibold">{determination.banner}</p>
      <p className="mt-1 text-xs">{determination.bannerRationale}</p>
    </div>
  )
}

const TONES: Record<string, string> = {
  red: 'border-red-200 bg-red-50',
  amber: 'border-amber-200 bg-amber-50',
  slate: 'border-slate-200 bg-slate-50',
}

export function GapList({
  title,
  tone,
  gaps,
  empty,
}: {
  title: string
  tone: 'red' | 'amber' | 'slate'
  gaps: readonly Gap[]
  empty: string
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        {title} <span className="text-sm font-normal text-slate-500">({gaps.length})</span>
      </h2>
      {gaps.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {gaps.map((g) => (
            <li key={g.id} className={`rounded border p-4 ${TONES[tone] ?? ''}`}>
              <p className="text-sm font-semibold text-slate-900">{g.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {g.location}
                {g.citation === undefined ? '' : ` · ${g.citation}`}
              </p>
              <p className="mt-2 text-sm text-slate-700">{g.detail}</p>
              <p className="mt-2 text-sm text-slate-900">
                <span className="font-medium">What to do: </span>
                {g.remedy}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export type { Severity }
