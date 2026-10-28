-- Existing regulatory packs remain global/read-only; newly authored packs carry
-- the owning tenant and can no longer be mutated across organizations.
ALTER TABLE "policy_pack" ADD COLUMN "ownerTenantId" TEXT;
CREATE INDEX "policy_pack_ownerTenantId_idx" ON "policy_pack"("ownerTenantId");
