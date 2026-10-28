-- Least-privilege database principal for the M-AI kernel (design law 12, checklist §6).
-- Controlled configuration item — versioned with the repo.
--
-- The kernel connects under `mai_kernel`:
--   • SELECT on host record tables it snapshots  (read-only view of host data)
--   • INSERT on every mai_* table
--   • UPDATE limited to supersession columns on mai_assessments and the
--     processed flags on mai_events
--   • NO UPDATE/DELETE on host tables — prohibited writes are structurally
--     impossible, not merely by convention (AT-04, AT-12).
--
-- Human responses (Confirm / Dismiss) execute under the HOST application
-- principal, NOT this role — a human acted through the host UI.
--
-- Run after mai_schema.sql. Set a real password out-of-band:
--   ALTER ROLE mai_kernel WITH PASSWORD '...';   -- or use MAI_KERNEL_DATABASE_URL

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mai_kernel') THEN
    CREATE ROLE mai_kernel LOGIN;
  END IF;
END
$$;

-- Read-only on host record tables the kernel snapshots.
-- (Prisma names the table "PmaCase"; extend this list as new record types are watched.)
GRANT SELECT ON "PmaCase" TO mai_kernel;

-- Append to the kernel ledger.
GRANT INSERT, SELECT ON mai_events, mai_assessments, mai_error_log, mai_rule_registry TO mai_kernel;

-- Supersession + event-processed flags are the ONLY updates the kernel may make.
GRANT UPDATE (status, superseded_by, superseded_at) ON mai_assessments TO mai_kernel;
GRANT UPDATE (processed, processed_at) ON mai_events TO mai_kernel;

-- Explicitly NO write grants on host tables beyond SELECT above.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON "PmaCase" FROM mai_kernel;
