/*
  Warnings:

  - You are about to drop the `regulatory_clause` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `regulatoryClauseId` on the `learning_atom` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "regulatory_clause_framework_itemNumber_key";

-- DropIndex
DROP INDEX "regulatory_clause_section_idx";

-- DropIndex
DROP INDEX "regulatory_clause_framework_idx";

-- AlterTable
ALTER TABLE "policy_pack" ADD COLUMN "spineRevision" INTEGER;

-- AlterTable
ALTER TABLE "policy_pack_clause" ADD COLUMN "section" TEXT;
ALTER TABLE "policy_pack_clause" ADD COLUMN "sectionLabel" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "regulatory_clause";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "requirement_spine_topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "spineRevision" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "clause_topic_map" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clauseId" TEXT NOT NULL,
    "topicId" TEXT,
    "coverage" TEXT NOT NULL,
    "deltaNote" TEXT,
    "mappedBy" TEXT,
    "approvedBy" TEXT,
    "effectiveDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clause_topic_map_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "policy_pack_clause" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "clause_topic_map_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "requirement_spine_topic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "atom_topic_map" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atomId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "mappedBy" TEXT NOT NULL,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "atom_topic_map_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "requirement_spine_topic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pack_adoption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "packRevision" INTEGER NOT NULL,
    "adoptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "supersededAt" DATETIME,
    CONSTRAINT "pack_adoption_packId_fkey" FOREIGN KEY ("packId") REFERENCES "policy_pack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_learning_atom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "objective" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "duration" INTEGER,
    "content" TEXT,
    "sourceEvidenceIds" TEXT NOT NULL DEFAULT '[]',
    "sourceSpans" TEXT,
    "applicabilityTags" TEXT NOT NULL DEFAULT '[]',
    "prerequisiteAtomIds" TEXT NOT NULL DEFAULT '[]',
    "roleAudience" TEXT NOT NULL DEFAULT '[]',
    "classification" TEXT NOT NULL DEFAULT 'INTERNAL',
    "assessmentQuestionIds" TEXT NOT NULL DEFAULT '[]',
    "recurrenceRule" TEXT,
    "effectivenessMethod" TEXT,
    "evaluationCriteria" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "replacementAtomId" TEXT,
    "replacedAtomId" TEXT,
    "replacementReason" TEXT,
    "licenseClass" TEXT,
    "owner" TEXT,
    "linkedEventIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reviewDate" DATETIME,
    "retiredDate" DATETIME,
    "emergencyExpiresAt" DATETIME,
    "origin" TEXT NOT NULL DEFAULT 'event',
    "sourceClause" TEXT,
    "contentSource" TEXT
);
INSERT INTO "new_learning_atom" ("applicabilityTags", "approvedAt", "approvedBy", "assessmentQuestionIds", "classification", "content", "contentSource", "createdAt", "duration", "effectivenessMethod", "emergencyExpiresAt", "evaluationCriteria", "format", "id", "licenseClass", "linkedEventIds", "objective", "origin", "owner", "prerequisiteAtomIds", "recurrenceRule", "replacedAtomId", "replacementAtomId", "replacementReason", "retiredDate", "reviewDate", "revision", "roleAudience", "sourceClause", "sourceEvidenceIds", "sourceSpans", "status", "title", "updatedAt") SELECT "applicabilityTags", "approvedAt", "approvedBy", "assessmentQuestionIds", "classification", "content", "contentSource", "createdAt", "duration", "effectivenessMethod", "emergencyExpiresAt", "evaluationCriteria", "format", "id", "licenseClass", "linkedEventIds", "objective", "origin", "owner", "prerequisiteAtomIds", "recurrenceRule", "replacedAtomId", "replacementAtomId", "replacementReason", "retiredDate", "reviewDate", "revision", "roleAudience", "sourceClause", "sourceEvidenceIds", "sourceSpans", "status", "title", "updatedAt" FROM "learning_atom";
DROP TABLE "learning_atom";
ALTER TABLE "new_learning_atom" RENAME TO "learning_atom";
CREATE INDEX "learning_atom_status_idx" ON "learning_atom"("status");
CREATE INDEX "learning_atom_format_idx" ON "learning_atom"("format");
CREATE INDEX "learning_atom_classification_idx" ON "learning_atom"("classification");
CREATE INDEX "learning_atom_approvedAt_idx" ON "learning_atom"("approvedAt");
CREATE INDEX "learning_atom_origin_idx" ON "learning_atom"("origin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "requirement_spine_topic_spineRevision_idx" ON "requirement_spine_topic"("spineRevision");

-- CreateIndex
CREATE INDEX "requirement_spine_topic_status_idx" ON "requirement_spine_topic"("status");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_spine_topic_code_spineRevision_key" ON "requirement_spine_topic"("code", "spineRevision");

-- CreateIndex
CREATE INDEX "clause_topic_map_clauseId_idx" ON "clause_topic_map"("clauseId");

-- CreateIndex
CREATE INDEX "clause_topic_map_topicId_idx" ON "clause_topic_map"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "clause_topic_map_clauseId_topicId_key" ON "clause_topic_map"("clauseId", "topicId");

-- CreateIndex
CREATE INDEX "atom_topic_map_atomId_idx" ON "atom_topic_map"("atomId");

-- CreateIndex
CREATE INDEX "atom_topic_map_topicId_idx" ON "atom_topic_map"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "atom_topic_map_atomId_topicId_key" ON "atom_topic_map"("atomId", "topicId");

-- CreateIndex
CREATE INDEX "pack_adoption_tenantId_idx" ON "pack_adoption"("tenantId");

-- CreateIndex
CREATE INDEX "pack_adoption_packId_idx" ON "pack_adoption"("packId");

-- CreateIndex
CREATE UNIQUE INDEX "pack_adoption_tenantId_packId_packRevision_key" ON "pack_adoption"("tenantId", "packId", "packRevision");
