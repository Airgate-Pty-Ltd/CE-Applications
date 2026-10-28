-- =============================================================================
-- POSTGRESQL: CUSTOMER_DATA_DB
-- Purpose: Store client documents, procedures, analysis results, reports
-- Run against: PostgreSQL database on Railway (DATABASE_URL)
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- 1. TENANTS (Client Organizations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  industry VARCHAR(100),
  region VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB
);

-- Ensure all columns exist before inserting
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS key VARCHAR(255) UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Set default key for existing rows if NULL
UPDATE tenants SET key = COALESCE(key, 'tenant_' || id::text) WHERE key IS NULL;

-- Make key NOT NULL if all rows have keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE key IS NULL) THEN
    ALTER TABLE tenants ALTER COLUMN key SET NOT NULL;
  END IF;
END $$;

-- Insert default tenant only if it doesn't exist (with key)
-- CRITICAL: key is NOT NULL, so we must provide it
INSERT INTO tenants (name, key, industry, region) 
SELECT 'Default Organization', 'default-org', 'Manufacturing', 'North America'
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE key = 'default-org' OR name = 'Default Organization')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 2. USERS (Team members) - REMOVED: Orphaned table, no code connections
-- =============================================================================
-- This table was defined but never used in code. Removed in migration 010.
-- CREATE TABLE IF NOT EXISTS users (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
--   email VARCHAR(255) UNIQUE NOT NULL,
--   name VARCHAR(255),
--   role VARCHAR(100),
--   created_at TIMESTAMP DEFAULT NOW(),
--   is_active BOOLEAN DEFAULT TRUE
-- );

-- =============================================================================
-- 3. UPLOAD_FILES (REMOVED - Orphaned table, no code connections)
-- =============================================================================
-- This table was defined but never used in code. Removed in migration 010.
-- File uploads are now tracked directly in public.standards table.

-- =============================================================================
-- STANDARD_FILES TABLE REMOVED
-- This table has been consolidated into the standards table (see migration 006)
-- All file-related data is now stored directly in public.standards
-- =============================================================================
-- The standard_files table is no longer created here - it was removed in migration 006
-- Also removed in migration 010 as orphaned table

-- =============================================================================
-- 3.5. STANDARDS (Compliance framework definitions)
-- CRITICAL: This table must exist in PostgreSQL for uploads to work
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  authority_source VARCHAR(100),
  sector VARCHAR(100),
  description TEXT,
  total_clauses INT DEFAULT 0,
  total_requirements INT DEFAULT 0,  -- Alternative column name for compatibility
  uploaded_at TIMESTAMP DEFAULT NOW(),
  parsed_at TIMESTAMP,
  model_version_used VARCHAR(20) DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for standards (only if columns exist)
CREATE INDEX IF NOT EXISTS idx_standards_code ON public.standards(code);
CREATE INDEX IF NOT EXISTS idx_standards_sector ON public.standards(sector);
CREATE INDEX IF NOT EXISTS idx_standards_uploaded_at ON public.standards(uploaded_at DESC);

-- Create index on authority_source only if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standards' 
    AND column_name = 'authority_source'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_standards_authority ON public.standards(authority_source);
  END IF;
END $$;

-- Ensure total_clauses column exists (for compatibility)
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS total_clauses INT DEFAULT 0;
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS total_requirements INT DEFAULT 0;
-- Ensure model_version_used column exists (for compatibility)
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS model_version_used VARCHAR(20) DEFAULT '1.0.0';
-- Add current_model_version as alias for backward compatibility (deprecated)
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS current_model_version VARCHAR(20);
UPDATE public.standards SET current_model_version = model_version_used WHERE current_model_version IS NULL;

COMMENT ON TABLE public.standards IS 'Stores compliance standards, regulatory requirements, and customer requirements';

