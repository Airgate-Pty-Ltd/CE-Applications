# HF Continuous Learning Engine — Prisma Schema Delta

**Date:** 2026-08-05  
**Purpose:** Document new Prisma models and relationships needed for Phase 1 (vertical slice). Existing models (User, Course, Lesson, Assessment, etc.) remain unchanged; these additions extend the schema in place.  
**Companion:** DESIGN-NOTES.md, DECISIONS.md (architecture rationale)

---

## Overview

**Existing Models (Keep Unchanged):** User, Course, Lesson, Assessment, AssessmentQuestion, AssessmentAttempt, CourseEnrollment, LessonCompletion, Certificate, AuditLog.

**New Models (Add to Schema):** 23 new tables across 4 planes.

**Relationships:** Evidence → Governance → Learning → Delivery (one-way flow for governance authority; bidirectional for traceability).

---

## Evidence Plane (4 Models)

### Model: HfEvidence
Evidence of HF-relevant occurrences, findings, changes. Never contains training decisions.

```prisma
model HfEvidence {
  id                      String    @id @default(cuid())
  
  tenantId                String
  
  // Classification & provenance
  classification          String    @default("INTERNAL")  // enum: EvidenceClassificationEnum
  // BURRANA_PRIVATE blocks AI Assist; EXPORT_CONTROLLED requires admin approval; others configurable
  
  source                  String    @db.Text  // "NCR-2026-0001", "LM-Fatigue-Study", "FAA-Bulletin-XYZ"
  sourceType              String    @default("ncr")
  // Values: ncr, incident, audit_finding, regulatory_alert, industry_lesson, internal_memo, etc.
  
  title                   String
  description             String?   @db.Text
  
  // Time context
  occurredAt              DateTime
  reportedAt              DateTime  @default(now())
  
  // Themes (HF categories)
  themes                  String[]  @default([])
  // Examples: "communication", "fatigue", "procedural_compliance", "situational_awareness", "supervision", "distraction"
  
  // Severity, evidence quality
  severity                String    @default("medium")  // low, medium, high, critical
  evidenceQuality         EvidenceQuality?  // extracted_from_source_confidence, source_authority, evidence_sufficiency, applicability_certainty
  
  // Attachment (source document)
  documentHash            String?   // SHA-256 of source file for integrity verification
  documentUrl             String?   // URL or local path to source document
  quarantineStatus        String?   // if uploaded: NEW, SCANNED, INTEGRITY_VERIFIED, CLASSIFIED, EXTRACTED, ACCEPTED, REJECTED, ARCHIVED
  
  // Upstream relationships
  createdBy               String    @db.Text  // named person or "system"
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  // Relationships
  events                  HfEvent[]
  relationships           EvidenceRelationship[] @relation("fromEvidence")
  classifications         EvidenceClassification[]
  
  @@index([tenantId])
  @@index([classification])
  @@index([occurredAt])
  @@index([themes])
  @@map("hf_evidence")
}

type EvidenceQuality {
  extractionQuality      Float     // 0.0-1.0: confidence in extracted data
  sourceAuthority        String    // "primary_source", "derived", "secondary", "questionable"
  evidenceSufficiency    String    // "complete", "partial", "anecdotal", "insufficient"
  applicabilityCertainty Float     // 0.0-1.0: how certain this evidence applies to our org/role
}
```

### Model: HfEvent
Specific event extracted from evidence. Many events per evidence source. Events lead to interventions.

```prisma
model HfEvent {
  id                      String    @id @default(cuid())
  
  tenantId                String
  evidenceId              String
  evidence                HfEvidence @relation(fields: [evidenceId], references: [id], onDelete: Cascade)
  
  // Event details
  title                   String
  description             String?   @db.Text
  occurredAt              DateTime
  
  // Risk exposure
  themes                  String[]  @default([])
  rolesExposed            String[]  @default([])  // ["mechanic", "inspector", "supervisor"]
  sitesExposed            String[]  @default([])  // ["Brisbane", "Irvine"]
  estimatedFrequency      String?   // "once", "monthly", "quarterly", "unknown"
  
  // Linkage to corrective action / investigation
  linkedCAPAId            String?   // external CA number if this is a formal CA
  linkedAuditId           String?   // audit finding reference
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  // Relationships
  relationships           EvidenceRelationship[] @relation("fromEvent")
  interventions           LearningIntervention[]
  causalStatus            MaiCausalStatus?  // human investigation, not auto-status
  maiEvents               MaiEvent[]  // kernel processing snapshots
  
  @@index([tenantId])
  @@index([themes])
  @@index([rolesExposed])
  @@map("hf_event")
}
```

### Model: EvidenceClassification
Sticky classification for evidence and derived atoms. Confidentiality enforcement point. Gates AI routing (query-level).

