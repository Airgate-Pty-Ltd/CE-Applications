// Client-side data access — replaces the removed /api/reports/latest and
// /api/findings route handlers so RegIntel can run as a static export talking
// to Supabase directly from the browser.
//
// SECURITY: the subscription gate ("only active/trialing subscribers may read
// findings and reports") is enforced in the DATABASE by RLS (see schema.sql),
// not here — so querying from the browser with the anon key is safe. A
// non-subscriber's queries return nothing.
//
// The per-tier archive depth below is an ENTITLEMENT limit (a paid feature),
// not a cross-user security boundary — every active subscriber can already see
// every finding; tier only limits how far back. It is applied here exactly as
// the old API route did, so behaviour is unchanged for normal use. To make it
// tamper-proof (a technical user could query older rows directly), add an RLS
// policy keyed on the caller's tier — tracked as a hardening item.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Finding, Report } from './types';

export async function fetchLatestReport(
  supabase: SupabaseClient,
): Promise<{ report: Report | null; generating: boolean }> {
  const { data: report } = await supabase
    .from('regulatory_reports')
    .select('*')
    .eq('status', 'complete')
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (report) return { report: report as Report, generating: false };

  // No complete report — is one being generated right now?
  const { data: generating } = await supabase
    .from('regulatory_reports')
    .select('report_date, status')
    .eq('status', 'generating')
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { report: null, generating: Boolean(generating) };
}

// Archive depth by tier — mirrors the old app/api/findings/route.ts.
const ARCHIVE_DAYS: Record<string, number> = { enterprise: 3650, pro: 90, basic: 30 };

export async function fetchFindings(
  supabase: SupabaseClient,
  opts: { limit?: number } = {},
): Promise<Finding[]> {
  const limit = Math.min(opts.limit ?? 1000, 1000);

  // Tier drives archive depth. RLS already blocks non-subscribers entirely.
  const { data: { user } } = await supabase.auth.getUser();
  let archiveDays = 7;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();
    archiveDays = ARCHIVE_DAYS[profile?.subscription_tier ?? ''] ?? 7;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - archiveDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const { data: findings } = await supabase
    .from('regulatory_findings')
    // is_comment_deadline_soon is a computed column; select=* omits it, so name it.
    .select('*, is_comment_deadline_soon')
    .gte('report_date', cutoffStr)
    .order('report_date', { ascending: false })
    .order('priority_rank', { ascending: true }) // urgent first — see migrations/002
    .limit(limit);

  return (findings as Finding[]) ?? [];
}
