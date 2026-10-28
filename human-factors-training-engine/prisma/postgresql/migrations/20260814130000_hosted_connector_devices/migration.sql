CREATE TABLE "ConnectorDevice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "ConnectorDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConnectorDevice_tokenHash_key" ON "ConnectorDevice"("tokenHash");
CREATE UNIQUE INDEX "ConnectorDevice_organizationId_name_key" ON "ConnectorDevice"("organizationId", "name");
CREATE INDEX "ConnectorDevice_organizationId_isActive_idx" ON "ConnectorDevice"("organizationId", "isActive");

ALTER TABLE "ConnectorDevice" ADD CONSTRAINT "ConnectorDevice_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
