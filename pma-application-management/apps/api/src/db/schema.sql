-- PMA Autopilot — authoritative HOST schema (node-postgres).
--
-- The sandbox blocks Prisma's engine, so the running data layer is SQL DDL + pg.
-- apps/api/prisma/schema.prisma is retained as a reference model. Column names are
-- camelCase (quoted) to match the kernel's getSnapshot and the platform convention.
-- Idempotent (IF NOT EXISTS). All host tables carry "tenantId".

-- ─── Organization (tenant) — holds its OWN Submission Office Profile ────────────
CREATE TABLE IF NOT EXISTS "Organization" (
  "id"                       text PRIMARY KEY,
  "name"                     text NOT NULL,
  "slug"                     text NOT NULL UNIQUE,
  "legalName"                text,
  "submissionOfficeName"     text,
  "submissionOfficeAddress"  text,
  "submissionOfficeContact"  text,
  "submissionMethod"         text,
  "createdAt"                text NOT NULL,
  "updatedAt"                text NOT NULL
);

-- ─── User ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "User" (
  "id"           text PRIMARY KEY,
  "tenantId"     text NOT NULL,
  "email"        text NOT NULL,
  "passwordHash" text NOT NULL,
  "fullName"     text NOT NULL,
  "role"         text NOT NULL DEFAULT 'PREPARER' CHECK ("role" IN ('PREPARER','REVIEWER','ADMIN')),
  "active"       boolean NOT NULL DEFAULT true,
  "createdAt"    text NOT NULL,
  "updatedAt"    text NOT NULL,
  UNIQUE ("tenantId", "email")
);
CREATE INDEX IF NOT EXISTS "User_tenant_idx" ON "User" ("tenantId");

-- ─── PMA Case (DIM snapshot fields materialized as columns) ─────────────────────
CREATE TABLE IF NOT EXISTS "PmaCase" (
  "id"                         text PRIMARY KEY,
  "tenantId"                   text NOT NULL,
  "articleName"                text NOT NULL,
  "status"                     text NOT NULL DEFAULT 'INTAKE'
     CHECK ("status" IN ('INTAKE','GAP_REVIEW','DRAFTING','UNDER_REVIEW','READY_FOR_SIGNATURE','EXPORTED','ARCHIVED')),
  "approvalBasis"              text
     CHECK ("approvalBasis" IN ('STC_IDENTICALITY','TC_LICENSED','IDENTICALITY_NO_LICENSE','TEST_AND_COMPUTATION','AMBIGUOUS')),
  "basisConfidence"            text CHECK ("basisConfidence" IN ('high','medium','low')),
  "basisConfirmedByUserId"     text,
  "basisConfirmedAt"           text,
  "regulatorySourceRevision"   text,
  "lastAssessedAt"             text,
  "stcNumber"                  text,
  "tcNumber"                   text,
  "tcHolder"                   text,
  "licenseAgreementPresent"    boolean,
  "complianceDataPresent"      boolean,
  "applicantLegalName"         text,
  "manufacturingAddress"       text,
  "faaSubmissionOffice"        text,
  "qmsManualNumber"            text,
  "qmsManualRevision"          text,
  "qmsManualDate"              text,
  "markingSchemeRef"           text,
  "icaDispositionStated"       boolean,
  "adImpactAddressed"          boolean,
  "signatoryName"              text,
  "signatoryTitle"             text,
  "pmaPartNumbers"             text[] NOT NULL DEFAULT '{}',
  "oemPartNumbers"             text[] NOT NULL DEFAULT '{}',
  "letterStcNumber"            text,
  "supplementStcNumber"        text,
  "letterModelEligibility"     text,
  "supplementModelEligibility" text,
  "createdAt"                  text NOT NULL,
  "updatedAt"                  text NOT NULL
);
CREATE INDEX IF NOT EXISTS "PmaCase_tenant_idx" ON "PmaCase" ("tenantId");
CREATE INDEX IF NOT EXISTS "PmaCase_tenant_status_idx" ON "PmaCase" ("tenantId","status");

-- ─── Evidence documents (uploaded source files) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "EvidenceDocument" (
  "id"               text PRIMARY KEY,
  "tenantId"         text NOT NULL,
  "caseId"           text NOT NULL REFERENCES "PmaCase"("id") ON DELETE CASCADE,
  "type"             text NOT NULL
     CHECK ("type" IN ('STC','ASSIST_LETTER','TC_HOLDER_LETTER','MASTER_DRAWING_LIST','DRAWING','TEST_REPORT','QMS_MANUAL_EXCERPT','OTHER')),
  "fileName"         text NOT NULL,
  "storageKey"       text NOT NULL,
  "contentHash"      text NOT NULL,
  "version"          integer NOT NULL DEFAULT 1,
  "uploadedByUserId" text,
  "createdAt"        text NOT NULL
);
CREATE INDEX IF NOT EXISTS "EvidenceDocument_case_idx" ON "EvidenceDocument" ("caseId");
CREATE INDEX IF NOT EXISTS "EvidenceDocument_tenant_idx" ON "EvidenceDocument" ("tenantId");

