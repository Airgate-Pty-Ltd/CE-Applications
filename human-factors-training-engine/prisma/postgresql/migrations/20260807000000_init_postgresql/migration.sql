-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'learner',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isBaselineContent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assessmentType" TEXT NOT NULL DEFAULT 'quiz',
    "passingScore" INTEGER NOT NULL DEFAULT 80,
    "timeLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL DEFAULT 'multiChoice',
    "options" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 5,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "score" INTEGER,
    "passed" BOOLEAN,
    "responses" TEXT,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'in-progress',
    "dueDate" TIMESTAMP(3),
    "currentLessonIndex" INTEGER NOT NULL DEFAULT 0,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCompletion" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeTaken" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "assessmentAttemptId" TEXT NOT NULL,
    "certificateCode" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "publicUrl" TEXT,
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hf_evidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classification" TEXT NOT NULL DEFAULT 'INTERNAL',
    "source" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'ncr',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "themes" TEXT NOT NULL DEFAULT '[]',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "evidenceQuality" TEXT,
    "documentHash" TEXT,
    "documentUrl" TEXT,
    "quarantineStatus" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hf_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_classification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "classification" TEXT NOT NULL DEFAULT 'INTERNAL',
    "rationale" TEXT,
    "classifiedBy" TEXT NOT NULL,
    "classifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hf_event" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "themes" TEXT NOT NULL DEFAULT '[]',
    "rolesExposed" TEXT NOT NULL DEFAULT '[]',
    "sitesExposed" TEXT NOT NULL DEFAULT '[]',
    "estimatedFrequency" TEXT,
    "linkedCAPAId" TEXT,
    "linkedAuditId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hf_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_relationship" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromEntityType" TEXT NOT NULL,
    "fromEntityId" TEXT NOT NULL,
    "toEntityType" TEXT NOT NULL,
    "toEntityId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "rationale" TEXT,
    "strength" DOUBLE PRECISION,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),
    "evidenceFromId" TEXT,
    "eventFromId" TEXT,

    CONSTRAINT "evidence_relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mai_rule_manifest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "rules" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "mai_rule_manifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mai_event" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleManifestId" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hfEventId" TEXT,

    CONSTRAINT "mai_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mai_error_log" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ruleId" TEXT,
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mai_error_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mai_system_condition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleManifestId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "rationale" TEXT NOT NULL,
    "suggestedAction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "response" TEXT,
    "respondedBy" TEXT,
    "respondedAt" TIMESTAMP(3),
    "responseNotes" TEXT,
    "supersededById" TEXT,
    "linkedInterventionId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mai_system_condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mai_causal_status" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "suspectedCauses" TEXT NOT NULL DEFAULT '[]',
    "verifiedRootCause" TEXT,
    "latentCondition" TEXT,
    "supportedAssertion" BOOLEAN,
    "assertionNotes" TEXT,
    "investigationNotes" TEXT,
    "investigationDeadline" TIMESTAMP(3),
    "promotedBy" TEXT,
    "promotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mai_causal_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mai_approval" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "approvalType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "rationale" TEXT,
    "conditionsImposed" TEXT,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "mai_approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_atom" (
    "id" TEXT NOT NULL,
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
    "approvedAt" TIMESTAMP(3),
    "replacementAtomId" TEXT,
    "replacedAtomId" TEXT,
    "replacementReason" TEXT,
    "licenseClass" TEXT,
    "owner" TEXT,
    "linkedEventIds" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewDate" TIMESTAMP(3),
    "retiredDate" TIMESTAMP(3),
    "emergencyExpiresAt" TIMESTAMP(3),

    CONSTRAINT "learning_atom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_intervention" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "atomIds" TEXT NOT NULL DEFAULT '[]',
    "caseStudyAtomId" TEXT,
    "assessmentIds" TEXT NOT NULL DEFAULT '[]',
    "effectivenessTargetLevel" TEXT NOT NULL DEFAULT 'COMPLETION',
    "appropriatenessReviewId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "designedBy" TEXT NOT NULL,
    "designedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "targetCompletionDate" TIMESTAMP(3),
    "closureStatus" TEXT NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "recalledAt" TIMESTAMP(3),
    "recallReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_intervention_appropriateness_review" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "competenceGapIdentified" BOOLEAN,
    "trainingReducesRisk" BOOLEAN,
    "engineeringAlternative" TEXT,
    "engineeringRanking" INTEGER,
    "processingAlternative" TEXT,
    "processingRanking" INTEGER,
    "toolingAlternative" TEXT,
    "toolingRanking" INTEGER,
    "primaryOrSupporting" TEXT NOT NULL DEFAULT 'PRIMARY',
    "expectedBehaviorChange" TEXT,
    "ineffectivenessEscalation" TEXT,
    "reviewedBy" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_intervention_appropriateness_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_pack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "regulatoryFramework" TEXT NOT NULL,
    "regulatoryReference" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "mandatoryTopics" TEXT NOT NULL DEFAULT '[]',
    "mandatoryAudiences" TEXT NOT NULL DEFAULT '[]',
    "mandatoryAssessments" TEXT NOT NULL DEFAULT '[]',
    "recurrenceMonths" INTEGER,
    "evidenceSufficiencyRules" TEXT,
    "licenseClass" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "policy_pack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_pack_clause" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "clauseNumber" TEXT NOT NULL,
    "clauseTitle" TEXT,
    "clauseText" TEXT,
    "mappedAtomIds" TEXT NOT NULL DEFAULT '[]',
    "traceabilityNotes" TEXT,

    CONSTRAINT "policy_pack_clause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_assignment" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "role" TEXT,
    "site" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "targetCompletionDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "passedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "assessmentAttemptIds" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atom_completion" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "atomId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atom_completion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drip_delivery" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "atomId" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drip_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_package_manifest" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "curriculumRevision" TEXT NOT NULL,
    "compilerVersion" TEXT NOT NULL,
    "rulesetRevision" TEXT NOT NULL,
    "policyPackRevisions" TEXT,
    "learnerId" TEXT,
    "learnerRole" TEXT,
    "learnerSite" TEXT,
    "learnerAttributes" TEXT,
    "baselineContent" TEXT NOT NULL,
    "recurrentContent" TEXT,
    "replacementDecisions" TEXT,
    "questionSelectionLog" TEXT,
    "sourceTraceability" TEXT,
    "inputHash" TEXT,
    "outputHash" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allLockedAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_package_manifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisor_observation" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "supervisorRole" TEXT,
    "title" TEXT,
    "description" TEXT NOT NULL,
    "dateObserved" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectivenessLevel" TEXT NOT NULL DEFAULT 'COMPLETION',
    "knowledgeSkillEvidence" TEXT,
    "transferEvidence" TEXT,
    "operationalImpactEvidence" TEXT,
    "outcome" TEXT,
    "recommendations" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,

    CONSTRAINT "supervisor_observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "effectiveness_evidence" (
    "id" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "level" TEXT NOT NULL DEFAULT 'COMPLETION',
    "evidenceType" TEXT NOT NULL,
    "data" TEXT,
    "supportingDocumentation" TEXT,
    "collectedBy" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supportsClosureAtLevel" BOOLEAN NOT NULL DEFAULT false,
    "closureEvidenceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "effectiveness_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Lesson_courseId_idx" ON "Lesson"("courseId");

-- CreateIndex
CREATE INDEX "Assessment_lessonId_idx" ON "Assessment"("lessonId");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_assessmentId_idx" ON "AssessmentQuestion"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_learnerId_idx" ON "AssessmentAttempt"("learnerId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_assessmentId_idx" ON "AssessmentAttempt"("assessmentId");

-- CreateIndex
CREATE INDEX "CourseEnrollment_learnerId_idx" ON "CourseEnrollment"("learnerId");

-- CreateIndex
CREATE INDEX "CourseEnrollment_courseId_idx" ON "CourseEnrollment"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseEnrollment_learnerId_courseId_key" ON "CourseEnrollment"("learnerId", "courseId");

-- CreateIndex
CREATE INDEX "LessonCompletion_learnerId_idx" ON "LessonCompletion"("learnerId");

-- CreateIndex
CREATE INDEX "LessonCompletion_lessonId_idx" ON "LessonCompletion"("lessonId");

-- CreateIndex
CREATE INDEX "LessonCompletion_enrollmentId_idx" ON "LessonCompletion"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonCompletion_learnerId_lessonId_courseId_key" ON "LessonCompletion"("learnerId", "lessonId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_assessmentAttemptId_key" ON "Certificate"("assessmentAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateCode_key" ON "Certificate"("certificateCode");

-- CreateIndex
CREATE INDEX "Certificate_learnerId_idx" ON "Certificate"("learnerId");

-- CreateIndex
CREATE INDEX "Certificate_courseId_idx" ON "Certificate"("courseId");

-- CreateIndex
CREATE INDEX "AuditLog_actor_idx" ON "AuditLog"("actor");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_objectId_idx" ON "AuditLog"("objectId");

-- CreateIndex
CREATE INDEX "hf_evidence_tenantId_idx" ON "hf_evidence"("tenantId");

-- CreateIndex
CREATE INDEX "hf_evidence_classification_idx" ON "hf_evidence"("classification");

-- CreateIndex
CREATE INDEX "hf_evidence_occurredAt_idx" ON "hf_evidence"("occurredAt");

-- CreateIndex
CREATE INDEX "evidence_classification_classification_idx" ON "evidence_classification"("classification");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_classification_tenantId_evidenceId_key" ON "evidence_classification"("tenantId", "evidenceId");

-- CreateIndex
CREATE INDEX "hf_event_tenantId_idx" ON "hf_event"("tenantId");

-- CreateIndex
CREATE INDEX "evidence_relationship_tenantId_idx" ON "evidence_relationship"("tenantId");

-- CreateIndex
CREATE INDEX "evidence_relationship_fromEntityType_fromEntityId_idx" ON "evidence_relationship"("fromEntityType", "fromEntityId");

-- CreateIndex
CREATE INDEX "evidence_relationship_toEntityType_toEntityId_idx" ON "evidence_relationship"("toEntityType", "toEntityId");

-- CreateIndex
CREATE INDEX "evidence_relationship_relationshipType_idx" ON "evidence_relationship"("relationshipType");

-- CreateIndex
CREATE INDEX "evidence_relationship_createdAt_idx" ON "evidence_relationship"("createdAt");

-- CreateIndex
CREATE INDEX "mai_rule_manifest_status_idx" ON "mai_rule_manifest"("status");

-- CreateIndex
CREATE INDEX "mai_rule_manifest_effectiveDate_idx" ON "mai_rule_manifest"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "mai_rule_manifest_tenantId_version_key" ON "mai_rule_manifest"("tenantId", "version");

-- CreateIndex
CREATE INDEX "mai_event_processedAt_idx" ON "mai_event"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "mai_event_tenantId_snapshotHash_key" ON "mai_event"("tenantId", "snapshotHash");

-- CreateIndex
CREATE INDEX "mai_error_log_tenantId_idx" ON "mai_error_log"("tenantId");

-- CreateIndex
CREATE INDEX "mai_error_log_ruleId_idx" ON "mai_error_log"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "mai_system_condition_linkedInterventionId_key" ON "mai_system_condition"("linkedInterventionId");

-- CreateIndex
CREATE INDEX "mai_system_condition_status_idx" ON "mai_system_condition"("status");

-- CreateIndex
CREATE INDEX "mai_system_condition_severity_idx" ON "mai_system_condition"("severity");

-- CreateIndex
CREATE INDEX "mai_system_condition_detectedAt_idx" ON "mai_system_condition"("detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "mai_system_condition_tenantId_snapshotHash_ruleId_key" ON "mai_system_condition"("tenantId", "snapshotHash", "ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "mai_causal_status_eventId_key" ON "mai_causal_status"("eventId");

-- CreateIndex
CREATE INDEX "mai_causal_status_status_idx" ON "mai_causal_status"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mai_causal_status_tenantId_eventId_key" ON "mai_causal_status"("tenantId", "eventId");

-- CreateIndex
CREATE INDEX "mai_approval_tenantId_idx" ON "mai_approval"("tenantId");

-- CreateIndex
CREATE INDEX "mai_approval_approvalType_idx" ON "mai_approval"("approvalType");

-- CreateIndex
CREATE INDEX "mai_approval_decision_idx" ON "mai_approval"("decision");

-- CreateIndex
CREATE INDEX "learning_atom_status_idx" ON "learning_atom"("status");

-- CreateIndex
CREATE INDEX "learning_atom_format_idx" ON "learning_atom"("format");

-- CreateIndex
CREATE INDEX "learning_atom_classification_idx" ON "learning_atom"("classification");

-- CreateIndex
CREATE INDEX "learning_atom_approvedAt_idx" ON "learning_atom"("approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "learning_intervention_appropriatenessReviewId_key" ON "learning_intervention"("appropriatenessReviewId");

-- CreateIndex
CREATE INDEX "learning_intervention_status_idx" ON "learning_intervention"("status");

-- CreateIndex
CREATE INDEX "learning_intervention_effectivenessTargetLevel_idx" ON "learning_intervention"("effectivenessTargetLevel");

-- CreateIndex
CREATE INDEX "learning_intervention_closureStatus_idx" ON "learning_intervention"("closureStatus");

-- CreateIndex
CREATE UNIQUE INDEX "learning_intervention_appropriateness_review_interventionId_key" ON "learning_intervention_appropriateness_review"("interventionId");

-- CreateIndex
CREATE INDEX "learning_intervention_appropriateness_review_competenceGapI_idx" ON "learning_intervention_appropriateness_review"("competenceGapIdentified");

-- CreateIndex
CREATE INDEX "learning_intervention_appropriateness_review_trainingReduce_idx" ON "learning_intervention_appropriateness_review"("trainingReducesRisk");

-- CreateIndex
CREATE INDEX "policy_pack_regulatoryFramework_idx" ON "policy_pack"("regulatoryFramework");

-- CreateIndex
CREATE INDEX "policy_pack_effectiveDate_idx" ON "policy_pack"("effectiveDate");

-- CreateIndex
CREATE INDEX "policy_pack_clause_packId_idx" ON "policy_pack_clause"("packId");

-- CreateIndex
CREATE INDEX "training_assignment_learnerId_idx" ON "training_assignment"("learnerId");

-- CreateIndex
CREATE INDEX "training_assignment_interventionId_idx" ON "training_assignment"("interventionId");

-- CreateIndex
CREATE INDEX "training_assignment_status_idx" ON "training_assignment"("status");

-- CreateIndex
CREATE INDEX "training_assignment_dueDate_idx" ON "training_assignment"("dueDate");

-- CreateIndex
CREATE INDEX "atom_completion_assignmentId_idx" ON "atom_completion"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "atom_completion_assignmentId_atomId_key" ON "atom_completion"("assignmentId", "atomId");

-- CreateIndex
CREATE INDEX "drip_delivery_assignmentId_atomId_idx" ON "drip_delivery"("assignmentId", "atomId");

-- CreateIndex
CREATE INDEX "training_package_manifest_outputHash_idx" ON "training_package_manifest"("outputHash");

-- CreateIndex
CREATE INDEX "training_package_manifest_frozenAt_idx" ON "training_package_manifest"("frozenAt");

-- CreateIndex
CREATE UNIQUE INDEX "training_package_manifest_packageId_version_key" ON "training_package_manifest"("packageId", "version");

-- CreateIndex
CREATE INDEX "supervisor_observation_assignmentId_idx" ON "supervisor_observation"("assignmentId");

-- CreateIndex
CREATE INDEX "supervisor_observation_interventionId_idx" ON "supervisor_observation"("interventionId");

-- CreateIndex
CREATE INDEX "supervisor_observation_effectivenessLevel_idx" ON "supervisor_observation"("effectivenessLevel");

-- CreateIndex
CREATE INDEX "supervisor_observation_dateObserved_idx" ON "supervisor_observation"("dateObserved");

-- CreateIndex
CREATE INDEX "effectiveness_evidence_interventionId_idx" ON "effectiveness_evidence"("interventionId");

-- CreateIndex
CREATE INDEX "effectiveness_evidence_level_idx" ON "effectiveness_evidence"("level");

-- CreateIndex
CREATE INDEX "effectiveness_evidence_evidenceType_idx" ON "effectiveness_evidence"("evidenceType");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_assessmentAttemptId_fkey" FOREIGN KEY ("assessmentAttemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_classification" ADD CONSTRAINT "evidence_classification_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "hf_evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hf_event" ADD CONSTRAINT "hf_event_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "hf_evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_relationship" ADD CONSTRAINT "evidence_relationship_evidenceFromId_fkey" FOREIGN KEY ("evidenceFromId") REFERENCES "hf_evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_relationship" ADD CONSTRAINT "evidence_relationship_eventFromId_fkey" FOREIGN KEY ("eventFromId") REFERENCES "hf_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mai_event" ADD CONSTRAINT "mai_event_ruleManifestId_fkey" FOREIGN KEY ("ruleManifestId") REFERENCES "mai_rule_manifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mai_event" ADD CONSTRAINT "mai_event_hfEventId_fkey" FOREIGN KEY ("hfEventId") REFERENCES "hf_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mai_error_log" ADD CONSTRAINT "mai_error_log_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "mai_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mai_system_condition" ADD CONSTRAINT "mai_system_condition_ruleManifestId_fkey" FOREIGN KEY ("ruleManifestId") REFERENCES "mai_rule_manifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mai_system_condition" ADD CONSTRAINT "mai_system_condition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "mai_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mai_system_condition" ADD CONSTRAINT "mai_system_condition_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "mai_system_condition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mai_system_condition" ADD CONSTRAINT "mai_system_condition_linkedInterventionId_fkey" FOREIGN KEY ("linkedInterventionId") REFERENCES "learning_intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mai_causal_status" ADD CONSTRAINT "mai_causal_status_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "hf_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_intervention" ADD CONSTRAINT "learning_intervention_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "hf_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_intervention_appropriateness_review" ADD CONSTRAINT "learning_intervention_appropriateness_review_interventionI_fkey" FOREIGN KEY ("interventionId") REFERENCES "learning_intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_pack_clause" ADD CONSTRAINT "policy_pack_clause_packId_fkey" FOREIGN KEY ("packId") REFERENCES "policy_pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignment" ADD CONSTRAINT "training_assignment_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignment" ADD CONSTRAINT "training_assignment_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "learning_intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignment" ADD CONSTRAINT "training_assignment_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "training_package_manifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atom_completion" ADD CONSTRAINT "atom_completion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "training_assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drip_delivery" ADD CONSTRAINT "drip_delivery_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "training_assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_observation" ADD CONSTRAINT "supervisor_observation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "training_assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_observation" ADD CONSTRAINT "supervisor_observation_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "learning_intervention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effectiveness_evidence" ADD CONSTRAINT "effectiveness_evidence_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "learning_intervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effectiveness_evidence" ADD CONSTRAINT "effectiveness_evidence_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "training_assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