-- =============================================================================
-- 3.6. PARSED_REQUIREMENTS (Individual extracted requirements)
-- CRITICAL: This table must exist in PostgreSQL for parsing to work
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.parsed_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
  clause_number VARCHAR(100) NOT NULL,
  clause_title VARCHAR(500),
  requirement_text TEXT NOT NULL,
  requirement_type VARCHAR(100),  -- 'Policy', 'Procedure', 'Record', 'Objective Evidence', 'Control'
  requirement_subtype VARCHAR(100),  -- 'Records/Retention', 'Risk', 'Configuration', etc.
  keyword VARCHAR(50),  -- 'shall', 'must', 'should', 'may'
  modal_verb VARCHAR(50),  -- 'shall', 'must', 'should', 'may', 'will'
  intent TEXT,  -- What this requirement is trying to achieve
  why_it_matters TEXT,  -- Business/regulatory rationale
  common_gaps TEXT,  -- Where organizations typically fail
  evidence_requirements JSONB,  -- Expected evidence type
  related_clauses JSONB,  -- Related requirements
  audit_frequency VARCHAR(50),  -- How often audited
  extracted_at TIMESTAMP DEFAULT NOW(),
  extracted_by_model_version VARCHAR(20) DEFAULT '1.0.0',
  confidence DECIMAL(3,2) DEFAULT 0.75,
  keywords TEXT,  -- Comma-separated keywords
  clause_ref VARCHAR(100),  -- Main clause reference
  sub_ref VARCHAR(100),  -- Sub-reference (a, b, c, etc.)
  full_ref VARCHAR(200),  -- Full hierarchical reference
  requirement_uid VARCHAR(16),  -- Deterministic UID
  aerospace_addition BOOLEAN DEFAULT FALSE,
  requires_maintained_di BOOLEAN DEFAULT FALSE,
  is_informative_note BOOLEAN DEFAULT FALSE,
  is_recommendation BOOLEAN DEFAULT FALSE,
  is_in_scope BOOLEAN DEFAULT TRUE,
  clause_path_depth INT DEFAULT 0,
  subject_text TEXT,  -- Paragraph/subject context
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for parsed_requirements (only if table and columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'parsed_requirements'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_parsed_requirements_standard_id ON public.parsed_requirements(standard_id);
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'parsed_requirements' 
      AND column_name = 'clause_number'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_parsed_requirements_clause_number ON public.parsed_requirements(clause_number);
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'parsed_requirements' 
      AND column_name = 'requirement_uid'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_parsed_requirements_requirement_uid ON public.parsed_requirements(requirement_uid);
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'parsed_requirements' 
      AND column_name = 'full_ref'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_parsed_requirements_full_ref ON public.parsed_requirements(full_ref);
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'parsed_requirements' 
      AND column_name = 'extracted_at'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_parsed_requirements_extracted_at ON public.parsed_requirements(extracted_at DESC);
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.parsed_requirements IS 'Stores parsed requirements extracted from standards documents';

-- =============================================================================
-- 4. CUSTOMER_DOCUMENTS (Document metadata + extracted text)
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  upload_file_id UUID REFERENCES upload_files(id) ON DELETE SET NULL,
  file_name VARCHAR(255),
  original_name VARCHAR(255),
  file_type VARCHAR(50),
  raw_content BYTEA,
  extracted_text TEXT,
  extraction_confidence DECIMAL(3,2),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  extracted_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  page_count INT,
  word_count INT,
  document_hash VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_customer_documents_tenant ON customer_documents(tenant_id);

-- =============================================================================
-- 5. CUSTOMER_PROCEDURES (Extracted procedures from documents)
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES customer_documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255),
  -- NOTE: procedure_number is optional cosmetic metadata for user convenience only.
  -- Compliance coverage is based on id, name, procedure_text, and explicit mappings, not numbering patterns.
  procedure_number VARCHAR(100),
  section_number VARCHAR(100),
  procedure_text TEXT,
  extracted_text TEXT,
  extracted_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_procedures_document ON customer_procedures(document_id);

-- Ensure tenant_id column exists before creating index (for compatibility with legacy schema)
ALTER TABLE customer_procedures ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Update existing rows to have a tenant_id if NULL (use default tenant)
-- This is safe to run multiple times - only updates NULL values
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  SELECT id INTO default_tenant_id FROM tenants WHERE key = 'default-org' LIMIT 1;
  IF default_tenant_id IS NULL THEN
    SELECT id INTO default_tenant_id FROM tenants WHERE name = 'Default Organization' LIMIT 1;
  END IF;
  IF default_tenant_id IS NOT NULL THEN
    UPDATE customer_procedures SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Add foreign key constraint if tenant_id column exists and constraint doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customer_procedures' AND column_name = 'tenant_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'customer_procedures_tenant_id_fkey'
    ) THEN
      ALTER TABLE customer_procedures ADD CONSTRAINT customer_procedures_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Create index only if tenant_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customer_procedures' AND column_name = 'tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_procedures_tenant ON customer_procedures(tenant_id) WHERE tenant_id IS NOT NULL;
  END IF;
