-- =============================================================================
-- MIGRATION 012: Create parsed_requirements table if it doesn't exist
-- CRITICAL: This table is required for parsing to work
-- =============================================================================

-- Create parsed_requirements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.parsed_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES public.standards(id) ON DELETE CASCADE,
  clause_number VARCHAR(100) NOT NULL,
  clause_title VARCHAR(500),
  requirement_text TEXT NOT NULL,
  requirement_type VARCHAR(100),
  requirement_subtype VARCHAR(100),
  keyword VARCHAR(50),
  modal_verb VARCHAR(50),
  intent TEXT,
  why_it_matters TEXT,
  common_gaps TEXT,
  evidence_requirements JSONB,
  related_clauses JSONB,
  audit_frequency VARCHAR(50),
  extracted_at TIMESTAMP DEFAULT NOW(),
  extracted_by_model_version VARCHAR(20) DEFAULT '1.0.0',
  confidence DECIMAL(3,2) DEFAULT 0.75,
  keywords TEXT,
  clause_ref VARCHAR(100),
  sub_ref VARCHAR(100),
  full_ref VARCHAR(200),
  requirement_uid VARCHAR(16),
  aerospace_addition BOOLEAN DEFAULT FALSE,
  requires_maintained_di BOOLEAN DEFAULT FALSE,
  requires_retained_di BOOLEAN DEFAULT FALSE,
  is_informative_note BOOLEAN DEFAULT FALSE,
  is_recommendation BOOLEAN DEFAULT FALSE,
  is_in_scope BOOLEAN DEFAULT TRUE,
  clause_path_depth INT DEFAULT 0,
  subject_text TEXT,
  extraction_flags JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parsed_requirements_standard_id ON public.parsed_requirements(standard_id);
CREATE INDEX IF NOT EXISTS idx_parsed_requirements_clause_number ON public.parsed_requirements(clause_number);
CREATE INDEX IF NOT EXISTS idx_parsed_requirements_clause_ref ON public.parsed_requirements(clause_ref);
CREATE INDEX IF NOT EXISTS idx_parsed_requirements_full_ref ON public.parsed_requirements(full_ref);
CREATE INDEX IF NOT EXISTS idx_parsed_requirements_extracted_at ON public.parsed_requirements(extracted_at DESC);

-- Ensure clause_number is NOT NULL (add constraint if table was created without it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'parsed_requirements'
  ) THEN
    -- Ensure clause_number exists and is NOT NULL
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS clause_number VARCHAR(100);
    
    -- Populate clause_number from full_ref or clause_ref if NULL
    UPDATE public.parsed_requirements 
    SET clause_number = COALESCE(full_ref, clause_ref, 'N/A')
    WHERE clause_number IS NULL OR clause_number = '';
    
    -- Ensure all other required columns exist (CRITICAL: requirement_type must exist)
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS requirement_type VARCHAR(100);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS requirement_subtype VARCHAR(100);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS clause_ref VARCHAR(100);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS sub_ref VARCHAR(100);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS full_ref VARCHAR(200);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS clause_path_depth INT DEFAULT 0;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS subject_text TEXT;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS is_informative_note BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS is_recommendation BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS is_in_scope BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS requirement_uid VARCHAR(16);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS aerospace_addition BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS requires_maintained_di BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS requires_retained_di BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS extraction_flags JSONB;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS keyword VARCHAR(50);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS modal_verb VARCHAR(50);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS intent TEXT;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS keywords TEXT;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 0.75;
    
    RAISE NOTICE 'Verified parsed_requirements table exists with all required columns';
  ELSE
    RAISE WARNING 'parsed_requirements table was not created - this is unexpected';
  END IF;
END $$;

COMMENT ON TABLE public.parsed_requirements IS 'Stores parsed requirements extracted from standards documents - CRITICAL for parsing functionality';

