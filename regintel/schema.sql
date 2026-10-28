-- ============================================================
-- Conform-Edge RegIntel™ — Supabase Database Schema
-- Run this in your Supabase project: SQL Editor → New Query
-- ============================================================

-- Profiles (extends Supabase Auth users)
create table public.profiles (
  id uuid references auth.users primary key,
  email text not null,
  full_name text,
  organization text,
  role text, -- 'MRO','PAH','Manufacturer','Consultant','Auditor'
  subscription_status text default 'inactive', -- 'active','inactive','trialing','cancelled'
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_tier text default 'basic', -- 'basic','pro','enterprise'
  trial_ends_at timestamptz,
  -- Stable id from the Conform-Edge website (handoff token `sub` claim).
  website_user_id text,
  -- Advanced only by explicit acknowledgement; drives "since your last login".
  last_reviewed_at timestamptz,
  subscribed_authorities text[],
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Daily reports (one row per day)
create table public.regulatory_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  generated_at timestamptz default now(),
  status text default 'pending', -- 'pending','generating','complete','error'
  priority_alerts jsonb,
  final_rules jsonb,
  open_nprs jsonb,
  advisory_guidance jsonb,
  standards_developments jsonb,
  international_updates jsonb,
  consulting_opportunities jsonb,
  no_activity jsonb,
  full_report_markdown text,
  authorities_searched text[],
  total_items_found integer default 0,
  error_message text
);

-- Individual findings (normalized for filtering)
create table public.regulatory_findings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.regulatory_reports(id) on delete cascade,
  report_date date not null,
  authority text not null,
  category text not null,
  priority text default 'normal',
  title text not null,
  summary text not null,
  detail text,
  source_url text,
  effective_date date,
  comment_deadline date,
  document_number text,
  -- Provenance. 'verified' = every field came from the authority's own
  -- structured record; 'unverified' = source is not structured and the item
  -- must not be presented as authoritative. See migrations/003.
  verification text not null default 'verified',
  source_id text,
  -- Document identity across runs. A finding is a DOCUMENT seen many times,
  -- not a per-day row. See migrations/004.
  finding_key text not null,
  first_seen_at timestamptz not null default now(),  -- NEVER update once set
  last_seen_at timestamptz not null default now(),
  content_hash text,
  last_changed_at timestamptz,
  -- Sort key. Ordering by the `priority` text column is alphabetical
  -- (high, low, normal, urgent), which puts urgent LAST. Always sort on this.
  priority_rank smallint generated always as (
    case priority
      when 'urgent' then 0
      when 'high'   then 1
      when 'normal' then 2
      when 'low'    then 3
      else 4
    end
  ) stored,
  created_at timestamptz default now()
);

-- "Comment deadline within 30 days" depends on TODAY, so it cannot be a stored
-- generated column: Postgres requires a generated expression to be IMMUTABLE,
-- and current_date is only STABLE. (Declaring it anyway fails at create-table
-- time with 42P17 "generation expression is not immutable".) A stored value
-- would also be wrong on its own terms — it would be frozen at write time and
-- silently go stale as the deadline approached.
--
-- Exposed instead as a PostgREST computed column, evaluated at read time.
-- PostgREST does NOT include computed columns in select=*, so clients must ask
-- for it by name: .select('*, is_comment_deadline_soon')
create function public.is_comment_deadline_soon(public.regulatory_findings)
returns boolean
language sql
stable
as $$
  select $1.comment_deadline is not null
     and $1.comment_deadline <= (current_date + interval '30 days')
$$;

grant execute on function public.is_comment_deadline_soon(public.regulatory_findings)
  to anon, authenticated, service_role;

-- Alert preferences per user
create table public.alert_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  authority text not null,
  category text,
  enabled boolean default true,
  unique(user_id, authority, category)
);

-- Audit log for security-relevant events
-- Written by the service role; RLS denies all other access by default.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  actor text,
  ip text,
  user_agent text,
  metadata jsonb,
  error text,
  created_at timestamptz default now()
);
alter table public.audit_log enable row level security;
create index idx_audit_created_at on public.audit_log(created_at desc);
create index idx_audit_event on public.audit_log(event);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.regulatory_reports enable row level security;
alter table public.regulatory_findings enable row level security;
alter table public.alert_preferences enable row level security;
alter table public.audit_log enable row level security;

-- Profiles: users may read their own row, and edit only descriptive fields.
--
-- Do NOT collapse these back into `for all using (id = auth.uid())`. That
-- constrains which ROW is touched but not which COLUMNS, which let any user
-- set their own subscription_status/subscription_tier and take a paid plan
-- for free. RLS cannot restrict columns — the GRANTs below do that.
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- No INSERT/DELETE policy: RLS denies by default. Rows are created by the
-- handle_new_user() trigger (SECURITY DEFINER, so it bypasses RLS).

