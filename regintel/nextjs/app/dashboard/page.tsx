'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Finding, Report } from '@/lib/types';
import { createBrowserSupabase } from '@/lib/supabase-client';
import { fetchLatestReport, fetchFindings } from '@/lib/data';
import { FindingCard } from './FindingCard';
import Markdown from '@/app/_components/Markdown';
import { formatLabel } from '@/lib/labels';
import {
  RefreshIcon, ArchiveIcon, SearchIcon, AlertIcon, FilterIcon,
  DownloadIcon, PrinterIcon,
} from '@/app/_components/icons';

// Filter facets are derived from the findings actually loaded, never from a
// hardcoded list. The old fixed list offered ISO, SAE, IAQG and IATF — licensed
// standards bodies RegIntel must not scrape, so those chips could only ever
// return nothing while implying coverage that will never exist — and omitted
// NHTSA, MHRA, DVSA and OPSS, which are covered. Deriving them also means new
// sources appear here the day they start producing findings.
const PRIORITY_ORDER = ['urgent', 'high', 'normal', 'low'];

// How many findings the feed pulls in one go. The urgent and deadline tiles are
// computed over what is fetched, so a short page would under-report them — an
// urgent airworthiness directive sitting just past the cut is exactly the thing
// this product exists to surface. Kept at the API's ceiling; see the note in
// app/api/findings/route.ts about paginating once volume outgrows this.
const FEED_LIMIT = 1000;

