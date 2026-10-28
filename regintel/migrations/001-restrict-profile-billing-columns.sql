-- ============================================================
-- Migration 001 — stop users granting themselves paid subscriptions
--
-- Run this in Supabase: SQL Editor → New Query. Safe to run more than once,
-- and safe on a database that already has profile rows (it changes no data).
--
-- THE PROBLEM
-- The original policy was:
--
--   create policy "Users can read and update own profile"
--     on public.profiles for all
--     using (id = auth.uid());
--
-- `for all` covers UPDATE, and with no `with check` Postgres reuses the
-- USING expression as the check. That expression only constrains WHICH ROW
-- is touched — not which COLUMNS. So any signed-in user could run, straight
-- from the browser with the public anon key:
--
--   update profiles
--      set subscription_status = 'active', subscription_tier = 'enterprise'
--    where id = auth.uid();
--
-- ...and every paid tier became free.
--
-- THE FIX
-- RLS cannot restrict columns, so row access and column access are handled
-- separately:
--   1. RLS policies scope users to their own row (unchanged intent).
--   2. Column-level GRANTs limit UPDATE to genuinely user-editable fields.
--
-- Billing columns become writable only by the service role — which is what
-- the Stripe webhook already uses, so application behaviour does not change.
-- ============================================================

-- --- 1. Replace the over-broad policy -----------------------------------

drop policy if exists "Users can read and update own profile" on public.profiles;
drop policy if exists "Users can read own profile"            on public.profiles;
drop policy if exists "Users can update own profile"          on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- No INSERT or DELETE policy: RLS denies by default. Rows are created by the
-- handle_new_user() trigger, which is SECURITY DEFINER and bypasses RLS.

-- --- 2. Column-level privileges ------------------------------------------

-- Clear table-wide UPDATE, then re-grant only the safe columns.
revoke update on public.profiles from anon, authenticated;

-- Users may edit their own descriptive details.
-- NOTE: `role` here is the self-declared business type ('MRO', 'PAH',
-- 'Consultant', ...) used for segmentation. It is NOT an authorisation role.
grant update (full_name, organization, role, subscribed_authorities)
  on public.profiles to authenticated;

-- Defence in depth: users never create or remove profile rows directly.
revoke insert, delete on public.profiles from anon, authenticated;

-- Deliberately NOT granted to anon/authenticated, i.e. service-role only:
--   subscription_status, subscription_tier, trial_ends_at,
--   stripe_customer_id, stripe_subscription_id, id, email, created_at

-- --- 3. Verification ------------------------------------------------------
-- After running, this should return ONLY the four safe columns:
--
--   select column_name
--     from information_schema.column_privileges
--    where table_name = 'profiles'
--      and grantee = 'authenticated'
--      and privilege_type = 'UPDATE'
--    order by column_name;
--
-- Expected: full_name, organization, role, subscribed_authorities
