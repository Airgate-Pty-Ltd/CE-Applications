-- =============================================================================
-- MIGRATION 009: Fix parsed_requirements table schema
-- Ensures clause_number and all required columns exist
-- CRITICAL: This fixes the "column clause_number does not exist" error
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'parsed_requirements'
  ) THEN
    -- Ensure clause_number column exists (CRITICAL FIX)
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS clause_number VARCHAR(100);
    
    -- Populate clause_number from full_ref or clause_ref if it's NULL
    UPDATE public.parsed_requirements 
    SET clause_number = COALESCE(full_ref, clause_ref, 'N/A')
    WHERE clause_number IS NULL OR clause_number = '';
    
    -- Ensure all other required columns exist
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS clause_ref VARCHAR(100);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS sub_ref VARCHAR(100);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS full_ref VARCHAR(200);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS clause_path_depth INTEGER DEFAULT 0;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS subject_text TEXT;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS is_informative_note BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS is_recommendation BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS is_in_scope BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS requirement_uid VARCHAR(16);
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS aerospace_addition BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.parsed_requirements ADD COLUMN IF NOT EXISTS requires_maintained_di BOOLEAN DEFAULT FALSE;
    
    -- Create indexes on new columns if they exist
    CREATE INDEX IF NOT EXISTS idx_parsed_requirements_clause_number 
      ON public.parsed_requirements(clause_number) 
      WHERE clause_number IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_parsed_requirements_clause_ref 
      ON public.parsed_requirements(clause_ref) 
      WHERE clause_ref IS NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_parsed_requirements_full_ref 
      ON public.parsed_requirements(full_ref) 
      WHERE full_ref IS NOT NULL;
    
    RAISE NOTICE 'Fixed parsed_requirements table schema - added clause_number and all required columns';
  ELSE
    RAISE WARNING 'parsed_requirements table does not exist - skipping schema fixes';
  END IF;
END $$;

