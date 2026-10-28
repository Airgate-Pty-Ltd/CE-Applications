-- =============================================================================
-- MIGRATION 008: Ensure parsed_clauses table exists in PostgreSQL
-- Some services reference parsed_clauses, but it may not exist
-- This creates it if missing, matching the structure expected by services
-- =============================================================================

-- Create parsed_clauses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.parsed_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
  
  -- Clause structure
  clause_number VARCHAR(100) NOT NULL,
  clause_hierarchy TEXT,
  clause_title VARCHAR(500),
  clause_text TEXT,
  
  -- Classification
  requirement_type VARCHAR(100),
  authority_source VARCHAR(50),
  intent TEXT,
  common_gaps TEXT,
  
  -- Metadata
  confidence_score DECIMAL(3,2) DEFAULT 0.75,
  extracted_by VARCHAR(100) DEFAULT 'system',
  extracted_at TIMESTAMP DEFAULT NOW(),
  model_version_used VARCHAR(20) DEFAULT '1.0.0',
  
  CONSTRAINT unique_clause UNIQUE(standard_id, clause_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parsed_clauses_standard 
  ON public.parsed_clauses(standard_id);
CREATE INDEX IF NOT EXISTS idx_parsed_clauses_type 
  ON public.parsed_clauses(requirement_type);
CREATE INDEX IF NOT EXISTS idx_parsed_clauses_number 
  ON public.parsed_clauses(clause_number);

-- Ensure regulatory_websites table exists in PostgreSQL (for compatibility)
CREATE TABLE IF NOT EXISTS public.regulatory_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url VARCHAR(500) NOT NULL,
  name VARCHAR(255),
  agency VARCHAR(100),
  regulatory_body VARCHAR(100),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  last_scraped TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Add tenant_id column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'regulatory_websites' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.regulatory_websites ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create unique index to handle NULL tenant_id properly
-- This ensures one URL per tenant, and allows multiple URLs with NULL tenant_id
-- Only create if tenant_id column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'regulatory_websites' AND column_name = 'tenant_id') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_regulatory_websites_unique_url_tenant 
      ON public.regulatory_websites(url, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));
  ELSE
    -- Fallback: create index without tenant_id if column doesn't exist
    CREATE UNIQUE INDEX IF NOT EXISTS idx_regulatory_websites_unique_url 
      ON public.regulatory_websites(url);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_regulatory_websites_agency 
  ON public.regulatory_websites(agency);
CREATE INDEX IF NOT EXISTS idx_regulatory_websites_active 
  ON public.regulatory_websites(is_active);

-- Verify tables created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parsed_clauses') THEN
    RAISE NOTICE '✓ parsed_clauses table exists';
  ELSE
    RAISE WARNING '✗ parsed_clauses table was not created';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regulatory_websites') THEN
    RAISE NOTICE '✓ regulatory_websites table exists';
  ELSE
    RAISE WARNING '✗ regulatory_websites table was not created';
  END IF;
END $$;