END $$;

-- =============================================================================
-- 6. GAP_ANALYSES (Analysis results)
-- =============================================================================
CREATE TABLE IF NOT EXISTS gap_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID,  -- For EDCAT orchestrator compatibility (nullable, will be set to id)
  tenant_id UUID,  -- Will be made NOT NULL after ensuring it exists
  document_id UUID REFERENCES customer_documents(id) ON DELETE SET NULL,
  standard_code VARCHAR(100),  -- Reference to EDCAT AI db: 'ISO9001:2015'
  analysis_date TIMESTAMP DEFAULT NOW(),
  total_requirements INT,
  covered_requirements INT,
  covered_count INT,  -- Alias for covered_requirements
  gap_count INT,
  gap_percentage DECIMAL(5,2),
  average_confidence DECIMAL(3,2),
  model_version_used VARCHAR(20),
  analysis_status VARCHAR(50),
  status VARCHAR(50),  -- Alias for analysis_status
  feedback_rating INT,
  feedback_accuracy DECIMAL(3,2),
  created_by UUID,  -- REMOVED FK: users table removed (orphaned)
  created_at TIMESTAMP DEFAULT NOW(),
  clarifications_needed INT DEFAULT 0,
  metadata JSONB
);

-- Ensure columns exist before creating indexes and constraints (for compatibility with legacy schema)
ALTER TABLE gap_analyses ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE gap_analyses ADD COLUMN IF NOT EXISTS analysis_date TIMESTAMP DEFAULT NOW();
ALTER TABLE gap_analyses ADD COLUMN IF NOT EXISTS analysis_id UUID;

-- Set default tenant_id for existing rows (use default tenant if exists)
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  SELECT id INTO default_tenant_id FROM tenants WHERE key = 'default-org' LIMIT 1;
  IF default_tenant_id IS NULL THEN
    SELECT id INTO default_tenant_id FROM tenants WHERE name = 'Default Organization' LIMIT 1;
  END IF;
  IF default_tenant_id IS NOT NULL THEN
    UPDATE gap_analyses SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Update analysis_id to match id if it's NULL (for existing rows)
UPDATE gap_analyses SET analysis_id = id WHERE analysis_id IS NULL;

-- Add UNIQUE constraint to analysis_id if it doesn't exist (after populating values)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'gap_analyses_analysis_id_key' 
    AND conrelid = 'gap_analyses'::regclass
  ) THEN
    ALTER TABLE gap_analyses ADD CONSTRAINT gap_analyses_analysis_id_key UNIQUE (analysis_id);
  END IF;
END $$;

-- Make tenant_id NOT NULL if all rows have tenant_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM gap_analyses WHERE tenant_id IS NULL) THEN
    ALTER TABLE gap_analyses ALTER COLUMN tenant_id SET NOT NULL;
    -- Add foreign key constraint if not exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'gap_analyses_tenant_id_fkey'
    ) THEN
      ALTER TABLE gap_analyses ADD CONSTRAINT gap_analyses_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Create indexes only if columns exist (using DO blocks to avoid errors)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gap_analyses' AND column_name = 'tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_gap_analyses_tenant ON gap_analyses(tenant_id) WHERE tenant_id IS NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gap_analyses' AND column_name = 'analysis_date') THEN
    CREATE INDEX IF NOT EXISTS idx_gap_analyses_date ON gap_analyses(analysis_date);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gap_analyses' AND column_name = 'analysis_id') THEN
    CREATE INDEX IF NOT EXISTS idx_gap_analyses_analysis_id ON gap_analyses(analysis_id) WHERE analysis_id IS NOT NULL;
  END IF;
  
  -- Also create index on id (primary key) for consistency
  CREATE INDEX IF NOT EXISTS idx_gap_analyses_id ON gap_analyses(id);
END $$;

