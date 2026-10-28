-- =============================================================================
-- EDCAT AI - PHASE 1: EXTENDED SCHEMA
-- =============================================================================
-- Adds rich clause storage, correlation matrix, learning events, and chat memory
-- Uses gen_random_uuid() from pgcrypto (enabled in 000_init or enable here)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Drop existing Phase 1 tables (safe re-run for dev)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS conversation_context CASCADE;
DROP TABLE IF EXISTS edcat_learning_events CASCADE;
DROP TABLE IF EXISTS clause_correlation_matrix CASCADE;

-- If a simpler parsed_clauses existed from earlier drafts, drop and recreate
DROP TABLE IF EXISTS parsed_clauses CASCADE;

-- =============================================================================
-- TABLE: PARSED_CLAUSES (Store extracted requirements)
-- =============================================================================
CREATE TABLE parsed_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES standards(id) ON DELETE CASCADE,

  -- Clause identification
  clause_number VARCHAR(100) NOT NULL, -- "8.5.1.2", "4.4.1", "21.137(f)"
  clause_hierarchy JSONB,              -- {"level": [8,5,1,2]}
  clause_title VARCHAR(500),
  clause_text TEXT NOT NULL,

  -- Classification
  requirement_type VARCHAR(100),       -- "Policy", "Procedure", "Record", "Control"
  authority_source VARCHAR(100),

  -- EDCAT Intelligence
  intent TEXT,                         -- What the clause really requires
  why_it_matters TEXT,                 -- Business rationale
  common_gaps TEXT,                    -- Typical failure modes

  -- Metadata
  extracted_by VARCHAR(100) DEFAULT 'system',
  extracted_at TIMESTAMP DEFAULT NOW(),
  model_version_used VARCHAR(20) DEFAULT '1.0.0',
  confidence_score DECIMAL(3,2) DEFAULT 0.75,

  -- Uniqueness
  UNIQUE(standard_id, clause_number)
);

CREATE INDEX IF NOT EXISTS idx_parsed_clauses_standard ON parsed_clauses(standard_id);
CREATE INDEX IF NOT EXISTS idx_parsed_clauses_type ON parsed_clauses(requirement_type);
CREATE INDEX IF NOT EXISTS idx_parsed_clauses_number ON parsed_clauses(clause_number);

COMMENT ON TABLE parsed_clauses IS 'Extracted regulatory clauses with AI-generated intent and gap insights';

-- =============================================================================
-- TABLE: CLAUSE_CORRELATION_MATRIX (Map clauses to procedures)
-- =============================================================================
CREATE TABLE clause_correlation_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
  clause_id UUID NOT NULL REFERENCES parsed_clauses(id) ON DELETE CASCADE,

  -- Document reference
  document_id UUID REFERENCES customer_documents(id) ON DELETE SET NULL,
  procedure_id UUID REFERENCES customer_procedures(id) ON DELETE SET NULL,

  -- Compliance assessment
  compliance_status VARCHAR(20) NOT NULL DEFAULT 'unknown', -- full | partial | none | unknown
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.00,      -- 0.00 to 1.00

  -- Analysis details
  evidence_text TEXT,                    -- Quote/summary from procedure
  evidence_location VARCHAR(255),        -- "P-800-01, Section 5.2"
  reasoning TEXT,                        -- Why we think this matches
  match_keywords JSONB,                  -- ["change","control","ecn"]

  -- Gap information
  gap_description TEXT,                  -- What's missing
  gap_severity VARCHAR(20) DEFAULT 'minor', -- critical | major | minor | observation
  recommendation TEXT,                   -- How to close gap
  recommendation_effort VARCHAR(50),     -- quick_fix | medium | complex

  -- Audit readiness
  auditor_would_accept BOOLEAN DEFAULT FALSE,
  auditor_notes TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  last_reviewed TIMESTAMP,
  reviewed_by VARCHAR(100),

  CONSTRAINT valid_status CHECK (compliance_status IN ('full','partial','none','unknown')),
  CONSTRAINT valid_severity CHECK (gap_severity IN ('critical','major','minor','observation')),
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Prevent duplicates per clause per tenant
  UNIQUE (clause_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_correlation_tenant ON clause_correlation_matrix(tenant_id);
CREATE INDEX IF NOT EXISTS idx_correlation_standard ON clause_correlation_matrix(standard_id);
CREATE INDEX IF NOT EXISTS idx_correlation_clause ON clause_correlation_matrix(clause_id);
CREATE INDEX IF NOT EXISTS idx_correlation_status ON clause_correlation_matrix(compliance_status);
CREATE INDEX IF NOT EXISTS idx_correlation_severity ON clause_correlation_matrix(gap_severity);

COMMENT ON TABLE clause_correlation_matrix IS 'Maps regulatory clauses to customer procedures with gap analysis';

-- =============================================================================
-- TABLE: EDCAT_LEARNING_EVENTS (Track all AI decisions for learning)
-- =============================================================================
CREATE TABLE edcat_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event classification
  event_type VARCHAR(100) NOT NULL,  -- clause_parsed | gap_identified | match_made | user_feedback | chat_interaction
  standard_id UUID REFERENCES standards(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,

  -- Event data
  source_data JSONB,                 -- Original data (clause/procedure/etc.)
  ai_decision JSONB,                 -- Decision payload (score, reasoning, etc.)

  -- User feedback (makes learning stronger)
  user_feedback VARCHAR(100),        -- accurate | partial | incorrect | helpful
  user_explanation TEXT,

  -- Learning impact
  affected_clause_id UUID REFERENCES parsed_clauses(id) ON DELETE SET NULL,
  confidence_before DECIMAL(3,2),
  confidence_after DECIMAL(3,2),
  improvement DECIMAL(3,2) GENERATED ALWAYS AS (confidence_after - confidence_before) STORED,

  -- Metadata
  model_version_at_time VARCHAR(20) DEFAULT '1.0.0',
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_feedback CHECK (user_feedback IN ('accurate','partial','incorrect','helpful', NULL))
);

CREATE INDEX IF NOT EXISTS idx_learning_type ON edcat_learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_tenant ON edcat_learning_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_feedback ON edcat_learning_events(user_feedback);
CREATE INDEX IF NOT EXISTS idx_learning_improvement ON edcat_learning_events(improvement DESC);

COMMENT ON TABLE edcat_learning_events IS 'Records AI decisions and user feedback for continuous improvement';

-- =============================================================================
-- TABLE: CONVERSATION_CONTEXT (Multi-turn chat memory)
-- =============================================================================
CREATE TABLE conversation_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL UNIQUE,

  -- Session info
  standard_id UUID REFERENCES standards(id),

  -- Full conversation
  messages JSONB NOT NULL, -- [{"role":"user"/"assistant","content":"...","timestamp":"..."}]

  -- Session learning
  session_learnings JSONB, -- What we learned this session
  clauses_discussed JSONB, -- Clauses mentioned

  -- Status
  session_started TIMESTAMP DEFAULT NOW(),
  session_ended TIMESTAMP,
  session_outcome VARCHAR(100), -- gap_analysis_complete | question_answered | mapping_created | incomplete

  CONSTRAINT valid_outcome CHECK (session_outcome IN ('gap_analysis_complete','question_answered','mapping_created','incomplete', NULL))
);

CREATE INDEX IF NOT EXISTS idx_conversation_tenant ON conversation_context(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_session ON conversation_context(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_started ON conversation_context(session_started DESC);

COMMENT ON TABLE conversation_context IS 'Stores multi-turn chat history with session state';

-- =============================================================================
-- COMMIT
-- =============================================================================
COMMIT;