export default function DashboardPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'report'>('feed');
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    authorities: [] as string[],
    categories: [] as string[],
    priorities: [] as string[],
    // Not a facet of the findings the way the others are — it is the
    // is_comment_deadline_soon computed column, driven by the KPI tile.
    deadlineSoon: false,
  });

  // Fetch latest report + findings
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Query Supabase directly from the browser. RLS gates both tables to
        // active/trialing subscribers, so this is as safe as the old server
        // route — and needs no Node server, so RegIntel ships as a static site.
        const supabase = createBrowserSupabase();
        const [{ report, generating }, loadedFindings] = await Promise.all([
          fetchLatestReport(supabase),
          fetchFindings(supabase, { limit: FEED_LIMIT }),
        ]);

        if (generating) setGenerating(true);
        if (report) setReport(report);
        setFindings(loadedFindings);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Counts come from the whole result set, not the filtered view, so a chip
  // still tells you how much is behind it once something else is selected.
  const facets = useMemo(() => {
    const tally = (pick: (f: Finding) => string | undefined) => {
      const m = new Map<string, number>();
      for (const f of findings) {
        const v = pick(f);
        if (v) m.set(v, (m.get(v) ?? 0) + 1);
      }
      return m;
    };
    const byCount = (m: Map<string, number>) =>
      [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const priorities = tally(f => f.priority);
    return {
      authorities: byCount(tally(f => f.authority)),
      categories: byCount(tally(f => f.category)),
      priorities: PRIORITY_ORDER.filter(p => priorities.has(p)).map(p => [p, priorities.get(p)!] as [string, number]),
    };
  }, [findings]);

  const filtered = useMemo(() => {
    let f = [...findings];
    if (filters.authorities.length) f = f.filter(x => filters.authorities.includes(x.authority));
    if (filters.categories.length) f = f.filter(x => filters.categories.includes(x.category));
    if (filters.priorities.length) f = f.filter(x => filters.priorities.includes(x.priority));
    if (filters.deadlineSoon) f = f.filter(x => x.is_comment_deadline_soon);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      f = f.filter(x =>
        x.title?.toLowerCase().includes(q) ||
        x.summary?.toLowerCase().includes(q) ||
        x.authority?.toLowerCase().includes(q) ||
        x.document_number?.toLowerCase().includes(q));
    }
    return f;
  }, [findings, filters, query]);

  function toggleFilter(type: 'authorities' | 'categories' | 'priorities', value: string) {
    setFilters(prev => {
      const arr = prev[type];
      return { ...prev, [type]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }
  function clearFilters() {
    setFilters({ authorities: [], categories: [], priorities: [], deadlineSoon: false });
  }

  // The KPI tiles double as filters. Urgent replaces the priority selection
  // rather than adding to it: the tile reads as "show me the urgent ones", so
  // clicking it while 'low' is selected should not widen the list.
  function toggleUrgentOnly() {
    setFilters(prev => ({
      ...prev,
      priorities: prev.priorities.length === 1 && prev.priorities[0] === 'urgent' ? [] : ['urgent'],
    }));
  }
  function toggleDeadlineSoon() {
    setFilters(prev => ({ ...prev, deadlineSoon: !prev.deadlineSoon }));
  }

  const urgentOnly = filters.priorities.length === 1 && filters.priorities[0] === 'urgent';

  const activeFilterCount =
    filters.authorities.length + filters.categories.length + filters.priorities.length +
    (filters.deadlineSoon ? 1 : 0);
  const urgentFindings = findings.filter(f => f.priority === 'urgent');
  const soonCount = findings.filter(f => f.is_comment_deadline_soon).length;

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="px-5 sm:px-8 py-6 max-w-[1060px] mx-auto">
      {/* Topbar */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="uppercase tracking-[0.12em] text-[11px] font-bold text-accent mb-1.5">{dateLabel}</p>
          <h1 className="text-[25px] leading-tight font-bold tracking-[-0.02em] text-ink">Regulatory feed</h1>
          <p className="text-[13.5px] text-muted mt-1.5">
            {report
              ? `Latest report ${report.report_date} · ${report.total_items_found} items found`
              : generating ? 'Generating today’s report…' : loading ? 'Loading…' : 'No report yet'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 text-[13px] font-semibold px-3.5 py-2.5 rounded-xl border border-line-strong bg-surface text-ink hover:border-faint transition"
          >
            <RefreshIcon size={15} /> Refresh
          </button>
          <a
            href="/dashboard/archive"
            className="inline-flex items-center gap-2 text-[13px] font-semibold px-3.5 py-2.5 rounded-xl bg-brand text-white hover:brightness-110 transition"
          >
            <ArchiveIcon size={15} /> Archive
          </a>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {/* The tiles are the primary filter control: click one to narrow the
            feed below, click it again to undo. Counts stay whole-report totals
            so they remain a fixed reference while filtering. */}
        <Kpi
          label="Items today"
          dot="bg-steel"
          // findings.length, NOT report.total_items_found: the report counts
          // what the ingestion window saw, which diverges from the feed the
          // moment the window changes — a 14-day run against a 60-day backfill
          // put 203 in this tile above a feed listing 617. The tile has to
          // agree with the list under it.
          value={loading ? '—' : findings.length}
          sub={activeFilterCount ? 'show everything' : 'in the latest report'}
          onClick={() => { clearFilters(); setActiveTab('feed'); }}
          // Never marked active: this tile widens rather than narrows, so a
          // "Filtering" ring on it would say the opposite of what it does. The
          // calm state — nothing ringed — is what "no filters" should look like.
          active={false}
          disabled={loading}
        />
        <Kpi
          label="Urgent"
          dot="bg-crit-line"
          value={loading ? '—' : urgentFindings.length}
          sub={urgentFindings.length ? 'need attention now' : 'nothing urgent'}
          alert={urgentFindings.length > 0}
          onClick={() => { toggleUrgentOnly(); setActiveTab('feed'); }}
          active={urgentOnly}
          disabled={loading || urgentFindings.length === 0}
        />
        <Kpi
          label="Deadlines soon"
          dot="bg-high-line"
          value={loading ? '—' : soonCount}
          sub="comment windows closing"
          onClick={() => { toggleDeadlineSoon(); setActiveTab('feed'); }}
          active={filters.deadlineSoon}
          disabled={loading || soonCount === 0}
        />
        <Kpi
          label="Authorities"
          dot="bg-good-line"
          value={loading ? '—' : new Set(findings.map(f => f.authority)).size}
          sub={filters.authorities.length ? `${filters.authorities.length} selected` : 'covered in this report'}
          onClick={() => { setShowFilters(v => !v); setActiveTab('feed'); }}
          active={filters.authorities.length > 0}
          disabled={loading}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <div className="inline-flex bg-surface border border-line rounded-xl p-1 shadow-card">
          {(['feed', 'report'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-lg transition ${
                activeTab === tab ? 'bg-brand text-white' : 'text-muted hover:text-ink'
              }`}
            >
              {tab === 'feed' ? `Feed (${filtered.length})` : 'Full report'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`inline-flex items-center gap-2 text-[12.5px] font-semibold px-3 py-2 rounded-xl border shadow-card transition ${
            activeFilterCount ? 'bg-accent-soft text-accent-ink border-accent' : 'bg-surface text-muted border-line hover:text-ink hover:border-faint'
          }`}
        >
          <FilterIcon size={14} /> Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-[12.5px] font-semibold text-steel hover:underline px-1">Clear</button>
        )}

        <div className="ml-auto inline-flex items-center gap-2 bg-surface border border-line rounded-xl px-3 py-2 shadow-card min-w-[210px]">
          <SearchIcon size={15} className="text-faint" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search findings…"
            className="bg-transparent outline-none text-[13px] text-ink placeholder:text-faint w-full"
          />
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-surface border border-line rounded-xl shadow-card p-4 mb-5 flex flex-col gap-4">
          <FilterGroup label="Authority" options={facets.authorities} selected={filters.authorities} onToggle={v => toggleFilter('authorities', v)} />
          <FilterGroup label="Category" options={facets.categories} selected={filters.categories} onToggle={v => toggleFilter('categories', v)} />
          <FilterGroup label="Priority" options={facets.priorities} selected={filters.priorities} onToggle={v => toggleFilter('priorities', v)} />
        </div>
      )}

      {/* Urgent banner */}
      {!loading && activeTab === 'feed' && urgentFindings.length > 0 && (
        <div className="flex items-center gap-3 bg-crit-bg border-l-4 border-crit-line rounded-lg px-4 py-3 mb-5">
          <AlertIcon size={18} className="text-crit-line shrink-0" />
          <b className="text-[13px] text-crit-ink">{urgentFindings.length} urgent {urgentFindings.length === 1 ? 'item' : 'items'}</b>
          <span className="text-[13px] text-crit-ink">need attention</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-faint">Loading…</div>
      ) : generating ? (
        <div className="text-center py-20">
          <div className="w-9 h-9 border-[3px] border-line-strong border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-medium text-ink">Today&apos;s report is being generated.</p>
          <p className="text-sm mt-1.5 text-muted">Typically takes 2–4 minutes. Refresh to check.</p>
        </div>
      ) : activeTab === 'feed' ? (
        <FindingsFeed findings={filtered} onClear={activeFilterCount || query ? () => { clearFilters(); setQuery(''); } : undefined} />
      ) : (
        <ReportView markdown={report?.full_report_markdown} />
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function Kpi({
  label, value, sub, dot, alert, onClick, active, disabled,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  dot: string;
  alert?: boolean;
  /** Omit to render a plain, non-interactive tile. */
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const base = `rounded-xl border p-4 shadow-card text-left w-full transition ${
    alert ? 'bg-crit-bg border-crit-line/40' : 'bg-surface border-line'
  }`;
  // The active ring has to read at a glance: these tiles are how you tell what
  // the list below is currently narrowed to.
  const interactive = onClick
    ? ` cursor-pointer hover:border-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active ? 'ring-2 ring-accent border-accent' : ''
      }${disabled ? ' opacity-60 cursor-not-allowed' : ''}`
    : '';

  const body = (
    <>
      <div className={`flex items-center justify-between gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] ${alert ? 'text-crit-ink' : 'text-muted'}`}>
        <span className="flex items-center gap-1.5">
          <span className={`w-[7px] h-[7px] rounded-full ${dot}`} /> {label}
        </span>
        {active && <span className="text-[10px] font-bold text-accent normal-case tracking-normal">Filtering</span>}
      </div>
      <div className={`text-[30px] font-bold tracking-[-0.02em] leading-none mt-2 tabular-nums ${alert ? 'text-crit-ink' : 'text-ink'}`}>{value}</div>
      <div className="text-[11.5px] text-muted mt-1.5">{sub}</div>
    </>
  );

  if (!onClick) return <div className={base}>{body}</div>;

  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={!!active} className={base + interactive}>
      {body}
    </button>
  );
}

function FilterGroup({ label, options, selected, onToggle }: {
  label: string; options: [string, number][]; selected: string[]; onToggle: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([opt, count]) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              aria-pressed={on}
              className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border transition ${
                on ? 'bg-accent-soft text-accent-ink border-accent' : 'bg-surface-2 text-muted border-line hover:text-ink hover:border-faint'
              }`}
            >
              {formatLabel(opt)}
              <span className="ml-1.5 tabular-nums opacity-60 normal-case">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FindingsFeed({ findings, onClear }: { findings: Finding[]; onClear?: () => void }) {
  if (findings.length === 0) {
    return (
      <div className="text-center py-20 text-faint">
        <p className="text-base">No findings match your filters.</p>
        {/* Filtering to nothing is a dead end without a way back out. */}
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mt-4 text-[13px] font-semibold px-4 py-2 rounded-lg border border-line-strong bg-surface text-ink hover:border-faint transition"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {findings.map(f => <FindingCard key={f.id} finding={f} />)}
    </div>
  );
}

// Rendered with react-markdown rather than regex → dangerouslySetInnerHTML.
//
// This content is written from third-party search snippets, so it is untrusted:
// a crafted page title could previously have injected markup straight into the
// DOM. react-markdown does not render raw HTML unless rehype-raw is added — do
// not add it here.
function ReportView({ markdown }: { markdown?: string }) {
  if (!markdown) {
    return <p className="text-faint text-center py-20">No report available.</p>;
  }
  return (
    <div>
      <div className="flex gap-2.5 mb-4">
        <button
          onClick={() => {
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'regintel-report.md'; a.click();
          }}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink hover:border-faint transition"
        >
          <DownloadIcon size={15} /> Download Markdown
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border border-line-strong rounded-lg bg-surface text-ink hover:border-faint transition"
        >
          <PrinterIcon size={15} /> Print / Save PDF
        </button>
      </div>
      <div className="bg-surface border border-line rounded-xl shadow-card p-6 max-w-none text-sm">
        <Markdown>{markdown}</Markdown>
      </div>
    </div>
  );
}
