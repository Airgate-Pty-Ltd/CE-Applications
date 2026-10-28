-- Bootstrap the historical single-tenant data into an explicit organization boundary.
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deploymentMode" TEXT NOT NULL DEFAULT 'onprem',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Organization" ("id", "slug", "name", "deploymentMode", "updatedAt")
VALUES ('tenant_001', 'default-organization', 'Default Organization', 'onprem', CURRENT_TIMESTAMP);

INSERT INTO "OrganizationMember" ("id", "organizationId", "userId", "role", "updatedAt")
SELECT 'bootstrap-member-' || "id", 'tenant_001', "id", "role", CURRENT_TIMESTAMP FROM "User";

ALTER TABLE "AuthSession" ADD COLUMN "organizationId" TEXT;
UPDATE "AuthSession" SET "organizationId" = 'tenant_001' WHERE "organizationId" IS NULL;
ALTER TABLE "AuthSession" ALTER COLUMN "organizationId" SET NOT NULL;

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "OrganizationMember_userId_isActive_idx" ON "OrganizationMember"("userId", "isActive");
CREATE INDEX "AuthSession_organizationId_revokedAt_expiresAt_idx" ON "AuthSession"("organizationId", "revokedAt", "expiresAt");

ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
