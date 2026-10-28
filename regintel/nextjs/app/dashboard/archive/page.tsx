'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase-client';
import { ChevronDownIcon, DownloadIcon, ExternalIcon } from '@/app/_components/icons';
import Markdown from '@/app/_components/Markdown';

// Mirrors the columns that actually exist on public.regulatory_reports.
// There is no urgent_count/high_count column: `priority_alerts` is the jsonb
// array of the urgent items, so its length IS the urgent count.
interface ReportSummary {
  id: string;
  report_date: string;
  status: string;
  total_items_found: number | null;
  priority_alerts: unknown[] | null;
}

export default function ArchivePage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<string>('basic');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      const userTier = profile?.subscription_tier || 'basic';
      setTier(userTier);

      // Compute archive cutoff by tier
      const now = new Date();
      let cutoff: string | null = null;
      if (userTier === 'basic') {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        cutoff = d.toISOString().split('T')[0];
      } else if (userTier === 'pro') {
        const d = new Date(now);
        d.setDate(d.getDate() - 90);
        cutoff = d.toISOString().split('T')[0];
      }
      // enterprise: no cutoff

      let query = supabase
        .from('regulatory_reports')
        .select('id, report_date, status, total_items_found, priority_alerts')
        .eq('status', 'complete')
        .order('report_date', { ascending: false });

      if (cutoff) {
        query = query.gte('report_date', cutoff);
      }

      const { data } = await query;
      setReports(data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function openReport(id: string) {
    if (selectedReport === id) {
      setSelectedReport(null);
      setReportContent(null);
      return;
    }
    setSelectedReport(id);
    setLoadingReport(true);
    setReportContent(null);

    const supabase = createBrowserSupabase();
    const { data } = await supabase
      .from('regulatory_reports')
      .select('full_report_markdown')
      .eq('id', id)
      .single();

    setReportContent(data?.full_report_markdown || '*Report content unavailable.*');
    setLoadingReport(false);
  }

  function downloadReport(date: string, content: string) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regintel-report-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const archiveLabel = tier === 'enterprise' ? 'Unlimited' : tier === 'pro' ? '90 days' : '30 days';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-[3px] border-line-strong border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Report archive</h1>
          <p className="text-sm text-muted mt-1">Archive depth: <span className="font-semibold text-ink">{archiveLabel}</span></p>
        </div>
        {tier === 'basic' && (
          <a
            href="/dashboard/profile"
            className="text-xs bg-accent text-[#1a2744] font-bold px-3.5 py-2 rounded-lg hover:brightness-105 transition"
          >
            Upgrade for 90-day archive
          </a>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-12 text-center shadow-card">
          <p className="text-muted text-base mb-1">No reports yet</p>
          <p className="text-sm text-faint">Reports are generated every weekday morning. Check back Monday.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map(report => {
            const date = new Date(report.report_date + 'T12:00:00');
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            const fullDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const isOpen = selectedReport === report.id;

            return (
              <div key={report.id} className="bg-surface rounded-xl border border-line overflow-hidden shadow-card">
                <button
                  onClick={() => openReport(report.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-faint font-medium">{dayName}</p>
                      <p className="text-sm font-bold text-ink tabular-nums">{fullDate}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(report.priority_alerts?.length || 0) > 0 && (
                        <span className="text-xs bg-crit-bg text-crit-ink font-bold px-2.5 py-0.5 rounded-full tabular-nums">{report.priority_alerts!.length} urgent</span>
                      )}
                      {report.total_items_found != null && (
                        <span className="text-xs bg-low-bg text-low-ink px-2.5 py-0.5 rounded-full tabular-nums">{report.total_items_found} total</span>
                      )}
                    </div>
                  </div>
                  <ChevronDownIcon size={18} className={`text-faint transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-line">
                    {loadingReport ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="w-6 h-6 border-[3px] border-line-strong border-t-accent rounded-full animate-spin" />
                      </div>
                    ) : reportContent ? (
                      <div className="p-5">
                        <div className="flex justify-end mb-4">
                          <button
                            onClick={() => downloadReport(report.report_date, reportContent)}
                            className="inline-flex items-center gap-1.5 text-xs bg-brand text-white font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition"
                          >
                            <DownloadIcon size={14} /> Download .md
                          </button>
                        </div>
                        <div className="bg-surface-2 border border-line rounded-lg p-5 max-h-[32rem] overflow-y-auto">
                          <Markdown>{reportContent}</Markdown>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tier !== 'enterprise' && reports.length > 0 && (
        <div className="mt-8 bg-surface-2 rounded-xl p-5 text-center border border-line">
          <p className="text-sm text-ink font-medium mb-3">
            {tier === 'basic' ? 'Upgrade to Pro for 90-day archive access.' : 'Upgrade to Enterprise for unlimited archive history.'}
          </p>
          <a
            href="/dashboard/profile"
            className="inline-flex items-center gap-1.5 bg-brand text-white font-semibold text-sm px-5 py-2 rounded-lg hover:brightness-110 transition"
          >
            Upgrade plan <ExternalIcon size={14} />
          </a>
        </div>
      )}
    </div>
  );
}
