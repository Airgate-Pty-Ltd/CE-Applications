// M-AI Core kernel — type contracts.
// The kernel imports NOTHING from the host. Hosts implement MaiAdapter; the
// dependency direction is one-way (design law 12).

// ─── Snapshot ───────────────────────────────────────────────────────────────
// An immutable, deep-copied view of a host record at a moment in time. `data`
// is the ONLY thing hashed and evaluated — `capturedAt` is metadata.
export interface Snapshot {
  recordType: string;
  recordId: string;
  tenantId: string;
  capturedAt: string; // ISO-8601
  data: Record<string, unknown>;
}

// ─── Rule grammar (closed operator set — additions need user approval) ────────
export type FieldOp =
  | 'is_null'
  | 'not_null'
  | 'is_empty'
  | 'not_empty'
  | 'eq'
  | 'ne'
  | 'in'
  | 'length_gte'
  | 'length_lt'
  | 'date_before_today'
  | 'date_after_today';

export type LinkOp = 'linked_record_exists' | 'linked_record_missing';

export interface FieldCondition {
  field: string;
  op: FieldOp;
  value?: unknown;
}
export interface LinkCondition {
  op: LinkOp;
  link: string;
}
export interface AllCondition {
  all: Condition[];
}
export interface AnyCondition {
  any: Condition[];
}
export interface NotCondition {
  not: Condition;
}
export type Condition =
  | FieldCondition
  | LinkCondition
  | AllCondition
  | AnyCondition
  | NotCondition;

export type GapClass = 'BLOCKING' | 'WARNING' | 'INFO';
export type RuleCategory =
  | 'completeness'
  | 'authority'
  | 'traceability'
  | 'timeliness'
  | 'linkage';

// A rule as authored in JSON. `severity`(major|minor) + `riskClass` are registry
// metadata; `gapClass` drives the displayed System-Detected-Condition severity and
// the Gap-Review gate (BLOCKING never proceeds).
export interface Rule {
  ruleId: string;
  dimId: string;
  revision: number;
  effectiveDate: string;
  approvedBy: string;
  approvalRef?: string;
  severity: 'major' | 'minor';
  gapClass: GapClass;
  category: RuleCategory;
  riskClass: 'A' | 'B' | 'C' | 'D';
  basisType: string;
  description: string;
  requiredFields: string[];
  events?: string[]; // restrict to specific events; omit for all subscribed
  findingText: string;
  resolutionHint: string;
  clauseRefs: string[];
  logicResult?: string; // label for the deterministic outcome; default 'condition_met'
  condition: Condition;
  testCases?: string[];
  limitations?: string[];
}

export interface DimManifest {
  dimId: string;
  description: string;
  subscribesTo: string[];
  readsFields: Record<string, string[]>;
  version: string;
  publishedAt: string;
}

// ─── Event & Assessment records (persisted, mirror mai_* tables) ──────────────
export interface MaiEvent {
  id: string;
  tenantId: string;
  eventType: string;
  recordType: string;
  recordId: string;
  actor: string;
  occurredAt: string;
  snapshotJson: Record<string, unknown>; // the hashed `data`
  snapshotHash: string;
  processed: boolean;
  processedAt: string | null;
}

export type AssessmentStatus = 'active' | 'superseded' | 'resolved';
export type ResponseValue =
  | 'confirm'
  | 'dismiss_incorrect'
  | 'dismiss_not_applicable';

export interface Assessment {
  id: string;
  tenantId: string;
  eventId: string;
  dimId: string;
  ruleId: string;
  ruleRevision: number;
  recordType: string;
  recordId: string;
  snapshotHash: string;
  tier: 'system_detected_condition';
  logicResult: string;
  dataConfidence: 'high' | 'medium' | 'low';
  severity: 'blocking' | 'warning' | 'info';
  findingText: string;
  resolutionHint: string | null;
  clauseRefs: string[];
  status: AssessmentStatus;
  supersededBy: string | null;
  supersededAt: string | null;
  createdAt: string;
  response: ResponseValue | null;
  responseBy: string | null;
  responseAt: string | null;
  prevHash: string | null;
  rowHash: string;
}

export interface LinkedRecordRef {
  recordType: string;
  recordId: string;
}

// ─── Host adapter contract ────────────────────────────────────────────────────
// All writes are scoped to mai_* tables only, EXCEPT recordAssessmentResponse,
// which runs under the HOST principal (a human acted through the host UI).
export interface MaiAdapter {
  getSnapshot(
    recordType: string,
    recordId: string,
    tenantId: string,
  ): Promise<Snapshot | null>;

  writeEvent(event: MaiEvent): Promise<void>;
  markEventProcessed(eventId: string, processedAt: string): Promise<void>;

  writeAssessment(assessment: Assessment): Promise<void>;

  // UPDATE limited to response, response_by, response_at, status='resolved'.
  recordAssessmentResponse(
    tenantId: string,
    assessmentId: string,
    response: ResponseValue,
    respondedBy: string,
    respondedAt: string,
  ): Promise<boolean>;

  // UPDATE limited to status, superseded_by, superseded_at.
  markAssessmentSuperseded(
    tenantId: string,
    assessmentId: string,
    supersededBy: string,
    supersededAt: string,
  ): Promise<void>;

  loadAssessments(tenantId: string): Promise<Assessment[]>;

  // All assessments (any status) for a single record — used per event for
  // supersession and same-snapshot idempotency. Read-only.
  loadRecordAssessments(
    tenantId: string,
    recordType: string,
    recordId: string,
  ): Promise<Assessment[]>;

  listLinkedRecords(
    recordType: string,
    recordId: string,
    linkType: string,
    tenantId: string,
  ): Promise<LinkedRecordRef[]>;

  notify(args: {
    tenantId: string;
    role: string;
    message: string;
    assessmentId: string;
  }): Promise<void>;

  log(
    level: 'info' | 'warn' | 'error',
    message: string,
    context: Record<string, unknown>,
  ): Promise<void>;
}

// Deterministic clock injected so tests are reproducible; defaults to real time
// only at the host boundary, never inside rule evaluation (design law 1).
export type NowFn = () => string;
