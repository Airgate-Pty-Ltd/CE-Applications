-- =============================================================================
-- EDCAT AI - PHASE 0: INITIAL SCHEMA
-- =============================================================================
-- This migration creates the foundational multi-tenant schema, upload pipeline,
-- parsed clauses store, and regulatory websites table.
-- It is intended for Railway Postgres. UUIDs use gen_random_uuid() (pgcrypto).
-- =============================================================================

-- Enable required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- DANGER: DEVELOPMENT-ONLY DROPS
-- Comment these out in production. These are provided to reset a dev database.
-- =============================================================================
DROP TABLE IF EXISTS conversation_context CASCADE;
DROP TABLE IF EXISTS regulatory_websites CASCADE;
DROP TABLE IF EXISTS upload_files CASCADE;
DROP TABLE IF EXISTS customer_procedures CASCADE;
DROP TABLE IF EXISTS customer_documents CASCADE;
DROP TABLE IF EXISTS parsed_clauses CASCADE;
DROP TABLE IF EXISTS standards CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- =============================================================================
-- TABLE 1: TENANTS (Multi-tenant support - each customer is a tenant)
-- =============================================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255),
  industry VARCHAR(100),
  region VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB
);

-- Insert default tenant (with key)
-- CRITICAL: key is NOT NULL, so we must provide it
-- Use key as conflict target since it's UNIQUE
INSERT INTO tenants (name, key, email, industry, region) VALUES 
  ('Demo Organization', 'demo-org', 'admin@demo.edcat.local', 'Manufacturing', 'North America')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- TABLE 2: STANDARDS (ISO 9001, AS9100D, FAA, EASA, etc.)
-- =============================================================================
CREATE TABLE standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE, -- "ISO9001:2015", "AS9100D"
  name VARCHAR(255) NOT NULL,
  authority_source VARCHAR(100), -- "ISO", "SAE", "FAA", "EASA"
  description TEXT,
  revision_year INT,
  total_clauses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed standards removed - standards should only appear after user uploads them
-- INSERT INTO standards (code, name, authority_source, revision_year) VALUES
--   ('ISO9001:2015', 'Quality Management System', 'ISO', 2015),
--   ('ISO9001:2023', 'Quality Management System', 'ISO', 2023),
--   ('AS9100D', 'Quality Management System - Aerospace', 'SAE', 2016),
--   ('AS9110C', 'Quality Requirements - Repair & Maintenance', 'SAE', 2016),
--   ('FAA-Part-21', 'Certification Procedures', 'FAA', 2024),
--   ('FAA-Part-145', 'Approved Repair Stations', 'FAA', 2024),
--   ('EASA-Part-145', 'Approved Maintenance Organizations', 'EASA', 2023),
--   ('ISO13485', 'Medical Devices Quality Management', 'ISO', 2016)
-- ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_standards_code ON standards(code);
CREATE INDEX IF NOT EXISTS idx_standards_authority ON standards(authority_source);

-- =============================================================================
-- TABLE 3: UPLOAD_FILES (Stores uploaded documents)
-- =============================================================================
CREATE TABLE upload_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL, -- Original filename
  file_path TEXT NOT NULL, -- Full path on disk
  file_size INT NOT NULL, -- Bytes
  file_type VARCHAR(50), -- MIME type
  file_category VARCHAR(100) NOT NULL, -- documents | standards | regulatory | customer

  -- Multi-tenant support
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Optional standard reference
  standard_id UUID REFERENCES standards(id) ON DELETE SET NULL,

  -- Metadata
  uploaded_by VARCHAR(100) DEFAULT 'system',
  uploaded_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  -- Constraints
  CONSTRAINT valid_category CHECK (file_category IN (
    'documents', 'standards', 'regulatory', 'customer'
  )),
  CONSTRAINT valid_size CHECK (file_size > 0 AND file_size < 104857600)
);

CREATE INDEX IF NOT EXISTS idx_upload_files_tenant ON upload_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_upload_files_category ON upload_files(file_category);
CREATE INDEX IF NOT EXISTS idx_upload_files_uploaded_at ON upload_files(uploaded_at DESC);

