ALTER TABLE "AuditLog" ADD COLUMN "organizationId" TEXT;

UPDATE "AuditLog" AS log
SET "organizationId" = membership."organizationId"
FROM "OrganizationMember" AS membership
WHERE log."actor" = membership."userId"
  AND membership."isActive" = TRUE
  AND 1 = (
      SELECT COUNT(*) FROM "OrganizationMember" AS candidate
      WHERE candidate."userId" = log."actor" AND candidate."isActive" = TRUE
  );

CREATE INDEX "AuditLog_organizationId_timestamp_idx" ON "AuditLog"("organizationId", "timestamp");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
