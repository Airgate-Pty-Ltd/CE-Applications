-- Frozen manifest immutability (C-013 / HFEFF-003) — PostgreSQL equivalent.
-- Per PHASE-1-SPECIFICATION.md C-013: "training_package_manifest table has trigger:
-- UPDATE on frozen row -> error 'frozen_manifest_immutable_error'".
--
-- This is the PostgreSQL equivalent of prisma/manual-sql/frozen_manifest_trigger.sql +
-- frozen_manifest_trigger_v2_widen_superseded.sql (SQLite), combined into one file since
-- Postgres CAN alter a trigger's condition via CREATE OR REPLACE FUNCTION without the
-- SQLite-forced DROP+CREATE dance — there is no "v1 then v2" history to preserve here, this
-- ships already covering both ACTIVE and SUPERSEDED from day one (Phase 3 WP-2's widening,
-- DECISIONS.md D-021, D-037, applied directly rather than reproducing the SQLite migration's
-- two-step history).
--
-- Applied via `npx prisma db execute --schema prisma/schema.postgresql.prisma` (not
-- schema-representable in Prisma — same reason as the SQLite version, see DECISIONS.md D-016).
--
-- Postgres syntax difference from SQLite (intentional, documented — DECISIONS.md D-040):
-- SQLite's inline `SELECT RAISE(ABORT, 'msg')` trigger body has no Postgres equivalent;
-- Postgres requires a separate trigger FUNCTION in PL/pgSQL that RAISEs an EXCEPTION, then a
-- TRIGGER that EXECUTEs it. The exact error message text ('frozen_manifest_immutable_error')
-- is preserved so any error-message matching logic behaves the same on both providers.

CREATE OR REPLACE FUNCTION prevent_frozen_manifest_update() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('ACTIVE', 'SUPERSEDED') THEN
    RAISE EXCEPTION 'frozen_manifest_immutable_error';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_frozen_manifest_update ON training_package_manifest;

CREATE TRIGGER prevent_frozen_manifest_update
BEFORE UPDATE ON training_package_manifest
FOR EACH ROW
EXECUTE FUNCTION prevent_frozen_manifest_update();
