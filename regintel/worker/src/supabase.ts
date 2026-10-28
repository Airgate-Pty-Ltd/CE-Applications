import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ReportResult, Finding } from './ingest';

// Created lazily so that importing this module does not require Supabase
// credentials. Without this, `generate-once --dry-run` (which needs none)
// crashes at import time.
let client: SupabaseClient | null = null;

function supabaseClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // service role — bypasses RLS
    if (!url || !key) {
      throw new Error(
        'Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      );
    }
    client = createClient(url, key);
  }
  return client;
}

export async function saveReport(result: ReportResult): Promise<void> {
  const today = result.report_date;

  // Upsert the report row (handles reruns on same day)
  const { data: report, error: reportError } = await supabaseClient()
    .from('regulatory_reports')
    .upsert(
      {
        report_date: today,
        status: result.status,
        priority_alerts: result.priority_alerts,
        final_rules: result.final_rules,
        open_nprs: result.open_nprs,
        advisory_guidance: result.advisory_guidance,
        standards_developments: result.standards_developments,
        international_updates: result.international_updates,
        no_activity: result.no_activity,
        full_report_markdown: result.full_report_markdown,
        authorities_searched: result.authorities_searched,
        total_items_found: result.total_items_found,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'report_date' }
    )
    .select()
    .single();

  if (reportError) throw new Error(`Failed to save report: ${reportError.message}`);

  // Delete any existing findings for today (clean rerun)
  await supabaseClient()
    .from('regulatory_findings')
    .delete()
    .eq('report_date', today);

  // Insert findings
  if (result.findings.length > 0) {
    const rows = result.findings.map((f: Finding & { authority?: string }) => ({
      report_id: report.id,
      report_date: today,
      authority: f.authority || 'UNKNOWN',
      category: f.category,
      priority: f.priority,
      title: f.title,
      summary: f.summary,
      detail: f.detail || null,
      source_url: f.source_url || null,
      effective_date: f.effective_date || null,
      comment_deadline: f.comment_deadline || null,
      document_number: f.document_number || null,
      verification: f.verification,
      source_id: f.source_id,
    }));

    const { error: findingsError } = await supabaseClient()
      .from('regulatory_findings')
      .insert(rows);

    if (findingsError) {
      console.error('Failed to save findings:', findingsError.message);
    }
  }

  console.log(`Saved report ${today} with ${result.findings.length} findings`);
}

export async function markReportError(date: string, message: string): Promise<void> {
  await supabaseClient()
    .from('regulatory_reports')
    .upsert(
      { report_date: date, status: 'error', error_message: message },
      { onConflict: 'report_date' }
    );
}
