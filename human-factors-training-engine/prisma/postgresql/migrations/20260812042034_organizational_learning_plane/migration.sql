CREATE TABLE "lesson_learned" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "narrative" TEXT,
    "lessonType" TEXT NOT NULL DEFAULT 'NEGATIVE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sourceClassification" TEXT NOT NULL DEFAULT 'INTERNAL_UNVALIDATED',
    "ingestionMethod" TEXT NOT NULL DEFAULT 'MANUAL',
    "externalSourceRef" TEXT,
    "themes" TEXT NOT NULL DEFAULT '[]',
    "rolesExposed" TEXT NOT NULL DEFAULT '[]',
    "sitesExposed" TEXT NOT NULL DEFAULT '[]',
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "supersedesLessonId" TEXT,
    "supersededByLessonId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lesson_learned_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "corrective_action" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "carNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issueStatement" TEXT NOT NULL,
    "containment" TEXT,
    "correction" TEXT,
    "causalAnalysis" TEXT,
    "correctiveActionText" TEXT,
    "effectivenessReview" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "trainingClassification" TEXT NOT NULL DEFAULT 'NO_TRAINING_REQUIRED',
    "trainingClassificationRationale" TEXT,
    "trainingClassificationDecidedBy" TEXT,
    "trainingClassificationDecidedAt" TIMESTAMP(3),
    "linkedLearnerPopulation" TEXT,
    "openedBy" TEXT,
    "openedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "corrective_action_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "car_lesson_link" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "lessonLearnedId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL DEFAULT 'RELATED',
    "suggestedBySystem" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "rationale" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "car_lesson_link_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mai_authority_profile" (
    "id" TEXT NOT NULL,
    "authorityProfileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "trustedSourceClasses" TEXT NOT NULL,
    "permittedBehaviors" TEXT NOT NULL,
    "humanApprovalPerInstance" BOOLEAN NOT NULL DEFAULT true,
    "constraints" TEXT NOT NULL DEFAULT '[]',
    "escalateWhen" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "profileHash" TEXT NOT NULL,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mai_authority_profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mai_governed_decision" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "authorityScope" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleRevision" INTEGER NOT NULL,
    "evidenceState" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "decisionState" TEXT NOT NULL,
    "permittedHostAction" TEXT NOT NULL,
    "humanReviewRequired" BOOLEAN NOT NULL,
    "overrideAuthority" TEXT NOT NULL DEFAULT '[]',
    "authorityProfileRowId" TEXT,
    "authorityProfileId" TEXT,
    "authorityProfileRevision" INTEGER,
    "authorityProfileHash" TEXT,
    "authorityEffectiveFrom" TIMESTAMP(3),
    "authorityEffectiveTo" TIMESTAMP(3),
    "autonomousExecutionPermitted" BOOLEAN,
    "subjectType" TEXT NOT NULL DEFAULT 'LessonLearned',
    "subjectId" TEXT NOT NULL,
    "lessonLearnedId" TEXT,
    "resultingAtomId" TEXT,
    "immutableAuditReference" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mai_governed_decision_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "hf_event" ADD COLUMN "correctiveActionId" TEXT;

CREATE INDEX "lesson_learned_tenantId_idx" ON "lesson_learned"("tenantId");
CREATE INDEX "lesson_learned_status_idx" ON "lesson_learned"("status");
CREATE INDEX "lesson_learned_sourceClassification_idx" ON "lesson_learned"("sourceClassification");
CREATE INDEX "corrective_action_tenantId_idx" ON "corrective_action"("tenantId");
CREATE INDEX "corrective_action_status_idx" ON "corrective_action"("status");
CREATE INDEX "corrective_action_trainingClassification_idx" ON "corrective_action"("trainingClassification");
CREATE INDEX "car_lesson_link_carId_idx" ON "car_lesson_link"("carId");
CREATE INDEX "car_lesson_link_lessonLearnedId_idx" ON "car_lesson_link"("lessonLearnedId");
CREATE UNIQUE INDEX "car_lesson_link_carId_lessonLearnedId_key" ON "car_lesson_link"("carId", "lessonLearnedId");
CREATE INDEX "mai_authority_profile_status_idx" ON "mai_authority_profile"("status");
CREATE UNIQUE INDEX "mai_authority_profile_authorityProfileId_version_key" ON "mai_authority_profile"("authorityProfileId", "version");
CREATE UNIQUE INDEX "mai_governed_decision_decisionId_key" ON "mai_governed_decision"("decisionId");
CREATE INDEX "mai_governed_decision_tenantId_idx" ON "mai_governed_decision"("tenantId");
CREATE INDEX "mai_governed_decision_decisionState_idx" ON "mai_governed_decision"("decisionState");
CREATE INDEX "mai_governed_decision_subjectId_idx" ON "mai_governed_decision"("subjectId");
CREATE INDEX "mai_governed_decision_lessonLearnedId_idx" ON "mai_governed_decision"("lessonLearnedId");
CREATE INDEX "hf_event_correctiveActionId_idx" ON "hf_event"("correctiveActionId");

ALTER TABLE "car_lesson_link" ADD CONSTRAINT "car_lesson_link_carId_fkey" FOREIGN KEY ("carId") REFERENCES "corrective_action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "car_lesson_link" ADD CONSTRAINT "car_lesson_link_lessonLearnedId_fkey" FOREIGN KEY ("lessonLearnedId") REFERENCES "lesson_learned"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mai_governed_decision" ADD CONSTRAINT "mai_governed_decision_authorityProfileRowId_fkey" FOREIGN KEY ("authorityProfileRowId") REFERENCES "mai_authority_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mai_governed_decision" ADD CONSTRAINT "mai_governed_decision_lessonLearnedId_fkey" FOREIGN KEY ("lessonLearnedId") REFERENCES "lesson_learned"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hf_event" ADD CONSTRAINT "hf_event_correctiveActionId_fkey" FOREIGN KEY ("correctiveActionId") REFERENCES "corrective_action"("id") ON DELETE SET NULL ON UPDATE CASCADE;
