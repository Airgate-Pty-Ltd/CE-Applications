'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase-client';
import { PlayIcon, ShieldIcon, ExternalIcon } from '@/app/_components/icons';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';

interface Subscriber {
  id: string;
  email: string;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
  stripe_customer_id: string | null;
}

interface ReportRow {
  id: string;
  report_date: string;
  status: string;
  // Real column names on public.regulatory_reports. There is no urgent_count
  // column; priority_alerts is the jsonb array of urgent items.
  total_items_found: number | null;
  priority_alerts: unknown[] | null;
  error_message: string | null;
}

interface Stats {
  total: number;
  active: number;
  trialing: number;
  byTier: { basic: number; pro: number; enterprise: number };
  mrr: number;
}

const TIER_BADGE: Record<string, string> = {
  enterprise: 'bg-norm-bg text-norm-ink',
  pro: 'bg-accent-soft text-accent-ink',
  basic: 'bg-low-bg text-low-ink',
};
const STATUS_BADGE: Record<string, string> = {
  active: 'bg-good-bg text-good-ink',
  complete: 'bg-good-bg text-good-ink',
  trialing: 'bg-norm-bg text-norm-ink',
  generating: 'bg-norm-bg text-norm-ink',
  past_due: 'bg-crit-bg text-crit-ink',
  error: 'bg-crit-bg text-crit-ink',
  canceled: 'bg-low-bg text-low-ink',
  cancelled: 'bg-low-bg text-low-ink',
};