```prisma
model EvidenceClassification {
  id                      String    @id @default(cuid())
  
  tenantId                String
  evidenceId              String
  evidence                HfEvidence @relation(fields: [evidenceId], references: [id], onDelete: Cascade)
  
  classification          String    @default("INTERNAL")
  // Seven classifications per directive §8.1:
  // PUBLIC: can appear in seeds, no restrictions, AI assist allowed
  // INTERNAL: org-only, no export, AI assist allowed (if configured)
  // BURRANA_PRIVATE: Burrana-only, blocks ALL AI Assist (external or internal), no seed data
  // EXPORT_CONTROLLED: ITAR/EAR, restricts geography/access, admin approval for any use
  // CUSTOMER_CONFIDENTIAL: customer data, restricted use, no seed unless customer approves
  // ANNEX_QUALITY_IP: Annex Quality proprietary, limited distribution, no commercial seed
  // SYSTEM_PROPRIETARY: system-specific training material, internal use only, AI assist allowed (if configured)
  
  rationale               String?   @db.Text
  
  classifiedBy            String    @db.Text  // named person or "system"
  classifiedAt            DateTime  @default(now())
  
  // AI routing gate (query-level enforcement)
  // Before routing evidence to AI Assist, check:
  // - if BURRANA_PRIVATE: BLOCK (return error, use no-AI fallback)
  // - if EXPORT_CONTROLLED: CHECK tenant config (may require approval)
  // - if CUSTOMER_CONFIDENTIAL: CHECK tenant config
  // - if PUBLIC, INTERNAL, ANNEX_QUALITY_IP, SYSTEM_PROPRIETARY: ALLOW (if AI assist enabled)
  
  @@unique([tenantId, evidenceId])
  @@index([classification])
  @@map("evidence_classification")
}

enum EvidenceClassificationEnum {
  PUBLIC
  INTERNAL
  BURRANA_PRIVATE
  EXPORT_CONTROLLED
  CUSTOMER_CONFIDENTIAL
  ANNEX_QUALITY_IP
  SYSTEM_PROPRIETARY
}
```

### Model: EvidenceRelationship
Directed, typed edges for traceability graph. Supports forward and reverse queries.

```prisma
model EvidenceRelationship {
  id                      String    @id @default(cuid())
  
  tenantId                String
  
  // FROM entity (subject)
  fromEntityType          String    // "HfEvidence", "HfEvent", "LearningAtom", "LearningIntervention", "TrainingAssignment", "SupervisorObservation", etc.
  fromEntityId            String
  
  // TO entity (object)
  toEntityType            String
  toEntityId              String
  
  // Relationship type
  relationshipType        String    // supports, contradicts, reveals, addresses, teaches, exposed_to, includes, verifies, evaluates, supersedes
  
  rationale               String?   @db.Text  // why this relationship exists
  strength                Float?    // 0.0-1.0: confidence in relationship
  
  createdBy               String    @db.Text  // named person
  createdAt               DateTime  @default(now())
  supersededAt            DateTime?  // when this relationship was invalidated (but never deleted, for audit trail)
  
  // Explicit foreign keys for common paths (for query performance)
  evidenceFromId          String?
  evidenceFrom            HfEvidence? @relation("fromEvidence", fields: [evidenceFromId], references: [id], onDelete: SetNull)
  
  eventFromId             String?
  eventFrom               HfEvent? @relation("fromEvent", fields: [eventFromId], references: [id], onDelete: SetNull)
  
  @@index([tenantId])
  @@index([fromEntityType, fromEntityId])
  @@index([toEntityType, toEntityId])
  @@index([relationshipType])
  @@index([createdAt])
  @@map("evidence_relationship")
}

enum RelationshipType {
  SUPPORTS              // source supports conclusion
  CONTRADICTS           // source contradicts conclusion
  REVEALS               // event reveals risk/issue
  ADDRESSES             // intervention addresses event/risk
  TEACHES               // lesson teaches control/skill
  EXPOSED_TO            // role/site exposed to risk
  INCLUDES              // package includes lesson
  VERIFIES              // assessment verifies objective
  EVALUATES             // observation evaluates intervention
  SUPERSEDES            // new atom supersedes old
}
```

---

## Governance Plane (8 Models)

### Model: MaiRuleManifest
Versioned rule set for M-AI Kernel. Deterministic, rules-only governance.

