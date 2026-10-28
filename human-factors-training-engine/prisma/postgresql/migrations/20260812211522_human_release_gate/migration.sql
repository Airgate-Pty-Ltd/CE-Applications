ALTER TABLE "mai_governed_decision" ADD COLUMN "resultingProposalId" TEXT;

CREATE TABLE "mai_content_revision_proposal" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mai_content_revision_proposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mai_content_revision_proposal_tenantId_idx" ON "mai_content_revision_proposal"("tenantId");
CREATE INDEX "mai_content_revision_proposal_status_idx" ON "mai_content_revision_proposal"("status");
CREATE INDEX "mai_content_revision_proposal_lessonLearnedId_idx" ON "mai_content_revision_proposal"("lessonLearnedId");
CREATE INDEX "mai_content_revision_proposal_baselineAtomId_idx" ON "mai_content_revision_proposal"("baselineAtomId");

ALTER TABLE "mai_content_revision_proposal"
ADD CONSTRAINT "mai_content_revision_proposal_lessonLearnedId_fkey"
FOREIGN KEY ("lessonLearnedId") REFERENCES "lesson_learned"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
