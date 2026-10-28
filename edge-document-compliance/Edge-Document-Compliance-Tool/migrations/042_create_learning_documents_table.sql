-- Migration 042: Create Learning Documents Table
-- Purpose: Store learning documents for semantic search and context building
-- Created: 2025-12-03

BEGIN;

-- Create learning documents table if not exists
CREATE TABLE IF NOT EXISTS edcat.document_content_for_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(50) NOT NULL,        -- 'standard', 'customer', 'regulatory', 'example'
  source_id UUID,                           -- Reference to original document
  standard_code VARCHAR(100),                -- Which standard this relates to
  clause_reference VARCHAR(100),             -- Which clause (e.g., "8.7.1")
  document_title VARCHAR(255),               -- Title of source document
  content TEXT NOT NULL,                     -- Extracted text content
  section_heading VARCHAR(255),              -- Section within document
  confidence DECIMAL(3,2) DEFAULT 0.80,     -- Confidence of extraction
  is_approved_example BOOLEAN DEFAULT false, -- Is this an approved example?
  is_bad_example BOOLEAN DEFAULT false,      -- Is this a bad example to avoid?
  tags TEXT[],                               -- Tags for categorization
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Legacy columns for backward compatibility
  file_id UUID,
  standard_id UUID,
  category TEXT,
  content_text TEXT,
  is_example BOOLEAN DEFAULT false,
  word_count INT
);

-- Add missing columns if table already exists (for backward compatibility)
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'edcat' AND table_name = 'document_content_for_learning' AND column_name = 'source_type') THEN
    ALTER TABLE edcat.document_content_for_learning ADD COLUMN source_type VARCHAR(50);
    ALTER TABLE edcat.document_content_for_learning ADD COLUMN source_id UUID;
    ALTER TABLE edcat.document_content_for_learning ADD COLUMN clause_reference VARCHAR(100);
    ALTER TABLE edcat.document_content_for_learning ADD COLUMN document_title VARCHAR(255);
    ALTER TABLE edcat.document_content_for_learning ADD COLUMN section_heading VARCHAR(255);
    ALTER TABLE edcat.document_content_for_learning ADD COLUMN confidence DECIMAL(3,2) DEFAULT 0.80;
    ALTER TABLE edcat.document_content_for_learning ADD COLUMN is_approved_example BOOLEAN DEFAULT false;
    ALTER TABLE edcat.document_content_for_learning ADD COLUMN is_bad_example BOOLEAN DEFAULT false;
    ALTER TABLE edcat.document_content_for_learning ADD COLUMN tags TEXT[];
    ALTER TABLE edcat.document_content_for_learning ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
  
  -- Populate source_type from existing data
  UPDATE edcat.document_content_for_learning 
  SET source_type = COALESCE(source_type, 'standard')
  WHERE source_type IS NULL;
  
  -- Map legacy columns to new structure
  UPDATE edcat.document_content_for_learning
  SET content = COALESCE(content, content_text),
      is_approved_example = COALESCE(is_approved_example, is_example)
  WHERE content IS NULL OR (is_approved_example IS NULL AND is_example IS NOT NULL);
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_standard 
  ON edcat.document_content_for_learning(standard_code);

CREATE INDEX IF NOT EXISTS idx_learning_clause 
  ON edcat.document_content_for_learning(clause_reference);

CREATE INDEX IF NOT EXISTS idx_learning_source_type 
  ON edcat.document_content_for_learning(source_type);

CREATE INDEX IF NOT EXISTS idx_learning_approved 
  ON edcat.document_content_for_learning(is_approved_example)
  WHERE is_approved_example = true;

CREATE INDEX IF NOT EXISTS idx_learning_created 
  ON edcat.document_content_for_learning(created_at DESC);

-- Create text search index for ILIKE queries
CREATE INDEX IF NOT EXISTS idx_learning_content_trgm 
  ON edcat.document_content_for_learning USING gin(
    to_tsvector('english', COALESCE(content, content_text, ''))
  );

-- Verify table
SELECT 'document_content_for_learning' as table_name,
       COUNT(*) as row_count,
       COUNT(DISTINCT standard_code) as standards
FROM edcat.document_content_for_learning;

COMMIT;

-- Success message
-- RESULT: Created/updated document_content_for_learning table with indexes

