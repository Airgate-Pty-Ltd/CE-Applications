// Federal Register — authoritative structured source.
//
// https://www.federalregister.gov/developers/api/v1
// Public, free, no API key. Returns document_number, publication_date,
// effective_on and comments_close_on as typed fields, so nothing about a
// finding is inferred.
//
// Covers the US agencies only. FAA and FDA are both first-class here, which
// is the bulk of RegIntel's US regulatory surface.

import type { Finding, Priority, Source } from './types';

const API = 'https://www.federalregister.gov/api/v1/documents.json';

/** Fields we request. Anything not listed is not read, so it cannot leak in. */
const FIELDS = [
  'document_number',
  'title',
  'type',
  'abstract',
  'publication_date',
  'effective_on',
  'comments_close_on',
  'html_url',
  'docket_ids',
  'agencies',
] as const;

interface FRDocument {
  document_number: string | null;
  title: string | null;
  type: string | null;
  abstract: string | null;
  publication_date: string | null;
  effective_on: string | null;
  comments_close_on: string | null;
  html_url: string | null;
  docket_ids: string[] | null;
}

interface FRResponse {
  count?: number;
  results?: FRDocument[];
}

/**
 * Map the Federal Register `type` to a RegIntel category.
 * This is a lookup over a closed set the publisher defines — not inference.
 */
function categoryForType(type: string | null): string {
  switch (type) {
    case 'Rule':
      return 'final_rule';
    case 'Proposed Rule':
      return 'nprm';
    case 'Notice':
      return 'notice';
    case 'Presidential Document':
      return 'presidential_document';
    default:
      return 'other';
  }
}

/** Whole days from today until `date` (UTC), or null if absent/unparseable. */
function daysUntil(date: string | null, today: Date): number | null {
  if (!date) return null;
  const then = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(then)) return null;
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((then - start) / 86_400_000);
}

/**
 * Priority derived purely from the publisher's own dates.
 *
 * Deliberately arithmetic, not judgement — the same input always yields the
 * same output, and the reasoning is inspectable. Deadlines dominate effective
 * dates because a missed comment window cannot be reopened.
 */
export function derivePriority(
  effectiveOn: string | null,
  commentsCloseOn: string | null,
  today: Date
): Priority {
  const toDeadline = daysUntil(commentsCloseOn, today);
  const toEffective = daysUntil(effectiveOn, today);

  // Only future deadlines matter; a closed comment window is not urgent.
  const deadlineSoon = toDeadline !== null && toDeadline >= 0 ? toDeadline : null;
  const effectiveSoon = toEffective !== null && toEffective >= 0 ? toEffective : null;

  if (deadlineSoon !== null && deadlineSoon <= 7) return 'urgent';
  if (effectiveSoon !== null && effectiveSoon <= 7) return 'urgent';
  if (deadlineSoon !== null && deadlineSoon <= 30) return 'high';
  if (effectiveSoon !== null && effectiveSoon <= 30) return 'high';
  if (deadlineSoon !== null || effectiveSoon !== null) return 'normal';
  return 'low';
}

function toFinding(
  doc: FRDocument,
  authority: string,
  today: Date
): Finding | null {
  // A finding with no link is not actionable and cannot be cited.
  if (!doc.html_url || !doc.title) return null;

  const docket = doc.docket_ids?.length ? doc.docket_ids.join(', ') : null;

  // `summary` is the publisher's own abstract, verbatim when present. We do
  // not write prose on the authority's behalf.
  const summary = doc.abstract?.trim()
    ? doc.abstract.trim()
    : `${doc.type ?? 'Document'} published ${doc.publication_date ?? 'date not stated'}.`;

  const detailParts = [
    doc.document_number ? `Document ${doc.document_number}` : null,
    doc.type,
    docket ? `Docket ${docket}` : null,
    doc.publication_date ? `Published ${doc.publication_date}` : null,
  ].filter(Boolean);

  return {
    authority,
    category: categoryForType(doc.type),
    priority: derivePriority(doc.effective_on, doc.comments_close_on, today),
    title: doc.title.trim(),
    summary,
    detail: detailParts.join(' · '),
    source_url: doc.html_url,
    effective_date: doc.effective_on,
    comment_deadline: doc.comments_close_on,
    document_number: doc.document_number,
    verification: 'verified',
    source_id: 'federal-register',
  };
}

/** Build a Federal Register source for one agency slug. */
export function federalRegisterSource(opts: {
  authority: string;
  authorityName: string;
  /** Federal Register agency slug, e.g. 'federal-aviation-administration'. */
  agencySlug: string;
  /** Cap on documents pulled per run. */
  perPage?: number;
}): Source {
  const { authority, authorityName, agencySlug, perPage = 100 } = opts;

  return {
    id: 'federal-register',
    authority,
    authorityName,
    verification: 'verified',

    async fetch(sinceDays: number): Promise<Finding[]> {
      const today = new Date();
      const since = new Date(today.getTime() - sinceDays * 86_400_000)
        .toISOString()
        .split('T')[0];

      const params = new URLSearchParams();
      params.set('per_page', String(perPage));
      params.set('order', 'newest');
      params.set('conditions[agencies][]', agencySlug);
      params.set('conditions[publication_date][gte]', since);
      for (const f of FIELDS) params.append('fields[]', f);

      const res = await fetch(`${API}?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(45_000),
      });

      if (!res.ok) {
        throw new Error(`Federal Register returned ${res.status} for ${agencySlug}`);
      }

      const data = (await res.json()) as FRResponse;
      const docs = data.results ?? [];

      const findings: Finding[] = [];
      const seen = new Set<string>();

      for (const doc of docs) {
        const finding = toFinding(doc, authority, today);
        if (!finding) continue;
        // Deduplicate by document number where present, else by URL.
        const key = finding.document_number ?? finding.source_url;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push(finding);
      }

      return findings;
    },
  };
}