```prisma
model MaiRuleManifest {
  id                      String    @id @default(cuid())
  
  tenantId                String    // multi-tenant isolation (even on-prem for future support)
  
  version                 Int       @default(1)  // incremented on changes
  status                  String    @default("DRAFT")  // DRAFT, PUBLISHED, SUPERSEDED
  
  effectiveDate           DateTime  @default(now())
  expiryDate              DateTime?
  
  // Rules as structured data (JSON array of rule objects)
  // NO executable strings. Pure JSON with defined operator grammar.
  // Kernel will parse and evaluate this JSON deterministically.
  rules                   Json      @db.Json  // array of {id, name, conditions[], actions[], severity, approvedBy, approvedAt}
  
  // Example rule structure (owner-supplied; not authored by Claude):
  // {
  //   "id": "R-001-HF-FATIGUE-RECURRENCE",
  //   "name": "Fatigue theme recurrence trigger",
  //   "conditions": [
  //     {"operator": "count_events", "theme": "fatigue", "timeWindow_months": 12, "threshold": 3},
  //     {"operator": "no_covering_training", "theme": "fatigue"}
  //   ],
  //   "actions": [
  //     {"operator": "surface_system_condition", "severity": "HIGH", "rationale": "Fatigue pattern; current training gap"}
  //   ],
  //   "approvedBy": "brian.olea@burrana.com",  // named person, not role
  //   "approvedAt": "2026-08-01T10:00:00Z"
  // }
  
  // Audit
  createdBy               String    @db.Text  // named person
  createdAt               DateTime  @default(now())
  publishedBy             String?   @db.Text  // named person
  publishedAt             DateTime?
  
  // Relationships
  systemConditions        MaiSystemCondition[]
  events                  MaiEvent[]
  
  @@unique([tenantId, version])
  @@index([status])
  @@index([effectiveDate])
  @@map("mai_rule_manifest")
}
```

### Model: MaiEvent
Immutable snapshot of evidence/event before kernel processing. Enables auditability and idempotency.

```prisma
model MaiEvent {
  id                      String    @id @default(cuid())
  
  tenantId                String
  
  ruleManifestId          String
  ruleManifest            MaiRuleManifest @relation(fields: [ruleManifestId], references: [id])
  
  // Immutable snapshot: kernel reads this, not live evidence
  snapshotJson            Json      @db.Json  // {eventId, themes[], rolesExposed[], timestamp, ...}
  snapshotHash            String    // SHA-256 of snapshotJson
  
  // Processing timestamp
  processedAt             DateTime  @default(now())
  
  // Relationships
  systemConditions        MaiSystemCondition[]
  errorLog                MaiErrorLog[]
  
  @@unique([tenantId, snapshotHash])  // idempotency: same snapshot → same mai_event
  @@index([processedAt])
  @@map("mai_event")
}
```

### Model: MaiErrorLog
Kernel errors (rules malformed, processing failures). Append-only audit trail.

```prisma
model MaiErrorLog {
  id                      String    @id @default(cuid())
  
  tenantId                String
  eventId                 String
  event                   MaiEvent  @relation(fields: [eventId], references: [id])
  
  ruleId                  String?   // which rule failed (if known)
  errorType               String    // "rule_malformed", "condition_eval_error", "action_eval_error", "system_error"
  errorMessage            String    @db.Text
  
  loggedAt                DateTime  @default(now())
  
  @@index([tenantId])
  @@index([ruleId])
  @@map("mai_error_log")
}
```
```

### Model: MaiSystemCondition
System-detected condition from rule evaluation. No authority; surfaces for human decision (Confirm / Dismiss–incorrect / Dismiss–not applicable).

```prisma
model MaiSystemCondition {
  id                      String    @id @default(cuid())
  
  tenantId                String
  
  ruleManifestId          String
  ruleManifest            MaiRuleManifest @relation(fields: [ruleManifestId], references: [id])
  
  eventId                 String
  event                   MaiEvent  @relation(fields: [eventId], references: [id], onDelete: Restrict)
  
  // Snapshot of what rule saw (for audit trail)
  snapshotJson            Json      @db.Json  // {eventId, themes[], timestamp, ...}
  snapshotHash            String    // SHA-256 of snapshotJson
  
  // Condition details
  ruleId                  String    // e.g., "R-001-HF-FATIGUE-RECURRENCE"
  ruleName                String
  severity                String    @default("INFO")  // INFO, LOW, MEDIUM, HIGH, CRITICAL
  
  rationale               String    @db.Text  // why kernel flagged this
  suggestedAction         String?   @db.Text  // kernel's advisory (not authoritative)
  
  // Human response: three-option gate
  status                  String    @default("NEW")  // NEW, REVIEWED, ARCHIVED
  response                String?   // CONFIRM, DISMISS_INCORRECT, DISMISS_NOT_APPLICABLE
  respondedBy             String?   @db.Text  // named person who decided
  respondedAt             DateTime?
  responseNotes           String?   @db.Text  // why they confirmed/dismissed
  
  // Supersession (history chain, forward-linked)
  supersededById          String?   // if superseded by newer condition from same event
  supersedingCondition    MaiSystemCondition? @relation("Supersession", fields: [supersededById], references: [id], onDelete: SetNull)
  supersededConditions    MaiSystemCondition[] @relation("Supersession")
  
  // Link to resulting intervention (if confirmed + actioned)
  linkedInterventionId    String?
  linkedIntervention      LearningIntervention? @relation(fields: [linkedInterventionId], references: [id], onDelete: SetNull)
  
  detectedAt              DateTime  @default(now())
  createdAt               DateTime  @default(now())
  
  @@unique([tenantId, snapshotHash, ruleId])  // idempotency: same snapshot + rule = same condition
  @@index([status])
  @@index([severity])
  @@index([detectedAt])
  @@map("mai_system_condition")
}
```

### Model: MaiCausalStatus
Human-only promotion of causal status. Kernel can flag; humans decide. History preserved (no cascade delete).

```prisma
model MaiCausalStatus {
  id                      String    @id @default(cuid())
  
  tenantId                String
  eventId                 String
  event                   HfEvent   @relation(fields: [eventId], references: [id], onDelete: Restrict)
  
  // Causal investigation
  status                  String    @default("REPORTED")
  // REPORTED, SUSPECTED, UNDER_INVESTIGATION, VERIFIED, ROOT_CAUSE, LATENT_CONDITION, UNSUPPORTED_ASSERTION, DISPUTED_CONCLUSION
  
  // Investigation details
  suspectedCauses         String[]  @default([])  // free text; e.g., ["insufficient training", "tool failure", "fatigue"]
  verifiedRootCause       String?   // single confirmed root cause
  latentCondition         String?   // systemic condition (if identified)
  
  // Gating: can this drive training?
  supportedAssertion      Boolean?  // null=unevaluated, true=evidence supports, false=unsupported assertion
  assertionNotes          String?   @db.Text
  
  investigationNotes      String?   @db.Text
  investigationDeadline   DateTime?
  
  // Promotions (history)
  promotedBy              String?   @db.Text  // named person who promoted status last
  promotedAt              DateTime?
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  @@unique([tenantId, eventId])
  @@index([status])
  @@map("mai_causal_status")
}

