-- The preceding backfill migration used a temporary legacy-tenant default so
-- existing rows could be upgraded. Remove it after backfill: every new hosted
-- record must now name its tenant explicitly.
ALTER TABLE "Course" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "learning_atom" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "learning_intervention" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "training_assignment" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "training_package_manifest" ALTER COLUMN "tenantId" DROP DEFAULT;
