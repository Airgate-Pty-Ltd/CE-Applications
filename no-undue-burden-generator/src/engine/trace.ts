/**
 * Rule execution trace.
 *
 * The test dashboard has to show every rule that fired, in order, with its
 * inputs and its output — so that when the risk determination comes back "Yes",
 * a reviewer can see exactly which conditions caused it rather than taking the
 * engine's word for it. That is only possible if the engine records its own
 * reasoning as it goes.
 *
 * Traces are part of the deterministic output: identical inputs must produce an
 * identical trace, in identical order. Nothing here may read the clock, generate
 * a random value, or depend on object key iteration order that is not fixed by
 * an explicit array.
 */

export interface RuleTrace {
  /** Stable identifier. Appears in the dashboard and in test assertions. */
  readonly id: string
  /** Plain-English statement of what the rule tests. */
  readonly description: string
  /** The exact values the rule read. */
  readonly inputs: Readonly<Record<string, unknown>>
  /** What the rule concluded. */
  readonly output: unknown
  /** Whether the rule's condition was met. */
  readonly fired: boolean
  /** Regulatory basis, where the rule implements one. */
  readonly citation?: string
}

export class TraceLog {
  private readonly entries: RuleTrace[] = []

  record(entry: RuleTrace): void {
    this.entries.push(entry)
  }

  /**
   * Evaluate a predicate and record it in one step, returning the result so the
   * caller can branch on it. Keeps the rule and its trace from drifting apart.
   */
  test(
    id: string,
    description: string,
    inputs: Readonly<Record<string, unknown>>,
    predicate: boolean,
    citation?: string,
  ): boolean {
    this.record({
      id,
      description,
      inputs,
      output: predicate,
      fired: predicate,
      ...(citation === undefined ? {} : { citation }),
    })
    return predicate
  }

  toArray(): readonly RuleTrace[] {
    return [...this.entries]
  }
}
