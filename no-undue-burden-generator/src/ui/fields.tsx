import type { ReactNode } from 'react'
import { isThin, THIN_NARRATIVE_CHARS, type Answer, type Narrative } from '../schema/common.ts'

/**
 * Intake field primitives.
 *
 * Deliberately plain. The UI seams are Mike's to style; what matters here is
 * that the behaviour is correct — help text that pushes toward specific factual
 * answers, a live warning when a narrative is too thin to be what AC 21-55 §6
 * asks for, and a visible evidence state on anything not typed by hand.
 */

export function FieldShell({
  label,
  help,
  citation,
  children,
  warning,
}: {
  label: string
  help?: string
  citation?: string
  children: ReactNode
  warning?: string | undefined
}) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-slate-800">{label}</label>
      {help !== undefined && <p className="mt-1 text-xs text-slate-600">{help}</p>}
      <div className="mt-2">{children}</div>
      {warning !== undefined && (
        <p className="mt-1 text-xs text-amber-700" role="status">
          {warning}
        </p>
      )}
      {citation !== undefined && <p className="mt-1 text-[11px] text-slate-400">{citation}</p>}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  help,
  citation,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  help?: string
  citation?: string
  placeholder?: string
}) {
  return (
    <FieldShell label={label} {...(help === undefined ? {} : { help })} {...(citation === undefined ? {} : { citation })}>
      <input
        type="text"
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        value={value}
        placeholder={placeholder ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  )
}

/**
 * A narrative answer.
 *
 * AC 21-55 §6 says the plan "should not be a generic replication of the PAH's
 * current quality system". The character counter and the thin-answer warning
 * exist to push back on boilerplate at the moment it is being typed, which is
 * the only moment the user can cheaply do something about it.
 */
export function NarrativeField({
  label,
  value,
  onChange,
  help,
  citation,
  rows = 4,
}: {
  label: string
  value: Narrative
  onChange: (value: Narrative) => void
  help?: string
  citation?: string
  rows?: number
}) {
  const length = value.text.trim().length
  const thin = length > 0 && isThin(value)

  return (
    <FieldShell
      label={label}
      {...(help === undefined ? {} : { help })}
      {...(citation === undefined ? {} : { citation })}
      warning={
        thin
          ? `${length} characters. This is likely too thin — the FAA rejects generic quality-system boilerplate. Name the procedure, the responsible function, and what actually happens.`
          : undefined
      }
    >
      <textarea
        className={`w-full rounded border px-3 py-2 text-sm ${thin ? 'border-amber-400' : 'border-slate-300'}`}
        rows={rows}
        value={value.text}
        onChange={(e) => onChange({ text: e.target.value, evidence: e.target.value.trim() === '' ? 'MISSING' : 'CONFIRMED' })}
      />
      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {length} character{length === 1 ? '' : 's'}
          {length > 0 && length < THIN_NARRATIVE_CHARS ? ` (under ${THIN_NARRATIVE_CHARS})` : ''}
        </span>
        <EvidenceBadge state={value.evidence} />
      </div>
    </FieldShell>
  )
}

export function AnswerField({
  label,
  value,
  onChange,
  help,
  citation,
}: {
  label: string
  value: Answer
  onChange: (value: Answer) => void
  help?: string
  citation?: string
}) {
  return (
    <FieldShell label={label} {...(help === undefined ? {} : { help })} {...(citation === undefined ? {} : { citation })}>
      <div className="flex gap-2">
        {(['YES', 'NO', 'UNANSWERED'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded border px-3 py-1.5 text-sm ${
              value === option
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {option === 'YES' ? 'Yes' : option === 'NO' ? 'No' : 'Not answered'}
          </button>
        ))}
      </div>
    </FieldShell>
  )
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="mb-2 flex items-start gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

export function EvidenceBadge({ state }: { state: Narrative['evidence'] }) {
  const styles: Record<Narrative['evidence'], string> = {
    CONFIRMED: 'bg-emerald-100 text-emerald-800',
    LIKELY: 'bg-sky-100 text-sky-800',
    AMBIGUOUS: 'bg-amber-100 text-amber-800',
    MISSING: 'bg-slate-100 text-slate-600',
  }
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[state]}`}>{state}</span>
}
