'use client';

import type { Finding } from '@/lib/types';
import { ClockIcon, AlertIcon, ExternalIcon } from '@/app/_components/icons';
import { formatLabel } from '@/lib/labels';

// React escapes text content by default, so plain strings from third-party
// feeds are safe without additional encoding. The source URL is validated
// before being used in an href to avoid javascript: or data: schemes.
function isHttpUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Presentation rules that carry meaning, not decoration:
//
// - A left severity stripe encodes urgency, so it's readable before any text is.
// - An `unverified` badge is shown whenever the source did not publish the
//   dates a subscriber acts on. Never let an item look authoritative when the
//   authority did not actually supply the field.
// - Deadlines are given in days remaining as well as the date, because
//   "closes in 4 days" is actionable and "2026-08-24" requires arithmetic.

// Maps priority → the semantic severity token family (crit/high/norm/low).
const SEV: Record<string, { stripe: string; badge: string; label: string }> = {
  urgent: { stripe: 'bg-crit-line', badge: 'bg-crit-bg text-crit-ink', label: 'Urgent' },
  high:   { stripe: 'bg-high-line', badge: 'bg-high-bg text-high-ink', label: 'High' },
  normal: { stripe: 'bg-norm-line', badge: 'bg-norm-bg text-norm-ink', label: 'Normal' },
  low:    { stripe: 'bg-low-line',  badge: 'bg-low-bg text-low-ink',   label: 'Low' },
};

function daysUntil(date?: string): number | null {
  if (!date) return null;
  const then = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(then)) return null;
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((then - start) / 86_400_000);
}

function DeadlineChip({ date }: { date: string }) {
  const days = daysUntil(date);
  if (days === null) return null;

  const closed = days < 0;
  const tone = closed || days > 30
    ? 'bg-low-bg text-low-ink'
    : days <= 7
      ? 'bg-crit-bg text-crit-ink'
      : 'bg-high-bg text-high-ink';

  const label = closed
    ? `Comments closed ${date}`
    : days === 0
      ? `Comments close today — ${date}`
      : `Comments close in ${days} day${days === 1 ? '' : 's'} — ${date}`;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${tone}`}>
      <ClockIcon size={13} /> {label}
    </span>
  );
}

export function FindingCard({ finding: f, flag }: { finding: Finding; flag?: 'new' | 'amended' }) {
  const sev = SEV[f.priority] || SEV.low;

  return (
    <article className="group relative bg-surface border border-line rounded-xl shadow-card overflow-hidden transition hover:shadow-lift hover:border-line-strong hover:-translate-y-px">
      <span className={`absolute inset-y-0 left-0 w-[3px] ${sev.stripe}`} aria-hidden="true" />
      <div className="p-4 pl-[18px]">
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          {flag === 'new' && (
            <span className="bg-good-bg text-good-ink text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">New</span>
          )}
          {flag === 'amended' && (
            <span className="bg-norm-bg text-norm-ink text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">Amended</span>
          )}

          <span className="bg-brand text-white text-[11px] font-bold px-2 py-0.5 rounded-md tracking-wide">{f.authority}</span>
          <span className="bg-low-bg text-low-ink text-[11px] font-semibold px-2 py-0.5 rounded-md">
            {formatLabel(f.category)}
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${sev.badge}`}>{sev.label}</span>

          {f.document_number && (
            <span className="text-[11.5px] font-mono text-faint">{f.document_number}</span>
          )}

          {f.verification === 'unverified' && (
            <span
              className="inline-flex items-center gap-1 bg-high-bg text-high-ink text-[11px] font-semibold px-2 py-0.5 rounded-md"
              title="The source feed did not publish effective or comment dates. Confirm against the official record before acting."
            >
              <AlertIcon size={12} /> Dates not in source
            </span>
          )}
        </div>

        <h3 className="font-semibold text-ink leading-snug tracking-[-0.01em] mb-1 max-w-[68ch]">{f.title}</h3>

        {f.comment_deadline && (
          <div className="mt-2.5">
            <DeadlineChip date={f.comment_deadline} />
          </div>
        )}

        {f.summary && <p className="text-sm text-muted mt-2 leading-relaxed max-w-[74ch]">{f.summary}</p>}
        {f.detail && <p className="text-xs text-faint mt-1.5 leading-relaxed max-w-[74ch]">{f.detail}</p>}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted mt-3 pt-3 border-t border-line">
          {f.effective_date && (
            <span>Effective <strong className="text-ink font-semibold tabular-nums">{f.effective_date}</strong></span>
          )}
          {f.source_url && isHttpUrl(f.source_url) && (
            <a
              href={f.source_url}
              target="_blank"
              rel="noreferrer noopener"
              className="ml-auto inline-flex items-center gap-1.5 text-steel font-semibold hover:underline"
            >
              View official record <ExternalIcon size={13} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
