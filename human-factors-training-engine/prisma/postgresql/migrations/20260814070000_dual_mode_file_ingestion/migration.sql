CREATE TABLE "IngestionSource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "folderPath" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IngestionSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IngestionFile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mediaType" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "content" BYTEA,
    "extractedText" TEXT,
    "recordType" TEXT NOT NULL DEFAULT 'organizational_data',
    "classification" TEXT NOT NULL DEFAULT 'INTERNAL',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "malwareScanStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "malwareScanner" TEXT,
    "failureReason" TEXT,
    "evidenceId" TEXT,
    "sourceFileModifiedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "IngestionFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IngestionSource_organizationId_name_key" ON "IngestionSource"("organizationId", "name");
CREATE INDEX "IngestionSource_organizationId_isEnabled_idx" ON "IngestionSource"("organizationId", "isEnabled");
CREATE UNIQUE INDEX "IngestionFile_organizationId_contentHash_key" ON "IngestionFile"("organizationId", "contentHash");
CREATE INDEX "IngestionFile_organizationId_status_idx" ON "IngestionFile"("organizationId", "status");
CREATE INDEX "IngestionFile_sourceId_relativePath_idx" ON "IngestionFile"("sourceId", "relativePath");

ALTER TABLE "IngestionSource" ADD CONSTRAINT "IngestionSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngestionFile" ADD CONSTRAINT "IngestionFile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngestionFile" ADD CONSTRAINT "IngestionFile_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
