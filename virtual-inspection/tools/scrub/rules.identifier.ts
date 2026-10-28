import type { ScrubRule } from './types.ts'

/**
 * Section 1.1 - clean-room identifier rules.
 *
 * Every pattern below is written so that its own source text cannot match it.
 * That is deliberate: the scanner scans the whole repository including itself,
 * and a rule that matched its own definition would make the gate unusable.
 *
 * Structured identifiers are caught by pattern. Free-form identifiers - company
 * names, people, third-party product names - cannot be expressed as a regex and
 * are supplied at scan time from an owner-held denylist that is never committed.
 * See DESIGN-NOTES.md, "Why the denylist lives outside the repository".
 */

const PLACEHOLDER_DOMAINS = /@(?:example\.(?:com|org|net)|test|localhost|invalid)\b/i

export const IDENTIFIER_RULES: ScrubRule[] = [
  {
    id: 'doc-number-procedure',
    gate: 'identifier',
    rationale:
      'Controlled procedure numbering from the source material. Document identity is a customer-configured value, never a constant.',
    pattern: /\bP-8\d{2}-\d{2}\b/g,
  },
  {
    id: 'doc-number-sop',
    gate: 'identifier',
    rationale: 'Controlled work-instruction numbering from the source material.',
    pattern: /\bSOP-8\d{2}-\d{2}\b/g,
  },
  {
    id: 'doc-number-form',
    gate: 'identifier',
    rationale: 'Controlled form numbering from the source material.',
    pattern: /\bF-8\d{2}-\d{2}\b/g,
  },
  {
    id: 'doc-number-qc-form',
    gate: 'identifier',
    rationale: 'Controlled quality-form numbering from the source material.',
    pattern: /\bQC-F-8\d{2}-\d{2}\b/g,
  },
  {
    id: 'doc-number-annex',
    gate: 'identifier',
    rationale: 'Controlled annex numbering from the source material.',
    pattern: /\bA-851-\d{2}\b/g,
  },
  {
    id: 'doc-number-manual',
    gate: 'identifier',
    rationale: 'Controlled manual numbering from the source material.',
    pattern: /\bPM-8\d{2}-\d{2}\b/g,
  },
  {
    id: 'doc-number-process-flow',
    gate: 'identifier',
    rationale: 'Controlled process-flow numbering from the source material.',
    pattern: /\bPF-8\d{2}-\d{2}\b/g,
  },
  {
    id: 'doc-number-quality-manual',
    gate: 'identifier',
    rationale: 'Controlled quality-manual numbering from the source material.',
    pattern: /\bPQM-\d{3}-\d\b/g,
  },
  {
    id: 'doc-number-corporate',
    gate: 'identifier',
    rationale: 'Corporate-level controlled procedure numbering from the source material.',
    pattern: /\bCORP-P-\d{3}-\d{2}\b/g,
  },
  {
    id: 'doc-number-supplier-request',
    gate: 'identifier',
    rationale: 'Supplier-request record numbering from the source material.',
    pattern: /\bSPR-[A-Z0-9]{2,}\b/g,
  },
  {
    id: 'doc-number-template',
    gate: 'identifier',
    rationale: 'Controlled template numbering from the source material.',
    pattern: /\bT-750-\d{2}\b/g,
  },
  {
    id: 'cancelled-notice-citation',
    gate: 'identifier',
    rationale:
      'A cancelled FAA notice that addressed administrative airman certification, not article inspection. The source material referenced it; this product must not. See REGULATORY-SOURCES.md.',
    pattern: /\b8900\.68\d\b/g,
  },
  {
    id: 'repair-station-certificate',
    gate: 'identifier',
    rationale:
      'Shape of an FAA repair station certificate number. Certificate identity is customer-configured.',
    pattern: /\b[A-Z0-9]{3}R\d{3}[A-Z]\b/g,
  },
  {
    id: 'email-address',
    gate: 'identifier',
    rationale: 'A real mailbox. Contact details are customer-configured, never constants.',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    exempt: (m) => PLACEHOLDER_DOMAINS.test(m),
  },
  {
    id: 'telephone-number',
    gate: 'identifier',
    rationale: 'A real telephone number. Contact details are customer-configured.',
    pattern: /\b(?:\+1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g,
  },
  {
    id: 'faa-field-office',
    gate: 'identifier',
    rationale:
      'A named FAA field office. The app addresses an authority abstractly; it never names an office.',
    pattern: /\b(?:[A-Z][a-z]{2,} (?:FSDO|MIDO|ACO)|(?:FSDO|MIDO|ACO) [A-Z][a-z]{2,})\b/g,
  },
  {
    id: 'postal-address',
    gate: 'identifier',
    rationale: 'A street address. Locations are roster entries supplied by the customer.',
    pattern:
      /\b\d{2,6} [A-Z][A-Za-z.]+(?: [A-Z][A-Za-z.]+){0,3} (?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.|Parkway|Pkwy\.|Suite|Ste\.)\b/g,
  },
  {
    id: 'personal-name-with-honorific',
    gate: 'identifier',
    rationale:
      'A named individual. People exist in this product only as roster entries created by the customer.',
    pattern: /\b(?:Mr|Mrs|Ms|Dr|Prof)\.? [A-Z][a-z]{2,}\b/g,
  },
]
