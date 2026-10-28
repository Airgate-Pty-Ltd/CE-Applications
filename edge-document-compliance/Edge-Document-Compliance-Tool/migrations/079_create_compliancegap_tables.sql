-- =============================================================================
-- ComplianceGap Module Database Schema
-- Purpose: Store compliance standards, gap analyses, and analysis clarifications
-- Run against: PostgreSQL database (DATABASE_URL)
-- =============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. COMPLIANCE_STANDARDS
-- Stores compliance standards/frameworks that can be analyzed
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.compliance_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50),
  authority_source VARCHAR(255),
  sector VARCHAR(100),
  description TEXT,
  document_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_standards_code ON public.compliance_standards(code);
CREATE INDEX IF NOT EXISTS idx_compliance_standards_active ON public.compliance_standards(is_active);

-- =============================================================================
-- 2. GAP_ANALYSES
-- Stores gap analysis sessions and results
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.gap_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id VARCHAR(100) UNIQUE NOT NULL,
  customer_id UUID,
  standard_id UUID REFERENCES public.compliance_standards(id) ON DELETE SET NULL,
  standard_code VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed
  summary TEXT,
  total_requirements INT DEFAULT 0,
  covered_count INT DEFAULT 0,
  partially_covered_count INT DEFAULT 0,
  not_covered_count INT DEFAULT 0,
  confidence_score DECIMAL(5,2),
  analysis_data JSONB, -- Full analysis results
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gap_analyses_analysis_id ON public.gap_analyses(analysis_id);
CREATE INDEX IF NOT EXISTS idx_gap_analyses_customer_id ON public.gap_analyses(customer_id);
CREATE INDEX IF NOT EXISTS idx_gap_analyses_standard_id ON public.gap_analyses(standard_id);
CREATE INDEX IF NOT EXISTS idx_gap_analyses_status ON public.gap_analyses(status);
CREATE INDEX IF NOT EXISTS idx_gap_analyses_created_at ON public.gap_analyses(created_at DESC);

-- =============================================================================
-- 3. ANALYSIS_CLARIFICATIONS
-- Stores clarification questions and answers during gap analysis
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.analysis_clarifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.gap_analyses(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_text TEXT,
  requirement_reference VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending', -- pending, answered, skipped
  asked_at TIMESTAMP DEFAULT NOW(),
  answered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_clarifications_analysis_id ON public.analysis_clarifications(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_clarifications_status ON public.analysis_clarifications(status);

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON TABLE public.compliance_standards IS 'Compliance standards and frameworks for gap analysis';
COMMENT ON TABLE public.gap_analyses IS 'Gap analysis sessions comparing customer documents against standards';
COMMENT ON TABLE public.analysis_clarifications IS 'Clarification questions and answers during gap analysis';