enum MaiCausalStatusEnum {
  REPORTED
  SUSPECTED
  UNDER_INVESTIGATION
  VERIFIED
  ROOT_CAUSE
  LATENT_CONDITION
  UNSUPPORTED_ASSERTION  // kernel flagged; investigation shows no credible cause
  DISPUTED_CONCLUSION    // disagreement on root cause; needs escalation
}
```

### Model: MaiApproval
Approval gate records. Kernel decisions are advisory; approvals are authority.

```prisma
model MaiApproval {
  id                      String    @id @default(cuid())
  
  tenantId                String
  
  // What is being approved?
  approvalType            String    // "LEARNING_ATOM", "CURRICULUM_MANIFEST", "PUBLICATION", "INTERVENTION_START", "EFFECTIVENESS_CLOSURE", etc.
  subjectId               String    // reference to the entity being approved
  subjectType             String    // "LearningAtom", "CurriculumManifest", etc.
  
  // Approval details
  rationale               String?   @db.Text
  conditionsImposed       String?   @db.Text  // e.g., "approved for maintenance technicians only, expires 2026-12-31"
  
  // Decision
  decision                String    @default("PENDING")  // PENDING, APPROVED, CONDITIONAL, REJECTED
  decidedBy               String?   @db.Text  // named person
  decidedAt               DateTime?
  
  createdAt               DateTime  @default(now())
  expiryDate              DateTime?
  
  @@index([tenantId])
  @@index([approvalType])
  @@index([decision])
  @@map("mai_approval")
}
```

### Model: LearningInterventionAppropriatenessReview
Human decision: is training the right intervention for this causal factor?

```prisma
model LearningInterventionAppropriatenessReview {
  id                      String    @id @default(cuid())
  
  interventionId          String    @unique
  intervention            LearningIntervention @relation(fields: [interventionId], references: [id], onDelete: Cascade)
  
  // The questions
  competenceGapIdentified Boolean?  // is there a training-addressable gap?
  trainingReducesRisk     Boolean?  // does training reduce the risk?
  
  // Alternatives ranking (1=best, 5=worst; null=not considered)
  engineeringAlternative  String?   @db.Text  // e.g., "better labeling on tool" or "N/A"
  engineeringRanking      Int?
  
  processingAlternative   String?   @db.Text  // e.g., "implement two-person verification" or "N/A"
  processingRanking       Int?
  
  toolingAlternative      String?   @db.Text  // e.g., "redesign checklist" or "N/A"
  toolingRanking          Int?
  
  // Training role
  primaryOrSupporting     String    @default("PRIMARY")  // PRIMARY, SUPPORTING, NONE
  expectedBehaviorChange  String?   @db.Text  // e.g., "recognize fatigue symptoms; request break"
  
  // Failure escalation
  ineffectivenessEscalation String? @db.Text  // e.g., "if incident recurs in 6 months, escalate to engineering review"
  
  // Approval
  reviewedBy              String    @db.Text
  reviewedAt              DateTime  @default(now())
  
  @@index([competenceGapIdentified])
  @@index([trainingReducesRisk])
}
```

---

## Learning Design Plane (4 Models)

### Model: LearningAtom
Smallest independently controlled content unit. Versioned, replaceable, approvable.

```prisma
model LearningAtom {
  id                      String    @id @default(cuid())
  
  // Identity
  title                   String
  revision                Int       @default(1)  // incremented on content changes
  objective               String    @db.Text  // learning objective or skill to be demonstrated
  
  // Content & format
  format                  String    // "micro_lesson", "case_study", "scenario", "question_cluster", "reminder", "briefing", "observation", "card"
  duration                Int?      // minutes
  content                 String?   @db.Text  // markdown or rich text
  
  // Relationships to evidence
  sourceEvidenceIds       String[]  @default([])  // HfEvidence ids this atom derives from
  sourceSpans             Json?     @db.Json  // [{source: "HfEvidence-id", span: {start, end}, text: "..."}] for grounding
  
  // Applicability
  applicabilityTags       String[]  @default([])  // ["maintenance", "inspection", "supervision", "communication", "fatigue", ...]
  prerequisiteAtomIds     String[]  @default([])  // must complete before this
  roleAudience            String[]  @default([])  // ["mechanic", "inspector", "supervisor"]
  
  // Classification (inherited from source evidence)
  classification          String    @default("INTERNAL")
  // If source evidence is BURRANA_PRIVATE, this atom is too
  
  // Assessment
  assessmentQuestionIds   String[]  @default([])  // links to AssessmentQuestion ids (if this atom has a quiz)
  recurrenceRule          String?   // e.g., "annual", "biennial", "every 24 months", "on-demand"
  
  // Effectiveness method
  effectivenessMethod     String?   // "completion", "knowledge_test", "workplace_transfer", "operational_impact"
  evaluationCriteria      String?   @db.Text
  
  // Approval & versioning
  status                  String    @default("DRAFT")  // DRAFT, UNDER_REVIEW, APPROVED, PUBLISHED, SUPERSEDED, ARCHIVED, REJECTED, EMERGENCY_INTERIM, REFERENCE_ONLY
  approvedBy              String?   @db.Text
  approvedAt              DateTime?
  
  // Replacement chain
  replacementAtomId       String?   // points to newer version if superseded
  replacedAtomId          String?   // points to older version if this is newer
  replacementReason       String?   // e.g., "updated examples", "regulatory change", "lesson learned"
  
  // License/confidentiality
  licenseClass            String?   // "public_domain", "cc_by", "annex_quality", "proprietary", "burrana"
  owner                   String?   // "Conform-Edge", "Annex Quality", "Burrana", "Org-ABC"
  
  // Risk linkage
  linkedEventIds          String[]  @default([])  // HfEvent ids this atom addresses
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  reviewDate              DateTime?  // when atom was last reviewed for accuracy
  retiredDate             DateTime?  // when atom was retired from use
  
  // Relationships
  relationships           EvidenceRelationship[]
  packInclusions          CurriculumManifestItem[]
  
  @@index([status])
  @@index([format])
  @@index([classification])
  @@index([approvedAt])
}
```

### Model: LearningIntervention
Intervention designed to address an event/risk. Contains atoms, assessment, approval.

```prisma
model LearningIntervention {
  id                      String    @id @default(cuid())
  
  eventId                 String
  event                   HfEvent   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  
  // Design
  title                   String
  description             String?   @db.Text
  
  // Content: atoms + assessment
  atomIds                 String[]  @default([])  // LearningAtom ids in this intervention
  caseStudyAtomId         String?   // one atom as the case study / scenario
  assessmentIds           String[]  @default([])  // Assessment ids (could be multiple, e.g., baseline + recall)
  
  // Effectiveness target
  effectivenessTargetLevel String  @default("COMPLETION")  // COMPLETION, KNOWLEDGE_SKILL, WORKPLACE_TRANSFER, OPERATIONAL_IMPACT
  // Closure rule: intervention closes only when evidence at this level is recorded
  
  // Appropriateness review
  appropriatenessReviewId String?   @unique
  appropriatenessReview   LearningInterventionAppropriatenessReview?
  
  // Status
  status                  String    @default("DRAFT")  // DRAFT, DESIGNED, APPROVED, PUBLISHED, ACTIVE, CLOSED, RECALLED
  
  // Approvals
  designedBy              String    @db.Text
  designedAt              DateTime  @default(now())
  
  approvedBy              String?   @db.Text
  approvedAt              DateTime?
  
  publishedBy             String?   @db.Text
  publishedAt             DateTime?
  
  // Lifecycle
  startDate               DateTime?  // when assignments begin
  targetCompletionDate    DateTime?  // when learners must complete
  
  closureStatus           String    @default("OPEN")  // OPEN, CLOSED, ARCHIVED
  // OPEN: awaiting effectiveness evidence at target level; CLOSED: evidence recorded; ARCHIVED: case complete, in history
  closedAt                DateTime?
  
  // Recall/withdrawal
  recalledAt              DateTime?  // if withdrawn (e.g., incorrect training)
  recallReason            String?   @db.Text
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  // Relationships
  systemCondition         MaiSystemCondition?
  assignments             TrainingAssignment[]
  observations            SupervisorObservation[]
  effectiveness           EffectivenessEvidence[]
  
  @@index([status])
  @@index([effectivenessTargetLevel])
  @@index([closureStatus])
}
```

### Model: PolicyPack
Versioned regulatory requirement sets. Defines mandatory topics, audiences, assessments, recurrence.

```prisma
model PolicyPack {
  id                      String    @id @default(cuid())
  
  name                    String    // e.g., "FAA HF Recurrent R4 2024"
  version                 Int       @default(1)
  
  // Regulatory context
  regulatoryFramework     String    // "FAA", "EASA", "CAAC", "AFAC", "CustomOrg"
  regulatoryReference     String?   // "14 CFR 145.23", "CCAR-145 8.12.1"
  
  // Effective dates
  effectiveDate           DateTime  @default(now())
  expiryDate              DateTime?  // when this pack is superseded
  
  // Mandatory requirements
  mandatoryTopics         String[]  @default([])  // e.g., ["Human Factors Fundamentals", "Fatigue Awareness", "Error Management"]
  mandatoryAudiences      String[]  @default([])  // roles required to complete: ["maintenance_technician", "inspector"]
  mandatoryAssessments    String[]  @default([])  // "written_test", "practical_demonstration", "none"
  
  recurrenceMonths        Int?      // if mandatory recurrent training: every N months
  evidenceSufficiencyRules String? @db.Text  // rules for what counts as completion (e.g., "score >= 80% and 100% attendance")
  
  // License/confidentiality
  licenseClass            String?   // "public", "org_only", etc.
  
  // Clauses mapped to atoms
  clauses                 PolicyPackClause[]
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  approvedBy              String?   @db.Text
  approvedAt              DateTime?
  
  @@index([regulatoryFramework])
  @@index([effectiveDate])
}

