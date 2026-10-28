-- ============================================================
-- Migration 004 — "what changed since your last login"
--
-- Run in Supabase: SQL Editor → New Query. Safe to run more than once.
--
-- THE PROBLEM
-- Findings were stored per report per day. With a daily run over a trailing
-- window, the same regulatory document became a new row every single day —
-- so there was no way to ask "is this new to me?", and a subscriber opening
-- Tuesday's report saw mostly what they already read on Monday. On a product
-- whose promise is surfacing what changed, that buries the signal.
--
-- THE FIX
-- A finding becomes a DOCUMENT with a stable identity, seen many times:
--   finding_key     stable identity (document number, else source URL)
--   first_seen_at   when RegIntel first ingested it — NEVER updated
--   last_seen_at    most recent run that still returned it
--   content_hash    detects a document changing after publication
--   last_changed_at when the content last actually differed
--
-- and each user carries last_reviewed_at, so the delta is per-subscriber.
--
-- Detecting CHANGE matters as much as detecting new: an extended comment
-- deadline or an amended effective date is news, and previously it would have
-- been silently overwritten.
-- ============================================================

-- --- 1. Give findings a stable identity ---------------------------------

alter table public.regulatory_findings
  add column if not exists finding_key   text,
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists last_seen_at  timestamptz not null default now(),
  add column if not exists content_hash  text,
  add column if not exists last_changed_at timestamptz;

-- Backfill identity for any existing rows.
update public.regulatory_findings
   set finding_key = coalesce(nullif(document_number, ''), source_url)
 where finding_key is null;

-- Collapse pre-existing per-day duplicates, keeping the earliest sighting.
-- Runs before the unique index so the index can be created successfully.
with ranked as (
  select id,
         finding_key,
         min(created_at) over (partition by finding_key) as earliest,
         row_number() over (partition by finding_key order by created_at) as rn
    from public.regulatory_findings
   where finding_key is not null
)
delete from public.regulatory_findings f
 using ranked r
 where f.id = r.id
   and r.rn > 1;

alter table public.regulatory_findings
  alter column finding_key set not null;

create unique index if not exists uq_findings_key
  on public.regulatory_findings(finding_key);

create index if not exists idx_findings_first_seen
  on public.regulatory_findings(first_seen_at desc);

-- --- 2. Track what each subscriber has already reviewed ------------------

-- Nullable on purpose: NULL means "has never reviewed", which the app treats
-- as "show the current window" rather than "show everything ever".
alter table public.profiles
  add column if not exists last_reviewed_at timestamptz;

-- Users may advance their own review marker, but must not touch billing
-- columns. Migration 001 revoked table-wide UPDATE; re-grant only this one.
grant update (last_reviewed_at) on public.profiles to authenticated;

-- --- 3. Verify -----------------------------------------------------------
-- Per-user delta:
--   select count(*) from regulatory_findings f, profiles p
--    where p.id = auth.uid()
--      and f.first_seen_at > coalesce(p.last_reviewed_at, now() - interval '14 days');
--
-- Should be zero (no duplicate identities remain):
--   select finding_key, count(*) from regulatory_findings
--    group by finding_key having count(*) > 1;
