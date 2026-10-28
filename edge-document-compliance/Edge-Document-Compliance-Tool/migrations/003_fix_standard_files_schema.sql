-- =============================================================================
-- MIGRATION 003: Fix standard_files table schema
-- =============================================================================
-- This migration ensures standard_files table exists with correct schema
-- to match what the upload route expects
-- =============================================================================

-- Create standard_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.standard_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(50),
  file_category VARCHAR(100) NOT NULL DEFAULT 'documents',
  standard_id UUID REFERENCES public.standards(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  parsed_at TIMESTAMP,
  file_content BYTEA,
  metadata JSONB
);

-- Add file_category column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standard_files' 
    AND column_name = 'file_category'
  ) THEN
    ALTER TABLE public.standard_files ADD COLUMN file_category VARCHAR(100) NOT NULL DEFAULT 'documents';
  END IF;
END $$;

-- If table has file_id column (old schema), migrate to id column
DO $$
BEGIN
  -- Check if file_id exists but id doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standard_files' 
    AND column_name = 'file_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'standard_files' 
    AND column_name = 'id'
  ) THEN
    -- Rename file_id to id
    ALTER TABLE public.standard_files RENAME COLUMN file_id TO id;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_standard_files_category ON public.standard_files(file_category);
CREATE INDEX IF NOT EXISTS idx_standard_files_standard_id ON public.standard_files(standard_id);
CREATE INDEX IF NOT EXISTS idx_standard_files_uploaded_at ON public.standard_files(uploaded_at DESC);

COMMENT ON TABLE public.standard_files IS 'Stores uploaded files for standards, regulatory, and customer requirements';