COMMENT ON TABLE upload_files IS 'Stores uploaded compliance documents for analysis';

-- =============================================================================
-- TABLE 4: CUSTOMER_DOCUMENTS (Extracts from uploaded files)
-- =============================================================================
CREATE TABLE customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  upload_file_id UUID NOT NULL REFERENCES upload_files(id) ON DELETE CASCADE,

  -- Document metadata
  document_name VARCHAR(255),
  document_type VARCHAR(50), -- pdf, docx, xlsx, txt

  -- Content
  raw_content TEXT, -- Original text extracted
  extracted_at TIMESTAMP DEFAULT NOW(),

  -- Processing
  word_count INT,
  page_count INT,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_documents_tenant ON customer_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_upload ON customer_documents(upload_file_id);

-- =============================================================================
-- TABLE 5: PARSED_CLAUSES (Extracted regulatory requirements)
-- =============================================================================
CREATE TABLE parsed_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES standards(id) ON DELETE CASCADE,

  -- Clause identification
  clause_number VARCHAR(100) NOT NULL, -- "8.5.1", "4.4.1.2", "21.137(f)"
  clause_title VARCHAR(500),
  clause_text TEXT NOT NULL,

  -- Classification
  requirement_type VARCHAR(100), -- Policy, Procedure, Record, etc.

  -- Metadata
  extracted_by VARCHAR(100) DEFAULT 'system',
  extracted_at TIMESTAMP DEFAULT NOW(),

  -- Uniqueness per standard
  UNIQUE(standard_id, clause_number)
);

CREATE INDEX IF NOT EXISTS idx_parsed_clauses_standard ON parsed_clauses(standard_id);
CREATE INDEX IF NOT EXISTS idx_parsed_clauses_number ON parsed_clauses(clause_number);

-- =============================================================================
-- TABLE 6: REGULATORY_WEBSITES (URLs for compliance sources)
-- =============================================================================
CREATE TABLE regulatory_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- URL info
  url VARCHAR(500) NOT NULL,
  name VARCHAR(255),
  agency VARCHAR(100), -- "FAA", "EASA", "ISO", etc.

  -- Metadata
  added_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,

  -- Uniqueness
  UNIQUE(url, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_regulatory_websites_tenant ON regulatory_websites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_websites_agency ON regulatory_websites(agency);

-- =============================================================================
-- TABLE 7: CUSTOMER_PROCEDURES (Procedures extracted from documents)
-- =============================================================================
CREATE TABLE customer_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES customer_documents(id) ON DELETE CASCADE,

  -- Procedure info
  procedure_name VARCHAR(255),
  -- NOTE: procedure_number is optional cosmetic metadata for user convenience only.
  -- Compliance coverage is based on id, procedure_name, procedure_text, and explicit mappings, not numbering patterns.
  procedure_number VARCHAR(100), -- P-800-01, SOP-001, etc. (cosmetic only)
  section_number VARCHAR(100), -- What section of doc

  -- Content
  procedure_text TEXT,
  extracted_at TIMESTAMP DEFAULT NOW(),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_procedures_tenant ON customer_procedures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_procedures_document ON customer_procedures(document_id);

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================
-- View: Standards with clause counts
CREATE OR REPLACE VIEW standards_with_counts AS
SELECT 
  s.id,
  s.code,
  s.name,
  s.authority_source,
  COUNT(pc.id) as clause_count
FROM standards s
LEFT JOIN parsed_clauses pc ON s.id = pc.standard_id
GROUP BY s.id, s.code, s.name, s.authority_source;

-- View: Uploaded files summary per tenant
CREATE OR REPLACE VIEW upload_summary_by_tenant AS
SELECT 
  t.id,
  t.name as tenant_name,
  uf.file_category,
  COUNT(uf.id) as file_count,
  SUM(uf.file_size) as total_bytes,
  MAX(uf.uploaded_at) as last_upload
FROM tenants t
LEFT JOIN upload_files uf ON t.id = uf.tenant_id
GROUP BY t.id, t.name, uf.file_category;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================
-- Grant to API user (adjust role if needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- =============================================================================
-- DONE
-- =============================================================================
COMMIT;