export default function AdminPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [tab, setTab] = useState<'subscribers' | 'reports'>('subscribers');

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createBrowserSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) {
        router.replace('/dashboard');
        return;
      }
      setAuthChecked(true);

      const { data: subs } = await supabase
        .from('profiles')
        .select('id, email, subscription_tier, subscription_status, created_at, stripe_customer_id')
        .order('created_at', { ascending: false });

      if (subs) {
        setSubscribers(subs);
        const active = subs.filter(s => s.subscription_status === 'active');
        const trialing = subs.filter(s => s.subscription_status === 'trialing');
        const tierPrices = { basic: 29, pro: 79, enterprise: 299 };
        const mrr = active.reduce((acc, s) => acc + (tierPrices[s.subscription_tier as keyof typeof tierPrices] || 0), 0);
        setStats({
          total: subs.length,
          active: active.length,
          trialing: trialing.length,
          byTier: {
            basic: subs.filter(s => s.subscription_tier === 'basic').length,
            pro: subs.filter(s => s.subscription_tier === 'pro').length,
            enterprise: subs.filter(s => s.subscription_tier === 'enterprise').length,
          },
          mrr,
        });
      }

      const { data: rpts } = await supabase
        .from('regulatory_reports')
        .select('id, report_date, status, total_items_found, priority_alerts, error_message')
        .order('report_date', { ascending: false })
        .limit(30);

      if (rpts) setReports(rpts);
    }

    checkAdmin();
  }, [router]);

  function triggerReport() {
    // RegIntel is a static site with no server endpoint to call. Ingestion runs
    // as a scheduled job (the Python scraper on a daily schedule) that writes
    // directly to Supabase. There is nothing to trigger from the browser.
    setTriggerResult({
      ok: false,
      msg: 'Ingestion runs on a daily schedule and writes to Supabase directly — there is no in-app trigger. To run it on demand, run the scraper job manually (see RUNBOOK.md).',
    });
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-line-strong border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Admin panel</h1>
          <span className="inline-flex items-center gap-1 bg-crit-bg text-crit-ink text-xs font-bold px-2 py-0.5 rounded-full">
            <ShieldIcon size={12} /> Admin only
          </span>
        </div>
        <Link href="/dashboard" className="text-sm text-muted hover:text-ink transition-colors">Back to dashboard</Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
          {[
            { label: 'Total users', value: stats.total, sub: 'all time' },
            { label: 'Active', value: stats.active, sub: 'paying subscribers' },
            { label: 'Trialing', value: stats.trialing, sub: 'free trial' },
            { label: 'MRR', value: `$${stats.mrr}`, sub: 'active subs only' },
          ].map(card => (
            <div key={card.label} className="bg-surface rounded-xl border border-line p-4 shadow-card">
              <p className="text-[11.5px] text-muted font-semibold uppercase tracking-[0.05em] mb-1">{card.label}</p>
              <p className="text-[28px] font-bold text-ink leading-none tabular-nums">{card.value}</p>
              <p className="text-xs text-faint mt-1.5">{card.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tier breakdown */}
      {stats && (
        <div className="grid grid-cols-3 gap-3.5 mb-6">
          {[
            { tier: 'Basic', count: stats.byTier.basic },
            { tier: 'Pro', count: stats.byTier.pro },
            { tier: 'Enterprise', count: stats.byTier.enterprise },
          ].map(t => (
            <div key={t.tier} className="bg-surface rounded-xl border border-line p-4 text-center shadow-card">
              <p className="text-[26px] font-bold text-ink tabular-nums">{t.count}</p>
              <p className="text-xs font-semibold text-muted">{t.tier}</p>
            </div>
          ))}
        </div>
      )}

      {/* Report trigger */}
      <div className="bg-rail rounded-xl p-5 mb-6 text-white">
        <h2 className="font-bold mb-2">Trigger report generation</h2>
        <p className="text-sm text-rail-ink mb-4 leading-relaxed">
          Normally runs automatically weekdays at 6 AM MT. Use this to trigger manually.
          Note: the UI trigger won&apos;t work without the CRON_SECRET header — trigger from
          Railway or use the cron endpoint directly with the secret.
        </p>
        <button
          onClick={triggerReport}
          disabled={triggerLoading}
          className="inline-flex items-center gap-2 bg-accent hover:brightness-105 text-[#1a2744] font-bold px-5 py-2 rounded-lg transition disabled:opacity-60"
        >
          <PlayIcon size={15} /> {triggerLoading ? 'Triggering…' : 'Trigger report now'}
        </button>
        {triggerResult && (
          <p className={`mt-3 text-sm font-medium ${triggerResult.ok ? 'text-good-line' : 'text-crit-line'}`}>{triggerResult.msg}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(['subscribers', 'reports'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === t ? 'bg-brand text-white' : 'bg-surface border border-line text-muted hover:text-ink'
            }`}
          >
            {t === 'subscribers' ? `Subscribers (${subscribers.length})` : `Report history (${reports.length})`}
          </button>
        ))}
      </div>

      {/* Subscribers table */}
      {tab === 'subscribers' && (
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 border-b border-line">
                <tr>
                  <th className="text-left p-4 font-semibold text-muted">Email</th>
                  <th className="p-4 font-semibold text-muted text-center">Tier</th>
                  <th className="p-4 font-semibold text-muted text-center">Status</th>
                  <th className="p-4 font-semibold text-muted text-center">Joined</th>
                  <th className="p-4 font-semibold text-muted text-center">Stripe</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map(sub => (
                  <tr key={sub.id} className="border-b border-line last:border-0">
                    <td className="p-4 font-medium text-ink">{sub.email}</td>
                    <td className="p-4 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${TIER_BADGE[sub.subscription_tier] || 'bg-low-bg text-low-ink'}`}>
                        {sub.subscription_tier}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[sub.subscription_status] || 'bg-low-bg text-low-ink'}`}>
                        {sub.subscription_status}
                      </span>
                    </td>
                    <td className="p-4 text-center text-muted text-xs tabular-nums">
                      {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-center">
                      {sub.stripe_customer_id ? (
                        <a
                          href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-steel hover:underline"
                        >
                          View <ExternalIcon size={12} />
                        </a>
                      ) : (
                        <span className="text-xs text-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports table */}
      {tab === 'reports' && (
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 border-b border-line">
                <tr>
                  <th className="text-left p-4 font-semibold text-muted">Date</th>
                  <th className="p-4 font-semibold text-muted text-center">Status</th>
                  <th className="p-4 font-semibold text-muted text-center">Total</th>
                  <th className="p-4 font-semibold text-muted text-center">Urgent</th>
                  <th className="text-left p-4 font-semibold text-muted">Error</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="p-4 font-medium text-ink tabular-nums">{r.report_date}</td>
                    <td className="p-4 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status] || 'bg-low-bg text-low-ink'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-center text-muted tabular-nums">{r.total_items_found ?? '—'}</td>
                    <td className="p-4 text-center tabular-nums">
                      {(r.priority_alerts?.length || 0) > 0
                        ? <span className="text-crit-ink font-bold">{r.priority_alerts!.length}</span>
                        : <span className="text-faint">0</span>}
                    </td>
                    <td className="p-4 text-xs text-crit-ink max-w-xs truncate">{r.error_message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
