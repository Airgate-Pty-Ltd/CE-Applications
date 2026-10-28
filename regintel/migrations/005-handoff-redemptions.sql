-- ============================================================
-- Migration 005 — entitlement handoff: single-use tokens + website id
--
-- Run in Supabase: SQL Editor → New Query. Safe to run more than once.
--
-- CONTEXT
-- RegIntel is a relying party: the Conform-Edge website proves a user is
-- entitled by handing them off to /enter with a short-lived HMAC-signed token
-- (see nextjs/lib/handoff.ts). /enter verifies the signature and freshness,
-- then establishes a Supabase session.
--
-- WHY THIS TABLE
-- A signature check is not enough on its own. A valid token that is captured
-- (shoulder-surfed, logged by a proxy, left in browser history) could be
-- replayed within its 120-second window to open a second session. Single-use
-- closes that: /enter records each token's `jti` here the first time it is
-- redeemed, and refuses any `jti` it has seen before. The insert's primary-key
-- conflict is the enforcement — it is atomic, so two concurrent redemptions of
-- the same token cannot both win.
--
-- Rows are only ever written by the service role (the /enter route). No anon or
-- authenticated access is granted; RLS denies by default.
-- ============================================================

-- --- 1. Record the website's stable user id on the profile ---------------
-- The handoff token's `sub` claim. Lets RegIntel keep a stable link to the
-- website's account even if the email later changes, and aids audit.
alter table public.profiles
  add column if not exists website_user_id text;

create index if not exists idx_profiles_website_user_id
  on public.profiles(website_user_id);

-- --- 2. Single-use token ledger ------------------------------------------
create table if not exists public.handoff_redemptions (
  jti          uuid primary key,          -- the token's unique id
  website_user_id text,                   -- who redeemed it (sub claim), for audit
  redeemed_at  timestamptz not null default now()
);

alter table public.handoff_redemptions enable row level security;
-- No policies: RLS denies all anon/authenticated access. Only the service role
-- (which bypasses RLS) reads or writes this table, from the /enter route.

-- Housekeeping: tokens older than the max age can never be redeemed again, so
-- old ledger rows are safe to prune. This index makes that cheap.
create index if not exists idx_handoff_redeemed_at
  on public.handoff_redemptions(redeemed_at);
