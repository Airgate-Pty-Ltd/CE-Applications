-- ISO/IEC 42001 AIMS Command Center — SQLite schema
-- Host record tables + M-AI Kernel governance tables (mai_*), single SQLite file.
-- The kernel writes ONLY to mai_* tables (Design Law 2). Host tables are never
-- touched by kernel code paths — verified by tests/AT-04 style checks.

PRAGMA foreign_keys = ON;

-- ============================================================================
-- HOST RECORD TABLES (Conform-Edge AIMS Command Center domain data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS soa_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  control_ref TEXT NOT NULL,
  control_title TEXT NOT NULL,
  applicability TEXT NOT NULL CHECK (applicability IN ('applicable', 'not_applicable')),
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  owner TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_soa_tenant ON soa_entries(tenant_id);

CREATE TABLE IF NOT EXISTS risk_register (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  risk_ref TEXT NOT NULL,
  description TEXT NOT NULL,
  likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER CHECK (impact BETWEEN 1 AND 5),
  score INTEGER,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_risk_tenant ON risk_register(tenant_id);

CREATE TABLE IF NOT EXISTS risk_treatments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  risk_id TEXT REFERENCES risk_register(id),
  soa_control_ref TEXT,
  description TEXT NOT NULL,
  target_date TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  owner TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_treatment_tenant ON risk_treatments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_treatment_soa_ref ON risk_treatments(tenant_id, soa_control_ref);

CREATE TABLE IF NOT EXISTS objectives (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  objective_text TEXT NOT NULL,
  measurable_target TEXT,
  owner TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_objectives_tenant ON objectives(tenant_id);

CREATE TABLE IF NOT EXISTS audit_findings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  finding_ref TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('major', 'minor')),
  clause_ref TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_findings_tenant ON audit_findings(tenant_id);

CREATE TABLE IF NOT EXISTS ncr_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  ncr_ref TEXT NOT NULL,
  description TEXT NOT NULL,
  corrective_action TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  linked_finding_id TEXT REFERENCES audit_findings(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ncr_tenant ON ncr_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ncr_linked_finding ON ncr_entries(tenant_id, linked_finding_id);

CREATE TABLE IF NOT EXISTS competence_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  person_name TEXT NOT NULL,
  role TEXT,
  last_review_date TEXT NOT NULL,
  competence_review_due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'current',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_competence_tenant ON competence_records(tenant_id);

-- ============================================================================
-- M-AI KERNEL GOVERNANCE TABLES (mai_*) — kernel writes ONLY here.
-- Per integration-checklist.md section 1.
-- ============================================================================

CREATE TABLE IF NOT EXISTS mai_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  actor TEXT,
  occurred_at TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  processed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_mai_events_tenant ON mai_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mai_events_record ON mai_events(tenant_id, record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_mai_events_hash ON mai_events(tenant_id, record_type, record_id, snapshot_hash);

CREATE TABLE IF NOT EXISTS mai_assessments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL REFERENCES mai_events(id),
  dim_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  rule_revision INTEGER NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'system_detected_condition',
  logic_result INTEGER NOT NULL,
  data_confidence TEXT NOT NULL CHECK (data_confidence IN ('high', 'medium', 'low')),
  severity TEXT NOT NULL CHECK (severity IN ('major', 'minor')),
  finding_text TEXT NOT NULL,
  resolution_hint TEXT,
  clause_refs TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'resolved')),
  superseded_by TEXT,
  superseded_at TEXT,
  created_at TEXT NOT NULL,
  response TEXT CHECK (response IN ('confirm', 'dismiss_incorrect', 'not_applicable') OR response IS NULL),
  response_by TEXT,
  response_at TEXT,
  prev_hash TEXT,
  row_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mai_assessments_tenant ON mai_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mai_assessments_record ON mai_assessments(tenant_id, record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_mai_assessments_status ON mai_assessments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_mai_assessments_hash ON mai_assessments(tenant_id, record_type, record_id, snapshot_hash);

CREATE TABLE IF NOT EXISTS mai_error_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  context_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mai_error_log_tenant ON mai_error_log(tenant_id);

CREATE TABLE IF NOT EXISTS mai_rule_registry (
  rule_id TEXT NOT NULL,
  dim_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  effective_date TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  loaded_at TEXT NOT NULL,
  definition_json TEXT NOT NULL,
  definition_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'loaded' CHECK (status IN ('loaded', 'rejected')),
  rejection_reason TEXT,
  PRIMARY KEY (rule_id, revision)
);
CREATE INDEX IF NOT EXISTS idx_mai_rule_registry_dim ON mai_rule_registry(dim_id);
