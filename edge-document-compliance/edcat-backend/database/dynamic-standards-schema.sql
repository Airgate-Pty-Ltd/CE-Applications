-- ============================================================================
-- DATABASE SCHEMA ADDITIONS - DYNAMIC STANDARDS STORAGE
-- ============================================================================
-- © 2025 Conform-Edge Quality Consulting. All rights reserved.
--
-- ADDITIONS to support:
-- - Dynamic standard ingestion (not hardcoded)
-- - Scalable to 100+ standards and 60+ regulators
-- - FAA, EASA, CAAC, and other regulatory sources
--
-- Run these migrations AFTER the base schema is deployed.
-- ============================================================================

-- ============================================================================
-- STANDARDS TABLE (Enhanced - extends existing standards table)
-- ============================================================================

-- Add columns to existing standards table if they don't exist
DO $$
BEGIN
  -- Add description column (if missing from base schema)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'description') THEN
    ALTER TABLE standards ADD COLUMN description TEXT;
  END IF;

  -- Add sector column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'sector') THEN
    ALTER TABLE standards ADD COLUMN sector VARCHAR(100);
  END IF;

  -- Add regulator_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'regulator_id') THEN
    ALTER TABLE standards ADD COLUMN regulator_id UUID;
  END IF;

  -- Add source_document_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'source_document_id') THEN
    ALTER TABLE standards ADD COLUMN source_document_id UUID;
  END IF;

  -- Add file_path column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'file_path') THEN
    ALTER TABLE standards ADD COLUMN file_path VARCHAR(1000);
  END IF;

  -- Add file_hash column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'file_hash') THEN
    ALTER TABLE standards ADD COLUMN file_hash VARCHAR(64);
  END IF;

  -- Add revision column (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'revision') THEN
    ALTER TABLE standards ADD COLUMN revision VARCHAR(50);
  END IF;

  -- Add published_date column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'published_date') THEN
    ALTER TABLE standards ADD COLUMN published_date DATE;
  END IF;

  -- Add total_clauses column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'total_clauses') THEN
    ALTER TABLE standards ADD COLUMN total_clauses INT DEFAULT 0;
  END IF;

  -- Add status column (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'status') THEN
    ALTER TABLE standards ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;

  -- Add aligned_standards column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'aligned_standards') THEN
    ALTER TABLE standards ADD COLUMN aligned_standards TEXT[];
  END IF;

  -- Add parent_standard_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'parent_standard_id') THEN
    ALTER TABLE standards ADD COLUMN parent_standard_id UUID REFERENCES standards(id);
  END IF;

  -- Add ingested_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'ingested_at') THEN
    ALTER TABLE standards ADD COLUMN ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Add ingestion_method column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'ingestion_method') THEN
    ALTER TABLE standards ADD COLUMN ingestion_method VARCHAR(50);
  END IF;

  -- Add ingestion_confidence column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'ingestion_confidence') THEN
    ALTER TABLE standards ADD COLUMN ingestion_confidence INT DEFAULT 100;
  END IF;

  -- Add manually_reviewed column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'manually_reviewed') THEN
    ALTER TABLE standards ADD COLUMN manually_reviewed BOOLEAN DEFAULT false;
  END IF;

  -- Add retention_until column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'retention_until') THEN
    ALTER TABLE standards ADD COLUMN retention_until DATE;
  END IF;

  -- Add archived_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'standards' AND column_name = 'archived_at') THEN
    ALTER TABLE standards ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_standards_sector ON standards(sector);
CREATE INDEX IF NOT EXISTS idx_standards_regulator ON standards(regulator_id);
CREATE INDEX IF NOT EXISTS idx_standards_status ON standards(status);
CREATE INDEX IF NOT EXISTS idx_standards_ingested_at ON standards(ingested_at DESC);

-- ============================================================================
-- CLAUSES TABLE (Enhanced - extends existing clauses table)
-- ============================================================================

