-- =============================================================================
-- EDCAT AI - PHASE 3: REGULATORY INTELLIGENCE & MOCK AUDITS
-- =============================================================================
-- Adds: regulatory_updates, mock audit session/data tables
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Regulatory updates catalog
CREATE TABLE IF NOT EXISTS regulatory_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authority VARCHAR(100) NOT NULL, -- "ISO", "FAA", "EASA", "SAE"
  code VARCHAR(100) NOT NULL,
  title TEXT,
  publication_date TIMESTAMP,
  status VARCHAR(100), -- "new_version", "advisory_circular", "new_guidance"
  url TEXT,
  detected_at TIMESTAMP DEFAULT NOW(),
  last_detected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(authority, code)
);

CREATE INDEX IF NOT EXISTS idx_regulatory_updates_authority ON regulatory_updates(authority);
CREATE INDEX IF NOT EXISTS idx_regulatory_updates_date ON regulatory_updates(publication_date DESC);

-- Mock audit core tables
CREATE TABLE IF NOT EXISTS mock_audit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES tenants(id),
  standard_id UUID NOT NULL REFERENCES standards(id),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  total_questions INT,
  final_score INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES mock_audit_sessions(id) ON DELETE CASCADE,
  clause_id UUID REFERENCES parsed_clauses(id) ON DELETE SET NULL,
  clause_number VARCHAR(100),
  clause_title VARCHAR(500),
  question TEXT NOT NULL,
  expected_evidence JSONB,
  difficulty VARCHAR(20),
  common_failures TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mock_audit_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES mock_audit_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES audit_questions(id) ON DELETE CASCADE,
  user_response TEXT,
  correct BOOLEAN,
  score INT,
  feedback TEXT,
  answered_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mock_audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES mock_audit_sessions(id) ON DELETE CASCADE,
  total_score INT,
  pass_fail VARCHAR(20),
  generated_at TIMESTAMP DEFAULT NOW()
);

COMMIT;


