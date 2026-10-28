-- Frozen manifest immutability (C-013 / HFEFF-003).
-- Per PHASE-1-SPECIFICATION.md C-013: "training_package_manifest table has trigger:
-- UPDATE on frozen row -> error 'frozen_manifest_immutable_error'".
-- Applied via `npx prisma db execute` (not schema-representable in Prisma, so it lives
-- outside the normal migration flow — see DECISIONS.md D-016 for how it's tracked).
CREATE TRIGGER IF NOT EXISTS prevent_frozen_manifest_update
BEFORE UPDATE ON training_package_manifest
WHEN OLD.status = 'ACTIVE'
BEGIN
  SELECT RAISE(ABORT, 'frozen_manifest_immutable_error');
END;