model PolicyPackClause {
  id                      String    @id @default(cuid())
  
  packId                  String
  pack                    PolicyPack @relation(fields: [packId], references: [id], onDelete: Cascade)
  
  // Regulation clause reference
  clauseNumber            String    // e.g., "8.12.1", "7.5.3"
  clauseTitle             String?   // e.g., "Personnel Competency"
  clauseText              String?   @db.Text  // reference text (quote rules: brief, attributed)
  
  // Mapped to atoms
  mappedAtomIds           String[]  @default([])  // LearningAtom ids that satisfy this clause
  
  // Traceability
  traceabilityNotes       String?   @db.Text  // how atoms cover clause intent
  
  @@index([packId])
}
```

---

## Delivery & Effectiveness Plane (5 Models)

### Model: TrainingAssignment
Learner is assigned a training package (manifest). Creates accountability.

```prisma
model TrainingAssignment {
  id                      String    @id @default(cuid())
  
  learnerId               String
  learner                 User      @relation(fields: [learnerId], references: [id], onDelete: Cascade)
  
  interventionId          String
  intervention            LearningIntervention @relation(fields: [interventionId], references: [id], onDelete: Cascade)
  
  // Package reference (frozen at assignment)
  manifestId              String
  manifest                TrainingPackageManifest @relation(fields: [manifestId], references: [id])
  
  // Assignment details
  role                    String?   // learner's role at assignment time (for audit)
  site                    String?   // learner's site at assignment time
  
  // Due dates
  assignedAt              DateTime  @default(now())
  dueDate                 DateTime?
  targetCompletionDate    DateTime?
  
  // Completion tracking
  completedAt             DateTime?
  passedAt                DateTime?  // assessment passed
  failedAt                DateTime?
  
  // Assessment attempt
  assessmentAttemptIds    String[]  @default([])  // AssessmentAttempt ids for this assignment
  
  // Status
  status                  String    @default("ASSIGNED")  // ASSIGNED, IN_PROGRESS, COMPLETED, PASSED, FAILED, OVERDUE, ARCHIVED
  
  createdAt               DateTime  @default(now())
  
  // Relationships
  observations            SupervisorObservation[]
  effectiveness           EffectivenessEvidence[]
  
  @@index([learnerId])
  @@index([interventionId])
  @@index([status])
  @@index([dueDate])
}

