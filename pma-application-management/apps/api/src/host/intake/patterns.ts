// Deterministic pattern extraction for format-known FAA identifiers. No LLM, no
// guessing — a value is accepted ONLY if it matches a known format; anything that
// does not match is left for guided human transcription (spec §6).

export interface PatternMatch {
  fieldKey: string;
  value: string;
  citation: string;
}

// FAA STC numbers: ST/SA + 5 digits + 2 letters, optional -D style suffix.
const STC_RE = /\b(?:ST|SA)\d{5}[A-Z]{2}(?:-[A-Z])?\b/g;
// FAA Type Certificate numbers (varied): e.g. A00001NY, 3A20, T00001AC.
const TC_RE = /\b(?:[A-Z]?\d{1,2}[A-Z]\d{1,3}|A\d{5}[A-Z]{2})\b/g;

export function extractStcNumbers(text: string): string[] {
  return unique(text.match(STC_RE) ?? []);
}

export function extractTcNumbers(text: string): string[] {
  // Exclude anything already an STC match to avoid double counting.
  const stc = new Set(extractStcNumbers(text));
  return unique((text.match(TC_RE) ?? []).filter((m) => !stc.has(m)));
}

// Returns the first STC found, as a pattern_match field.
export function patternMatch(text: string): PatternMatch[] {
  const out: PatternMatch[] = [];
  const stc = extractStcNumbers(text);
  if (stc.length) out.push({ fieldKey: 'stc_number', value: stc[0], citation: 'pattern:STC' });
  const tc = extractTcNumbers(text);
  if (tc.length) out.push({ fieldKey: 'tc_number', value: tc[0], citation: 'pattern:TC' });
  return out;
}

function unique(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()))].filter(Boolean);
}
