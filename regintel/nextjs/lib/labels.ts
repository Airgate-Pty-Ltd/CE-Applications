// Display labels for authority codes and category slugs.
//
// These are stored as the authority's own short form ("FAA", "EASA") or as a
// slug ("final_rule", "amc_gm"). Rendering them with CSS `capitalize` after a
// toLowerCase() turned every acronym into title case — "Faa", "Easa", "Nprm" —
// which reads as a typo to anyone in the industry. Casing is decided here
// instead, so the two places that show these labels cannot drift apart.

/** Rendered in full caps. Regulator short forms and document-class acronyms. */
const ACRONYMS = new Set([
  // authorities
  'FAA', 'EASA', 'FDA', 'NHTSA', 'MHRA', 'DVSA', 'OPSS', 'CAAC', 'CAA',
  'TCCA', 'ANAC', 'IAQG', 'ISO', 'SAE', 'IATF', 'EU', 'UK', 'US', 'PRC',
  // document classes and regulatory terms
  'AC', 'AD', 'AMC', 'AP', 'CCAR', 'CS', 'CTSO', 'ED', 'GM', 'IR', 'DR',
  'NPA', 'NPRM', 'CRD', 'MB', 'OSD', 'QMS', 'SMS', 'STC', 'TSO', 'ETSO',
  'SERA', 'ATM', 'ANS', 'UAS', 'GNSS',
]);

/** Slugs whose natural rendering is not just word-by-word. */
const SPECIAL: Record<string, string> = {
  amc_gm: 'AMC/GM',
  ed_decision: 'ED Decision',
  certification_specification: 'Certification Specification',
  easy_access_rules: 'Easy Access Rules',
};

/**
 * Human label for an authority code or category slug.
 *
 * Acronyms stay in full caps; everything else is title-cased. Unknown values
 * pass through title-cased rather than being dropped, so a newly added
 * authority shows up readably before anyone updates this list.
 */
export function formatLabel(value: string | null | undefined): string {
  if (!value) return '';
  const key = value.toLowerCase();
  if (SPECIAL[key]) return SPECIAL[key];

  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      // Already-uppercase short tokens are almost certainly acronyms we have
      // not listed yet ("OPSS" before it was added). Leave them alone rather
      // than mangling them into title case.
      if (word.length <= 5 && word === upper) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