model TrainingPackageManifest {
  id                      String    @id @default(cuid())
  
  // Identity
  packageId               String    @default(cuid())  // links all versions; manifest is one frozen snapshot
  version                 Int       @default(1)
  
  // Compiler output (snapshot of what was compiled)
  curriculumRevision      String
  compilerVersion         String    // e.g., "1.0.0"
  rulesetRevision         String
  policyPackRevisions     Json      // array of {pack_id, version, effective_date}
  
  // Learner attributes at compile time
  learnerId               String?   // if generated for single learner
  learnerRole             String?
  learnerSite             String?
  learnerAttributes       Json?     @db.Json  // custom attributes used in compilation
  
  // Compilation decisions (frozen)
  baselineContent         Json      @db.Json  // array of {atom_id, title, format, duration, ...}
  recurrentContent        Json?     @db.Json  // if recurrent cycle
  replacementDecisions    Json?     @db.Json  // [{old_atom, new_atom, reason}]
  questionSelectionLog    Json?     @db.Json  // [{question_id, why_selected, priority_rank}]
  
  // Traceability
  sourceTraceability      Json?     @db.Json  // map of atom_id → source_evidence_ids for grounding
  
  // Hashes for integrity
  inputHash               String?   // hash of all inputs (for reproducibility verification)
  outputHash              String    // hash of compiled manifest (uniqueness proof)
  
  // Approval & freezing
  approvedBy              String?   @db.Text
  approvedAt              DateTime?
  
  frozenAt                DateTime  @default(now())  // timestamp when manifest became immutable
  allLockedAfter          DateTime  @default(now())  // practical lock time
  
  // State
  status                  String    @default("ACTIVE")  // ACTIVE, ARCHIVED, SUPERSEDED
  
  createdAt               DateTime  @default(now())
  
  // Relationships
  assignments             TrainingAssignment[]
  
  @@unique([packageId, version])
  @@index([outputHash])
  @@index([frozenAt])
}
```

### Model: SupervisorObservation
Supervisor records evidence of learner workplace transfer and effectiveness.

```prisma
model SupervisorObservation {
  id                      String    @id @default(cuid())
  
  assignmentId            String
  assignment              TrainingAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  
  interventionId          String
  intervention            LearningIntervention @relation(fields: [interventionId], references: [id])
  
  // Observer details
  supervisorId            String    @db.Text
  supervisorRole          String?   // "shift_lead", "area_supervisor", "quality_manager"
  
  // Observation
  title                   String?
  description             String    @db.Text  // narrative of observation
  dateObserved            DateTime  @default(now())
  
  // Evidence of effectiveness level
  effectivenessLevel      String    @default("COMPLETION")  // COMPLETION, KNOWLEDGE_SKILL, WORKPLACE_TRANSFER, OPERATIONAL_IMPACT
  
  // Observation details by level
  knowledgeSkillEvidence  String?   @db.Text  // e.g., "learner correctly identified 3 fatigue symptoms on the shift"
  transferEvidence        String?   @db.Text  // e.g., "learner requested break when showing signs of fatigue"
  operationalImpactEvidence String? @db.Text  // e.g., "no incidents of type X in 90 days; trend improving"
  
  // Recommendation
  outcome                 String?   // "effective", "partially_effective", "ineffective", "needs_reinforcement"
  recommendations         String?   @db.Text
  
  recordedAt              DateTime  @default(now())
  recordedBy              String    @db.Text  // typically supervisorId
  
  // Relationships
  relationships           EvidenceRelationship[]
  
  @@index([assignmentId])
  @@index([interventionId])
  @@index([effectivenessLevel])
  @@index([dateObserved])
}

