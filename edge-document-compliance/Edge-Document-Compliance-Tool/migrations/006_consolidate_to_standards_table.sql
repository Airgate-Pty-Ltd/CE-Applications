-- =============================================================================
-- MIGRATION 006: Consolidate to standards table only
-- Remove standard_files and standard_files_content tables
-- Move all file-related data to standards table
-- =============================================================================

-- CRITICAL: This migration is idempotent - checks if tables exist before using them

-- Step 1: Ensure standards table exists first (create if missing)
-- This migration is idempotent and will create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  authority_source VARCHAR(100),
  sector VARCHAR(100),
  description TEXT,
  total_clauses INT DEFAULT 0,
  total_requirements INT DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  parsed_at TIMESTAMP,
  model_version_used VARCHAR(20) DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Add file-related columns to standards table if they don't exist
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS file_category VARCHAR(100) DEFAULT 'standard';
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP;
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS file_content BYTEA;
ALTER TABLE public.standards ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Step 3: Migrate data from standard_files to standards table (only if standard_files exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'standard_files'
  ) THEN
    -- Update standards with file information from standard_files
    UPDATE public.standards s
    SET 
      file_path = sf.file_path,
      file_name = sf.file_name,
      file_size = sf.file_size,
      file_type = sf.file_type,
      file_category = COALESCE(s.file_category, sf.file_category, 'standard'),
      parsed_at = COALESCE(s.parsed_at, sf.parsed_at),
      file_content = sf.file_content,
      metadata = sf.metadata,
      uploaded_at = COALESCE(s.uploaded_at, sf.uploaded_at)
    FROM public.standard_files sf
    WHERE sf.standard_id = s.id
      AND (s.file_path IS NULL OR s.file_name IS NULL);
    
    RAISE NOTICE 'Migrated data from standard_files to standards table';
  ELSE
    RAISE NOTICE 'standard_files table does not exist - skipping data migration';
  END IF;
END $$;

-- Step 4: Migrate data from standard_files_content to standards table (only if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'standard_files_content'
  ) THEN
    -- Update standards with file content from standard_files_content
    UPDATE public.standards s
    SET 
      file_content = sfc.file_content,
      file_size = COALESCE(s.file_size, sfc.file_size),
      file_name = COALESCE(s.file_name, sfc.filename)
    FROM public.standard_files_content sfc
    WHERE sfc.standard_id = s.id
      AND s.file_content IS NULL;
    
    RAISE NOTICE 'Migrated data from standard_files_content to standards table';
  ELSE
    RAISE NOTICE 'standard_files_content table does not exist - skipping data migration';
  END IF;
END $$;

-- Step 5: Ensure file_category is set for all standards
-- Use sector as fallback for file_category if not set
UPDATE public.standards
SET file_category = CASE
  WHEN sector = 'regulatory' THEN 'regulatory'
  WHEN sector = 'customer' OR sector = 'customer_requirements' THEN 'customer_requirements'
  ELSE COALESCE(file_category, 'standard')
END
WHERE file_category IS NULL OR file_category = '';

-- Step 6: Ensure uploaded_at is set for all standards with files
UPDATE public.standards
SET uploaded_at = COALESCE(uploaded_at, NOW())
WHERE (file_path IS NOT NULL OR file_name IS NOT NULL)
  AND uploaded_at IS NULL;

-- Step 7: Create indexes on new columns (only if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standards' 
    AND column_name = 'file_category'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_standards_file_category ON public.standards(file_category);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standards' 
    AND column_name = 'file_path'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_standards_file_path ON public.standards(file_path) WHERE file_path IS NOT NULL;
  END IF;
END $$;

-- Step 8: Drop standard_files_content table (non-functional) - safe to drop even if doesn't exist
DROP TABLE IF EXISTS public.standard_files_content CASCADE;

-- Step 9: Drop standard_files table (consolidated into standards) - safe to drop even if doesn't exist
DROP TABLE IF EXISTS public.standard_files CASCADE;

-- Step 10: Add comments to standards table columns (only if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standards' 
    AND column_name = 'file_path'
  ) THEN
    COMMENT ON COLUMN public.standards.file_path IS 'Path to uploaded file (replaces standard_files table)';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standards' 
    AND column_name = 'file_name'
  ) THEN
    COMMENT ON COLUMN public.standards.file_name IS 'Original filename (replaces standard_files table)';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standards' 
    AND column_name = 'file_category'
  ) THEN
    COMMENT ON COLUMN public.standards.file_category IS 'Category: standard, regulatory, or customer_requirements (replaces standard_files.file_category)';
  END IF;
END $$;