-- ─── Data fields (CONFIRMED / MISSING only — no LIKELY state) ────────────────────
CREATE TABLE IF NOT EXISTS "DataField" (
  "id"               text PRIMARY KEY,
  "tenantId"         text NOT NULL,
  "caseId"           text NOT NULL REFERENCES "PmaCase"("id") ON DELETE CASCADE,
  "fieldKey"         text NOT NULL,
  "value"            text,
  "state"            text NOT NULL DEFAULT 'MISSING' CHECK ("state" IN ('CONFIRMED','MISSING')),
  "method"           text CHECK ("method" IN ('form_field_read','pattern_match','preparer_transcribed')),
  "sourceEvidenceId" text REFERENCES "EvidenceDocument"("id") ON DELETE SET NULL,
  "sourceCitation"   text,
  "createdAt"        text NOT NULL,
  "updatedAt"        text NOT NULL,
  UNIQUE ("caseId","fieldKey")
);
CREATE INDEX IF NOT EXISTS "DataField_case_idx" ON "DataField" ("caseId");
CREATE INDEX IF NOT EXISTS "DataField_tenant_idx" ON "DataField" ("tenantId");

-- ─── Generated documents (versioned, stamped) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "GeneratedDocument" (
  "id"                       text PRIMARY KEY,
  "tenantId"                 text NOT NULL,
  "caseId"                   text NOT NULL REFERENCES "PmaCase"("id") ON DELETE CASCADE,
  "type"                     text NOT NULL
     CHECK ("type" IN ('APPLICATION_LETTER','PMA_SUPPLEMENT','SUBMISSION_CHECKLIST','MANAGEMENT_REVIEW_PACK')),
  "version"                  integer NOT NULL DEFAULT 1,
  "storageKey"               text NOT NULL,
  "dataSnapshotHash"         text NOT NULL,
  "regulatorySourceRevision" text NOT NULL,
  "submissionStatus"         text NOT NULL CHECK ("submissionStatus" IN ('DRAFTED','DRAFTED_WITH_GAPS','BLOCKED')),
  "generatedByUserId"        text,
  "createdAt"                text NOT NULL
);
CREATE INDEX IF NOT EXISTS "GeneratedDocument_case_idx" ON "GeneratedDocument" ("caseId");
CREATE INDEX IF NOT EXISTS "GeneratedDocument_tenant_idx" ON "GeneratedDocument" ("tenantId");

-- ─── Approved library (promoted precedent) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ApprovedLibraryEntry" (
  "id"               text PRIMARY KEY,
  "tenantId"         text NOT NULL,
  "sourceCaseId"     text,
  "articleName"      text NOT NULL,
  "approvalBasis"    text NOT NULL,
  "summary"          text,
  "keywords"         text[] NOT NULL DEFAULT '{}',
  "promotedByUserId" text,
  "createdAt"        text NOT NULL
);
CREATE INDEX IF NOT EXISTS "ApprovedLibraryEntry_tenant_idx" ON "ApprovedLibraryEntry" ("tenantId");
CREATE INDEX IF NOT EXISTS "ApprovedLibraryEntry_tenant_basis_idx" ON "ApprovedLibraryEntry" ("tenantId","approvalBasis");

-- ─── Regulatory source registry ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RegulatorySource" (
  "id"              text PRIMARY KEY,
  "tenantId"        text NOT NULL,
  "title"           text NOT NULL,
  "canonicalUrl"    text NOT NULL,
  "category"        text NOT NULL CHECK ("category" IN ('AC','CFR_SECTION','FAA_FORM')),
  "currentRevision" text,
  "lastKnownHash"   text,
  "status"          text NOT NULL DEFAULT 'OK' CHECK ("status" IN ('OK','BROKEN','CHANGED')),
  "lastCheckedAt"   text,
  "frozen"          boolean NOT NULL DEFAULT false,
  "proposedUrl"     text,
  "createdAt"       text NOT NULL,
  "updatedAt"       text NOT NULL
);
CREATE INDEX IF NOT EXISTS "RegulatorySource_tenant_idx" ON "RegulatorySource" ("tenantId");
CREATE INDEX IF NOT EXISTS "RegulatorySource_tenant_status_idx" ON "RegulatorySource" ("tenantId","status");

-- ─── Audit ledger (append-only, immutable) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AuditLedger" (
  "id"          text PRIMARY KEY,
  "tenantId"    text NOT NULL,
  "actorUserId" text,
  "action"      text NOT NULL,
  "recordType"  text NOT NULL,
  "recordId"    text NOT NULL,
  "contentHash" text NOT NULL,
  "detail"      jsonb,
  "occurredAt"  text NOT NULL
);
CREATE INDEX IF NOT EXISTS "AuditLedger_tenant_idx" ON "AuditLedger" ("tenantId");
CREATE INDEX IF NOT EXISTS "AuditLedger_tenant_record_idx" ON "AuditLedger" ("tenantId","recordType","recordId");