model EffectivenessEvidence {
  id                      String    @id @default(cuid())
  
  interventionId          String
  intervention            LearningIntervention @relation(fields: [interventionId], references: [id], onDelete: Cascade)
  
  assignmentId            String?
  assignment              TrainingAssignment? @relation(fields: [assignmentId], references: [id], onDelete: SetNull)
  
  // Level of evidence
  level                   String    @default("COMPLETION")  // COMPLETION, KNOWLEDGE_SKILL, WORKPLACE_TRANSFER, OPERATIONAL_IMPACT
  
  // Evidence type
  evidenceType            String    // "assessment_score", "skill_test", "observation", "incident_absence", "trend_analysis", "survey", "other"
  
  // Evidence data
  data                    Json?     @db.Json  // structured evidence data: {score: 95, duration: "90_days", incidents: 0, ...}
  supportingDocumentation String?   @db.Text  // link to evidence file or narrative
  
  // Collector & timing
  collectedBy             String    @db.Text
  collectedAt             DateTime  @default(now())
  
  // Impact on closure
  supportsClosureAt Level  Boolean   @default(false)  // does this evidence satisfy closure requirement?
  closureEvidenceAt       DateTime?  // when this was accepted as closure evidence
  
  createdAt               DateTime  @default(now())
  
  @@index([interventionId])
  @@index([level])
  @@index([evidenceType])
}
```

---

## Relationships Summary

```
HfEvidence
├─ HfEvent (1:many)
├─ EvidenceClassification (1:1)
├─ EvidenceRelationship (1:many) [fromEvidence]
└─ LearningAtom.sourceEvidenceIds (many:many via array)

HfEvent
├─ LearningIntervention (1:many)
├─ EvidenceRelationship (1:many) [fromEvent]
└─ MaiCausalStatus (1:1)