-- =============================================================================
-- 7. ANALYSIS_CLARIFICATIONS (Q&A during analysis)
-- =============================================================================
CREATE TABLE IF NOT EXISTS analysis_clarifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clarification_id UUID UNIQUE,  -- For EDCAT orchestrator compatibility
  analysis_id UUID NOT NULL REFERENCES gap_analyses(id) ON DELETE CASCADE,
  requirement_id UUID,  -- Reference to EDCAT AI: parsed_requirements.id
  procedure_id UUID REFERENCES customer_procedures(id) ON DELETE SET NULL,
  clarification_question TEXT,
  ai_confidence_before DECIMAL(3,2),
  user_response VARCHAR(50),  -- 'yes', 'no', 'unclear'
  ai_confidence_after DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW(),
  response_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clarifications_analysis ON analysis_clarifications(analysis_id);

-- =============================================================================
-- 8. GENERATED_REPORTS (Reports created for customers) - REMOVED: Orphaned table, no code connections
-- =============================================================================
-- This table was defined but never used in code. Removed in migration 010.
-- CREATE TABLE IF NOT EXISTS generated_reports (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
--   analysis_id UUID REFERENCES gap_analyses(id) ON DELETE SET NULL,
--   report_name VARCHAR(255),
--   report_type VARCHAR(50),  -- 'gap_analysis', 'compliance_readiness', 'audit_prep'
--   file_format VARCHAR(20),  -- 'pdf', 'docx', 'xlsx'
--   file_path TEXT,
--   file_size INT,
--   created_at TIMESTAMP DEFAULT NOW(),
--   created_by UUID,  -- REMOVED FK: users table removed (orphaned)
--   shared_with JSONB,  -- List of emails shared with
--   generated_sections JSONB  -- Sections included in report
-- );
-- CREATE INDEX IF NOT EXISTS idx_reports_tenant ON generated_reports(tenant_id);

-- =============================================================================
-- 9. USER_FEEDBACK (Accuracy ratings and comments) - REMOVED: Orphaned table, no code connections
-- =============================================================================
-- This table was defined but never used in code. Removed in migration 010.
-- CREATE TABLE IF NOT EXISTS user_feedback (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   analysis_id UUID NOT NULL REFERENCES gap_analyses(id) ON DELETE CASCADE,
--   user_id UUID REFERENCES users(id) ON DELETE SET NULL,
--   accuracy_rating INT,  -- 1-5
--   confidence_rating INT,  -- 1-5
--   feedback_text TEXT,
--   feedback_category VARCHAR(100),
--   created_at TIMESTAMP DEFAULT NOW()
-- );

-- =============================================================================
-- 10. AUDIT_TRAIL (EDCAT AI Decision Log - Every EDCAT decision logged)
-- =============================================================================
-- Track every EDCAT decision for traceability & learning
-- NOTE: References gap_analyses(id) as the primary key, not analysis_id
CREATE TABLE IF NOT EXISTS audit_trail (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FIXED ERROR 1: Removed gap_analysis_id column - it doesn't exist in the actual schema
  analysis_id UUID,  -- References gap_analyses.analysis_id (not gap_analysis_id)
  timestamp TIMESTAMP DEFAULT NOW(),
  
  -- WHO & WHY
  actor VARCHAR(100) NOT NULL,  -- 'EDCAT_ORCHESTRATOR', 'USER', 'LEARNING_SYSTEM', 'PARSER', 'GAP_ANALYZER', 'CLARIFIER'
  action VARCHAR(100) NOT NULL,  -- 'PARSE_STANDARD', 'ANALYZE_GAPS', 'GENERATE_CLARIFICATIONS', 'CRAWL_CUSTOMER_DATA', 'STORE_ANALYSIS'
  details TEXT NOT NULL,         -- Human-readable description
  
  -- REASONING (Why EDCAT made this decision)
  reasoning JSONB,               -- Contains decision logic, thresholds used, confidence calculations
  
  -- RESULTS
  status VARCHAR(50),            -- 'success', 'partial', 'failed'
  metadata JSONB,                -- Additional context specific to action
  
  -- For learning
  predicted_accuracy DECIMAL(3,2),  -- What EDCAT predicted would happen (0.00-1.00)
  actual_accuracy DECIMAL(3,2),     -- What actually happened (filled in by feedback, 0.00-1.00)
  
  -- Standard/Customer context
  standard_id UUID,  -- Reference to standards (no FK to avoid cross-database issues)
  customer_id UUID,  -- Can reference customer_documents or customer_procedures
  
  -- Performance metrics
  execution_time_ms INTEGER,     -- How long the action took
  confidence_score DECIMAL(3,2)  -- EDCAT's confidence in this decision (0.00-1.00)
);

