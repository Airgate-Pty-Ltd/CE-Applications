-- =============================================================================
-- MIGRATION 007: Fix PostgreSQL Schema Mismatches
-- Fixes 4 critical schema/query mismatch errors
-- CRITICAL: This migration is idempotent - checks if tables exist before altering
-- =============================================================================

-- =============================================================================
-- FIX ERROR 1: Remove gap_analysis_id references from audit_trail
-- The audit_trail table does NOT have gap_analysis_id column
-- =============================================================================
-- NOTE: This UPDATE block is removed - gap_analysis_id doesn't exist in audit_trail
-- The audit_trail table only has analysis_id column (not gap_analysis_id)

-- =============================================================================
-- FIX ERROR 2: Ensure model_version_used column exists in standards
-- Replace references with model_version_used (the correct column name)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'standards'
  ) THEN
    -- Ensure model_version_used exists
    ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS model_version_used VARCHAR(20) DEFAULT '1.0.0';
    
    -- Copy data from current_model_version to model_version_used if needed
    -- Note: current_model_version column may not exist, so we skip this update
    -- The default value '1.0.0' will be used for new records
    
    RAISE NOTICE 'Fixed model_version_used column in standards table';
  ELSE
    RAISE WARNING 'standards table does not exist - skipping model_version_used fix';
  END IF;
END $$;

-- =============================================================================
-- FIX ERROR 3: Ensure analysis_date column exists in gap_analyses
-- The gap_analyses table uses analysis_date, not created_at
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'gap_analyses'
  ) THEN
    -- Ensure analysis_date exists (it should already exist from migration 001)
    ALTER TABLE public.gap_analyses ADD COLUMN IF NOT EXISTS analysis_date TIMESTAMP DEFAULT NOW();
    
    -- Copy data from created_at to analysis_date if needed
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'gap_analyses' 
      AND column_name = 'created_at'
    ) THEN
      UPDATE public.gap_analyses 
      SET analysis_date = COALESCE(analysis_date, created_at)
      WHERE analysis_date IS NULL AND created_at IS NOT NULL;
    END IF;
    
    RAISE NOTICE 'Fixed analysis_date column in gap_analyses table';
  ELSE
    RAISE WARNING 'gap_analyses table does not exist - skipping analysis_date fix';
  END IF;
END $$;

-- =============================================================================
-- FIX ERROR 4: Ensure file_name and file_path columns exist in standards
-- Migration 006 should have added this, but ensure it exists
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'standards'
  ) THEN
    -- Migration 006 adds file_name to standards table
    -- Ensure it exists (should already be added by migration 006)
    ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
    ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS file_path TEXT;
    ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS file_size BIGINT;
    ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);
    ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS file_category VARCHAR(100) DEFAULT 'standard';
    
    RAISE NOTICE 'Fixed file-related columns in standards table';
  ELSE
    RAISE WARNING 'standards table does not exist - skipping file column fixes';
  END IF;
END $$;

-- =============================================================================
-- FIX ADDITIONAL: Ensure clause_number and full_ref exist in parsed_requirements
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'parsed_requirements'
  ) THEN
    -- Ensure parsed_requirements has the required columns
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS clause_number VARCHAR(100);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS full_ref VARCHAR(200);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS clause_ref VARCHAR(100);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS sub_ref VARCHAR(100);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS clause_path_depth INTEGER;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS subject_text TEXT;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS is_informative_note BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS is_recommendation BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS is_in_scope BOOLEAN DEFAULT TRUE;
    
    -- Create indexes on new columns if they exist
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
      AND column_name = 'full_ref'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_parsed_requirements_full_ref ON public.parsed_requirements(full_ref);
    END IF;
    
    RAISE NOTICE 'Fixed parsed_requirements columns';
  ELSE
    RAISE WARNING 'parsed_requirements table does not exist - skipping column fixes';
  END IF;
END $$;