MaiSystemCondition
└─ LearningIntervention (1:1) [linkedIntervention]

LearningAtom
├─ LearningIntervention (many:many via array)
├─ TrainingPackageManifest (many:many via JSON)
└─ EvidenceRelationship (many) [fromEvidence or involved]

LearningIntervention
├─ LearningInterventionAppropriatenessReview (1:1)
├─ MaiSystemCondition (1:1) [linkedIntervention]
├─ TrainingAssignment (1:many)
├─ SupervisorObservation (1:many)
├─ EffectivenessEvidence (1:many)
└─ EvidenceRelationship (many)

TrainingAssignment
├─ TrainingPackageManifest (many:1)
├─ LearningIntervention (many:1)
├─ User (many:1) [learner]
├─ SupervisorObservation (1:many)
└─ EffectivenessEvidence (1:many)

SupervisorObservation
└─ EffectivenessEvidence (1:many) [implicit via effectiveness_level data]
```

---

## Phase 1 Data Requirements

### Minimum records for Phase 1 vertical slice:
- 1 HfEvidence (one NCR/lessons-learned document)
- 1 HfEvent (one incident extracted from evidence)
- 1 LearningIntervention (one training intervention designed)
- 3-5 LearningAtom (one main lesson + one case study + supporting atoms)
- 1 TrainingAssignment (assign to one learner)
- 1 TrainingPackageManifest (frozen package for that learner)
- 1-2 SupervisorObservation (supervisor records workplace transfer)
- 1 EffectivenessEvidence (closure-level evidence)

### No changes to existing models:
- User, Course, Lesson, Assessment, AssessmentQuestion, AssessmentAttempt, CourseEnrollment, LessonCompletion, Certificate, AuditLog remain as-is.
- New models extend the schema without touching legacy code.

---

## Governance Plane Implementation Notes

### M-AI Kernel Rule Authorship
The kernel rule table (MaiRuleManifest.rules JSON) **is NOT authored by the development team**. The owner (Brian Olea) will supply Phase 1 rule set separately. The schema provides the structure; the owner provides the semantics.

**Operator Grammar (to be defined by owner):**
```
Supported operators in rule conditions:
- count_events: {theme: string, timeWindow_months: int, threshold: int}
- no_covering_training: {theme: string}
- other operators: (owner to define)

Supported operators in rule actions:
- surface_system_condition: {severity: string, rationale: string}
- other operators: (owner to define)
```

The kernel service must parse and evaluate JSON conditions deterministically, with NO executable strings.

### AI Assist Routing Gate (Query-Level)
All AI Assist service calls must check EvidenceClassification before routing evidence:

```typescript
// Pseudo-code
async function routeToAiAssist(evidenceId: string): Promise<boolean> {
  const classification = await db.evidenceClassification.findUnique({
    where: { evidenceId }
  });
  
  if (classification.classification === 'BURRANA_PRIVATE') {
    // BLOCK: no AI assist
    throw new Error('BURRANA_PRIVATE evidence cannot be routed to AI Assist');
  }
  
  if (classification.classification === 'EXPORT_CONTROLLED') {
    // CHECK tenant config
    if (!tenantConfig.allowExportControlledToAi) {
      throw new Error('EXPORT_CONTROLLED evidence blocked by tenant policy');
    }
  }
  
  if (classification.classification === 'CUSTOMER_CONFIDENTIAL') {
    // CHECK tenant config
    if (!tenantConfig.allowCustomerConfidentialToAi) {
      throw new Error('CUSTOMER_CONFIDENTIAL evidence blocked by tenant policy');
    }
  }
  
  // PUBLIC, INTERNAL, ANNEX_QUALITY_IP, SYSTEM_PROPRIETARY: allowed (if AI assist enabled)
  return true;
}
```

### Tenant Isolation
Every `mai_*` table includes `tenantId`. Queries must filter by tenant to prevent cross-tenant data leakage. Example:

```typescript
// CORRECT: filtered by tenant
const conditions = await db.maiSystemCondition.findMany({
  where: { tenantId: context.tenantId }
});

// WRONG: no tenant filter
const conditions = await db.maiSystemCondition.findMany();
```

## Migration Strategy

1. **Create new Prisma models** (this document) in `prisma/schema.prisma`.
2. **Generate migration** via `npx prisma migrate dev --name add-hf-continuous-learning-governance-and-learning-planes`.
3. **Seed Phase 1 data** via `prisma/seed.ts` extension (owner to provide rule manifests).
4. **No backward-incompatible changes** to existing models; old learner/course workflow continues.
5. **Phase 1 focus:** evidence ingestion, intervention design, frozen manifests, effectiveness observation.

---

*References: HF-ENGINE-BUILD-PROMPT-v3.md (architecture), DESIGN-NOTES.md (rationale), DECISIONS.md (decisions), SCHEMA-DELTA.md (this document).*
