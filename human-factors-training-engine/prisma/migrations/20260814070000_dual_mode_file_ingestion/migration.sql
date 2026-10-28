CREATE TABLE "IngestionSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "folderPath" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IngestionSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "IngestionFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mediaType" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "content" BLOB,
    "extractedText" TEXT,
    "recordType" TEXT NOT NULL DEFAULT 'organizational_data',
    "classification" TEXT NOT NULL DEFAULT 'INTERNAL',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "malwareScanStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "malwareScanner" TEXT,
    "failureReason" TEXT,
    "evidenceId" TEXT,
    "sourceFileModifiedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    CONSTRAINT "IngestionFile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IngestionFile_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IngestionSource_organizationId_name_key" ON "IngestionSource"("organizationId", "name");
CREATE INDEX "IngestionSource_organizationId_isEnabled_idx" ON "IngestionSource"("organizationId", "isEnabled");
CREATE UNIQUE INDEX "IngestionFile_organizationId_contentHash_key" ON "IngestionFile"("organizationId", "contentHash");
CREATE INDEX "IngestionFile_organizationId_status_idx" ON "IngestionFile"("organizationId", "status");
CREATE INDEX "IngestionFile_sourceId_relativePath_idx" ON "IngestionFile"("sourceId", "relativePath");