-- FIXED ERROR 1: Removed obsolete UPDATE block that references gap_analysis_id
-- The audit_trail table does NOT have gap_analysis_id column
-- The analysis_id column is populated directly, not from gap_analysis_id

-- Create indexes for audit_trail (only if table and columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_trail') THEN
    -- Create indexes only if the respective columns exist
    -- FIXED ERROR 1: Removed index on gap_analysis_id - column doesn't exist
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_trail' AND column_name = 'analysis_id') THEN
      CREATE INDEX IF NOT EXISTS idx_audit_trail_analysis_id ON audit_trail(analysis_id) WHERE analysis_id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_trail' AND column_name = 'timestamp') THEN
      CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_trail' AND column_name = 'actor') THEN
      CREATE INDEX IF NOT EXISTS idx_audit_trail_actor ON audit_trail(actor);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_trail' AND column_name = 'action') THEN
      CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_trail' AND column_name = 'standard_id') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_trail' AND column_name = 'customer_id') THEN
      CREATE INDEX IF NOT EXISTS idx_audit_trail_standard_customer ON audit_trail(standard_id, customer_id) WHERE standard_id IS NOT NULL AND customer_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 11. AUDIT_LOGS_RESULTS (What actions happened) - REMOVED: Orphaned table, no code connections
-- =============================================================================
-- This table was defined but never used in code. Removed in migration 010.
-- CREATE TABLE IF NOT EXISTS audit_logs_results (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
--   action_type VARCHAR(100),  -- 'upload', 'analyze', 'report_generated', 'feedback_submitted'
--   action_details JSONB,
--   related_analysis_id UUID REFERENCES gap_analyses(id) ON DELETE SET NULL,
--   related_document_id UUID REFERENCES customer_documents(id) ON DELETE SET NULL,
--   performed_by UUID,  -- REMOVED FK: users table removed (orphaned)
--   created_at TIMESTAMP DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs_results(tenant_id);
-- CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs_results(created_at);

-- =============================================================================
-- 11. DOCUMENT_CONTENT_FOR_LEARNING (Extracted text content for Vera's learning)
-- =============================================================================
-- This table stores extracted text from documents that Vera uses for learning
-- and knowledge retrieval. Migrated from EDCAT AI DB to PostgreSQL.
CREATE TABLE IF NOT EXISTS document_content_for_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL,
  standard_id UUID REFERENCES public.standards(id) ON DELETE SET NULL,
  standard_code TEXT,
  category TEXT NOT NULL,
  content_text TEXT NOT NULL,
  is_example BOOLEAN DEFAULT false,
  word_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_content_file ON document_content_for_learning(file_id);
CREATE INDEX IF NOT EXISTS idx_doc_content_standard ON document_content_for_learning(standard_id) WHERE standard_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_content_standard_code ON document_content_for_learning(standard_code) WHERE standard_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doc_content_example ON document_content_for_learning(is_example) WHERE is_example = true;

COMMENT ON TABLE document_content_for_learning IS 'Extracted text content from documents that Vera uses for learning and knowledge retrieval';

-- =============================================================================
-- 12. INTEGRATION_LOGS (Data sent to external systems) - REMOVED: Orphaned table, no code connections
-- =============================================================================
-- This table was defined but never used in code. Removed in migration 010.
-- CREATE TABLE IF NOT EXISTS integration_logs (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
--   integration_type VARCHAR(100),  -- 'slack', 'email', 'salesforce', 'jira'
--   destination VARCHAR(255),
--   payload JSONB,
--   status VARCHAR(50),  -- 'pending', 'sent', 'failed'
--   error_message TEXT,
--   created_at TIMESTAMP DEFAULT NOW(),
--   sent_at TIMESTAMP
-- );

-- Done!

