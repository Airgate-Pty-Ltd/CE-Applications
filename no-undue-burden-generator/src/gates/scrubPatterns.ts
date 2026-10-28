/**
 * Proprietary-content scrub patterns — the single definition.
 *
 * Lives in src/ rather than scripts/ so that both the CI gate and the test
 * dashboard's scrub panel read the same list. Two copies would drift, and a
 * dashboard that shows green against a stale pattern set is worse than no
 * dashboard.
 *
 * WHY PATTERNS AND NOT A LIST OF LITERAL STRINGS
 * ----------------------------------------------
 * The build specification asks for a grep against a list of specific proprietary
 * values, and separately forbids those values from appearing in the repository —
 * including git history. Those two requirements are in direct conflict: storing
 * the literals in order to grep for them is itself the leak, and committing that
 * file writes the leak permanently into history where it cannot be removed by a
 * later edit.
 *
 * This module resolves the conflict by matching the SHAPE of each value rather
 * than the value. `internal-doc-number` matches the family that the listed
 * document numbers belong to, so it catches every one of them without any of
 * them being written down here. This is strictly stronger than a literal list:
 * it also catches sibling values that were never enumerated.
 *
 * FALSE POSITIVES ARE THE PRICE, AND THEY ARE ACCEPTABLE
 * ------------------------------------------------------
 * A structural pattern will occasionally flag legitimate content. The rule for
 * resolving a hit is: change the repository content, never widen the exception.
 * In particular, fictional article and model numbers in `src/fixtures` must avoid
 * the `PREFIX-999-99` shape. Use forms such as `ACT-4410` or `LSP-2200`.
 */

export interface ScrubPattern {
  /** Stable identifier, used in failure output. */
  readonly id: string
  /** What class of proprietary value this catches. */
  readonly describes: string
  /** What the author should do instead. */
  readonly remedy: string
  readonly pattern: RegExp
  /**
   * Values that match `pattern` but are reserved by a public standard for
   * fictional or documentation use, and therefore cannot correspond to any real
   * person, company or facility.
   *
   * This is NOT a convenience escape hatch and is not the allowlist. An
   * exemption is only legitimate where a standards body has set the range aside
   * precisely so that examples can carry a realistic-looking value safely.
   * Appendix A requires a phone number and an address in its header fields;
   * reserved ranges are how the fixtures populate those without either weakening
   * the gate or shipping somebody's real contact details.
   */
  readonly exempt?: RegExp
}

export const SCRUB_PATTERNS: readonly ScrubPattern[] = [
  {
    id: 'pma-number',
    describes: 'A specific PMA supplement number',
    remedy: 'PMA numbers belong to the customer. Read it from the Organization Profile at runtime.',
    pattern: /\bPQ\d{3,5}[A-Z]{2}\b/g,
  },
  {
    id: 'internal-doc-number',
    describes: 'An employer-internal controlled document number',
    remedy:
      'Ask the user which of their procedures governs this and insert their answer. ' +
      'If this is a fixture model number, rename it to avoid the PREFIX-999-99 shape.',
    pattern: /\b[A-Z]{1,4}(?:-[A-Z]{1,4})?-\d{3}-\d{1,2}\b/g,
  },
  {
    id: 'email-address',
    describes: 'An email address — likely a named FAA officer or company contact',
    remedy: 'Addressee details are Organization Profile fields, not defaults.',
    pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]*[a-z]{2,}\b/gi,
    // RFC 2606 and RFC 6761 reserve these names permanently for documentation
    // and testing. They are guaranteed never to resolve to a real mailbox.
    exempt: /@(?:[\w-]+\.)*(?:example\.(?:com|net|org)|invalid|test|localhost)$/i,
  },
  {
    id: 'us-phone-number',
    describes: 'A phone number — likely a named FAA officer or company contact',
    remedy: 'Phone numbers are Organization Profile fields, not defaults.',
    pattern: /(?<![\d-])(?:\+?1[-. ])?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}(?![\d-])/g,
    // The North American Numbering Plan reserves 555-0100 through 555-0199 for
    // fictional use. These numbers are unassignable, so a fixture carrying one
    // cannot reach a real person.
    exempt: /555[-. ]01\d{2}\s*$/,
  },
  {
    id: 'us-street-address',
    describes: 'A street address',
    remedy: 'Facility and mailing addresses are Organization Profile fields.',
    pattern:
      /\b\d{1,6}\s+(?:[A-Z][a-z]+\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Parkway|Pkwy)\b\.?/g,
    // There is no standards-reserved street range, so fixtures use "Example" as
    // the documentation marker — the same role example.com plays for domains.
    // Real US street names do not contain it, so this cannot mask a live address.
    exempt: /\bExample\b/,
  },
]

/**
 * Substrings permitted despite matching a pattern above.
 *
 * EVERY ENTRY NEEDS A JUSTIFICATION. A test asserts this stays empty: an
 * allowlist entry is a permanent hole in the most important gate in the repo.
 */
export const ALLOWLIST: readonly { readonly value: string; readonly why: string }[] = []

export interface ScrubHit {
  readonly ruleId: string
  readonly match: string
  readonly describes: string
  readonly remedy: string
}

/**
 * Scan a string. Used by the dashboard against generated document text and the
 * loaded scenario; the CI gate uses the same patterns against files on disk.
 */
export function scanText(value: string): ScrubHit[] {
  const hits: ScrubHit[] = []
  const allowed = ALLOWLIST.map((a) => a.value)

  for (const rule of SCRUB_PATTERNS) {
    rule.pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = rule.pattern.exec(value)) !== null) {
      if (match[0].length === 0) {
        rule.pattern.lastIndex += 1
        continue
      }
      if (allowed.includes(match[0])) continue
      if (rule.exempt?.test(match[0])) continue
      hits.push({
        ruleId: rule.id,
        match: match[0],
        describes: rule.describes,
        remedy: rule.remedy,
      })
    }
  }

  return hits
}
