import type { DenylistEntry, Finding, ScanInput, ScanOptions, ScrubRule } from './types.ts'
import { IDENTIFIER_RULES } from './rules.identifier.ts'
import { OPINION_RULES } from './rules.opinion.ts'

/**
 * A line opts out of one rule by carrying this marker followed by the rule id.
 * Opt-outs are counted and reported so they cannot accumulate unnoticed.
 */
const ALLOW_MARKER = /SCRUB-ALLOW:\s*([a-z0-9-]+)/gi

export const ALL_RULES: ScrubRule[] = [...IDENTIFIER_RULES, ...OPINION_RULES]

/**
 * Mask everything that carries identity, keeping only enough shape to locate
 * the problem. A finding is a signpost, not a copy of the offending string.
 */
export function redact(match: string): string {
  return match.replace(/[A-Za-z0-9]/g, (c, i: number) => (i < 2 ? c : '•'))
}

function allowedRuleIdsOnLine(line: string): Set<string> {
  const ids = new Set<string>()
  ALLOW_MARKER.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = ALLOW_MARKER.exec(line)) !== null) {
    if (m[1]) ids.add(m[1].toLowerCase())
  }
  return ids
}

function denylistToRules(entries: DenylistEntry[]): ScrubRule[] {
  return entries.map((entry, index) => ({
    id: `denylist-${entry.category}-${index}`,
    gate: 'identifier' as const,
    rationale: `Owner-supplied denylist term in category "${entry.category}". This value is customer-configured at runtime and must not be a constant in the repository.`,
    // Hyphen, underscore, space and dot are treated as equivalent separators so
    // a term is caught in prose, in kebab-case and in snake_case alike.
    pattern: new RegExp(
      `(?<![A-Za-z0-9])${escapeRegex(entry.term).replace(/\\?[ \-_.]/g, '[ \\-_.]?')}(?![A-Za-z0-9])`,
      'gi',
    ),
  }))
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Scan one file's text. Pure: no I/O, no clock, no globals mutated. */
export function scanText(input: ScanInput, options: ScanOptions = {}): Finding[] {
  const rules = [...ALL_RULES, ...denylistToRules(options.denylist ?? [])]
  const findings: Finding[] = []
  const lines = input.text.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const allowed = allowedRuleIdsOnLine(line)

    for (const rule of rules) {
      if (allowed.has(rule.id.toLowerCase())) continue
      rule.pattern.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = rule.pattern.exec(line)) !== null) {
        const text = match[0]
        if (text.length === 0) break
        if (rule.exempt?.(text)) continue
        findings.push({
          ruleId: rule.id,
          gate: rule.gate,
          file: input.file,
          line: i + 1,
          column: match.index + 1,
          redacted: redact(text),
          rationale: rule.rationale,
        })
      }
    }
  }

  return findings
}

export function scanFiles(inputs: ScanInput[], options: ScanOptions = {}): Finding[] {
  return inputs.flatMap((input) => scanText(input, options))
}

/** Every allow-marker in the repository, so opt-outs stay visible in review. */
export function collectAllowMarkers(inputs: ScanInput[]): Array<{ file: string; line: number; ruleId: string }> {
  const out: Array<{ file: string; line: number; ruleId: string }> = []
  for (const input of inputs) {
    const lines = input.text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      for (const ruleId of allowedRuleIdsOnLine(lines[i] ?? '')) {
        out.push({ file: input.file, line: i + 1, ruleId })
      }
    }
  }
  return out
}
