CREATE TABLE "InstallationState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "initialAdminUserId" TEXT,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "InstallationState" ("id", "setupCompleted", "updatedAt")
SELECT 'singleton', CASE WHEN EXISTS(SELECT 1 FROM "User") THEN true ELSE false END, CURRENT_TIMESTAMP;