-- Column-level privileges: billing columns are service-role only, which is
-- what the Stripe webhook already uses.
revoke update on public.profiles from anon, authenticated;

-- `role` is the self-declared business type ('MRO', 'PAH', ...), not an
-- authorisation role.
grant update (full_name, organization, role, subscribed_authorities, last_reviewed_at)
  on public.profiles to authenticated;

revoke insert, delete on public.profiles from anon, authenticated;

-- Reports: active/trialing subscribers can read
create policy "Active subscribers can read reports"
  on public.regulatory_reports for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and subscription_status in ('active','trialing')
    )
  );

-- Findings: same gate as reports
create policy "Active subscribers can read findings"
  on public.regulatory_findings for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and subscription_status in ('active','trialing')
    )
  );

-- Alert prefs: own rows only
create policy "Users manage own alert preferences"
  on public.alert_preferences for all
  using (user_id = auth.uid());

-- ============================================================
-- Table privileges
--
-- RLS decides WHICH ROWS a role may touch; GRANTs decide whether the statement
-- may run at all. Both are required — a table with policies but no grant fails
-- every PostgREST call with 42501 "permission denied". Do not rely on Supabase's
-- default privileges firing for tables created by a migration: on this project
-- they did not, and every API call failed until these were added explicitly.
-- ============================================================

-- Ingestion and admin path. Bypasses RLS by design.
grant select, insert, update, delete on public.profiles            to service_role;
grant select, insert, update, delete on public.regulatory_reports  to service_role;
grant select, insert, update, delete on public.regulatory_findings to service_role;
grant select, insert, update, delete on public.alert_preferences   to service_role;
grant select, insert, update, delete on public.handoff_redemptions to service_role;
grant select, insert on public.audit_log to service_role;

-- Subscribers: read-only on content, gated to active/trialing by the policies.
grant select on public.regulatory_reports  to authenticated;
grant select on public.regulatory_findings to authenticated;

-- profiles: SELECT only at TABLE level. UPDATE stays COLUMN-level (granted
-- above on the five descriptive columns) so a subscriber cannot write their own
-- subscription_status/subscription_tier and take a paid plan for free. Adding a
-- table-level UPDATE grant here would silently undo that protection.
grant select on public.profiles to authenticated;

grant select, insert, update, delete on public.alert_preferences to authenticated;

-- anon is used only for the auth handshake and gets no table access.
-- handoff_redemptions stays service-role-only (see migration 005).

-- ============================================================
-- Indexes
-- ============================================================
create index idx_findings_report_date on public.regulatory_findings(report_date desc);
create index idx_findings_authority on public.regulatory_findings(authority);
create index idx_findings_priority on public.regulatory_findings(priority);
create index idx_findings_priority_rank on public.regulatory_findings(priority_rank);
create index idx_findings_category on public.regulatory_findings(category);
create index idx_findings_verification on public.regulatory_findings(verification);
create unique index uq_findings_key on public.regulatory_findings(finding_key);
create index idx_findings_first_seen on public.regulatory_findings(first_seen_at desc);
create index idx_reports_date on public.regulatory_reports(report_date desc);
create index idx_profiles_stripe on public.profiles(stripe_customer_id);
create index idx_profiles_website_user_id on public.profiles(website_user_id);

-- ============================================================
-- Audit cleanup
-- ============================================================
-- Audit logs accumulate quickly. This function is intended to be called by a
-- scheduled job to remove rows older than 90 days while keeping security events.
-- For now, retention is manual.
create or replace function public.trim_audit_logs(cutoff_days integer default 90)
returns integer
language plpgsql
security definer
as $$
declare
  deleted integer;
begin
  delete from public.audit_log
  where created_at < now() - (cutoff_days || ' days')::interval
    and event not in ('handoff_rejected', 'report_generation_failed');
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

-- ============================================================
-- Entitlement handoff — single-use token ledger
--
-- The Conform-Edge website hands users off to /enter with a short-lived
-- HMAC-signed token (see nextjs/lib/handoff.ts). /enter records each token's
-- `jti` here on first redemption and refuses any it has seen before, so a
-- captured token cannot be replayed within its 120-second window. Written only
-- by the service role; RLS denies all other access. See migration 005.
-- ============================================================
create table public.handoff_redemptions (
  jti uuid primary key,
  website_user_id text,
  redeemed_at timestamptz not null default now()
);
alter table public.handoff_redemptions enable row level security;
create index idx_handoff_redeemed_at on public.handoff_redemptions(redeemed_at);
