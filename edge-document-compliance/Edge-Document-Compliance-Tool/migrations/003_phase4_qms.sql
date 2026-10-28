-- =============================================================================
-- EDCAT AI - PHASE 4: FULL QMS INTEGRATION
-- =============================================================================
-- Adds CAPA, Training, Document Management, KPI-related tables
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- CAPA SYSTEM
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS capa_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES tenants(id),
  gap_id UUID,
  clause_id UUID REFERENCES parsed_clauses(id),

  -- CAPA Details
  title VARCHAR(500) NOT NULL,
  description TEXT,
  root_cause TEXT,
  source_type VARCHAR(100),

  -- Status & Tracking
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(20),

  -- Dates
  due_date TIMESTAMP,
  target_completion TIMESTAMP,
  closed_at TIMESTAMP,

  -- Accountability
  created_by VARCHAR(100),
  assigned_to VARCHAR(100),
  last_updated TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capa_customer ON capa_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_capa_status ON capa_records(status);
CREATE INDEX IF NOT EXISTS idx_capa_due_date ON capa_records(due_date);

CREATE TABLE IF NOT EXISTS capa_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id UUID NOT NULL REFERENCES capa_records(id) ON DELETE CASCADE,
  action_sequence INT,
  description TEXT NOT NULL,
  responsible_person VARCHAR(100),
  target_completion TIMESTAMP,
  action_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'open',
  evidence_link TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capa_effectiveness_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id UUID NOT NULL REFERENCES capa_records(id) ON DELETE CASCADE,
  planned_check_date TIMESTAMP,
  check_method VARCHAR(500),
  acceptance_criteria TEXT,
  result_date TIMESTAMP,
  result TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  conducted_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- TRAINING & COMPETENCY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES tenants(id),
  employee_id VARCHAR(50),
  employee_name VARCHAR(255),
  department VARCHAR(100),
  email VARCHAR(255),
  role VARCHAR(100),
  hire_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES tenants(id),
  procedure_id UUID,

  title VARCHAR(500) NOT NULL,
  description TEXT,
  audience VARCHAR(255),
  required_roles JSONB,

  training_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'scheduled',

  scheduled_date TIMESTAMP,
  completed_date TIMESTAMP,

  trainer_name VARCHAR(100),
  training_location VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES training_records(id),
  employee_id UUID NOT NULL REFERENCES employees(id),

  score INT,
  passed BOOLEAN,
  completed_at TIMESTAMP NOT NULL,
  certificate_issued BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  training_id UUID REFERENCES training_records(id),

  skill_area VARCHAR(500),
  competency_level VARCHAR(50),
  verified_date TIMESTAMP,
  expiration_date TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, training_id)
);

-- ---------------------------------------------------------------------------
-- DOCUMENT MANAGEMENT & CHANGE CONTROL
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qms_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NOTE: doc_number is optional cosmetic metadata for user convenience only.
  -- Compliance coverage is based on id, title, content, and explicit mappings, not numbering patterns.
  doc_number VARCHAR(50) UNIQUE,
  customer_id UUID NOT NULL REFERENCES tenants(id),

  title VARCHAR(500) NOT NULL,
  document_type VARCHAR(100),
  clause_reference VARCHAR(100),

  version VARCHAR(10) DEFAULT '1.0',
  status VARCHAR(50) DEFAULT 'draft',

  content TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  released_at TIMESTAMP,
  archived_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_customer ON qms_documents(customer_id);
-- Index on doc_number for search convenience only - not used for compliance logic
CREATE INDEX IF NOT EXISTS idx_doc_number ON qms_documents(doc_number);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES qms_documents(id),
  version VARCHAR(10),
  content TEXT,
  reason_for_change TEXT,
  archived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES qms_documents(id),
  approver VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  comments TEXT,
  requested_at TIMESTAMP,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES qms_documents(id),
  recipient VARCHAR(255),
  distributed_at TIMESTAMP,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;


