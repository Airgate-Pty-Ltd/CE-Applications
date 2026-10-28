-- AlterTable
ALTER TABLE "mai_governed_decision" ADD COLUMN "resultingProposalId" TEXT;

-- CreateTable
CREATE TABLE "mai_content_revision_proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "lessonLearnedId" TEXT,
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

-- CreateIndex
CREATE INDEX "mai_content_revision_proposal_tenantId_idx" ON "mai_content_revision_proposal"("tenantId");

-- CreateIndex
CREATE INDEX "mai_content_revision_proposal_status_idx" ON "mai_content_revision_proposal"("status");

-- CreateIndex
CREATE INDEX "mai_content_revision_proposal_lessonLearnedId_idx" ON "mai_content_revision_proposal"("lessonLearnedId");

-- CreateIndex
CREATE INDEX "mai_content_revision_proposal_baselineAtomId_idx" ON "mai_content_revision_proposal"("baselineAtomId");
