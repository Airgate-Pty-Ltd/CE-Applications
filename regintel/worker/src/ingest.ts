// Deterministic report builder. Replaces the previous LLM pipeline.
//
// The old worker asked an 8B model to read Google search snippets and emit
// document numbers, effective dates and comment deadlines. Those are the
// load-bearing facts of this product, and a model working from truncated
// snippets produces plausible, well-formatted, wrong values — silently. For
// Part 145 repair stations and PAHs that is not a quality-of-service issue.
//
// Every value here comes from the publishing authority's own structured feed.
// There is no model, no network search, and no randomness: the same inputs
// always produce the same report.

import { pullAllSources, UNCOVERED_AUTHORITIES, type Finding } from './sources/index';

export type { Finding } from './sources/index';

export interface ReportResult {
  report_date: string;
  status: string;
  priority_alerts: Finding[];
  final_rules: Finding[];
  open_nprs: Finding[];
  advisory_guidance: Finding[];
  standards_developments: Finding[];
  international_updates: Finding[];
  no_activity: string[];
  full_report_markdown: string;
  authorities_searched: string[];
  total_items_found: number;
  findings: Finding[];
}

/** How far back each run looks. */
const LOOKBACK_DAYS = 14;

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'URGENT',
  high: 'HIGH',
  normal: 'NORMAL',
  low: 'LOW',
};

function formatFinding(f: Finding): string {
  const bits: string[] = [];
  bits.push(`**${f.title}**`);
  bits.push('');
  bits.push(`- Priority: ${PRIORITY_LABEL[f.priority] ?? f.priority}`);
  if (f.document_number) bits.push(`- Document: ${f.document_number}`);
  if (f.effective_date) bits.push(`- Effective: ${f.effective_date}`);
  if (f.comment_deadline) bits.push(`- **Comment deadline: ${f.comment_deadline}**`);
  bits.push(`- Source: [${f.authority} — official record](${f.source_url})`);
  if (f.summary) {
    bits.push('');
    bits.push(f.summary);
  }
  return bits.join('\n');
}

function section(title: string, findings: Finding[], emptyText: string): string {
  if (findings.length === 0) return `## ${title}\n\n${emptyText}\n\n---\n`;
  return `## ${title}\n\n${findings.map(formatFinding).join('\n\n---\n\n')}\n\n---\n`;
}

/**
 * Render the report. A pure function of its inputs — no model, no I/O.
 */
export function buildMarkdownReport(
  findings: Finding[],
  date: string,
  covered: string[],
  quiet: string[],
  failed: { authorityName: string; error: string }[]
): string {
  const urgent = findings.filter((f) => f.priority === 'urgent');
  const deadlines = findings
    .filter((f) => f.comment_deadline)
    .sort((a, b) => (a.comment_deadline! < b.comment_deadline! ? -1 : 1));
  const finalRules = findings.filter((f) => f.category === 'final_rule');
  const nprms = findings.filter((f) => f.category === 'nprm');
  const other = findings.filter(
    (f) => !['final_rule', 'nprm'].includes(f.category)
  );

  const parts: string[] = [];

  parts.push(`# Regulatory Intelligence Report — ${date}\n`);
  parts.push(
    `${findings.length} item${findings.length === 1 ? '' : 's'} published in the last ` +
    `${LOOKBACK_DAYS} days. Every item below is taken directly from the ` +
    `publishing authority's official record — dates and document numbers are ` +
    `the authority's own values.\n\n` +
    `Urgent = comment deadline or effective date within 7 days. ` +
    `High = deadline or effective date within 30 days.\n`
  );

  parts.push(
    section(
      'Priority Alerts',
      urgent,
      'No priority alerts today.'
    )
  );

  if (deadlines.length > 0) {
    const rows = deadlines
      .map(
        (f) =>
          `| ${f.comment_deadline} | ${f.authority} | ${f.document_number ?? '—'} | [${f.title.slice(0, 70)}](${f.source_url}) |`
      )
      .join('\n');
    parts.push(
      `## Open Comment Deadlines\n\n` +
      `| Closes | Authority | Document | Item |\n|---|---|---|---|\n${rows}\n\n---\n`
    );
  }

  parts.push(section('Final Rules', finalRules, 'No new final rules today.'));
  parts.push(section('Proposed Rules, NPRMs & NPAs', nprms, 'No new proposed rules today.'));
  parts.push(section('Notices & Other Documents', other, 'No other documents today.'));

  if (quiet.length > 0) {
    parts.push(`## No Activity\n\nNo new items from: ${quiet.join(', ')}.\n\n---\n`);
  }

  if (failed.length > 0) {
    parts.push(
      `## Sources Unavailable\n\n` +
      `These sources could not be reached this run. Their absence below does ` +
      `NOT mean there was no activity:\n\n` +
      failed.map((f) => `- **${f.authorityName}** — ${f.error}`).join('\n') +
      `\n\n---\n`
    );
  }

  if (UNCOVERED_AUTHORITIES.length > 0) {
    parts.push(
      `## Coverage Gaps\n\n` +
      `No authoritative structured source is configured for the following, so ` +
      `they were **not checked**:\n\n` +
      UNCOVERED_AUTHORITIES.map((a) => `- **${a.name}** — ${a.note}`).join('\n') +
      `\n\n---\n`
    );
  }

  parts.push(
    `*Compiled from ${covered.length} authority source(s) as at ${date}. ` +
    `Deterministic pull from official sources; no AI-generated regulatory content.*`
  );

  return parts.join('\n');
}

/** Pull every configured source and assemble the day's report. */
export async function generateDailyReport(): Promise<ReportResult> {
  const today = new Date().toISOString().split('T')[0];

  const results = await pullAllSources(LOOKBACK_DAYS);

  const findings = results.flatMap((r) => r.findings);

  // Global dedup: the same document can legitimately be returned by more than
  // one configured source.
  const seen = new Set<string>();
  const deduped = findings.filter((f) => {
    const key = f.document_number ?? f.source_url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Stable, deterministic ordering: urgency, then soonest deadline, then title.
  const rank: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  deduped.sort((a, b) => {
    const byPriority = (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4);
    if (byPriority !== 0) return byPriority;
    const ad = a.comment_deadline ?? '9999-12-31';
    const bd = b.comment_deadline ?? '9999-12-31';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  const covered = results.filter((r) => r.ok).map((r) => r.authorityName);
  const quiet = results
    .filter((r) => r.ok && r.findings.length === 0)
    .map((r) => r.authorityName);
  const failed = results
    .filter((r) => !r.ok)
    .map((r) => ({ authorityName: r.authorityName, error: r.error ?? 'unknown error' }));

  const markdown = buildMarkdownReport(deduped, today, covered, quiet, failed);

  return {
    report_date: today,
    // If every source failed we have no basis for a report; say so rather than
    // publishing an empty one that reads like a quiet day.
    status: failed.length === results.length && results.length > 0 ? 'error' : 'complete',
    priority_alerts: deduped.filter((f) => f.priority === 'urgent'),
    final_rules: deduped.filter((f) => f.category === 'final_rule'),
    open_nprs: deduped.filter((f) => f.category === 'nprm'),
    advisory_guidance: deduped.filter((f) => f.category === 'notice'),
    standards_developments: [],
    international_updates: [],
    no_activity: quiet,
    full_report_markdown: markdown,
    authorities_searched: covered,
    total_items_found: deduped.length,
    findings: deduped,
  };
}
