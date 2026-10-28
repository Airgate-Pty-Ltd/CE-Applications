-- ============================================================
-- Migration 007 — clause-level regulatory corpus (DOCUMENT / VERSION /
-- REGULATORY_NODE / CHANGE_EVENT)
--
-- Run in Supabase: SQL Editor → New Query. Safe to run more than once.
--
-- WHY THESE ARE SEPARATE FROM regulatory_findings
-- A `regulatory_finding` is a PUBLICATION EVENT: "EASA issued ED Decision
-- 2026/005/R on this date". It is what a subscriber reads in the daily feed.
--
-- These tables hold something different: the CONSOLIDATED RULE TEXT itself,
-- broken into the smallest meaningful unit (an Article, an AMC, a GM), tracked
-- across revisions. One Easy Access Rules publication yields ~300 nodes, so
-- emitting them into the feed would bury the handful of items that actually
-- changed. The feed keeps showing publications; this corpus answers "what
-- exactly changed inside them".
--
-- NO LLM TOUCHES ANY OF THIS. Every column is copied from the publisher's own
-- structured record (EASA eRules XML export, which ships a published XSD).
-- Dates are the authority's EntryIntoForceDate / ApplicabilityDate attributes,
-- never inferred from prose. A node whose date attribute says "n/a" stores
-- NULL — see the no-guessed-dates rule in HANDOVER.md.
-- ============================================================

-- --- DOCUMENT: a publication that has a consolidated text -----------------
create table if not exists public.regulatory_documents (
  id            uuid primary key default gen_random_uuid(),
  authority     text not null,
  -- Stable slug for the publication, e.g. 'easa:easy-access-rules-unmanned-aircraft-systems'
  document_key  text not null unique,
  title         text not null,
  source_url    text,
  -- 'easy_access_rules', 'ccar', ... — the publisher's own document class.
  document_class text,
  created_at    timestamptz not null default now()
);

-- --- VERSION: one retrieved revision of that document ---------------------
create table if not exists public.regulatory_versions (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references public.regulatory_documents(id) on delete cascade,
  -- The publisher's own revision label, e.g. 'Revision June 2026'.
  revision      text not null,
  -- pub-time from the export; the authority's timestamp, not ours.
  published_at  timestamptz,
  retrieved_at  timestamptz not null default now(),
  source_url    text,
  source_format text not null default 'EASA-eRules-XML',
  node_count    integer not null default 0,
  -- sha256 over the ordered node hashes: cheap "did anything change at all".
  content_hash  text,
  unique (document_id, revision)
);

-- --- REGULATORY_NODE: the smallest meaningful regulatory unit -------------
create table if not exists public.regulatory_nodes (
  id                uuid primary key default gen_random_uuid(),
  version_id        uuid not null references public.regulatory_versions(id) on delete cascade,
  document_id       uuid not null references public.regulatory_documents(id) on delete cascade,
  -- The publisher's stable identifier (EASA ERulesId). This is what makes a
  -- node the SAME node across revisions, so deltas are real rather than
  -- position-based guesses.
  node_key          text not null,
  ordinal           integer not null,
  title             text,
  -- Publisher's TypeOfContent: 'IR (Implementing rule)', 'AMC to IR', 'GM to IR' …
  node_type         text,
  -- Publisher's RegulatorySource: 'Regulation (EU) 2019/947', 'ED Decision 2025/018/R'
  regulatory_source text,
  parent_ir         text,
  amended_by        text,
  -- The authority's own dates. NULL where the export says 'n/a'.
  entry_into_force  date,
  applicability_date date,
  body              text,
  content_hash      text not null,
  unique (version_id, node_key)
);

-- --- CHANGE_EVENT: the delta between two versions of a document ----------
create table if not exists public.regulatory_change_events (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references public.regulatory_documents(id) on delete cascade,
  from_version_id uuid references public.regulatory_versions(id) on delete set null,
  to_version_id   uuid not null references public.regulatory_versions(id) on delete cascade,
  node_key        text not null,
  -- 'added' | 'changed' | 'removed'
  change_type     text not null,
  title           text,
  node_type       text,
  -- Which fields moved, for a changed node: {"body":true,"entry_into_force":true}
  changed_fields  jsonb,
  detected_at     timestamptz not null default now(),
  unique (to_version_id, node_key)
);

-- ============================================================
-- Row Level Security + privileges
--
-- Same gate as the findings: active/trialing subscribers read, service role
-- writes. RLS decides which rows; the grants decide whether the statement may
-- run at all — both are required (see the note in schema.sql).
-- ============================================================
alter table public.regulatory_documents     enable row level security;
alter table public.regulatory_versions      enable row level security;
alter table public.regulatory_nodes         enable row level security;
alter table public.regulatory_change_events enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'regulatory_documents','regulatory_versions','regulatory_nodes','regulatory_change_events'
  ] loop
    execute format(
      'create policy "Active subscribers can read %1$s" on public.%1$I for select using ('
      || ' exists (select 1 from public.profiles where id = auth.uid()'
      || ' and subscription_status in (''active'',''trialing'')))', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
exception when duplicate_object then
  null;  -- policies already present; re-running the migration is not an error
end $$;

create index if not exists idx_regnodes_document   on public.regulatory_nodes(document_id);
create index if not exists idx_regnodes_version    on public.regulatory_nodes(version_id);
create index if not exists idx_regnodes_key        on public.regulatory_nodes(node_key);
create index if not exists idx_regnodes_type       on public.regulatory_nodes(node_type);
create index if not exists idx_regnodes_eif        on public.regulatory_nodes(entry_into_force);
create index if not exists idx_regversions_doc     on public.regulatory_versions(document_id, retrieved_at desc);
create index if not exists idx_regchanges_doc      on public.regulatory_change_events(document_id, detected_at desc);
create index if not exists idx_regchanges_type     on public.regulatory_change_events(change_type);
