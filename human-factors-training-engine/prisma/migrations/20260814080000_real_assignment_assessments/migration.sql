CREATE TABLE "atom_assessment_question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "atomId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL DEFAULT 'multiChoice',
    "options" TEXT NOT NULL,
    "correctAnswers" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "atom_assessment_question_atomId_fkey" FOREIGN KEY ("atomId") REFERENCES "learning_atom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "assignment_assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "passingScore" INTEGER NOT NULL DEFAULT 80,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "questionSnapshot" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assignment_assessment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "training_assignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "assignment_assessment_attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessmentId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responses" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "integrityHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assignment_assessment_attempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assignment_assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "assignment_assessment_attempt_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "training_certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "certificateCode" TEXT NOT NULL,
    "assessmentSnapshotHash" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    "revocationReason" TEXT,
    CONSTRAINT "training_certificate_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "training_assignment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "training_certificate_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "assignment_assessment_attempt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "training_certificate_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "atom_assessment_question_tenantId_atomId_status_idx" ON "atom_assessment_question"("tenantId", "atomId", "status");
CREATE UNIQUE INDEX "assignment_assessment_assignmentId_key" ON "assignment_assessment"("assignmentId");
CREATE INDEX "assignment_assessment_tenantId_idx" ON "assignment_assessment"("tenantId");
CREATE UNIQUE INDEX "assignment_assessment_attempt_assessmentId_attemptNumber_key" ON "assignment_assessment_attempt"("assessmentId", "attemptNumber");
CREATE INDEX "assignment_assessment_attempt_learnerId_idx" ON "assignment_assessment_attempt"("learnerId");
CREATE UNIQUE INDEX "training_certificate_assignmentId_key" ON "training_certificate"("assignmentId");
CREATE UNIQUE INDEX "training_certificate_attemptId_key" ON "training_certificate"("attemptId");
CREATE UNIQUE INDEX "training_certificate_certificateCode_key" ON "training_certificate"("certificateCode");
CREATE INDEX "training_certificate_tenantId_learnerId_idx" ON "training_certificate"("tenantId", "learnerId");
