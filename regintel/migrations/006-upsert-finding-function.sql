-- ============================================================
-- Migration 006 — upsert_finding(): the one safe write path for findings
--
-- Run in Supabase: SQL Editor → New Query. Safe to run more than once.
--
-- WHY
-- A finding is a DOCUMENT with a stable identity, seen many times — not a
-- per-day row. The rules that make "what changed since your last login" work
-- are subtle and must never be reimplemented per-ingestor:
--
--   * first_seen_at is set once and NEVER moves (it is what the per-subscriber
--     delta is measured against);
--   * last_changed_at moves ONLY when the authority actually amended the
--     document (detected by a content hash), not on every re-sighting;
--   * last_seen_at bumps every run.
--
-- The Python pipeline enforces these in store.py. This function puts the exact
-- same logic in the database so any OTHER writer — an n8n workflow running on
-- your machine, a one-off script — can upsert a finding correctly by calling
-- ONE function, instead of hand-rolling the dedup and getting first_seen_at
-- wrong (which silently makes already-read items resurface as new).
--
-- The content hash is computed HERE, byte-for-byte identically to
-- models.Finding.content_hash() — sha256 over
--   title ␟ summary ␟ effective_date ␟ comment_deadline ␟ priority ␟ category
-- (␟ = U+241F, and a missing field contributes an empty string, not a skipped
-- separator). Because both the Python pipeline and this function use the same
-- formula, they agree on what "changed" means and never thrash each other.
--
-- The caller supplies finding_key (document number else source URL — same as
-- models.Finding.key()). Returns 'inserted' | 'changed' | 'unchanged'.
-- ============================================================

-- digest() lives in pgcrypto. On Supabase it is installed in the `extensions`
-- schema; create it if missing.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.upsert_finding(
  p_finding_key       text,
  p_authority         text,
  p_category          text,
  p_priority          text,
  p_title             text,
  p_summary           text,
  p_detail            text,
  p_source_url        text,
  p_effective_date    date,
  p_comment_deadline  date,
  p_document_number   text,
  p_verification      text,
  p_source_id         text,
  p_report_date       date,
  p_report_id         uuid default null
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  sep      constant text := chr(9247);  -- ␟, the separator models.py joins on
  v_hash   text;
  v_prior  text;
  v_exists boolean;
begin
  -- Reproduce models.Finding.content_hash() exactly: empty string for a
  -- missing field (NOT a skipped separator, so do not use concat_ws).
  v_hash := encode(
    extensions.digest(
      coalesce(p_title, '')            || sep ||
      coalesce(p_summary, '')          || sep ||
      coalesce(p_effective_date::text, '')   || sep ||
      coalesce(p_comment_deadline::text, '') || sep ||
      coalesce(p_priority, '')         || sep ||
      coalesce(p_category, ''),
      'sha256'
    ),
    'hex'
  );

  select content_hash into v_prior
    from public.regulatory_findings
   where finding_key = p_finding_key;
  v_exists := found;

  if not v_exists then
    insert into public.regulatory_findings (
      finding_key, authority, category, priority, title, summary, detail,
      source_url, effective_date, comment_deadline, document_number,
      verification, source_id, report_date, report_id, content_hash,
      first_seen_at, last_seen_at, last_changed_at
    ) values (
      p_finding_key, p_authority, p_category, coalesce(p_priority, 'normal'),
      p_title, p_summary, p_detail, p_source_url, p_effective_date,
      p_comment_deadline, p_document_number, coalesce(p_verification, 'verified'),
      p_source_id, p_report_date, p_report_id, v_hash,
      now(), now(), now()
    );
    return 'inserted';

  elsif v_prior is distinct from v_hash then
    -- Amended by the authority — surface as changed. first_seen_at untouched.
    update public.regulatory_findings set
      authority        = p_authority,
      category         = p_category,
      priority         = coalesce(p_priority, 'normal'),
      title            = p_title,
      summary          = p_summary,
      detail           = p_detail,
      source_url       = p_source_url,
      effective_date   = p_effective_date,
      comment_deadline = p_comment_deadline,
      document_number  = p_document_number,
      verification     = coalesce(p_verification, 'verified'),
      source_id        = p_source_id,
      report_date      = p_report_date,
      report_id        = coalesce(p_report_id, report_id),
      content_hash     = v_hash,
      last_seen_at     = now(),
      last_changed_at  = now()
    where finding_key = p_finding_key;
    return 'changed';

  else
    -- Seen again, unchanged: only bump last_seen_at.
    update public.regulatory_findings set
      last_seen_at = now(),
      report_id    = coalesce(p_report_id, report_id)
    where finding_key = p_finding_key;
    return 'unchanged';
  end if;
end;
$$;

-- Findings must only ever be written by the service role. Lock the function to
-- match: revoke the default PUBLIC execute (so a leaked anon/authenticated key
-- cannot inject findings by calling the RPC) and grant it back to service_role,
-- which is what an n8n Postgres/HTTP-RPC call authenticates as.
revoke all on function public.upsert_finding(
  text, text, text, text, text, text, text, text, date, date, text, text, text,
  date, uuid
) from public, anon, authenticated;

grant execute on function public.upsert_finding(
  text, text, text, text, text, text, text, text, date, date, text, text, text,
  date, uuid
) to service_role;
