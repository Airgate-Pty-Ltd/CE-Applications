-- ============================================================
-- Migration 003 — record where each finding came from
--
-- Run in Supabase: SQL Editor → New Query. Safe to run more than once.
--
-- The ingestion pipeline is now deterministic: findings are pulled from the
-- publishing authority's own structured record rather than inferred by a
-- model from search snippets. These columns carry that provenance through to
-- the UI so a subscriber can always see whether an item is the authority's
-- own data.
--
-- 'verified'   — every field came from an official structured source.
-- 'unverified' — source is not structured; must never be presented as
--                authoritative.
-- ============================================================

alter table public.regulatory_findings
  add column if not exists verification text not null default 'verified';

alter table public.regulatory_findings
  add column if not exists source_id text;

create index if not exists idx_findings_verification
  on public.regulatory_findings(verification);

-- Verify:
--   select verification, source_id, count(*)
--     from public.regulatory_findings
--    group by verification, source_id;