-- Add columns to existing clauses table if they don't exist
DO $$
BEGIN
  -- Add clause_format column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'clause_format') THEN
    ALTER TABLE clauses ADD COLUMN clause_format VARCHAR(50);
  END IF;

  -- Add full_context column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'full_context') THEN
    ALTER TABLE clauses ADD COLUMN full_context TEXT;
  END IF;

  -- Add requirement_strength column (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'requirement_strength') THEN
    ALTER TABLE clauses ADD COLUMN requirement_strength VARCHAR(50);
  END IF;

  -- Add domain_tags column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'domain_tags') THEN
    ALTER TABLE clauses ADD COLUMN domain_tags TEXT[];
  END IF;

  -- Add requirement_keywords column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'requirement_keywords') THEN
    ALTER TABLE clauses ADD COLUMN requirement_keywords TEXT[];
  END IF;

  -- Add page_number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'page_number') THEN
    ALTER TABLE clauses ADD COLUMN page_number INT;
  END IF;

  -- Add source_section column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'source_section') THEN
    ALTER TABLE clauses ADD COLUMN source_section VARCHAR(500);
  END IF;

  -- Add extraction_confidence column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'extraction_confidence') THEN
    ALTER TABLE clauses ADD COLUMN extraction_confidence FLOAT DEFAULT 0.8;
  END IF;

  -- Add needs_manual_review column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'needs_manual_review') THEN
    ALTER TABLE clauses ADD COLUMN needs_manual_review BOOLEAN DEFAULT false;
  END IF;

  -- Add manually_reviewed_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'manually_reviewed_at') THEN
    ALTER TABLE clauses ADD COLUMN manually_reviewed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add reviewed_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'reviewed_by') THEN
    ALTER TABLE clauses ADD COLUMN reviewed_by VARCHAR(500);
  END IF;

  -- Add related_clauses column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'related_clauses') THEN
    ALTER TABLE clauses ADD COLUMN related_clauses UUID[];
  END IF;

  -- Add supersedes_clause_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'supersedes_clause_id') THEN
    ALTER TABLE clauses ADD COLUMN supersedes_clause_id UUID REFERENCES clauses(id);
  END IF;

  -- Add tenant_id column (for multi-tenant support)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clauses' AND column_name = 'tenant_id') THEN
    ALTER TABLE clauses ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_clauses_format ON clauses(clause_format);
CREATE INDEX IF NOT EXISTS idx_clauses_strength ON clauses(requirement_strength);
CREATE INDEX IF NOT EXISTS idx_clauses_needs_review ON clauses(needs_manual_review);

-- ============================================================================
-- GAP PROFILES TABLE (Enhanced - extends existing gap_profiles table)
-- ============================================================================

