-- CreateTable
CREATE TABLE "lesson_learned" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "submittedAt" DATETIME,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "supersedesLessonId" TEXT,
    "supersededByLessonId" TEXT,
    "publishedAt" DATETIME,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "corrective_action" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "trainingClassificationDecidedAt" DATETIME,
    "linkedLearnerPopulation" TEXT,
    "openedBy" TEXT,
    "openedAt" DATETIME,
    "closedBy" TEXT,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "car_lesson_link" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "lessonLearnedId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL DEFAULT 'RELATED',
    "suggestedBySystem" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT,
    "confirmedAt" DATETIME,
    "rationale" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "car_lesson_link_carId_fkey" FOREIGN KEY ("carId") REFERENCES "corrective_action" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "car_lesson_link_lessonLearnedId_fkey" FOREIGN KEY ("lessonLearnedId") REFERENCES "lesson_learned" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mai_authority_profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorityProfileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "trustedSourceClasses" TEXT NOT NULL,
    "permittedBehaviors" TEXT NOT NULL,
    "humanApprovalPerInstance" BOOLEAN NOT NULL DEFAULT true,
    "constraints" TEXT NOT NULL DEFAULT '[]',
    "escalateWhen" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "profileHash" TEXT NOT NULL,
    "supersededAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "mai_governed_decision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "authorityScope" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleRevision" INTEGER NOT NULL,
    "evidenceState" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "rationale" TEXT NOT NULL,
    "decisionState" TEXT NOT NULL,
    "permittedHostAction" TEXT NOT NULL,
    "humanReviewRequired" BOOLEAN NOT NULL,
    "overrideAuthority" TEXT NOT NULL DEFAULT '[]',
    "authorityProfileRowId" TEXT,
    "authorityProfileId" TEXT,
    "authorityProfileRevision" INTEGER,
    "authorityProfileHash" TEXT,
    "authorityEffectiveFrom" DATETIME,
    "authorityEffectiveTo" DATETIME,
    "autonomousExecutionPermitted" BOOLEAN,
    "subjectType" TEXT NOT NULL DEFAULT 'LessonLearned',
    "subjectId" TEXT NOT NULL,
    "lessonLearnedId" TEXT,
    "resultingAtomId" TEXT,
    "immutableAuditReference" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mai_governed_decision_authorityProfileRowId_fkey" FOREIGN KEY ("authorityProfileRowId") REFERENCES "mai_authority_profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "mai_governed_decision_lessonLearnedId_fkey" FOREIGN KEY ("lessonLearnedId") REFERENCES "lesson_learned" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_hf_event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "themes" TEXT NOT NULL DEFAULT '[]',
    "rolesExposed" TEXT NOT NULL DEFAULT '[]',
    "sitesExposed" TEXT NOT NULL DEFAULT '[]',
    "estimatedFrequency" TEXT,
    "linkedCAPAId" TEXT,
    "linkedAuditId" TEXT,
    "correctiveActionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "hf_event_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "hf_evidence" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "hf_event_correctiveActionId_fkey" FOREIGN KEY ("correctiveActionId") REFERENCES "corrective_action" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_hf_event" ("createdAt", "description", "estimatedFrequency", "evidenceId", "id", "linkedAuditId", "linkedCAPAId", "occurredAt", "rolesExposed", "sitesExposed", "tenantId", "themes", "title", "updatedAt") SELECT "createdAt", "description", "estimatedFrequency", "evidenceId", "id", "linkedAuditId", "linkedCAPAId", "occurredAt", "rolesExposed", "sitesExposed", "tenantId", "themes", "title", "updatedAt" FROM "hf_event";
DROP TABLE "hf_event";
ALTER TABLE "new_hf_event" RENAME TO "hf_event";
CREATE INDEX "hf_event_tenantId_idx" ON "hf_event"("tenantId");
CREATE INDEX "hf_event_correctiveActionId_idx" ON "hf_event"("correctiveActionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "lesson_learned_tenantId_idx" ON "lesson_learned"("tenantId");

-- CreateIndex
CREATE INDEX "lesson_learned_status_idx" ON "lesson_learned"("status");

-- CreateIndex
CREATE INDEX "lesson_learned_sourceClassification_idx" ON "lesson_learned"("sourceClassification");

-- CreateIndex
CREATE INDEX "corrective_action_tenantId_idx" ON "corrective_action"("tenantId");

-- CreateIndex
CREATE INDEX "corrective_action_status_idx" ON "corrective_action"("status");

-- CreateIndex
CREATE INDEX "corrective_action_trainingClassification_idx" ON "corrective_action"("trainingClassification");

-- CreateIndex
CREATE INDEX "car_lesson_link_carId_idx" ON "car_lesson_link"("carId");

-- CreateIndex
CREATE INDEX "car_lesson_link_lessonLearnedId_idx" ON "car_lesson_link"("lessonLearnedId");

-- CreateIndex
CREATE UNIQUE INDEX "car_lesson_link_carId_lessonLearnedId_key" ON "car_lesson_link"("carId", "lessonLearnedId");

-- CreateIndex
CREATE INDEX "mai_authority_profile_status_idx" ON "mai_authority_profile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mai_authority_profile_authorityProfileId_version_key" ON "mai_authority_profile"("authorityProfileId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "mai_governed_decision_decisionId_key" ON "mai_governed_decision"("decisionId");

-- CreateIndex
CREATE INDEX "mai_governed_decision_tenantId_idx" ON "mai_governed_decision"("tenantId");

-- CreateIndex
CREATE INDEX "mai_governed_decision_decisionState_idx" ON "mai_governed_decision"("decisionState");

-- CreateIndex
CREATE INDEX "mai_governed_decision_subjectId_idx" ON "mai_governed_decision"("subjectId");

-- CreateIndex
CREATE INDEX "mai_governed_decision_lessonLearnedId_idx" ON "mai_governed_decision"("lessonLearnedId");
