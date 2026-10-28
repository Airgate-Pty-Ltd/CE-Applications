-- Widen frozen-manifest immutability to also protect SUPERSEDED rows (C-013,
-- PHASE-3-RUN-DIRECTIVE.md WP-2 §3; closes the gap logged in OPEN-QUESTIONS.md Q-003).
-- SQLite has no ALTER TRIGGER — the only way to change a trigger's WHEN condition is
-- DROP + CREATE. Applied via `npx prisma db execute` (see DECISIONS.md D-016, D-027).
DROP TRIGGER IF EXISTS prevent_frozen_manifest_update;

CREATE TRIGGER prevent_frozen_manifest_update
BEFORE UPDATE ON training_package_manifest
WHEN OLD.status IN ('ACTIVE', 'SUPERSEDED')
BEGIN
  SELECT RAISE(ABORT, 'frozen_manifest_immutable_error');
END;
