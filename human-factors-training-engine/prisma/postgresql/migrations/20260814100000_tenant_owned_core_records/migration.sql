-- Backfill the existing single-tenant data while making the core content and
-- delivery roots directly scopeable for hosted multi-tenant deployments.
ALTER TABLE "Course" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'tenant_001';
ALTER TABLE "learning_atom" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_001';
ALTER TABLE "learning_intervention" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_001';
ALTER TABLE "training_assignment" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_001';
ALTER TABLE "training_package_manifest" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'tenant_001';

CREATE INDEX "Course_organizationId_idx" ON "Course"("organizationId");
CREATE INDEX "learning_atom_tenantId_idx" ON "learning_atom"("tenantId");
CREATE INDEX "learning_intervention_tenantId_idx" ON "learning_intervention"("tenantId");
CREATE INDEX "training_assignment_tenantId_idx" ON "training_assignment"("tenantId");
CREATE INDEX "training_package_manifest_tenantId_idx" ON "training_package_manifest"("tenantId");
