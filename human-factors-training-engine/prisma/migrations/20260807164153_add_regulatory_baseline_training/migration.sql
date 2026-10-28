-- AlterTable
ALTER TABLE "training_assignment" ADD COLUMN "recurrenceIntervalMonths" INTEGER;

-- CreateTable
CREATE TABLE "regulatory_clause" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "framework" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "sectionLabel" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "itemLabel" TEXT NOT NULL,
    "intentSummary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    "regulatoryClauseId" TEXT,
    "contentSource" TEXT,
    CONSTRAINT "learning_atom_regulatoryClauseId_fkey" FOREIGN KEY ("regulatoryClauseId") REFERENCES "regulatory_clause" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_learning_atom" ("applicabilityTags", "approvedAt", "approvedBy", "assessmentQuestionIds", "classification", "content", "createdAt", "duration", "effectivenessMethod", "emergencyExpiresAt", "evaluationCriteria", "format", "id", "licenseClass", "linkedEventIds", "objective", "owner", "prerequisiteAtomIds", "recurrenceRule", "replacedAtomId", "replacementAtomId", "replacementReason", "retiredDate", "reviewDate", "revision", "roleAudience", "sourceEvidenceIds", "sourceSpans", "status", "title", "updatedAt") SELECT "applicabilityTags", "approvedAt", "approvedBy", "assessmentQuestionIds", "classification", "content", "createdAt", "duration", "effectivenessMethod", "emergencyExpiresAt", "evaluationCriteria", "format", "id", "licenseClass", "linkedEventIds", "objective", "owner", "prerequisiteAtomIds", "recurrenceRule", "replacedAtomId", "replacementAtomId", "replacementReason", "retiredDate", "reviewDate", "revision", "roleAudience", "sourceEvidenceIds", "sourceSpans", "status", "title", "updatedAt" FROM "learning_atom";
DROP TABLE "learning_atom";
ALTER TABLE "new_learning_atom" RENAME TO "learning_atom";
CREATE INDEX "learning_atom_status_idx" ON "learning_atom"("status");
CREATE INDEX "learning_atom_format_idx" ON "learning_atom"("format");
CREATE INDEX "learning_atom_classification_idx" ON "learning_atom"("classification");
CREATE INDEX "learning_atom_approvedAt_idx" ON "learning_atom"("approvedAt");
CREATE INDEX "learning_atom_origin_idx" ON "learning_atom"("origin");
CREATE INDEX "learning_atom_regulatoryClauseId_idx" ON "learning_atom"("regulatoryClauseId");
CREATE TABLE "new_learning_intervention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'event',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "atomIds" TEXT NOT NULL DEFAULT '[]',
    "caseStudyAtomId" TEXT,
    "assessmentIds" TEXT NOT NULL DEFAULT '[]',
    "effectivenessTargetLevel" TEXT NOT NULL DEFAULT 'COMPLETION',
    "appropriatenessReviewId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "designedBy" TEXT NOT NULL,
    "designedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "publishedBy" TEXT,
    "publishedAt" DATETIME,
    "startDate" DATETIME,
    "targetCompletionDate" DATETIME,
    "closureStatus" TEXT NOT NULL DEFAULT 'OPEN',
    "closedAt" DATETIME,
    "recalledAt" DATETIME,
    "recallReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "learning_intervention_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "hf_event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_learning_intervention" ("appropriatenessReviewId", "approvedAt", "approvedBy", "assessmentIds", "atomIds", "caseStudyAtomId", "closedAt", "closureStatus", "createdAt", "description", "designedAt", "designedBy", "effectivenessTargetLevel", "eventId", "id", "publishedAt", "publishedBy", "recallReason", "recalledAt", "startDate", "status", "targetCompletionDate", "title", "updatedAt") SELECT "appropriatenessReviewId", "approvedAt", "approvedBy", "assessmentIds", "atomIds", "caseStudyAtomId", "closedAt", "closureStatus", "createdAt", "description", "designedAt", "designedBy", "effectivenessTargetLevel", "eventId", "id", "publishedAt", "publishedBy", "recallReason", "recalledAt", "startDate", "status", "targetCompletionDate", "title", "updatedAt" FROM "learning_intervention";
DROP TABLE "learning_intervention";
ALTER TABLE "new_learning_intervention" RENAME TO "learning_intervention";
CREATE UNIQUE INDEX "learning_intervention_appropriatenessReviewId_key" ON "learning_intervention"("appropriatenessReviewId");
CREATE INDEX "learning_intervention_status_idx" ON "learning_intervention"("status");
CREATE INDEX "learning_intervention_effectivenessTargetLevel_idx" ON "learning_intervention"("effectivenessTargetLevel");
CREATE INDEX "learning_intervention_closureStatus_idx" ON "learning_intervention"("closureStatus");
CREATE INDEX "learning_intervention_origin_idx" ON "learning_intervention"("origin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "regulatory_clause_framework_idx" ON "regulatory_clause"("framework");

-- CreateIndex
CREATE INDEX "regulatory_clause_section_idx" ON "regulatory_clause"("section");

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_clause_framework_itemNumber_key" ON "regulatory_clause"("framework", "itemNumber");