-- Add columns to existing gap_profiles table if they don't exist
DO $$
BEGIN
  -- Add profile_code column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gap_profiles' AND column_name = 'profile_code') THEN
    ALTER TABLE gap_profiles ADD COLUMN profile_code VARCHAR(150);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_gap_profiles_code ON gap_profiles(profile_code);
  END IF;

  -- Add generation_method column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gap_profiles' AND column_name = 'generation_method') THEN
    ALTER TABLE gap_profiles ADD COLUMN generation_method VARCHAR(50);
  END IF;

  -- Add generation_confidence column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gap_profiles' AND column_name = 'generation_confidence') THEN
    ALTER TABLE gap_profiles ADD COLUMN generation_confidence FLOAT DEFAULT 0.6;
  END IF;

  -- Add manually_reviewed column (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gap_profiles' AND column_name = 'manually_reviewed') THEN
    ALTER TABLE gap_profiles ADD COLUMN manually_reviewed BOOLEAN DEFAULT false;
  END IF;

  -- Add reviewed_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gap_profiles' AND column_name = 'reviewed_at') THEN
    ALTER TABLE gap_profiles ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add reviewed_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gap_profiles' AND column_name = 'reviewed_by') THEN
    ALTER TABLE gap_profiles ADD COLUMN reviewed_by VARCHAR(500);
  END IF;

  -- Add manual_updates column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gap_profiles' AND column_name = 'manual_updates') THEN
    ALTER TABLE gap_profiles ADD COLUMN manual_updates TEXT[];
  END IF;

  -- Add aligned_profiles column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gap_profiles' AND column_name = 'aligned_profiles') THEN
    ALTER TABLE gap_profiles ADD COLUMN aligned_profiles UUID[];
  END IF;

  -- Add cross_references column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gap_profiles' AND column_name = 'cross_references') THEN
    ALTER TABLE gap_profiles ADD COLUMN cross_references TEXT[];
  END IF;

  -- Add status column (if not exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gap_profiles' AND column_name = 'status') THEN
    ALTER TABLE gap_profiles ADD COLUMN status VARCHAR(50) DEFAULT 'active';
  END IF;

  -- Add version column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gap_profiles' AND column_name = 'version') THEN
    ALTER TABLE gap_profiles ADD COLUMN version INT DEFAULT 1;
  END IF;

  -- Add generated_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gap_profiles' AND column_name = 'generated_at') THEN
    ALTER TABLE gap_profiles ADD COLUMN generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_status ON gap_profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_generated_at ON gap_profiles(generated_at DESC);

-- ============================================================================
-- REGULATORY SOURCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulatory_sources (
  source_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Source identification
  regulator_name VARCHAR(500) NOT NULL,
  regulator_code VARCHAR(50) NOT NULL UNIQUE,
  jurisdiction VARCHAR(200),
  jurisdiction_code VARCHAR(50),
  
  -- Regulatory authority
  authority_type VARCHAR(50),
  regulatory_framework VARCHAR(100),
  
  -- Website & access
  website VARCHAR(500),
  base_url VARCHAR(1000),
  
  -- Document sources
  known_documents TEXT[],
  
  -- Crawling configuration
  crawl_enabled BOOLEAN DEFAULT false,
  crawl_frequency_days INT DEFAULT 30,
  crawl_depth INT DEFAULT 2,
  last_crawl_at TIMESTAMP WITH TIME ZONE,
  next_crawl_due TIMESTAMP WITH TIME ZONE,
  
  -- Content filters
  content_types TEXT[] DEFAULT ARRAY['application/pdf', 'text/html'],
  exclude_patterns TEXT[],
  
  -- Contact & metadata
  contact_email VARCHAR(500),
  api_endpoint VARCHAR(1000),
  api_key_encrypted VARCHAR(500),
  
  -- Status & tracking
  active BOOLEAN DEFAULT true,
  supported BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_sources_code ON regulatory_sources(regulator_code);
CREATE INDEX IF NOT EXISTS idx_regulatory_sources_active ON regulatory_sources(active);
CREATE INDEX IF NOT EXISTS idx_regulatory_sources_crawl_due ON regulatory_sources(next_crawl_due) WHERE crawl_enabled = true;

-- ============================================================================
-- REGULATORY CRAWL JOBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulatory_crawl_jobs (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES regulatory_sources(source_id) ON DELETE CASCADE,
  
  -- Job details
  job_name VARCHAR(500),
  job_type VARCHAR(50),
  
  -- Execution
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'in_progress',
  
  -- Results
  urls_crawled INT DEFAULT 0,
  documents_found INT DEFAULT 0,
  documents_ingested INT DEFAULT 0,
  errors INT DEFAULT 0,
  error_messages TEXT[],
  
  -- Performance
  duration_seconds INT,
  bytes_downloaded INT,
  
  -- Audit
  created_by VARCHAR(500),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_source ON regulatory_crawl_jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON regulatory_crawl_jobs(status);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_completed_at ON regulatory_crawl_jobs(completed_at DESC);

-- ============================================================================
-- INGESTED REGULATORY DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ingested_regulatory_documents (
  doc_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Source
  source_id UUID REFERENCES regulatory_sources(source_id),
  crawl_job_id UUID REFERENCES regulatory_crawl_jobs(job_id),
  
  -- Document identification
  source_url VARCHAR(1000),
  document_title VARCHAR(500),
  
  -- Content
  content_hash VARCHAR(64),
  content_type VARCHAR(100),
  file_size_bytes INT,
  
  -- Processing
  processing_status VARCHAR(50) DEFAULT 'pending',
  standard_id UUID REFERENCES standards(id),
  clauses_extracted INT DEFAULT 0,
  
  -- Metadata
  published_date DATE,
  effective_date DATE,
  revision VARCHAR(50),
  
  -- Quality
  confidence_score FLOAT DEFAULT 0.5,
  needs_review BOOLEAN DEFAULT true,
  
  -- Retention
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  crawled_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ingested_source ON ingested_regulatory_documents(source_id);
CREATE INDEX IF NOT EXISTS idx_ingested_status ON ingested_regulatory_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_ingested_standard ON ingested_regulatory_documents(standard_id);

-- ============================================================================
-- STANDARDS INGESTION LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS standards_ingestion_log (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What happened
  action VARCHAR(100),
  standard_id UUID REFERENCES standards(id),
  
  -- Details
  details JSONB,
  
  -- Actor
  user_id VARCHAR(500),
  ip_address INET,
  
  -- Result
  status VARCHAR(50),
  error_message TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_log_standard ON standards_ingestion_log(standard_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_log_created_at ON standards_ingestion_log(created_at DESC);

-- ============================================================================
-- STANDARDS ALIGNMENT MATRIX TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS standards_alignment_matrix (
  alignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Two clauses being compared
  standard1_id UUID NOT NULL REFERENCES standards(id),
  clause1_id UUID NOT NULL REFERENCES clauses(id),
  
  standard2_id UUID NOT NULL REFERENCES standards(id),
  clause2_id UUID NOT NULL REFERENCES clauses(id),
  
  -- Alignment details
  alignment_type VARCHAR(50),
  similarity_score FLOAT,
  description TEXT,
  
  -- Audit
  identified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  identified_by VARCHAR(500),
  
  UNIQUE(clause1_id, clause2_id)
);

CREATE INDEX IF NOT EXISTS idx_alignment_standard1 ON standards_alignment_matrix(standard1_id);
CREATE INDEX IF NOT EXISTS idx_alignment_standard2 ON standards_alignment_matrix(standard2_id);

-- ============================================================================
-- INITIAL DATA - REGULATORY SOURCES (60+)
-- ============================================================================

INSERT INTO regulatory_sources 
  (regulator_name, regulator_code, jurisdiction, authority_type, website, base_url, active, supported)
VALUES
  -- Aerospace
  ('Federal Aviation Administration', 'faa', 'United States', 'civil_aviation', 'https://www.faa.gov/', 'https://www.ecfr.gov/', true, true),
  ('European Union Aviation Safety Agency', 'easa', 'European Union', 'civil_aviation', 'https://www.easa.europa.eu/', 'https://www.easa.europa.eu/regulations', true, true),
  ('Civil Aviation Administration of China', 'caac', 'China', 'civil_aviation', 'https://www.caac.gov.cn/', 'https://www.caac.gov.cn/', true, false),
  
  -- Medical Devices
  ('U.S. Food and Drug Administration', 'fda', 'United States', 'medical_devices', 'https://www.fda.gov/medical-devices/', 'https://www.fda.gov/medical-devices/', true, true),
  ('European Medicines Agency', 'ema', 'European Union', 'medical_devices', 'https://www.ema.europa.eu/', 'https://www.ema.europa.eu/en', true, false),
  
  -- Information Security
  ('National Institute of Standards & Technology', 'nist', 'United States', 'information_security', 'https://www.nist.gov/', 'https://csrc.nist.gov/', true, true)
ON CONFLICT (regulator_code) DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON standards TO app_user;
GRANT SELECT, INSERT, UPDATE ON clauses TO app_user;
GRANT SELECT, INSERT, UPDATE ON gap_profiles TO app_user;
GRANT SELECT, INSERT, UPDATE ON regulatory_sources TO app_user;
GRANT SELECT, INSERT ON regulatory_crawl_jobs TO app_user;
GRANT SELECT, INSERT ON ingested_regulatory_documents TO app_user;
GRANT SELECT, INSERT ON standards_ingestion_log TO app_user;
GRANT SELECT, INSERT ON standards_alignment_matrix TO app_user;

