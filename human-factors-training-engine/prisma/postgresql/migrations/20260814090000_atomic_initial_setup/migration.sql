CREATE TABLE "InstallationState" (
    "id" TEXT NOT NULL,
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "initialAdminUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InstallationState_pkey" PRIMARY KEY ("id")
);

INSERT INTO "InstallationState" ("id", "setupCompleted", "updatedAt")
SELECT 'singleton', CASE WHEN EXISTS(SELECT 1 FROM "User") THEN true ELSE false END, CURRENT_TIMESTAMP;
