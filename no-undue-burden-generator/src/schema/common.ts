import { z } from 'zod'

/**
 * How well a value is established.
 *
 * Every field the user did not type by hand carries one of these. The state is
 * shown in the UI and drives the gap report. Only a human can promote a field to
 * CONFIRMED — convenience extraction from an uploaded document produces LIKELY
 * at best, never CONFIRMED, and never the determination itself.
 */
export const evidenceState = z.enum(['CONFIRMED', 'LIKELY', 'AMBIGUOUS', 'MISSING'])
export type EvidenceState = z.infer<typeof evidenceState>

/**
 * AC 21-55 Appendix A asks several questions as Yes/No with an FAA Validation
 * column beside them. `UNANSWERED` is distinct from `NO`: an unanswered risk
 * question blocks generation, whereas a considered "no" is a valid answer.
 */
export const answer = z.enum(['YES', 'NO', 'UNANSWERED'])
export type Answer = z.infer<typeof answer>

/** A narrative field, with the evidence state of whatever produced it. */
export const narrative = z.object({
  text: z.string().default(''),
  evidence: evidenceState.default('MISSING'),
})
export type Narrative = z.infer<typeof narrative>

/**
 * The FAA explicitly rejects generic quality-system boilerplate: AC 21-55 §6
 * says the plan "should not be a generic replication of the PAH's current
 * quality system." Anything shorter than this is almost certainly a placeholder
 * rather than the specific, factual description the AC asks for.
 */
export const THIN_NARRATIVE_CHARS = 40

export function isThin(n: Narrative | undefined): boolean {
  return (n?.text.trim().length ?? 0) < THIN_NARRATIVE_CHARS
}

export function isEmpty(n: Narrative | undefined): boolean {
  return (n?.text.trim().length ?? 0) === 0
}

/** A missing required value renders as this token, visibly, in the document. */
export function confirmToken(whatIsNeeded: string): string {
  return `[CONFIRM: ${whatIsNeeded}]`
}

/**
 * Text for the document, or a visible CONFIRM token. Never a silent blank and
 * never an invented value — an FAA reader must be able to see what is absent.
 */
export function textOrConfirm(n: Narrative | undefined, whatIsNeeded: string): string {
  const t = n?.text.trim() ?? ''
  return t.length > 0 ? t : confirmToken(whatIsNeeded)
}

export function answerOrConfirm(a: Answer | undefined, whatIsNeeded: string): string {
  switch (a) {
    case 'YES':
      return 'Yes'
    case 'NO':
      return 'No'
    default:
      return confirmToken(whatIsNeeded)
  }
}
