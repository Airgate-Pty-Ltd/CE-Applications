-- ============================================================
-- Migration 002 — sort findings by real priority, not alphabetically
--
-- Run in Supabase: SQL Editor → New Query. Safe to run more than once.
--
-- THE PROBLEM
-- /api/findings ordered by the `priority` text column ascending, with the
-- comment "urgent first". Alphabetically that is:
--
--   high, low, normal, urgent
--
-- so urgent items sorted LAST, and with a row limit applied they could fall
-- off the response entirely — on a product whose whole promise is surfacing
-- urgent regulatory changes.
--
-- THE FIX
-- A stored generated column with the real severity order, plus an index.
-- ============================================================

alter table public.regulatory_findings
  add column if not exists priority_rank smallint
  generated always as (
    case priority
      when 'urgent' then 0
      when 'high'   then 1
      when 'normal' then 2
      when 'low'    then 3
      else 4
    end
  ) stored;

create index if not exists idx_findings_priority_rank
  on public.regulatory_findings(priority_rank);

-- Verify:
--   select priority, priority_rank
--     from public.regulatory_findings
--    group by priority, priority_rank
--    order by priority_rank;
--
-- Expected: urgent=0, high=1, normal=2, low=3
