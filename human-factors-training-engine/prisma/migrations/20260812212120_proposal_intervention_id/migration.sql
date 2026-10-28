/*
  Warnings:

  - Added the required column `interventionId` to the `mai_content_revision_proposal` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_mai_content_revision_proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "lessonLearnedId" TEXT,
    "interventionId" TEXT NOT NULL,
    "baselineAtomId" TEXT,
    "preparingDecisionId" TEXT,
    "priorProposalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_HUMAN_RELEASE',
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "content" TEXT,
    "format" TEXT NOT NULL,
    "duration" INTEGER,
    "classification" TEXT NOT NULL DEFAULT 'INTERNAL',
    "applicabilityTags" TEXT NOT NULL DEFAULT '[]',
    "recurrenceRule" TEXT,
    "roleAudience" TEXT NOT NULL DEFAULT '[]',
    "effectivenessMethod" TEXT,
    "evaluationCriteria" TEXT,
    "assessmentQuestionIds" TEXT NOT NULL DEFAULT '[]',
    "humanEditedContent" TEXT,
    "editSummary" TEXT,
    "releaseApprovalId" TEXT,
    "resultingAtomId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "mai_content_revision_proposal_lessonLearnedId_fkey" FOREIGN KEY ("lessonLearnedId") REFERENCES "lesson_learned" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_mai_content_revision_proposal" ("applicabilityTags", "assessmentQuestionIds", "baselineAtomId", "classification", "content", "createdAt", "duration", "editSummary", "effectivenessMethod", "evaluationCriteria", "format", "humanEditedContent", "id", "lessonLearnedId", "objective", "preparingDecisionId", "priorProposalId", "recurrenceRule", "releaseApprovalId", "resultingAtomId", "roleAudience", "status", "tenantId", "title", "triggerType", "updatedAt") SELECT "applicabilityTags", "assessmentQuestionIds", "baselineAtomId", "classification", "content", "createdAt", "duration", "editSummary", "effectivenessMethod", "evaluationCriteria", "format", "humanEditedContent", "id", "lessonLearnedId", "objective", "preparingDecisionId", "priorProposalId", "recurrenceRule", "releaseApprovalId", "resultingAtomId", "roleAudience", "status", "tenantId", "title", "triggerType", "updatedAt" FROM "mai_content_revision_proposal";
DROP TABLE "mai_content_revision_proposal";
ALTER TABLE "new_mai_content_revision_proposal" RENAME TO "mai_content_revision_proposal";
CREATE INDEX "mai_content_revision_proposal_tenantId_idx" ON "mai_content_revision_proposal"("tenantId");
CREATE INDEX "mai_content_revision_proposal_status_idx" ON "mai_content_revision_proposal"("status");
CREATE INDEX "mai_content_revision_proposal_lessonLearnedId_idx" ON "mai_content_revision_proposal"("lessonLearnedId");
CREATE INDEX "mai_content_revision_proposal_baselineAtomId_idx" ON "mai_content_revision_proposal"("baselineAtomId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
