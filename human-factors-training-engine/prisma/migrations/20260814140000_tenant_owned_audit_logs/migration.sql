PRAGMA foreign_keys=OFF;

CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_AuditLog" ("id", "organizationId", "actor", "action", "object", "objectId", "details", "timestamp", "createdAt")
SELECT "id",
       CASE WHEN "actor" IS NOT NULL AND (
           SELECT COUNT(*) FROM "OrganizationMember" AS membership
           WHERE membership."userId" = "AuditLog"."actor" AND membership."isActive" = 1
       ) = 1 THEN (
           SELECT membership."organizationId" FROM "OrganizationMember" AS membership
           WHERE membership."userId" = "AuditLog"."actor" AND membership."isActive" = 1
           LIMIT 1
       ) ELSE NULL END,
       "actor", "action", "object", "objectId", "details", "timestamp", "createdAt"
FROM "AuditLog";

DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_actor_idx" ON "AuditLog"("actor");
CREATE INDEX "AuditLog_organizationId_timestamp_idx" ON "AuditLog"("organizationId", "timestamp");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX "AuditLog_objectId_idx" ON "AuditLog"("objectId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
